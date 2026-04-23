const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const { downloadVideo, extractAudio, getVideoMetadata } = require('./videoService');
const { transcribeAudio, detectViralMoments, generateClipSubtitles } = require('./aiService');
const { extractAudioSegment, processVerticalClipWithSubtitles, processVerticalClip, generateThumbnail } = require('../utils/ffmpeg');

// ─── CONCURRENCY CONTROL ─────────────────────────────────────────────────────
const MAX_CONCURRENT_JOBS = 2; // Limit FFmpeg/AI load
let activeJobs = 0;
const jobQueue = [];

async function nextInQueue() {
  if (activeJobs < MAX_CONCURRENT_JOBS && jobQueue.length > 0) {
    const { jobId, url, socket, templateId, resolve, reject } = jobQueue.shift();
    activeJobs++;
    try {
      const result = await runJob(jobId, url, socket, templateId);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      activeJobs--;
      nextInQueue();
    }
  }
}

async function createJob(url, socket, templateId) {
  const jobId = uuidv4();
  
  // Create project in database
  const project = await Project.create({
    jobId,
    youtubeUrl: url,
    templateId,
    status: 'queued'
  });
  
  // Submit to the managed queue
  return new Promise((resolve, reject) => {
    jobQueue.push({ jobId, url, socket, templateId, resolve, reject });
    // Emit progress to user immediately
    console.log(`[Job ${jobId}] Added to queue. Position: ${jobQueue.length}`);
    if (socket) {
      socket.emit('job-progress', { jobId, stage: 'queued', percent: 0, message: `Job queued. Position in line: ${jobQueue.length}` });
    }
    nextInQueue();
  });
}

// Function to log locally, emit safely, AND persist to DB
async function emitLog(socket, jobId, stage, percent, message) {
  console.log(`[Job ${jobId}][${stage}] ${percent}% - ${message}`);
  
  // Progress event to current UI
  if (socket) {
    socket.emit('job-progress', { jobId, stage, percent, message });
  }

  // Persist log entry to MongoDB
  try {
    await Project.findOneAndUpdate(
      { jobId },
      { 
        $push: { logs: { stage, percent, message } },
        // Update top-level percentage for easy dashboard polling if needed
        $set: { updatedAt: new Date() } 
      }
    );
  } catch (err) {
    console.error(`Failed to persist log for ${jobId}:`, err);
  }
}

async function runJob(jobId, url, socket, templateId) {
  await Project.findOneAndUpdate({ jobId }, { status: 'processing' });
  await emitLog(socket, jobId, 'init', 0, 'Starting Agent processing phase...');

  const tempFilesToClean = [];

  try {
    // 1. Fetch metadata early to populate UI
    await emitLog(socket, jobId, 'metadata', 5, 'Fetching video metadata...');
    const metadata = await getVideoMetadata(url);
    await Project.findOneAndUpdate({ jobId }, {
      videoTitle: metadata.title,
      videoAuthor: metadata.author,
      videoThumbnail: metadata.thumbnail
    });
    await emitLog(socket, jobId, 'metadata', 8, `Metadata locked: "${metadata.title}"`);

  const tempDir = path.join(__dirname, '..', 'temp');
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  let mainVideoPath = null;
  let mainAudioPath = null;

    emitLog(socket, jobId, 'download', 10, 'Downloading highest quality video & audio from YouTube...');
    mainVideoPath = await downloadVideo(url, tempDir);
    tempFilesToClean.push(mainVideoPath);

    emitLog(socket, jobId, 'extract-audio', 20, 'Extracting master audio track for Whisper AI...');
    mainAudioPath = await extractAudio(mainVideoPath, tempDir);
    tempFilesToClean.push(mainAudioPath);

    emitLog(socket, jobId, 'transcribe', 30, 'Transcribing master audio (Gemini 2.0 Flash)...');
    const transcriptionData = await transcribeAudio(mainAudioPath);
    if (!transcriptionData || !transcriptionData.segments) {
      throw new Error('Transcription failed.');
    }
    
    emitLog(socket, jobId, 'analyze', 45, 'Agent analyzing transcript for viral hooks (Gemma 4 31B)...');
    const viralMoments = await detectViralMoments(transcriptionData);
    
    // We only process up to 3 for time/resource safety
    const clipsToProcess = Math.min(viralMoments.length, 3);
    emitLog(socket, jobId, 'analyze', 60, `Analysis complete. Identified ${clipsToProcess} highly viral segments.`);
    
    const finalClips = [];

    for (let i = 0; i < clipsToProcess; i++) {
      const clipInfo = viralMoments[i];
      const start = clipInfo.start_time;
      const duration = clipInfo.end_time - start;
      const clipId = uuidv4();
      
      const clipAudioPath = path.join(tempDir, `clip_audio_${clipId}.mp3`);
      const outputVideoPath = path.join(outputDir, `short_${clipId}.mp4`);
      const thumbnailPath = path.join(outputDir, `thumb_${clipId}.jpg`);
      
      tempFilesToClean.push(clipAudioPath);

      // We give the Rendering process the remaining 40% (60 -> 100)
      const basePercent = 60 + (i * (40 / clipsToProcess));
      
      emitLog(socket, jobId, 'render', Math.floor(basePercent), `Clip ${i+1}/${clipsToProcess}: Extracting slice audio...`);
      await extractAudioSegment(mainVideoPath, start, duration, clipAudioPath);
      
      // Captions are disabled per user request
      emitLog(socket, jobId, 'render', Math.floor(basePercent + 5), `Clip ${i+1}/${clipsToProcess}: Rendering vertical layout via FFmpeg...`);
      await processVerticalClip(mainVideoPath, start, duration, outputVideoPath);
      
      emitLog(socket, jobId, 'render', Math.floor(basePercent + 12), `Clip ${i+1}/${clipsToProcess}: Generating engaging thumbnail...`);
      await generateThumbnail(outputVideoPath, thumbnailPath);
      
      finalClips.push({
        ...clipInfo,
        videoUrl: `/output/short_${clipId}.mp4`,
        thumbnailUrl: `/output/thumb_${clipId}.jpg`
      });
    }

    emitLog(socket, jobId, 'complete', 100, 'Agent has successfully published the generated shorts to your dashboard.');
    
    // Save final clips to project in database
    await Project.findOneAndUpdate({ jobId }, { status: 'completed', clips: finalClips });
    
    if (socket) {
      socket.emit('job-complete', { jobId, clips: finalClips });
    }

  } catch (error) {
    console.error(`[Job ${jobId}] Final Failure:`, error);
    
    // Improved error classification
    let userMsg = error.message;
    if (userMsg.includes('yt-dlp')) userMsg = 'YouTube download blocked or video unavailable.';
    if (userMsg.includes('FFmpeg')) userMsg = 'Video processing error. The video might be corrupted.';
    if (userMsg.includes('AI providers exhausted')) userMsg = 'Internal AI capacity reached. Try again in a few minutes.';

    await Project.findOneAndUpdate({ jobId }, { status: 'failed', error: userMsg });
    
    if (socket) {
      socket.emit('job-error', { jobId, error: userMsg });
    }
    throw error;
  } finally {
    // Cleanup temporary files
    for (const file of tempFilesToClean) {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) {}
      }
    }
  }
}

module.exports = {
  createJob
};
