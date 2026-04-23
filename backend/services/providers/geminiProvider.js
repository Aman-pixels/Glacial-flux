const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

function extractJson(text) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Fallback: extract object between first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e2) {
        throw new Error(`Failed to parse extracted JSON: ${e2.message}`);
      }
    }
    throw new Error('No JSON object found in response');
  }
}

async function uploadAudio(filePath) {
  console.log(`[Gemini] Uploading: ${path.basename(filePath)}`);
  const result = await fileManager.uploadFile(filePath, {
    mimeType: 'audio/mpeg',
    displayName: path.basename(filePath),
  });
  return result.file;
}

async function deleteAudio(file) {
  try { await fileManager.deleteFile(file.name); } catch (e) {}
}

async function transcribeAudio(filePath) {
  const file = await uploadAudio(filePath);
  try {
    const prompt = `Transcribe this audio with precise timestamps.
Return ONLY this JSON structure, no markdown:
{
  "text": "full transcription",
  "segments": [{ "start": 0.0, "end": 5.2, "text": "words here" }]
}`;

    const transcribeModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await transcribeModel.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'audio/mpeg' } },
      { text: prompt },
    ]);
    const parsed = extractJson(result.response.text());
    if (!parsed.segments) throw new Error('Missing segments');
    return parsed;
  } finally {
    await deleteAudio(file);
  }
}

async function detectViralMoments(transcriptionData) {
  const promptData = transcriptionData.segments
    .map((s) => `[${s.start.toFixed(2)} - ${s.end.toFixed(2)}]: ${s.text}`)
    .join('\n');

  const result = await model.generateContent([
    { text: `You are a viral content expert. Find the top 3-5 most viral moments (30-45 sec) in this transcript.
Return ONLY this JSON, no markdown:
{"clips":[{"title":"catchy title","description":"why it will go viral","start_time":0.0,"end_time":45.0,"virality_score":95}]}` },
    { text: `Transcript:\n${promptData}` },
  ]);

  const text = result.response.text();
  const parsed = extractJson(text);
  return parsed.clips || [];
}

async function generateClipSubtitles(audioFilePath) {
  const file = await uploadAudio(audioFilePath);
  try {
    const srtModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await srtModel.generateContent([
      { fileData: { fileUri: file.uri, mimeType: 'audio/mpeg' } },
      { text: `Transcribe this audio as a valid SRT subtitle file. Max 6 words per line.
Return ONLY raw SRT content, no markdown, no explanation.` },
    ]);
    return result.response.text().trim();
  } finally {
    await deleteAudio(file);
  }
}

module.exports = { name: 'Gemini', transcribeAudio, detectViralMoments, generateClipSubtitles };
