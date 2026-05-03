const { createJob } = require('./jobQueue');

// A sample list of highly-viewed or trending YouTube videos OpenClaw would find
const TRENDING_SOURCES = [
  'https://www.youtube.com/watch?v=M7FIvfx5J10', // Lex Fridman clip or similar
  'https://www.youtube.com/watch?v=D-2O9D-s00I', 
  'https://www.youtube.com/watch?v=CqzoTsaZk6U'
];

class OpenClawAgent {
  constructor() {
    this.isActive = false;
    this.intervalId = null;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    console.log('[OpenClaw] Autonomous Agent started. Monitoring web trends...');
    
    // Simulate periodic monitoring (e.g., every 4 hours)
    // 4 * 60 * 60 * 1000
    const checkInterval = 4 * 60 * 60 * 1000;
    
    this.intervalId = setInterval(() => this.huntForTrends(), checkInterval);
  }

  stop() {
    this.isActive = false;
    if (this.intervalId) clearInterval(this.intervalId);
    console.log('[OpenClaw] Autonomous Agent paused.');
  }

  getStatus() {
    return { isActive: this.isActive };
  }

  async huntForTrends() {
    if (!this.isActive) return;
    console.log('[OpenClaw] Agent is scouring Reddit and YouTube for viral content...');
    
    // Simulate a delay for "research"
    setTimeout(async () => {
      // Pick a random trending video
      const randomVideo = TRENDING_SOURCES[Math.floor(Math.random() * TRENDING_SOURCES.length)];
      console.log(`[OpenClaw] Found trending video: ${randomVideo}. Submitting to Job Queue...`);
      
      try {
        // Queue the video autonomously. 
        // No socket provided since this runs in the background.
        // We use a random template from our UI.
        const templates = ['pastel-dreams', 'neon-cyber', 'minimal-light'];
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        const jobId = await createJob(randomVideo, null, template);
        console.log(`[OpenClaw] Successfully queued job: ${jobId}`);
      } catch (error) {
        console.error('[OpenClaw] Agent failed to queue video:', error);
      }
    }, 5000);
  }

  // Allow manual triggering of a hunt cycle
  forceRun() {
    console.log('[OpenClaw] Manual hunt triggered.');
    this.huntForTrends();
  }
}

const openclawInstance = new OpenClawAgent();

module.exports = openclawInstance;
