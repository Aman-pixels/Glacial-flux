const { OpenAI } = require('openai');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// OpenAI: Whisper-1 for audio + GPT-4o-mini for LLM (paid, highest reliability)

async function transcribeAudio(filePath) {
  console.log('[OpenAI] Transcribing with whisper-1...');

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

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
  console.log('[OpenAI] Detecting viral moments with gpt-4o-mini...');

  const promptData = transcriptionData.segments
    .map((s) => `[${s.start.toFixed(2)} - ${s.end.toFixed(2)}]: ${s.text}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a viral content expert. Find the top 3-5 most viral moments (30-45 sec) in the transcript.
Return ONLY valid JSON, no markdown:
{"clips":[{"title":"catchy title","description":"why it will go viral","start_time":0.0,"end_time":45.0,"virality_score":95}]}`,
      },
      { role: 'user', content: `Transcript:\n${promptData}` },
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.clips || [];
}

async function generateClipSubtitles(audioFilePath) {
  console.log('[OpenAI] Generating SRT with whisper-1...');

  const srt = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: 'whisper-1',
    response_format: 'srt',
  });

  return srt;
}

module.exports = { name: 'OpenAI', transcribeAudio, detectViralMoments, generateClipSubtitles };
