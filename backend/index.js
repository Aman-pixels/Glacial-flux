// Load env vars FIRST — before any require() that reads process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const connectDB = require('./config/db');
const Project = require('./models/Project');
const { createJob } = require('./services/jobQueue');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Ensure temp and output directories exist
const tempDir = path.join(__dirname, 'temp');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Serve statically generated clips so the frontend can download/preview them
app.use('/output', express.static(path.join(__dirname, 'output')));

// Map to store connected clients for real-time tracking
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  connectedClients.set(socket.id, socket);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

// API: Start processing a URL
app.post('/api/process-url', async (req, res) => {
  const { url, socketId, templateId } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

  // Get the socket instance associated with this user's tab
  const socket = connectedClients.get(socketId);
  if (!socket) {
    console.warn('Process initiated without a valid socketId. Progress will not be streamed to client.');
  }

  try {
    // Submit the heavy lifting to the Queue Manager
    const jobId = await createJob(url, socket, templateId);
    
    // Instantly return the assigned jobId so the UI knows we are working!
    res.json({ success: true, jobId });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create processing job.' });
  }
});

// API: Get all projects (history)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({ status: 'completed' }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

server.listen(PORT, () => {
  console.log(`Agent Backend server running on http://localhost:${PORT}`);
});
