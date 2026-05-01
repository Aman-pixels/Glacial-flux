import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Loader2, Download, CheckCircle, Bot, Terminal,
  Home, FolderOpen, LayoutTemplate, SquarePen, Settings, HelpCircle,
  Zap, DownloadCloud, Cpu, Sparkles, Trash2, Play, Pause,
  Plus, Search, Mail, MessageSquare, Shield, Bell, User,
  Sliders, Film, Info, Star, Volume2, X
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io();

// ─── PERSISTENCE (Disabled LocalStorage, now using MongoDB) ──────────────────
// const PROJECTS_KEY = 'glacialflux_projects';
// const loadProjects = () => { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch { return []; } };
// const saveProjects = (p) => localStorage.setItem(PROJECTS_KEY, JSON.stringify(p));

// ─── DESIGN TOKENS (matching new palette) ────────────────────────────────────
const T = {
  bg:       '#F1F7F7',
  surface:  '#FFFFFF',
  s2:       '#F7FAFA',
  sage:     '#D5E6E5',
  teal:     '#BDD1D6',
  tealDeep: '#5D6B6B',
  rose:     '#F7CBCA',
  roseDeep: '#C4918F',
  greige:   '#DDD3C8',
  ink:      '#3A4A4A',
  muted:    '#7A9090',
  subtle:   '#A8BCBC',
};

// ─── SHARED MICRO COMPONENTS ─────────────────────────────────────────────────

