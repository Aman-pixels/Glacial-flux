const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ffprobeStatic = require('ffprobe-static');

// Point fluent-ffmpeg to the bundled static binary
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

async function extractAudioSegment(videoPath, startTime, duration, outputAudioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .noVideo()
      .audioCodec('libmp3lame')
      .save(outputAudioPath)
      .on('end', () => resolve(outputAudioPath))
      .on('error', (err) => reject(err));
  });
}

const TEMPLATE_STYLES = {
  'tiktok-energy': 'FontName=Arial,FontSize=20,PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=2',
  'podcast-clean': 'FontName=Arial,FontSize=16,PrimaryColour=&HFFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0',
  'vlog-warm': 'FontName=Georgia,FontSize=18,PrimaryColour=&H00A5FF,OutlineColour=&H40000000,BorderStyle=3,Outline=1,Shadow=1',
  'tech-minimal': 'FontName=Courier New,FontSize=14,PrimaryColour=&HEEEEEE,OutlineColour=&H40000000,BorderStyle=3,Outline=1,Shadow=0',
  'news-bold': 'FontName=Impact,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H0000FF,BorderStyle=1,Outline=3,Shadow=0',
  'asmr-soft': 'FontName=Arial,FontSize=18,PrimaryColour=&HFBC7F7,OutlineColour=&HFFFFFF,BorderStyle=3,Outline=0,Shadow=0',
  'default': 'FontName=Arial,FontSize=18,PrimaryColour=&H00FFFF,OutlineColour=&H40000000,BorderStyle=3,Outline=2,Shadow=0'
};

function getStyleForTemplate(templateId) {
  return TEMPLATE_STYLES[templateId] || TEMPLATE_STYLES['default'];
}

/**
 * Renders a vertical 9:16 clip with burned-in subtitles using raw spawn().
 *
 * WHY spawn() instead of fluent-ffmpeg:
 *  - fluent-ffmpeg's .save() wraps the output path in shell quoting that
 *    breaks when the path contains spaces AND a Windows drive letter.
 *  - The subtitles filter requires its OWN escaping scheme (colons → \\:,
 *    backslashes → /) that conflicts with fluent-ffmpeg's internal quoting.
 *  - Using spawn() we pass args as a plain JS array — no shell, no re-quoting.
 */
async function processVerticalClipWithSubtitles(videoPath, startTime, duration, srtPath, destPath, templateId) {
  return new Promise((resolve, reject) => {
    // libass subtitle filter on Windows: backslashes → forward slashes,
    // the single remaining colon (drive letter) → \: so libass doesn't
    // treat it as an option separator.
    const libassPath = srtPath.replace(/\\/g, '/').replace(':', '\\:');

    const forceStyle = getStyleForTemplate(templateId);

    const filterComplex = `crop=ih*(9/16):ih,subtitles='${libassPath}':force_style='${forceStyle}'`;

    const args = [
      '-ss', String(startTime),
      '-i', videoPath,
      '-t', String(duration),
      '-vf', filterComplex,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      destPath,
    ];

    console.log('[FFmpeg spawn] Args:', args.join(' '));

    const proc = spawn(ffmpegStatic, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stderr = '';
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });

    proc.on('error', (err) => reject(new Error(`Failed to spawn FFmpeg: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(destPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}.\n${stderr.slice(-800)}`));
      }
    });
  });
}

async function processVerticalClip(videoPath, startTime, duration, destPath) {
  return new Promise((resolve, reject) => {
    // Just the crop filter, no subtitles
    const filterComplex = 'crop=ih*(9/16):ih';

    const args = [
      '-ss', String(startTime),
      '-i', videoPath,
      '-t', String(duration),
      '-vf', filterComplex,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      destPath,
    ];

    console.log('[FFmpeg spawn] Args (No Subtitles):', args.join(' '));

    const proc = spawn(ffmpegStatic, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => reject(new Error(`Failed to spawn FFmpeg: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(destPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}.\n${stderr.slice(-800)}`));
      }
    });
  });
}

async function generateThumbnail(videoPath, outputThumbPath) {
  return new Promise((resolve, reject) => {
    const parentDir = path.dirname(outputThumbPath);
    const thumbName = path.basename(outputThumbPath);

    ffmpeg(videoPath)
      .on('end', () => resolve(outputThumbPath))
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: ['50%'], // middle of the clip
        folder: parentDir,
        filename: thumbName,
        size: '360x640', // vertical resolution
      });
  });
}

module.exports = {
  extractAudioSegment,
  processVerticalClipWithSubtitles,
  processVerticalClip,
  generateThumbnail,
};
