const { downloadVideo } = require('./services/videoService');
const path = require('path');
const fs = require('fs');

async function test() {
  const url = 'https://www.youtube.com/shorts/p6-k8Lg9L-w'; // A very short short
  const tempDir = path.join(__dirname, 'temp_test');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  try {
    console.log('Testing download...');
    const videoPath = await downloadVideo(url, tempDir);
    console.log('Download success:', videoPath);
  } catch (err) {
    console.error('Download failed:', err);
  }
}

test();
