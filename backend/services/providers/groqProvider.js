const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq: Whisper large-v3 for audio + Llama 3.3 70B for LLM
// Free tier: extremely generous — 7,200 audio mins/day, 14,400 LLM req/day

async function transcribeAudio(filePath) {
  console.log('[Groq] Transcribing with whisper-large-v3...');

  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  // Groq verbose_json returns same shape as OpenAI — already compatible
  return {
    text: transcription.text,
    segments: (transcription.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

async function detectViralMoments(transcriptionData) {
  console.log('[Groq] Detecting viral moments with llama-3.3-70b...');

  const promptData = transcriptionData.segments
    .map((s) => `[${s.start.toFixed(2)} - ${s.end.toFixed(2)}]: ${s.text}`)
    .join('\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a viral content expert. Find the top 3-5 most viral moments (15-60 sec) in the transcript.
Return ONLY valid JSON, no markdown:
{"clips":[{"title":"catchy title","description":"why it will go viral","start_time":0.0,"end_time":30.0,"virality_score":95}]}`,
      },
      { role: 'user', content: `Transcript:\n${promptData}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.clips || [];
}

function formatSrtTime(seconds) {
  const pad = (num, size) => num.toString().padStart(size, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

async function generateClipSubtitles(audioFilePath) {
  console.log('[Groq] Generating SRT with whisper-large-v3...');

  // Groq doesn't support response_format: 'srt' natively, so we request verbose_json
  // and construct the SRT format manually.
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
  });

  if (!transcription.segments) return '';

  let srtContent = '';
  transcription.segments.forEach((segment, index) => {
    const startTime = formatSrtTime(segment.start);
    const endTime = formatSrtTime(segment.end);
    srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n\n`;
  });

  return srtContent.trim();
}

module.exports = { name: 'Groq', transcribeAudio, detectViralMoments, generateClipSubtitles };
