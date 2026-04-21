const { spawnSync } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');

console.log('--- Checking FFmpeg ---');
const ffProc = spawnSync(ffmpegStatic, ['-version']);
console.log(ffProc.stdout.toString().split('\n')[0]);

console.log('\n--- Checking ffprobe ---');
const fpProc = spawnSync(ffprobeStatic.path, ['-version']);
console.log(fpProc.stdout.toString().split('\n')[0]);

console.log('\n--- Checking yt-dlp ---');
// Extract path logic from videoService.js
const ytDlpBin = path.join(
  path.dirname(require.resolve('youtube-dl-exec/package.json')),
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);
const ytProc = spawnSync(ytDlpBin, ['--version']);
if (ytProc.error) {
  console.log('yt-dlp not found at:', ytDlpBin);
} else {
  console.log('yt-dlp version:', ytProc.stdout.toString().trim());
}
