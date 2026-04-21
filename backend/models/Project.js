const mongoose = require('mongoose');

const ClipSchema = new mongoose.Schema({
    title: String,
    description: String,
    virality_score: Number,
    start_time: Number,
    end_time: Number,
    videoUrl: String,
    thumbnailUrl: String,
    createdAt: { type: Number, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
    jobId: { type: String, required: true, unique: true },
    youtubeUrl: { type: String, required: true },
    templateId: String,
    videoTitle: String,
    videoAuthor: String,
    videoThumbnail: String,
    status: { 
        type: String, 
        enum: ['queued', 'processing', 'completed', 'failed'], 
        default: 'queued' 
    },
    error: String,
    logs: [{
        time: { type: String, default: () => new Date().toLocaleTimeString() },
        message: String,
        stage: String,
        percent: Number
    }],
    clips: [ClipSchema],
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
