# AI Viral Shorts Generator 🎬

![AI Viral Shorts Generator Hero](./assets/hero.png)

An autonomous, AI-powered pipeline designed to transform long-form YouTube content into high-engagement, vertical (9:16) shorts. This project leverages state-of-the-art LLMs to identify viral moments and uses FFmpeg for professional-grade video processing and subtitle rendering.

---

## ✨ Key Features

- **🚀 Autonomous Pipeline**: Simply provide a YouTube URL and let the agent do the rest.
- **🤖 Multi-Provider AI Intelligence**: 
  - Uses **Gemini 1.5 Pro**, **Groq (Llama 3)**, or **OpenAI** to analyze transcripts and pinpoint the most engaging segments.
  - Intelligent identification of hooks, climaxes, and call-to-actions.
- **✂️ Professional Video Editing**:
  - Automatic cropping to **9:16 vertical aspect ratio**.
  - Intelligent resizing and centering.
  - **Dynamic Subtitles**: High-impact, burned-in captions with customizable templates.
- **⚡ Real-time Feedback**: Socket.io integration provides live status updates (Downloading -> Analyzing -> Rendering).
- **📊 Content Dashboard**: A sleek, modern UI to manage your project history, preview clips, and download final renders.
- **🗄️ Persistent Storage**: Full MongoDB integration for project and metadata management.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Communication**: Socket.io-client & Axios

### Backend
- **Runtime**: Node.js
- **Server**: Express
- **Database**: MongoDB (via Mongoose)
- **Video Processing**: FFmpeg (fluent-ffmpeg) & yt-dlp
- **Real-time**: Socket.io

### AI Integration
- **Google AI**: Gemini 1.5 Pro
- **Groq**: Llama 3 70B
- **OpenAI**: GPT-4o / Whisper

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- FFmpeg installed on your system path

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
```
Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 How it Works

1. **Extraction**: The system downloads the YouTube video and extracts the audio/transcript.
2. **Analysis**: The AI agent analyzes the transcript to find segments with high viral potential based on sentiment, pacing, and content.
3. **Synthesis**: For each selected segment, FFmpeg crops the video to vertical, optimizes quality, and burns in synchronized subtitles.
4. **Delivery**: The final `.mp4` files are served via the dashboard for instant preview and download.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