// Pill badge
const Pill = ({ children, color = 'teal' }) => {
  const map = {
    teal:  'bg-[#D5E6E5] text-[#5D6B6B] border-[#BDD1D6]',
    rose:  'bg-[#F7CBCA]/40 text-[#C4918F] border-[#F7CBCA]',
    greige:'bg-[#DDD3C8]/40 text-[#7A9090] border-[#DDD3C8]',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${map[color]}`}>
      {children}
    </span>
  );
};

// Sidebar nav button
const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button onClick={onClick}
    className={`w-full flex items-center px-3.5 py-2.5 rounded-2xl transition-all duration-150 group relative mb-0.5
      ${active
        ? 'bg-white shadow-[0_2px_12px_rgba(93,107,107,0.10)] text-[#3A4A4A] font-semibold'
        : 'text-[#7A9090] hover:bg-white/60 hover:text-[#3A4A4A]'}`}>
    <Icon className={`w-[18px] h-[18px] mr-3 flex-shrink-0 transition-colors ${active ? 'text-[#C4918F]' : 'group-hover:text-[#5D6B6B]'}`} />
    <span className="text-[13px]">{label}</span>
    {badge && <span className="ml-auto text-[10px] bg-[#F7CBCA] text-[#C4918F] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
  </button>
);

// Card wrapper
const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick}
    className={`bg-white rounded-3xl border border-[#D5E6E5]/60 shadow-[0_4px_24px_rgba(93,107,107,0.06)] ${className}`}>
    {children}
  </div>
);

// Primary CTA button
const PrimaryBtn = ({ children, onClick, disabled, type = 'button', className = '' }) => (
  <button type={type} onClick={onClick} disabled={disabled}
    className={`flex items-center justify-center bg-[#C4918F] text-white font-semibold rounded-2xl
      hover:bg-[#b07e7c] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
      transition-all duration-150 shadow-[0_4px_14px_rgba(196,145,143,0.35)] ${className}`}>
    {children}
  </button>
);

// Ghost button
const GhostBtn = ({ children, onClick, className = '' }) => (
  <button onClick={onClick}
    className={`flex items-center justify-center bg-white border border-[#D5E6E5] text-[#5D6B6B] font-semibold rounded-2xl
      hover:border-[#BDD1D6] hover:bg-[#F7FAFA] active:scale-[0.98] transition-all duration-150 ${className}`}>
    {children}
  </button>
);

// Section heading
const SectionHead = ({ eyebrow, title, subtitle }) => (
  <div className="mb-8">
    {eyebrow && <p className="text-[10px] font-bold tracking-[0.22em] text-[#A8BCBC] uppercase mb-2">{eyebrow}</p>}
    <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
      className="text-4xl text-[#3A4A4A] leading-tight">{title}</h2>
    {subtitle && <p className="text-[#7A9090] text-sm mt-1.5">{subtitle}</p>}
  </div>
);

// ─── CLIP CARD ────────────────────────────────────────────────────────────────
const ClipCard = ({ clip, idx, onDownload, onDelete, onOpen }) => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: idx * 0.07, duration: 0.3 }}
      className="bg-white rounded-3xl overflow-hidden border border-[#D5E6E5]/60 shadow-[0_4px_24px_rgba(93,107,107,0.07)] flex flex-col group"
    >
      {/* Video */}
      <div className="relative aspect-[9/16] bg-[#1a2020] overflow-hidden">
        <video ref={videoRef} poster={clip.thumbnailUrl}
          className="w-full h-full object-contain" crossOrigin="anonymous"
          onEnded={() => setPlaying(false)}>
          <source src={clip.videoUrl} type="video/mp4" />
        </video>

        {/* Play overlay */}
        <button onClick={togglePlay} aria-label="Play or Pause Video" className="absolute inset-0 flex items-center justify-center">
          <div className={`w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all duration-200
            ${playing ? 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100' : 'opacity-100 scale-100'}`}>
            {playing ? <Pause className="w-5 h-5 text-[#5D6B6B]" /> : <Play className="w-5 h-5 text-[#5D6B6B] ml-1" />}
          </div>
        </button>

        {/* Badges */}
        {idx === 0 && (
          <div className="absolute top-3 left-3 bg-[#F7CBCA] text-[#C4918F] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center">
            🌸 Top Pick
          </div>
        )}
        {clip.virality_score && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#5D6B6B] text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center shadow-sm">
            <Star className="w-3 h-3 mr-1 text-[#C4918F]" /> {clip.virality_score}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-[15px] font-semibold text-[#3A4A4A] mb-1 line-clamp-1 leading-snug group-hover:text-[#C4918F] transition-colors">
          {clip.title}
        </h3>
        <p className="text-xs text-[#7A9090] line-clamp-2 leading-relaxed mb-4">
          {clip.description}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-[#F1F7F7] pt-3">
          <div></div>
          <div className="flex items-center space-x-1.5">
            {onOpen && (
              <button onClick={() => onOpen(clip)} title="Open in Editor" aria-label="Open in Editor"
                className="w-8 h-8 rounded-full border border-[#D5E6E5] flex items-center justify-center text-[#A8BCBC] hover:text-[#5D6B6B] hover:border-[#BDD1D6] hover:bg-[#F7FAFA] transition-all">
                <SquarePen className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(clip)} title="Delete Project" aria-label="Delete Project"
                className="w-8 h-8 rounded-full border border-[#D5E6E5] flex items-center justify-center text-[#A8BCBC] hover:text-red-400 hover:border-red-200 hover:bg-red-50 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => onDownload(clip.videoUrl, clip.title)} title="Download Clip" aria-label="Download Clip"
              className="w-8 h-8 rounded-full bg-[#C4918F] border border-[#C4918F] flex items-center justify-center text-white hover:bg-[#b07e7c] transition-all shadow-[0_2px_8px_rgba(196,145,143,0.3)]">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
const HomeView = ({ onGenerate, processing, logs, results, jobId, progressPercent, error, onReset, onDownload }) => {
  const [url, setUrl] = useState('');
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const handleSubmit = (e) => { e.preventDefault(); if (url.trim()) onGenerate(url.trim()); };

  return (
    <AnimatePresence mode="wait">

      {/* ── IDLE / HERO ── */}
      {!processing && !results && logs.length === 0 && (
        <motion.div key="hero"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          className="flex flex-col items-center"
        >
          {/* Hero text */}
          <div className="text-center max-w-3xl mb-10 mt-6">
            <div className="inline-flex items-center space-x-2 bg-[#F7CBCA]/30 border border-[#F7CBCA] rounded-full px-4 py-1.5 mb-7">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-[#C4918F] uppercase tracking-wider">AI Engine Online · 3 Providers Active</span>
            </div>

            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              className="text-6xl lg:text-7xl text-[#3A4A4A] mb-5 leading-[1.08] tracking-[-0.01em]">
              Turn Long Videos Into{' '}
              <span className="italic text-[#C4918F]">Viral Masterpieces</span>
            </h1>
            <p className="text-lg text-[#7A9090] max-w-xl mx-auto leading-relaxed">
              Our AI curates your longest stories into bite-sized highlights perfectly tailored for TikTok, Reels, and Shorts.
            </p>
          </div>

          {/* URL Input */}
          <form onSubmit={handleSubmit} className="w-full max-w-[680px] relative mb-5 z-20">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Video className="w-4 h-4 text-[#A8BCBC]" />
            </div>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="Paste your YouTube link here…"
              className="w-full pl-12 pr-40 py-4.5 h-[58px] bg-white border border-[#D5E6E5] focus:border-[#BDD1D6] focus:ring-4 focus:ring-[#D5E6E5]/40 rounded-2xl text-[#3A4A4A] placeholder:text-[#A8BCBC] outline-none transition-all text-sm font-medium shadow-[0_4px_24px_rgba(93,107,107,0.08)]"
            />
            <div className="absolute right-2 top-2 bottom-2">
              <PrimaryBtn type="submit" disabled={processing || !url.trim()} className="h-full px-7 text-sm">
                <Zap className="w-4 h-4 mr-2" /> Generate
              </PrimaryBtn>
            </div>
          </form>

          {error && (
            <div className="w-full max-w-[680px] mb-5 bg-red-50 text-red-500 border border-red-100 rounded-2xl px-5 py-3 text-sm text-center">
              {error}
            </div>
          )}

          {/* Workflow Cards */}
          <div className="w-full mt-20">
            <div className="text-center mb-10">
              <p className="text-[10px] font-bold tracking-[0.22em] text-[#A8BCBC] uppercase mb-2">Workflow</p>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                className="text-3xl text-[#3A4A4A]">Mastery in Three Steps</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: DownloadCloud, label: 'Ingest',   color: '#D5E6E5', desc: 'Drop a link. Our engine downloads at max resolution, ensuring every key moment is captured faithfully.' },
                { icon: Cpu,          label: 'Analyze',   color: '#F7CBCA', desc: 'Gemma 4 AI identifies high-engagement moments, analysing topics and pacing for maximum virality.' },
                { icon: Sparkles,     label: 'Polish',    color: '#DDD3C8', desc: 'Smart vertical cropping and rendering deploys your masterpiece with one click.' },
              ].map(({ icon: Icon, label, color, desc }) => (
                <Card key={label} className="p-7 transition-all hover:translate-y-[-4px]">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm" style={{ background: color }}>
                    <Icon className="w-5 h-5 text-[#5D6B6B]" />
                  </div>
                  <h3 className="font-semibold text-[#3A4A4A] mb-2 text-sm">{label}</h3>
                  <p className="text-xs text-[#7A9090] leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── PROCESSING ── */}
      {(processing || (logs.length > 0 && !results)) && (
        <motion.div key="processing"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="w-full"
        >
          <div className="flex items-end justify-between mb-8">
            <SectionHead title="Processing…" subtitle="Glacial Core is analyzing and rendering your clips." />
            <div className="flex items-center space-x-2 bg-white border border-[#D5E6E5] px-3 py-1.5 rounded-full shadow-sm mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-[#5D6B6B] uppercase tracking-wide">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Progress card */}
            <Card className="p-7 flex flex-col justify-between h-52">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-[#A8BCBC] mb-1 uppercase tracking-wider">Render Engine</p>
                  <h3 className="text-4xl font-bold text-[#3A4A4A]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    {progressPercent}%
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: T.sage }}>
                  <Cpu className="w-5 h-5 text-[#5D6B6B] animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#A8BCBC] mb-1.5">
                  <span>Progress</span><span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-[#F1F7F7] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }}
                    className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #BDD1D6, #C4918F)' }} />
                </div>
              </div>
            </Card>

            {/* Log card */}
            <Card className="p-5 flex flex-col h-52">
              <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-[#F1F7F7]">
                <Terminal className="w-4 h-4 text-[#A8BCBC]" />
                <span className="text-[11px] font-mono font-semibold tracking-wider text-[#5D6B6B] uppercase">
                  Event Log {jobId ? `// ${jobId.substring(0, 6)}` : ''}
                </span>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                {logs.map((log, i) => (
                  <div key={i} className={`flex ${log.message.includes('ERROR') ? 'text-red-400' : 'text-[#7A9090]'}`}>
                    <span className="text-[#C4918F]/60 mr-2 w-[56px] flex-shrink-0">[{log.time}]</span>
                    <span className="truncate">{log.message}</span>
                  </div>
                ))}
                {processing && (
                  <div className="flex animate-pulse text-[#7A9090]">
                    <span className="text-[#C4918F]/60 mr-2 w-[56px]">[{new Date().toLocaleTimeString()}]</span>
                    <span>▌</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <GhostBtn onClick={onReset} className="px-5 py-2 text-sm text-red-400 border-red-100 hover:bg-red-50 hover:border-red-200">
            Cancel Job
          </GhostBtn>
        </motion.div>
      )}

      {/* ── RESULTS ── */}
      {results && results.length > 0 && !processing && (
        <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <div className="flex items-end justify-between mb-8">
            <SectionHead eyebrow="Curated Collection" title="Your Shorts are Ready 🌸"
              subtitle={`${results.length} clips generated and saved to My Projects.`} />
            <GhostBtn onClick={onReset} className="px-5 py-2.5 text-sm mb-8">
              <Plus className="w-4 h-4 mr-2" /> New Short
            </GhostBtn>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {results.map((clip, idx) => (
              <ClipCard key={idx} clip={clip} idx={idx} onDownload={onDownload} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── MY PROJECTS VIEW ────────────────────────────────────────────────────────
const ProjectsView = ({ projects, onDownload, onOpenEditor, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const filtered = (projects || [])
    .filter(p => (p.title || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'newest' ? (b.createdAt || 0) - (a.createdAt || 0) : (b.virality_score || 0) - (a.virality_score || 0));

  const handleDelete = (clip) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    onDelete(clip.jobId);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="flex items-end justify-between mb-8">
        <SectionHead eyebrow="Library" title="My Projects"
          subtitle={`${projects?.length || 0} clip${projects?.length !== 1 ? 's' : ''} in your workspace.`} />
        {onRefresh && (
          <GhostBtn onClick={onRefresh} className="px-4 py-2 text-xs mb-8">
            <Loader2 className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </GhostBtn>
        )}
      </div>

      {loading && projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-[#A8BCBC]">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-sm">Fetching projects from cloud...</p>
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 rounded-3xl border-2 border-dashed border-[#D5E6E5]">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: T.sage }}>
            <FolderOpen className="w-7 h-7 text-[#7A9090]" />
          </div>
          <h3 className="text-lg font-semibold text-[#3A4A4A] mb-1">No projects yet</h3>
          <p className="text-sm text-[#7A9090]">Generate your first short from the Home tab.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-3 mb-8">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8BCBC]" />
              <input type="text" placeholder="Search clips…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#D5E6E5] rounded-2xl text-sm text-[#3A4A4A] placeholder:text-[#A8BCBC] outline-none focus:border-[#BDD1D6] transition-all" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-4 py-2.5 bg-white border border-[#D5E6E5] rounded-2xl text-sm text-[#3A4A4A] outline-none focus:border-[#BDD1D6] cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="score">Highest Score</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((clip, idx) => (
              <ClipCard key={idx} clip={clip} idx={idx} onDownload={onDownload} onDelete={handleDelete} onOpen={onOpenEditor} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

// ─── TEMPLATES VIEW ──────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'tiktok-energy', name: 'TikTok Energy',    tag: 'Trending',    badge: 'rose',   bg: 'linear-gradient(135deg,#F7CBCA 0%,#D5E6E5 100%)', desc: 'High-contrast cyan captions with fast-cut rhythm. Perfect for Gen-Z energy.' },
  { id: 'podcast-clean', name: 'Podcast Clean',     tag: 'Educational', badge: 'teal',   bg: 'linear-gradient(135deg,#D5E6E5 0%,#BDD1D6 100%)', desc: 'Minimal white subtitles on dark bg — ideal for interview and commentary.' },
  { id: 'vlog-warm',     name: 'Vlog Warmth',       tag: 'Lifestyle',   badge: 'greige', bg: 'linear-gradient(135deg,#DDD3C8 0%,#F7CBCA 100%)', desc: 'Warm amber captions with soft drop-shadows for travel and lifestyle creators.' },
  { id: 'tech-minimal',  name: 'Tech Minimal',      tag: 'Technical',   badge: 'teal',   bg: 'linear-gradient(135deg,#BDD1D6 0%,#5D6B6B 100%)', desc: 'Monospace font and subtle grey subtitles — the right tone for tutorials.' },
  { id: 'news-bold',     name: 'News Bold',          tag: 'Impact',      badge: 'rose',   bg: 'linear-gradient(135deg,#F7CBCA 0%,#DDD3C8 100%)', desc: 'Large bold captions with strong outline. Designed for maximum readability.' },
  { id: 'asmr-soft',     name: 'ASMR Soft',          tag: 'ASMR',        badge: 'greige', bg: 'linear-gradient(135deg,#F7CBCA/30 0%,#D5E6E5 100%)', desc: 'Pastel pink captions with no outline — for soft, aesthetic, mindful content.' },
];

const TemplatesView = ({ onSelectTemplate, activeTemplate }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
    <SectionHead eyebrow="Style Presets" title="Templates"
      subtitle="Choose a style to apply to your next generation run." />

    {activeTemplate && (
      <div className="mb-7 flex items-center space-x-3 bg-[#F7CBCA]/20 border border-[#F7CBCA] rounded-2xl px-5 py-3">
        <CheckCircle className="w-5 h-5 text-[#C4918F] flex-shrink-0" />
        <span className="text-sm font-semibold text-[#3A4A4A]">
          Active: <span className="text-[#C4918F]">{activeTemplate.name}</span>
        </span>
        <button onClick={() => onSelectTemplate(null)} className="ml-auto text-xs text-[#A8BCBC] hover:text-red-400 transition-colors">
          Clear
        </button>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {TEMPLATES.map((tpl) => {
        const isActive = activeTemplate?.id === tpl.id;
        return (
          <motion.div key={tpl.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
            onClick={() => onSelectTemplate(tpl)}
            className={`bg-white rounded-3xl overflow-hidden border-2 cursor-pointer transition-all shadow-[0_4px_24px_rgba(93,107,107,0.06)]
              ${isActive ? 'border-[#C4918F] shadow-[0_0_0_3px_rgba(196,145,143,0.15)]' : 'border-[#D5E6E5]/60 hover:border-[#BDD1D6]'}`}>
            {/* Preview strip */}
            <div className="h-36 relative flex flex-col items-center justify-center" style={{ background: tpl.bg }}>
              <div className="h-2.5 w-28 rounded-full bg-white/70 mb-2" />
              <div className="h-2 w-20 rounded-full bg-white/40" />
              {isActive && (
                <div className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-[#C4918F]" />
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-semibold text-[#3A4A4A] text-[15px]">{tpl.name}</h3>
                <Pill color={tpl.badge}>{tpl.tag}</Pill>
              </div>
              <p className="text-xs text-[#7A9090] leading-relaxed mb-4">{tpl.desc}</p>
              <button
                className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-all
                  ${isActive
                    ? 'bg-[#C4918F] text-white shadow-[0_4px_12px_rgba(196,145,143,0.3)]'
                    : 'bg-[#F1F7F7] text-[#5D6B6B] hover:bg-[#D5E6E5]'}`}>
                {isActive ? '✓ Applied' : 'Use Template'}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  </motion.div>
);

// ─── EDITOR VIEW ─────────────────────────────────────────────────────────────
const EditorView = ({ editClip, dbProjects, onDownload }) => {
  const [selected, setSelected] = useState(editClip || dbProjects[0] || null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [volume, setVolume] = useState(80);
  const [title, setTitle] = useState('');
  const [captionStyle, setCaptionStyle] = useState('POP OUT');
  const videoRef = useRef(null);

  useEffect(() => { if (editClip) { setSelected(editClip); setTitle(editClip.title || ''); } }, [editClip]);
  useEffect(() => { if (selected) setTitle(selected.title || ''); }, [selected]);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume / 100; }, [volume, selected]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const dur = videoRef.current.duration;
    const curr = videoRef.current.currentTime;
    const startSec = (trimStart / 100) * dur;
    const endSec = (trimEnd / 100) * dur;
    if (curr < startSec || curr > endSec) {
      videoRef.current.currentTime = startSec;
    }
  };

  const captionStyles = ['POP OUT', 'MINIMAL', 'OUTLINE', 'BOXED'];

  if (!selected && projects.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col items-center justify-center py-28">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: T.sage }}>
        <SquarePen className="w-7 h-7 text-[#7A9090]" />
      </div>
      <h3 className="text-lg font-semibold text-[#3A4A4A] mb-1">No clips to edit</h3>
      <p className="text-sm text-[#7A9090]">Generate a short first, then open it in the Editor.</p>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <SectionHead eyebrow="Workspace" title="Editor" subtitle="Preview, trim, and export your clips." />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_240px] gap-5">

        {/* ── Clip List ── */}
        <Card className="p-4 overflow-hidden">
          <p className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-wider mb-3">Generated Clips<br/>
            <span className="text-[#C4918F] uppercase">Editorial Mode</span></p>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {dbProjects.map((clip, i) => (
              <button key={i} onClick={() => setSelected(clip)}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-2xl transition-all text-left
                  ${selected?.jobId === clip.jobId
                    ? 'bg-[#F7CBCA]/20 border border-[#F7CBCA]/60'
                    : 'hover:bg-[#F7FAFA] border border-transparent'}`}>
                <div className="w-9 h-12 bg-[#F1F7F7] rounded-xl flex-shrink-0 overflow-hidden border border-[#D5E6E5]/60">
                  {clip.thumbnailUrl
                    ? <img src={clip.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                    : <Film className="w-4 h-4 m-auto mt-3.5 text-[#A8BCBC]" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#3A4A4A] truncate">{clip.title || `Clip ${i + 1}`}</p>
                  <p className="text-[10px] text-[#A8BCBC] mt-0.5">
                    {clip.virality_score ? `Score ${clip.virality_score}/10` : 'No score'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Preview ── */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full max-w-[260px] aspect-[9/16] bg-[#1a2020] rounded-3xl overflow-hidden border border-[#D5E6E5]/40 shadow-[0_20px_60px_rgba(93,107,107,0.15)] relative">
            {selected ? (
              <video ref={videoRef} src={selected.videoUrl} poster={selected.thumbnailUrl}
                controls className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#A8BCBC]">
                <Film className="w-12 h-12 mb-2" />
                <span className="text-xs">Select a clip</span>
              </div>
            )}
          </div>

          {selected && (
            <div className="w-full max-w-[260px] bg-white border border-[#D5E6E5]/60 rounded-2xl px-4 py-2.5 flex justify-between text-[11px] text-[#A8BCBC] font-medium">
              <span>PREVIEW RESOLUTION: <span className="text-[#5D6B6B]">1080×1920</span></span>
              <span>60 FPS</span>
            </div>
          )}
        </div>

        {/* ── Properties ── */}
        <Card className="p-5 space-y-5">
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-3 mb-2">
              <Info className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
              <p className="text-[10px] text-emerald-700 leading-relaxed font-medium">
                Captions are currently disabled for maximum clarity. Standard 9:16 vertical cropping is active.
              </p>
            </div>

            <div className="border-t border-[#F1F7F7] pt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-widest block mb-1.5">Short Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7FAFA] border border-[#D5E6E5] rounded-xl text-sm text-[#3A4A4A] outline-none focus:border-[#BDD1D6] transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-widest block mb-1.5">Trim — {trimStart}% to {trimEnd}%</label>
                <input type="range" min={0} max={trimEnd - 5} value={trimStart} onChange={e => setTrimStart(+e.target.value)} className="w-full mb-1.5" />
                <input type="range" min={trimStart + 5} max={100} value={trimEnd} onChange={e => setTrimEnd(+e.target.value)} className="w-full" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-widest block mb-1.5">
                  <Volume2 className="inline w-3 h-3 mr-1" />Volume — {volume}%
                </label>
                <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)} className="w-full" />
              </div>
            </div>

            {selected && (
              <PrimaryBtn onClick={() => onDownload(selected.videoUrl, title || selected.title)}
                className="w-full py-3 text-sm mt-2 disabled:bg-slate-200">
                <Download className="w-4 h-4 mr-2" /> Export Short
              </PrimaryBtn>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
const SettingsView = () => {
  const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem('gf_notif') ?? 'true'));
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('gf_dark') ?? 'false'));
  const [quality, setQuality] = useState(() => localStorage.getItem('gf_qual') || 'high');
  const [name, setName] = useState(() => localStorage.getItem('gf_name') || 'Admin');
  const [email, setEmail] = useState(() => localStorage.getItem('gf_email') || 'admin@glacialflux.ai');
  const [saved, setSaved] = useState(false);

  const save = () => { 
    localStorage.setItem('gf_notif', JSON.stringify(notifications));
    localStorage.setItem('gf_dark', JSON.stringify(darkMode));
    localStorage.setItem('gf_qual', quality);
    localStorage.setItem('gf_name', name);
    localStorage.setItem('gf_email', email);
    setSaved(true); setTimeout(() => setSaved(false), 2000); 
  };

  const Toggle = ({ val, set }) => (
    <button onClick={() => set(!val)} aria-label="Toggle setting" aria-checked={val} role="switch"
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${val ? 'bg-[#C4918F]' : 'bg-[#D5E6E5]'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${val ? 'left-6' : 'left-1'}`} />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
      <SectionHead eyebrow="Preferences" title="Settings" />
      <div className="space-y-4">

        <Card className="p-6">
          <h3 className="font-semibold text-[#3A4A4A] flex items-center mb-5 text-sm">
            <User className="w-4 h-4 mr-2 text-[#C4918F]" /> Profile
          </h3>
          <div className="space-y-4">
            {[{ label: 'Display Name', val: name, set: setName, type: 'text' },
              { label: 'Email', val: email, set: setEmail, type: 'email' }].map(f => (
              <div key={f.label}>
                <label className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-widest block mb-1.5">{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7FAFA] border border-[#D5E6E5] rounded-2xl text-sm text-[#3A4A4A] outline-none focus:border-[#BDD1D6] transition-all" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-[#3A4A4A] flex items-center mb-4 text-sm">
            <Sliders className="w-4 h-4 mr-2 text-[#C4918F]" /> Rendering
          </h3>
          <label className="text-[10px] font-bold text-[#A8BCBC] uppercase tracking-widest block mb-1.5">Output Quality</label>
          <select value={quality} onChange={e => setQuality(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#F7FAFA] border border-[#D5E6E5] rounded-2xl text-sm text-[#3A4A4A] outline-none focus:border-[#BDD1D6] cursor-pointer">
            <option value="low">Fast (Lower Quality)</option>
            <option value="medium">Balanced</option>
            <option value="high">High Quality (Recommended)</option>
          </select>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-[#3A4A4A] flex items-center text-sm">
            <Bell className="w-4 h-4 mr-2 text-[#C4918F]" /> Preferences
          </h3>
          {[{ label: 'Push Notifications', desc: 'Alert when jobs complete', val: notifications, set: setNotifications },
            { label: 'Dark Mode', desc: 'Experimental — coming soon', val: darkMode, set: setDarkMode }].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#3A4A4A]">{item.label}</p>
                <p className="text-xs text-[#A8BCBC]">{item.desc}</p>
              </div>
              <Toggle val={item.val} set={item.set} />
            </div>
          ))}
        </Card>

        <PrimaryBtn onClick={save} className="w-full py-3.5 text-sm">
          {saved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</> : 'Save Changes'}
        </PrimaryBtn>
      </div>
    </motion.div>
  );
};

// ─── SUPPORT VIEW ─────────────────────────────────────────────────────────────
const SupportView = () => {
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  const FAQS = [
    { q: 'How long does processing take?', a: 'Usually 2–5 minutes depending on video length and AI provider response times.' },
    { q: 'Which AI providers are used?', a: 'Gemini, Groq, and OpenAI — with automatic failover for maximum uptime.' },
    { q: 'Can I process private videos?', a: 'Only public YouTube videos are supported at this time.' },
    { q: 'Where are output files stored?', a: 'Locally in backend/output, served via the Express static file server.' },
    { q: 'Why did my job fail?', a: 'The most common cause is YouTube bot detection. Try a different link or check backend logs.' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
      <SectionHead eyebrow="Help Center" title="Support" subtitle="Find answers or send us a message." />
      <div className="space-y-4">

        <Card className="p-6">
          <h3 className="font-semibold text-[#3A4A4A] flex items-center mb-5 text-sm">
            <Info className="w-4 h-4 mr-2 text-[#C4918F]" /> FAQ
          </h3>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="border-b border-[#F1F7F7] last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-semibold text-[#3A4A4A] mb-1">{f.q}</p>
                <p className="text-xs text-[#7A9090] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-[#3A4A4A] flex items-center mb-4 text-sm">
            <MessageSquare className="w-4 h-4 mr-2 text-[#C4918F]" /> Send a Message
          </h3>
          <textarea rows={4} value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Describe your issue or question…"
            className="w-full px-4 py-3 bg-[#F7FAFA] border border-[#D5E6E5] rounded-2xl text-sm text-[#3A4A4A] placeholder:text-[#A8BCBC] outline-none focus:border-[#BDD1D6] transition-all resize-none mb-4" />
          <PrimaryBtn onClick={() => { if (msg.trim()) { setSent(true); setMsg(''); setTimeout(() => setSent(false), 3000); } }}
            className="w-full py-3 text-sm">
            {sent ? <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</> : <><Mail className="w-4 h-4 mr-2" /> Send Message</>}
          </PrimaryBtn>
        </Card>

        <div className="flex items-center space-x-3 bg-[#D5E6E5]/30 border border-[#D5E6E5] rounded-2xl px-5 py-4">
          <Shield className="w-5 h-5 text-[#7A9090] flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#3A4A4A]">System Status</p>
            <p className="text-xs text-[#7A9090]">All AI providers online · Backend on port 3000 · Socket.IO connected</p>
          </div>
          <div className="ml-auto w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home');
  const [jobId, setJobId] = useState(null);
  const jobIdRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState(null);
  const [editClip, setEditClip] = useState(null);
  const [dbProjects, setDbProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Sync projects from DB
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const r = await axios.get('/api/projects');
      const allClips = r.data.flatMap(p => 
        (p.clips || []).map(c => ({ 
          ...c, 
          youtubeUrl: p.youtubeUrl, 
          jobId: p.jobId,
          videoTitle: p.videoTitle,
          videoAuthor: p.videoAuthor,
          videoThumbnail: p.videoThumbnail,
          projectStatus: p.status
        }))
      );
      setDbProjects(allClips);

      // SESSION RECOVERY: Check for any in-progress jobs to re-attach
      const activeJob = r.data.find(p => p.status === 'processing' || p.status === 'queued');
      if (activeJob && !jobIdRef.current) {
        console.log('[Recovery] Found active job:', activeJob.jobId);
        setJobId(activeJob.jobId);
        jobIdRef.current = activeJob.jobId;
        setProcessing(true);
        setLogs(activeJob.logs || []);
        const lastLogLine = (activeJob.logs || []).slice(-1)[0];
        if (lastLogLine) setProgress(lastLogLine.percent || 0);
      }
    } catch (err) {
      console.error('Failed to sync projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Socket
  useEffect(() => {
    socket.on('job-progress', d => {
      if (d.jobId !== jobIdRef.current) return;
      setProgress(d.percent);
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), message: d.message }]);
    });
    socket.on('job-complete', d => {
      if (d.jobId !== jobIdRef.current) return;
      setProcessing(false);
      const stamped = d.clips.map(c => ({ ...c, createdAt: Date.now() }));
      setResults(stamped);
      fetchProjects(); // Sync with DB
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), message: '✅ Done! Clips ready.' }]);
    });
    socket.on('job-error', d => {
      if (d.jobId !== jobIdRef.current) return;
      setProcessing(false);
      setError(d.error);
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), message: `❌ ${d.error}` }]);
    });
    return () => { socket.off('job-progress'); socket.off('job-complete'); socket.off('job-error'); };
  }, []);

  const handleGenerate = useCallback(async (url) => {
    setProcessing(true); setError(''); setResults(null); setProgress(0);
    setLogs([{ time: new Date().toLocaleTimeString(), message: 'Initializing Glacial Core…' }]);
    try {
      const r = await axios.post('/api/process-url', { url, socketId: socket.id, templateId: template?.id });
      setJobId(r.data.jobId);
      jobIdRef.current = r.data.jobId;
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), message: `✅ Job locked [${r.data.jobId.substring(0, 8)}]` }]);
    } catch (err) {
      setProcessing(false);
      setError(err.response?.data?.error || err.message);
      setLogs(p => [...p, { time: new Date().toLocaleTimeString(), message: '❌ Connection failed.' }]);
    }
  }, []);

  const handleReset = useCallback(() => {
    setJobId(null); jobIdRef.current = null;
    setProcessing(false); setProgress(0);
    setLogs([]); setResults(null); setError('');
  }, []);

  const handleDownload = useCallback(async (videoUrl, name) => {
    try {
      const r = await fetch(videoUrl);
      const blob = await r.blob();
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${(name || 'clip').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { alert('Download failed.'); }
  }, []);

  const handleDeleteProject = useCallback(async (jid) => {
    try {
      await axios.delete(`/api/projects/${jid}`);
      fetchProjects();
    } catch (err) { alert('Delete failed: ' + err.message); }
  }, [fetchProjects]);

  const openEditor = useCallback((clip) => { setEditClip(clip); setView('editor'); }, []);

  const NAV = [
    { id: 'home',      icon: Home,           label: 'Home' },
    { id: 'projects',  icon: FolderOpen,     label: 'My Projects', badge: dbProjects.length || null },
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'editor',    icon: SquarePen,      label: 'Editor' },
  ];
  const BOTTOM_NAV = [
    { id: 'settings', icon: Settings,   label: 'Settings' },
    { id: 'support',  icon: HelpCircle, label: 'Support' },
  ];
  const TOP_NAV = [
    { id: 'home',     label: 'Dashboard' },
    { id: 'projects', label: 'Library' },
    { id: 'editor',   label: 'Editor' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: T.bg, color: T.ink, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-[220px] flex-shrink-0 hidden lg:flex flex-col justify-between sticky top-0 h-screen z-20 border-r"
        style={{ background: T.sage, borderColor: `${T.teal}80` }}>
        <div className="p-5">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white border" style={{ borderColor: `${T.teal}80` }}>
              <img src="/logo.png" alt="Glacial Flux Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-[15px] leading-tight" style={{ color: T.tealDeep }}>Glacial Flux</h1>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>Editorial Mode</p>
            </div>
          </div>

          {/* Create New */}
          <button onClick={() => { handleReset(); setView('home'); }}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl font-semibold text-sm mb-6 transition-all active:scale-[0.98]"
            style={{ background: T.roseDeep, color: 'white', boxShadow: '0 4px 14px rgba(196,145,143,0.4)' }}>
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>

          {/* Main nav */}
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <NavItem key={n.id} icon={n.icon} label={n.label} active={view === n.id}
                badge={n.badge} onClick={() => setView(n.id)} />
            ))}
          </nav>
        </div>

        <div className="p-5">
          <nav className="space-y-0.5 mb-4">
            {BOTTOM_NAV.map(n => (
              <NavItem key={n.id} icon={n.icon} label={n.label} active={view === n.id} onClick={() => setView(n.id)} />
            ))}
          </nav>
          {/* Status pill */}
          <div className="rounded-2xl p-3.5 border" style={{ background: '#FFFFFF60', borderColor: `${T.teal}80` }}>
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold" style={{ color: T.tealDeep }}>AI Engine Online</span>
            </div>
            <p className="text-[10px]" style={{ color: T.muted }}>Gemini · Groq · OpenAI</p>
          </div>
          {/* Upgrade */}
          <button className="w-full mt-4 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: T.roseDeep, color: 'white', boxShadow: '0 4px 14px rgba(196,145,143,0.3)' }}>
            ⚡ Upgrade to Pro
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        {/* Dreamy background blobs */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]"
            style={{ background: T.rose }} />
          <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
            style={{ background: T.sage }} />
        </div>

        {/* ── Top nav ── */}
        <header className="sticky top-0 z-10 px-8 lg:px-10 py-4 flex items-center justify-between"
          style={{ background: `${T.bg}CC`, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.teal}60` }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-white border" style={{ borderColor: `${T.teal}80` }}>
              <img src="/logo.png" alt="Glacial Flux Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px]" style={{ color: T.tealDeep }}>Glacial Flux</span>
          </div>

          {/* Top page nav */}
          <nav className="hidden lg:flex items-center space-x-6">
            {TOP_NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                className="text-sm font-semibold transition-all pb-0.5"
                style={{
                  color: view === n.id ? T.tealDeep : T.muted,
                  borderBottom: view === n.id ? `2px solid ${T.roseDeep}` : '2px solid transparent'
                }}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            <button onClick={() => setView('settings')} className="text-sm font-medium transition-colors" style={{ color: T.muted }}>
              Settings
            </button>
            <button className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
              style={{ background: T.rose, color: T.roseDeep, border: `1px solid ${T.roseDeep}30` }}>
              Upgrade
            </button>
            <div onClick={() => setView('settings')}
              className="w-9 h-9 rounded-full overflow-hidden cursor-pointer shadow-sm border-2"
              style={{ borderColor: T.rose }}>
              <img src="https://ui-avatars.com/api/?name=AD&background=F7CBCA&color=5D6B6B&bold=true" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 w-full max-w-[1080px] mx-auto px-6 lg:px-10 pt-10 pb-24">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <HomeView key="home" onGenerate={handleGenerate} processing={processing}
                logs={logs} results={results} jobId={jobId} progressPercent={progress}
                error={error} onReset={handleReset} onDownload={handleDownload} />
            )}
            {view === 'projects' && <ProjectsView key="projects" projects={dbProjects} onDownload={handleDownload} onOpenEditor={openEditor} onDelete={handleDeleteProject} loading={loadingProjects} onRefresh={fetchProjects} />}
            {view === 'templates' && (
              <TemplatesView key="templates" onSelectTemplate={setTemplate} activeTemplate={template} />
            )}
            {view === 'editor' && (
              <EditorView key="editor" editClip={editClip} dbProjects={dbProjects} onDownload={handleDownload} />
            )}
            {view === 'settings' && <SettingsView key="settings" />}
            {view === 'support' && <SupportView key="support" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
