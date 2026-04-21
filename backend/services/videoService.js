const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

const ffprobeStatic = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Resolve the bundled yt-dlp binary — use package.json as anchor to get true package root
// (require.resolve('youtube-dl-exec') points to src/index.js, not the package root)
const ytDlpBin = path.join(
  path.dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

// ─── Download video using spawn (NOT shell) ─────────────────────────────────
// youtube-dl-exec uses shell:true which splits paths on spaces.
// spawn() passes args as an array directly to the OS — spaces are safe.
async function downloadVideo(url, outputDir) {
  const fileId = uuidv4();
  const outputTemplate = path.join(outputDir, `video_${fileId}.%(ext)s`);

  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] Binary: ${ytDlpBin}`);
    console.log(`[yt-dlp] Output template: ${outputTemplate}`);

    const args = [
      url,
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputTemplate,
      '--no-check-certificates',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=android'
    ];

    const proc = spawn(ytDlpBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // ← KEY: no shell, args array is passed directly to OS
    });

    let stderr = '';
    proc.stdout.on('data', (d) => console.log('[yt-dlp]', d.toString().trim()));
    proc.stderr.on('data', (d) => {
      const line = d.toString().trim();
      stderr += line + '\n';
      console.error('[yt-dlp stderr]', line);
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}. ${stderr}`));
      }

      // Find whichever file yt-dlp produced
      const files = fs.readdirSync(outputDir).filter((f) => f.startsWith(`video_${fileId}`));
      if (files.length === 0) {
        return reject(new Error('yt-dlp finished but no output file found.'));
      }

      const videoPath = path.join(outputDir, files[0]);
      console.log(`[yt-dlp] Download complete: ${videoPath}`);
      resolve(videoPath);
    });
  });
}

// ─── Extract full audio track for transcription ──────────────────────────────
async function extractAudio(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    const audioPath = path.join(outputDir, `audio_${uuidv4()}.mp3`);
    console.log(`Extracting audio to ${audioPath}...`);

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioQuality(5) // Slightly lower quality to stay under Gemini's 20MB file limit
      .save(audioPath)
      .on('end', () => resolve(audioPath))
      .on('error', (err) => {
        console.error('Failed to extract audio:', err);
        reject(err);
      });
  });
}

module.exports = {
  downloadVideo,
  extractAudio,
};
