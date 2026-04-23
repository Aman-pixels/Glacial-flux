const dotenv = require('dotenv');
dotenv.config();

// ─── Load only providers whose API keys exist in .env ───────────────────────
const providers = [];

if (process.env.GEMINI_API_KEY) {
  providers.push(require('./providers/geminiProvider'));
  console.log('[AI Router] Gemini ✓ loaded');
}
if (process.env.GROQ_API_KEY) {
  providers.push(require('./providers/groqProvider'));
  console.log('[AI Router] Groq ✓ loaded');
}
if (process.env.OPENAI_API_KEY) {
  providers.push(require('./providers/openaiProvider'));
  console.log('[AI Router] OpenAI ✓ loaded');
}

if (providers.length === 0) {
  throw new Error('No AI provider configured. Add at least one of: GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY to your .env');
}

console.log(`[AI Router] ${providers.length} provider(s) active: ${providers.map(p => p.name).join(' → ')}`);

// ─── Rate limit detection ────────────────────────────────────────────────────
function isRateLimited(err) {
  const msg = err?.message || '';
  return (
    err?.status === 429 ||
    msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

// ─── Core failover router ────────────────────────────────────────────────────
// Tries each provider in order. On rate-limit, silently switches to the next.
// On any other error, fails immediately (don't retry real errors with another provider).
async function withFailover(fnName, ...args) {
  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[AI Router] ${fnName} → trying ${provider.name}...`);
      const result = await provider[fnName](...args);
      console.log(`[AI Router] ${fnName} → success with ${provider.name}`);
      return result;
    } catch (err) {
      const isRetryable = isRateLimited(err) || 
                          err instanceof SyntaxError || 
                          err.message.includes('JSON') ||
                          err.message.includes('extracted JSON');

      if (isRetryable) {
        console.warn(`[AI Router] ${provider.name} failed with retryable error for ${fnName}: ${err.message}. Switching to next provider...`);
        lastError = err;
        continue; // try next provider
      }
      // Non-retryable error — re-throw immediately
      throw err;
    }
  }

  throw new Error(`All AI providers exhausted for ${fnName}. Last error: ${lastError?.message}`);
}

// ─── Public API (same interface jobQueue.js expects) ─────────────────────────
async function transcribeAudio(filePath) {
  return withFailover('transcribeAudio', filePath);
}

async function detectViralMoments(transcriptionData) {
  return withFailover('detectViralMoments', transcriptionData);
}

async function generateClipSubtitles(audioFilePath) {
  return withFailover('generateClipSubtitles', audioFilePath);
}

module.exports = { transcribeAudio, detectViralMoments, generateClipSubtitles };
