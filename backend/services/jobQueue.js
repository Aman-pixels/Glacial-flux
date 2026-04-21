const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const { downloadVideo, extractAudio } = require('./videoService');
const { transcribeAudio, detectViralMoments, generateClipSubtitles } = require('./aiService');
const { extractAudioSegment, processVerticalClipWithSubtitles, generateThumbnail } = require('../utils/ffmpeg');

async function createJob(url, socket, templateId) {
  const jobId = uuidv4();
  
  // Create project in database
  const project = await Project.create({
    jobId,
    youtubeUrl: url,
    templateId,
    status: 'queued'
  });
  
  // Start async processing without blocking
  processJob(jobId, url, socket, templateId).catch(async (err) => {
    console.error(`Job ${jobId} failed:`, err);
    if (socket) {
      socket.emit('job-error', { jobId, error: err.message });
    }
    await Project.findOneAndUpdate({ jobId }, { status: 'failed', error: err.message });
  });

  return jobId;
}

// Function to log locally and emit safely
function emitLog(socket, jobId, stage, percent, message) {
  console.log(`[Job ${jobId}][${stage}] ${percent}% - ${message}`);
  if (socket) {
    socket.emit('job-progress', { jobId, stage, percent, message });
  }
}

async function processJob(jobId, url, socket, templateId) {
  await Project.findOneAndUpdate({ jobId }, { status: 'processing' });
  emitLog(socket, jobId, 'init', 0, 'Starting Agent processing phase...');

  const tempDir = path.join(__dirname, '..', 'temp');
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  let mainVideoPath = null;
  let mainAudioPath = null;
  const tempFilesToClean = [];

  try {
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
    
    emitLog(socket, jobId, 'analyze', 45, 'Agent analyzing transcript for viral hooks and high retention moments (Gemini 2.0 Flash)...');
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
      const srtPath = path.join(tempDir, `sub_${clipId}.srt`);
      const outputVideoPath = path.join(outputDir, `short_${clipId}.mp4`);
      const thumbnailPath = path.join(outputDir, `thumb_${clipId}.jpg`);
      
      tempFilesToClean.push(clipAudioPath, srtPath);

      // We give the Rendering process the remaining 40% (60 -> 100)
      const basePercent = 60 + (i * (40 / clipsToProcess));
      
      emitLog(socket, jobId, 'render', Math.floor(basePercent), `Clip ${i+1}/${clipsToProcess}: Extracting slice audio...`);
      await extractAudioSegment(mainVideoPath, start, duration, clipAudioPath);
      
      emitLog(socket, jobId, 'render', Math.floor(basePercent + 2), `Clip ${i+1}/${clipsToProcess}: Generating perfect localized subtitle track...`);
      const srtContent = await generateClipSubtitles(clipAudioPath);
      fs.writeFileSync(srtPath, srtContent);
      
      emitLog(socket, jobId, 'render', Math.floor(basePercent + 5), `Clip ${i+1}/${clipsToProcess}: Rendering vertical layout & burning subtitles via FFmpeg...`);
      await processVerticalClipWithSubtitles(mainVideoPath, start, duration, srtPath, outputVideoPath, templateId);
      
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
    throw error; // Let the top level catch log and emit
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
