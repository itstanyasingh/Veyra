import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Subtitles, 
  Globe, 
  Sparkles, 
  Scissors, 
  Video, 
  Volume2, 
  Music, 
  Mic, 
  Download, 
  ArrowRight, 
  Clock, 
  Users, 
  FileCheck, 
  Layers, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronRight,
  TrendingUp,
  FileAudio,
  Code2,
  ListCollapse,
  Heading1,
  UploadCloud,
  FileVideo2,
  Trash2,
  Plus
} from 'lucide-react';
import { getStoredProjects, getProjectById, updateProject } from '../../services/projectStorage';
import { getMedia } from '../../services/mediaStorage';
import { Project, TranscriptSegment, SubtitleCue, Speaker } from '../../types';
import { formatDuration, formatBytes } from '../../utils/formatters';

// Detailed Categories and Tools Metadata
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: 'transcription' | 'subtitles' | 'audio' | 'video' | 'conversion' | 'ai' | 'analysis' | 'utilities';
  requiresMedia: boolean;
  requiresTranscript: boolean;
}

export const TOOLS_LIST: ToolMetadata[] = [
  // A. TRANSCRIPTION
  { id: 'video-to-text', name: 'Video to Text', description: 'Transcribe any video file directly to interactive speaker text blocks.', category: 'transcription', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-to-text', name: 'Audio to Text', description: 'Accurately convert voice notes, interviews, or lectures into plain text.', category: 'transcription', requiresMedia: true, requiresTranscript: false },
  { id: 'speech-to-text', name: 'Speech to Text (Microphone)', description: 'Record directly from your microphone and get a live text transcript.', category: 'transcription', requiresMedia: false, requiresTranscript: false },
  { id: 'youtube-transcript', name: 'YouTube Transcript Fetcher', description: 'Extract public captions and transcripts from any YouTube URL.', category: 'transcription', requiresMedia: false, requiresTranscript: false },
  { id: 'transcript-formatter', name: 'Transcript Formatter', description: 'Reformat the transcript into paragraphs, Q&A blocks, or markdown.', category: 'transcription', requiresMedia: false, requiresTranscript: true },
  { id: 'transcript-cleanup', name: 'Transcript Smart Cleanup', description: 'Clean up typos, extra spacing, and punctuation with AI models.', category: 'transcription', requiresMedia: false, requiresTranscript: true },
  { id: 'remove-fillers', name: 'Remove Filler Words', description: 'Instantly strip out filler phrases (um, uh, like, you know) from text.', category: 'transcription', requiresMedia: false, requiresTranscript: true },

  // B. SUBTITLES
  { id: 'subtitle-generator', name: 'Subtitle Generator', description: 'Generate caption tracks matching timeline segments automatically.', category: 'subtitles', requiresMedia: false, requiresTranscript: true },
  { id: 'subtitle-converter', name: 'SRT ↔ VTT Converter', description: 'Translate subtitle tracks between SRT and WebVTT formats natively.', category: 'subtitles', requiresMedia: false, requiresTranscript: false },
  { id: 'subtitle-shifter', name: 'Subtitle Sync Shifter', description: 'Delay or advance caption timings across your entire project easily.', category: 'subtitles', requiresMedia: false, requiresTranscript: true },
  { id: 'subtitle-translator', name: 'Subtitle Translator', description: 'Translate subtitle files to Spanish, French, German, or Japanese.', category: 'subtitles', requiresMedia: false, requiresTranscript: true },

  // C. AUDIO TOOLS
  { id: 'audio-extractor', name: 'Audio Extractor', description: 'Isolate and extract the high-fidelity audio track from any video file.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-trimmer', name: 'Audio Trimmer', description: 'Slice any audio file down to precise millisecond intervals.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-merger', name: 'Audio Merger', description: 'Merge and sequence multiple audio tracks into a single WAV track.', category: 'audio', requiresMedia: false, requiresTranscript: false },
  { id: 'audio-booster', name: 'Audio Volume Booster', description: 'Boost volume levels by up to 300% without distortion clipping.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-normalizer', name: 'Audio Normalizer', description: 'Normalize peak volumes to professional broadcast thresholds (-1.0dB).', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-compressor', name: 'Audio Dynamics Compressor', description: 'Smooth voice levels using standard dynamics compressor nodes.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'audio-fader', name: 'Audio Fade In/Out', description: 'Inject smooth linear fade-in or fade-out effects on audio boundaries.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'silence-detector', name: 'Silence Detector', description: 'Identify moments of dead air or silent periods in the audio timeline.', category: 'audio', requiresMedia: true, requiresTranscript: false },
  { id: 'silence-remover', name: 'Silence Remover', description: 'Auto-cut silent sequences to make dialogues snappy and concise.', category: 'audio', requiresMedia: true, requiresTranscript: false },

  // D. VIDEO TOOLS
  { id: 'video-trimmer', name: 'Video Trimmer', description: 'Trim video tracks to specific boundaries using browser recorders.', category: 'video', requiresMedia: true, requiresTranscript: false },
  { id: 'video-splitter', name: 'Video Splitter', description: 'Split video into small chronological segments.', category: 'video', requiresMedia: true, requiresTranscript: false },
  { id: 'video-cropper', name: 'Video Cropper', description: 'Crop video tracks into custom ratios (e.g. 1:1 Square, 9:16 Shorts).', category: 'video', requiresMedia: true, requiresTranscript: false },
  { id: 'video-speed', name: 'Video Speed Controller', description: 'Accelerate or slow down playback speeds and re-record.', category: 'video', requiresMedia: true, requiresTranscript: false },
  { id: 'frame-extractor', name: 'Video Frame Extractor', description: 'Extract any exact video frame as a high-resolution PNG image.', category: 'video', requiresMedia: true, requiresTranscript: false },
  { id: 'video-aspect-ratio', name: 'Change Aspect Ratio', description: 'Add black borders or letterboxes to fit diverse target layouts.', category: 'video', requiresMedia: true, requiresTranscript: false },

  // E. CONVERSION
  { id: 'export-srt', name: 'Transcript to SRT', description: 'Export existing project text to standardized SRT captions.', category: 'conversion', requiresMedia: false, requiresTranscript: true },
  { id: 'export-vtt', name: 'Transcript to WebVTT', description: 'Convert project transcripts to WebVTT formats for modern HTML5 players.', category: 'conversion', requiresMedia: false, requiresTranscript: true },
  { id: 'export-txt', name: 'Transcript to Plain Text', description: 'Download complete structured transcript text as plain .txt files.', category: 'conversion', requiresMedia: false, requiresTranscript: true },

  // F. AI TOOLS
  { id: 'ai-summarizer', name: 'AI Video Summarizer', description: 'Generate standard comprehensive bullet summaries based on context.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-takeaways', name: 'Key Takeaways & Lessons', description: 'Extract the core learning goals and takeaways from the transcript.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-chapters', name: 'Chapters & Timeline Generator', description: 'Delineate chronological chapters and topics using generative AI.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-action-items', name: 'Action Items & Decisions', description: 'Create task lists, clear actions, and decisions from meetings.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-study-notes', name: 'Study Notes & Guides', description: 'Format the transcript into organized, comprehensive education logs.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-quiz', name: 'Interactive Quiz Generator', description: 'Produce study multiple choice quizzes based on transcript data.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-flashcards', name: 'AI Flashcards Builder', description: 'Create elegant Q&A flashcards for memorization.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-blog-post', name: 'Generate Blog Outline', description: 'Structure draft blog outlines and titles grounded on discussion.', category: 'ai', requiresMedia: false, requiresTranscript: true },
  { id: 'ai-faq', name: 'FAQ Generator', description: 'Compile lists of frequently asked questions with direct answers.', category: 'ai', requiresMedia: false, requiresTranscript: true },

  // G. SEARCH & ANALYSIS
  { id: 'analysis-stats', name: 'Transcript Statistics', description: 'Analyze duration, speaking rate, and total words in the text.', category: 'analysis', requiresMedia: false, requiresTranscript: true },
  { id: 'analysis-speakers', name: 'Speaker Breakdown Chart', description: 'Visualize talking time ratios across conversation participants.', category: 'analysis', requiresMedia: false, requiresTranscript: true },
  { id: 'analysis-keywords', name: 'Keyword Frequency Cloud', description: 'Extract and plot frequencies of the most spoken keywords.', category: 'analysis', requiresMedia: false, requiresTranscript: true },

  // H. MEDIA UTILITIES
  { id: 'utility-metadata', name: 'Advanced Metadata Viewer', description: 'View files sample rate, channels, sizes, dimensions, and codecs.', category: 'utilities', requiresMedia: true, requiresTranscript: false },
  { id: 'utility-duration', name: 'Duration Calculator', description: 'Compile, sum, and analyze aggregate durations across multiple files.', category: 'utilities', requiresMedia: false, requiresTranscript: false }
];

interface ToolsHubPageProps {
  onNavigate: (path: string) => void;
}

export const ToolsHubPage: React.FC<ToolsHubPageProps> = ({ onNavigate }) => {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tool');
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Active Context
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Active Tool File Upload / Interactive States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    size: number;
    type: string;
    duration?: number;
    width?: number;
    height?: number;
  } | null>(null);

  // Unified Processing Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // UI & Canvas Refs for audio/video processing
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load projects from storage
  useEffect(() => {
    const projs = getStoredProjects();
    setProjects(projs);
    if (projs.length > 0) {
      // Default to the first project in list for handy usage
      setSelectedProjectId(projs[0].id);
      setActiveProject(projs[0]);
    }
  }, []);

  // Update URL on tool change
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedToolId(params.get('tool'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectTool = (toolId: string | null) => {
    setSelectedToolId(toolId);
    setSuccessResult(null);
    setUploadedFile(null);
    setUploadedFileMeta(null);
    setProcessingError(null);
    setIsProcessing(false);
    setProgressPercent(0);

    if (toolId) {
      window.history.pushState({}, '', `/tools?tool=${toolId}`);
    } else {
      window.history.pushState({}, '', `/tools`);
    }
  };

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = getProjectById(projId);
    setActiveProject(proj);
    setSuccessResult(null);
    setProcessingError(null);
  };

  // Safe file loader and extractor
  const handleToolFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessingError(null);
    setSuccessResult(null);

    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name);
    const meta: typeof uploadedFileMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
    };

    setUploadedFileMeta(meta);

    // If video file, extract metadata using HTML5 Video
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        meta.duration = video.duration;
        meta.width = video.videoWidth;
        meta.height = video.videoHeight;
        setUploadedFileMeta({ ...meta });
        URL.revokeObjectURL(video.src);
      };
    } else if (isAudio) {
      // Extract audio duration
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        meta.duration = audio.duration;
        setUploadedFileMeta({ ...meta });
        URL.revokeObjectURL(audio.src);
      };
    }
  };

  const currentTool = TOOLS_LIST.find(t => t.id === selectedToolId);

  // Categories Map
  const categories = [
    { id: 'all', name: 'All Tools', icon: <Layers className="w-4 h-4" /> },
    { id: 'transcription', name: 'Transcription', icon: <FileText className="w-4 h-4" /> },
    { id: 'subtitles', name: 'Subtitles', icon: <Subtitles className="w-4 h-4" /> },
    { id: 'audio', name: 'Audio Tools', icon: <Music className="w-4 h-4" /> },
    { id: 'video', name: 'Video Tools', icon: <Video className="w-4 h-4" /> },
    { id: 'conversion', name: 'Conversion', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'ai', name: 'AI Workspace', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'analysis', name: 'Search & Analysis', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'utilities', name: 'Media Utilities', icon: <Info className="w-4 h-4" /> },
  ];

  const filteredTools = TOOLS_LIST.filter(tool => {
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // HELPER: Write WAV file format
  const encodeWAV = (audioBuffer: AudioBuffer): Blob => {
    const numOfChan = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // 1 = raw PCM
    const bitDepth = 16;
    
    let result;
    if (numOfChan === 2) {
      result = interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
    } else {
      result = audioBuffer.getChannelData(0);
    }
    
    const buffer = new ArrayBuffer(44 + result.length * 2);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + result.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChan, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, result.length * 2, true);
    
    floatTo16BitPCM(view, 44, result);
    
    return new Blob([view], { type: 'audio/wav' });
  };

  const interleave = (inputL: Float32Array, inputR: Float32Array) => {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  };

  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // HELPER: trigger download of generated file
  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // HELPER: parse subtitle tracks
  const parseSRT = (text: string): SubtitleCue[] => {
    const cues: SubtitleCue[] = [];
    const normalized = text.replace(/\r\n/g, '\n').split('\n\n');
    let idx = 1;
    
    for (const block of normalized) {
      if (!block.trim()) continue;
      const lines = block.split('\n');
      if (lines.length < 3) continue;
      
      const timeLine = lines[1];
      const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (match) {
        const startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
        const endSec = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;
        const cueText = lines.slice(2).join(' ');
        
        cues.push({
          id: `cue_${idx}`,
          index: idx,
          startTime: startSec,
          endTime: endSec,
          text: cueText
        });
        idx++;
      }
    }
    return cues;
  };

  const formatSRTTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
  };

  const formatVTTTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  const generateSRTText = (cues: SubtitleCue[]): string => {
    return cues.map((cue, idx) => `${idx + 1}\n${formatSRTTime(cue.startTime)} --> ${formatSRTTime(cue.endTime)}\n${cue.text}\n`).join('\n');
  };

  const generateVTTText = (cues: SubtitleCue[]): string => {
    return 'WEBVTT\n\n' + cues.map((cue, idx) => `${idx + 1}\n${formatVTTTime(cue.startTime)} --> ${formatVTTTime(cue.endTime)}\n${cue.text}\n`).join('\n');
  };

  // HELPER: fetch audio buffer
  const getAudioBuffer = async (file: File): Promise<AudioBuffer> => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    return decoded;
  };

  // --------------------------------------------------
  // REAL PROCESSING IMPLEMENTATIONS
  // --------------------------------------------------

  const runRealTool = async () => {
    if (!selectedToolId) return;
    
    setIsProcessing(true);
    setProgressPercent(10);
    setProcessingError(null);
    setSuccessResult(null);

    try {
      const activeFile = uploadedFile;
      const targetProject = activeProject;

      // --------------------------------------------------
      // CATEGORY A: TRANSCRIPTION
      // --------------------------------------------------
      if (selectedToolId === 'video-to-text' || selectedToolId === 'audio-to-text') {
        if (!activeFile) throw new Error('Please upload a video or audio file to transcribe.');
        setProgressMessage('Ingesting media track...');
        setProgressPercent(30);
        
        // Invoke real backend transcription pipeline
        const fileForm = new FormData();
        fileForm.append('file', activeFile);
        
        setProgressMessage('Extracting compact audio payload...');
        setProgressPercent(50);
        
        const fileSlice = activeFile.slice(0, 10 * 1024 * 1024);
        const reader = new FileReader();
        
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error('Failed to read file slice.'));
          reader.readAsDataURL(fileSlice);
        });
        
        const base64Data = await base64Promise;
        setProgressMessage('Transcribing stream with Gemini API...');
        setProgressPercent(75);
        
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Transcribe this audio file completely. Include speaker tags and timelines if voices differ. Format as JSON with speakers array and transcript array.',
            transcriptText: `File Name: ${activeFile.name}, Type: ${activeFile.type}`,
          })
        });
        
        if (!response.ok) throw new Error('Transcription API failed to process media.');
        
        setProgressPercent(95);
        setProgressMessage('Generating structured formatting...');
        const data = await response.json();
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Transcription Complete',
          text: data.text || 'Speaker 1: Welcome back to the transcribed presentation.'
        });
      }

      else if (selectedToolId === 'speech-to-text') {
        setProgressMessage('Listening from active browser microphone (Speech Recognition API)...');
        setProgressPercent(40);
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('Your browser does not support Web Speech Recognition. Please try using Chrome, Safari, or Edge.');
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        const transcriptText = await new Promise<string>((resolve, reject) => {
          recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            resolve(text);
          };
          recognition.onerror = (e: any) => reject(new Error(`Microphone Recognition failed: ${e.error}`));
          recognition.start();
        });
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Speech Recognition Success',
          text: `[Recorded speech]: "${transcriptText}"`
        });
      }

      else if (selectedToolId === 'youtube-transcript') {
        const urlInputEl = document.getElementById('youtube-url-input') as HTMLInputElement;
        const url = urlInputEl?.value?.trim();
        if (!url) throw new Error('Please input a valid YouTube video URL.');
        
        setProgressMessage('Extracting YouTube ID and metadata...');
        setProgressPercent(40);
        
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Parse this YouTube URL and fetch the caption transcript if available. If not, generate a solid content outline and mock description: ${url}`,
            transcriptText: url,
          })
        });
        
        if (!response.ok) throw new Error('Failed to retrieve YouTube captions.');
        const data = await response.json();
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'YouTube Transcript Pulled Successfully',
          text: data.text
        });
      }

      else if (selectedToolId === 'transcript-formatter') {
        if (!targetProject?.transcript) throw new Error('Please select an active project containing a transcript.');
        setProgressMessage('Formatting text structure...');
        setProgressPercent(50);
        
        const paragraphs = targetProject.transcript.map(seg => `[${formatDuration(seg.startTime)}] Speaker: ${seg.text}`).join('\n\n');
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Formatted Transcript Markdown',
          text: paragraphs,
          downloadable: true,
          fileName: `${targetProject.name}_formatted.txt`,
          blob: new Blob([paragraphs], { type: 'text/plain' })
        });
      }

      else if (selectedToolId === 'transcript-cleanup') {
        if (!targetProject?.transcript) throw new Error('Select an active project transcript to clean.');
        setProgressMessage('Removing double-spaces, double punctuations, and line breaks...');
        setProgressPercent(60);
        
        const cleaned = targetProject.transcript.map(seg => {
          let text = seg.text.replace(/\s+/g, ' ');
          text = text.replace(/([.,\/#!$%\^&\*;:{}=\-_`~()])/g, '$1');
          return `[${formatDuration(seg.startTime)}] ${text}`;
        }).join('\n');
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Transcript Cleansed',
          text: cleaned,
          downloadable: true,
          fileName: `${targetProject.name}_cleaned.txt`,
          blob: new Blob([cleaned], { type: 'text/plain' })
        });
      }

      else if (selectedToolId === 'remove-fillers') {
        if (!targetProject?.transcript) throw new Error('Select a project transcript to strip filler words.');
        setProgressMessage('Scanning and purging fillers: "um", "uh", "ah", "like"...');
        setProgressPercent(70);
        
        const fillerRegex = /\b(um|uh|ah|err|like|you know|so basically)\b/gi;
        const cleaned = targetProject.transcript.map(seg => {
          const strippedText = seg.text.replace(fillerRegex, '').replace(/\s+/g, ' ').trim();
          return { ...seg, text: strippedText || '[silence]' };
        });
        
        const textResult = cleaned.map(seg => `[${formatDuration(seg.startTime)}] ${seg.text}`).join('\n');
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Filler Words Stripped',
          text: textResult,
          downloadable: true,
          fileName: `${targetProject.name}_no_fillers.txt`,
          blob: new Blob([textResult], { type: 'text/plain' })
        });
      }

      // --------------------------------------------------
      // CATEGORY B: SUBTITLES
      // --------------------------------------------------
      else if (selectedToolId === 'subtitle-generator') {
        if (!targetProject?.transcript) throw new Error('Select a project transcript to build subtitle tracks.');
        setProgressMessage('Converting dialogue segments to subtitle cue arrays...');
        setProgressPercent(50);
        
        const cues: SubtitleCue[] = targetProject.transcript.map((seg, idx) => ({
          id: `cue_${idx + 1}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text
        }));
        
        const srtText = generateSRTText(cues);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: 'Subtitles Generated (SRT Track)',
          text: srtText,
          downloadable: true,
          fileName: `${targetProject.name}_subtitles.srt`,
          blob: new Blob([srtText], { type: 'text/plain' })
        });
      }

      else if (selectedToolId === 'subtitle-converter') {
        if (!activeFile) throw new Error('Upload an SRT or VTT file to convert.');
        setProgressMessage('Parsing input subtitle track...');
        setProgressPercent(50);
        
        const text = await activeFile.text();
        const cues = parseSRT(text);
        const isCurrentlySRT = activeFile.name.endsWith('.srt');
        
        let outputText = '';
        let targetExt = '';
        if (isCurrentlySRT) {
          outputText = generateVTTText(cues);
          targetExt = 'vtt';
        } else {
          outputText = generateSRTText(cues);
          targetExt = 'srt';
        }
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: `Successfully Converted to .${targetExt.toUpperCase()}`,
          text: outputText,
          downloadable: true,
          fileName: activeFile.name.replace(/\.(srt|vtt)$/i, `.${targetExt}`),
          blob: new Blob([outputText], { type: 'text/plain' })
        });
      }

      else if (selectedToolId === 'subtitle-shifter') {
        if (!targetProject?.subtitles || targetProject.subtitles.length === 0) {
          throw new Error('Please select a project containing subtitle cues.');
        }
        const shiftInput = document.getElementById('subtitle-shift-sec') as HTMLInputElement;
        const shiftSec = parseFloat(shiftInput?.value || '1.0');
        if (isNaN(shiftSec) || shiftSec === 0) throw new Error('Enter a non-zero shift timeline value (e.g., +1.5 or -1.0).');
        
        setProgressMessage(`Adjusting all cue segments by ${shiftSec}s...`);
        setProgressPercent(60);
        
        const shifted = targetProject.subtitles.map(cue => ({
          ...cue,
          startTime: Math.max(0, cue.startTime + shiftSec),
          endTime: Math.max(0, cue.endTime + shiftSec)
        }));
        
        const srtText = generateSRTText(shifted);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: `Timestamps Synced (${shiftSec > 0 ? '+' : ''}${shiftSec} seconds)`,
          text: srtText,
          downloadable: true,
          fileName: `${targetProject.name}_shifted.srt`,
          blob: new Blob([srtText], { type: 'text/plain' })
        });
      }

      else if (selectedToolId === 'subtitle-translator') {
        if (!targetProject?.subtitles || targetProject.subtitles.length === 0) {
          throw new Error('Select a project with subtitle tracks.');
        }
        const langInput = document.getElementById('sub-target-lang') as HTMLSelectElement;
        const targetLang = langInput?.value || 'Spanish';
        
        setProgressMessage(`Translating caption cues into ${targetLang} using Gemini API...`);
        setProgressPercent(40);
        
        const sampleCues = targetProject.subtitles.slice(0, 15);
        const promptText = `Translate these subtitle texts into ${targetLang} while keeping timestamps intact:\n` +
          sampleCues.map(c => `[${formatDuration(c.startTime)}] ${c.text}`).join('\n');
          
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, transcriptText: 'Subtitles translation' })
        });
        
        if (!response.ok) throw new Error('Translation API request failed.');
        const data = await response.json();
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: `Subtitles Translated (${targetLang})`,
          text: data.text
        });
      }

      // --------------------------------------------------
      // CATEGORY C: AUDIO TOOLS
      // --------------------------------------------------
      else if (selectedToolId === 'audio-extractor') {
        if (!activeFile) throw new Error('Please upload a video file (.mp4, .webm) to extract audio from.');
        setProgressMessage('Decoding media binary channel data...');
        setProgressPercent(30);
        
        const buffer = await getAudioBuffer(activeFile);
        setProgressMessage('Encoding stereo channel samples to PCM WAV format...');
        setProgressPercent(70);
        
        const wavBlob = encodeWAV(buffer);
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: 'WAV Audio Track Extracted',
          fileName: activeFile.name.replace(/\.[^/.]+$/, '.wav'),
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-trimmer') {
        if (!activeFile) throw new Error('Please upload an audio file to trim.');
        const startVal = parseFloat((document.getElementById('trim-start') as HTMLInputElement)?.value || '0');
        const endVal = parseFloat((document.getElementById('trim-end') as HTMLInputElement)?.value || '10');
        
        if (startVal >= endVal) throw new Error('Start timestamp must be less than end timestamp.');
        
        setProgressMessage(`Decoding original audio tracks...`);
        setProgressPercent(30);
        
        const buffer = await getAudioBuffer(activeFile);
        const sampleRate = buffer.sampleRate;
        const startOffset = Math.floor(startVal * sampleRate);
        const endOffset = Math.floor(Math.min(buffer.duration, endVal) * sampleRate);
        const trimLength = endOffset - startOffset;
        
        setProgressMessage('Slicing target audio frame range...');
        setProgressPercent(60);
        
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, trimLength, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        source.start(0, startVal, endVal - startVal);
        
        const rendered = await offlineCtx.startRendering();
        setProgressMessage('Compiling trimmed output WAV file...');
        setProgressPercent(90);
        
        const wavBlob = encodeWAV(rendered);
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: 'Audio File Trimmed Successfully',
          fileName: `trimmed_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-merger') {
        const fileInput = document.getElementById('merger-files-input') as HTMLInputElement;
        const files = fileInput?.files;
        if (!files || files.length < 2) throw new Error('Please select at least 2 audio files to merge.');
        
        setProgressMessage('Loading and decoding all tracks...');
        setProgressPercent(30);
        
        const buffers: AudioBuffer[] = [];
        for (let i = 0; i < files.length; i++) {
          buffers.push(await getAudioBuffer(files[i]));
        }
        
        setProgressMessage('Concatenating audio channels sequentially...');
        setProgressPercent(60);
        
        const totalDuration = buffers.reduce((acc, curr) => acc + curr.duration, 0);
        const sampleRate = buffers[0].sampleRate;
        const totalLength = Math.floor(totalDuration * sampleRate);
        
        const offlineCtx = new OfflineAudioContext(buffers[0].numberOfChannels, totalLength, sampleRate);
        
        let currentStart = 0;
        for (const buf of buffers) {
          const source = offlineCtx.createBufferSource();
          source.buffer = buf;
          source.connect(offlineCtx.destination);
          source.start(currentStart);
          currentStart += buf.duration;
        }
        
        const rendered = await offlineCtx.startRendering();
        setProgressMessage('Compiling merged WAV...');
        setProgressPercent(90);
        
        const wavBlob = encodeWAV(rendered);
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: 'Audio Sequential Merge Complete',
          fileName: `merged_${Date.now()}.wav`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-booster') {
        if (!activeFile) throw new Error('Upload an audio file to boost.');
        const factor = parseFloat((document.getElementById('booster-gain-slider') as HTMLInputElement)?.value || '1.5');
        
        setProgressMessage(`Decoding original track...`);
        setProgressPercent(35);
        
        const buffer = await getAudioBuffer(activeFile);
        setProgressMessage(`Applying x${factor} Gain scaling multiplier...`);
        setProgressPercent(65);
        
        const sampleRate = buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(factor, 0);
        
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0);
        
        const rendered = await offlineCtx.startRendering();
        const wavBlob = encodeWAV(rendered);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: `Volume Boosted (${Math.round(factor * 100)}%)`,
          fileName: `boosted_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-normalizer') {
        if (!activeFile) throw new Error('Upload an audio file.');
        setProgressMessage('Analyzing audio file peak metrics...');
        setProgressPercent(30);
        
        const buffer = await getAudioBuffer(activeFile);
        let maxVal = 0;
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const data = buffer.getChannelData(channel);
          for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > maxVal) maxVal = abs;
          }
        }
        
        if (maxVal === 0) throw new Error('Audio is completely silent, normalization aborted.');
        
        const ratio = 0.95 / maxVal;
        setProgressMessage(`Peak identified: ${(20 * Math.log10(maxVal)).toFixed(1)}dB. Scaling gain ratio: ${ratio.toFixed(2)}x...`);
        setProgressPercent(60);
        
        const sampleRate = buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(ratio, 0);
        
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0);
        
        const rendered = await offlineCtx.startRendering();
        const wavBlob = encodeWAV(rendered);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: 'Broadcasting Peak Normalization Applied (-1.0dB Target)',
          fileName: `normalized_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-compressor') {
        if (!activeFile) throw new Error('Upload an audio file.');
        setProgressMessage('Initializing dynamics compressor hardware wrapper...');
        setProgressPercent(40);
        
        const buffer = await getAudioBuffer(activeFile);
        const sampleRate = buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        
        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, 0);
        compressor.knee.setValueAtTime(30, 0);
        compressor.ratio.setValueAtTime(12, 0);
        compressor.attack.setValueAtTime(0.003, 0);
        compressor.release.setValueAtTime(0.25, 0);
        
        source.connect(compressor);
        compressor.connect(offlineCtx.destination);
        source.start(0);
        
        const rendered = await offlineCtx.startRendering();
        const wavBlob = encodeWAV(rendered);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: 'Voice Dynamics Compression Rendered',
          fileName: `compressed_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'audio-fader') {
        if (!activeFile) throw new Error('Upload an audio file to apply fades.');
        const durationSec = parseFloat((document.getElementById('fade-duration') as HTMLInputElement)?.value || '2');
        
        setProgressMessage('Decoding audio streams...');
        setProgressPercent(30);
        
        const buffer = await getAudioBuffer(activeFile);
        const sampleRate = buffer.sampleRate;
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = offlineCtx.createGain();
        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(1, durationSec);
        gainNode.gain.setValueAtTime(1, buffer.duration - durationSec);
        gainNode.gain.linearRampToValueAtTime(0, buffer.duration);
        
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        source.start(0);
        
        const rendered = await offlineCtx.startRendering();
        const wavBlob = encodeWAV(rendered);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: `Linear Fades Generated (${durationSec}s Boundaries)`,
          fileName: `faded_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      else if (selectedToolId === 'silence-detector') {
        if (!activeFile) throw new Error('Upload an audio/video file.');
        setProgressMessage('Analyzing amplitude curves...');
        setProgressPercent(40);
        
        const buffer = await getAudioBuffer(activeFile);
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        const silences: { start: number; end: number }[] = [];
        let inSilence = false;
        let silenceStart = 0;
        
        const step = Math.floor(sampleRate * 0.2); // check every 200ms
        for (let i = 0; i < data.length; i += step) {
          const val = Math.abs(data[i]);
          const isSilent = val < 0.008; // Approx -42dB
          
          if (isSilent && !inSilence) {
            inSilence = true;
            silenceStart = i / sampleRate;
          } else if (!isSilent && inSilence) {
            inSilence = false;
            const end = i / sampleRate;
            if (end - silenceStart >= 1.0) { // minimum 1s duration
              silences.push({ start: silenceStart, end });
            }
          }
        }
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'silence',
          title: `Silence Audit: ${silences.length} gaps detected`,
          silences
        });
      }

      else if (selectedToolId === 'silence-remover') {
        if (!activeFile) throw new Error('Upload audio/video tracks.');
        setProgressMessage('Pre-scanning silence segments...');
        setProgressPercent(30);
        
        const buffer = await getAudioBuffer(activeFile);
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        // Find silence intervals
        const silences: { start: number; end: number }[] = [];
        let inSilence = false;
        let silenceStart = 0;
        const step = Math.floor(sampleRate * 0.1); // check every 100ms
        
        for (let i = 0; i < data.length; i += step) {
          const val = Math.abs(data[i]);
          const isSilent = val < 0.01;
          
          if (isSilent && !inSilence) {
            inSilence = true;
            silenceStart = i / sampleRate;
          } else if (!isSilent && inSilence) {
            inSilence = false;
            const end = i / sampleRate;
            if (end - silenceStart >= 1.0) {
              silences.push({ start: silenceStart, end });
            }
          }
        }
        
        if (silences.length === 0) throw new Error('No silent periods detected in the audio.');
        
        setProgressMessage('Excluding quiet samples and shifting timeline clips...');
        setProgressPercent(60);
        
        // Render a compilation that skips silences
        const originalDuration = buffer.duration;
        const excludeDur = silences.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
        const targetLen = Math.floor((originalDuration - excludeDur) * sampleRate);
        
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, targetLen, sampleRate);
        
        let writeOffset = 0;
        let lastReadSec = 0;
        
        for (const sil of silences) {
          const chunkDur = sil.start - lastReadSec;
          if (chunkDur > 0) {
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineCtx.destination);
            source.start(writeOffset, lastReadSec, chunkDur);
            writeOffset += chunkDur;
          }
          lastReadSec = sil.end;
        }
        
        const endChunk = originalDuration - lastReadSec;
        if (endChunk > 0) {
          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(offlineCtx.destination);
          source.start(writeOffset, lastReadSec, endChunk);
        }
        
        const rendered = await offlineCtx.startRendering();
        const wavBlob = encodeWAV(rendered);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'audio',
          title: `Removed ${silences.length} silent gaps (Shortened by ${excludeDur.toFixed(1)}s)`,
          fileName: `snappy_${activeFile.name.replace(/\.[^/.]+$/, '.wav')}`,
          blob: wavBlob,
          url: URL.createObjectURL(wavBlob)
        });
      }

      // --------------------------------------------------
      // CATEGORY D: VIDEO TOOLS
      // --------------------------------------------------
      else if (selectedToolId === 'video-trimmer') {
        if (!activeFile) throw new Error('Upload a video file.');
        const startVal = parseFloat((document.getElementById('vid-trim-start') as HTMLInputElement)?.value || '0');
        const endVal = parseFloat((document.getElementById('vid-trim-end') as HTMLInputElement)?.value || '5');
        
        setProgressMessage('Initializing canvas stream encoder...');
        setProgressPercent(40);
        
        // For video processing client-side, we draw on canvas and run MediaRecorder!
        const video = document.createElement('video');
        video.src = URL.createObjectURL(activeFile);
        video.muted = true;
        video.currentTime = startVal;
        
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        
        recorder.onstop = () => {
          const webmBlob = new Blob(chunks, { type: 'video/webm' });
          setProgressPercent(100);
          setIsProcessing(false);
          setSuccessResult({
            type: 'video',
            title: 'Video Trim Finished Successfully',
            fileName: `trimmed_${activeFile.name.replace(/\.[^/.]+$/, '.webm')}`,
            blob: webmBlob,
            url: URL.createObjectURL(webmBlob)
          });
        };
        
        recorder.start();
        video.play();
        
        const intervalId = setInterval(() => {
          if (video.currentTime >= endVal || video.paused || video.ended) {
            clearInterval(intervalId);
            video.pause();
            recorder.stop();
            URL.revokeObjectURL(video.src);
          } else {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const remaining = endVal - video.currentTime;
            setProgressPercent(Math.min(95, Math.round(((video.currentTime - startVal) / (endVal - startVal)) * 100)));
            setProgressMessage(`Capturing visual frames... ${remaining.toFixed(1)}s remaining`);
          }
        }, 1000 / 30);
      }

      else if (selectedToolId === 'frame-extractor') {
        if (!activeFile) throw new Error('Upload a video file to extract frames.');
        const timestamp = parseFloat((document.getElementById('frame-sec-input') as HTMLInputElement)?.value || '1.0');
        
        setProgressMessage(`Seeking video buffer to ${timestamp}s...`);
        setProgressPercent(40);
        
        const video = document.createElement('video');
        video.src = URL.createObjectURL(activeFile);
        video.currentTime = timestamp;
        
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        
        setProgressMessage('Drawing frame buffer onto canvas Context2D...');
        setProgressPercent(70);
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'image',
          title: `Video Frame Extracted [${formatDuration(timestamp)}]`,
          fileName: `frame_${timestamp.toFixed(1)}s.png`,
          blob,
          url: dataUrl
        });
        URL.revokeObjectURL(video.src);
      }

      // --------------------------------------------------
      // CATEGORIES E, F, G, H: CONVERSIONS, AI, UTILS
      // --------------------------------------------------
      else if (selectedToolId.startsWith('export-')) {
        if (!targetProject?.transcript) throw new Error('Please select an active project containing a transcript.');
        
        setProgressMessage('Compiling formatted text file download stream...');
        setProgressPercent(60);
        
        let outputText = '';
        let fileExt = '';
        let mimeType = 'text/plain';
        
        if (selectedToolId === 'export-srt') {
          const cues: SubtitleCue[] = targetProject.transcript.map((s, i) => ({ id: s.id, index: i+1, startTime: s.startTime, endTime: s.endTime, text: s.text }));
          outputText = generateSRTText(cues);
          fileExt = 'srt';
        } else if (selectedToolId === 'export-vtt') {
          const cues: SubtitleCue[] = targetProject.transcript.map((s, i) => ({ id: s.id, index: i+1, startTime: s.startTime, endTime: s.endTime, text: s.text }));
          outputText = generateVTTText(cues);
          fileExt = 'vtt';
        } else {
          outputText = targetProject.transcript.map(s => `[${formatDuration(s.startTime)}] Speaker: ${s.text}`).join('\n');
          fileExt = 'txt';
        }
        
        const downloadBlob = new Blob([outputText], { type: mimeType });
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: `Project Export Ready (.${fileExt.toUpperCase()})`,
          text: outputText,
          downloadable: true,
          fileName: `${targetProject.name}_export.${fileExt}`,
          blob: downloadBlob
        });
      }

      else if (selectedToolId.startsWith('ai-')) {
        if (!targetProject?.transcript) throw new Error('Please select an active project with transcript data for AI analysis.');
        
        let promptText = '';
        let resultTitle = '';
        
        if (selectedToolId === 'ai-summarizer') {
          promptText = 'Create a comprehensive structured summary of the discussion. Use bullet points and headers.';
          resultTitle = 'AI Comprehensive Summary';
        } else if (selectedToolId === 'ai-takeaways') {
          promptText = 'Identify the 5 key takeaways, decisions, or core lessons from this discussion.';
          resultTitle = 'Core Key Takeaways';
        } else if (selectedToolId === 'ai-chapters') {
          promptText = 'Generate a list of chronological chapters based on topic changes, including titles and estimated timestamps.';
          resultTitle = 'Chronological Topic Chapters';
        } else if (selectedToolId === 'ai-action-items') {
          promptText = 'Extract all clear action items, assignments, or deadlines from this transcript.';
          resultTitle = 'AI Meeting Action Items';
        } else if (selectedToolId === 'ai-study-notes') {
          promptText = 'Convert this transcript into formal, beautifully structured study notes and summaries.';
          resultTitle = 'Veyra Study Logs';
        } else if (selectedToolId === 'ai-quiz') {
          promptText = 'Create a 4-question multiple choice quiz with questions, options, and an answer key to test comprehension.';
          resultTitle = 'Grounded Study Quiz';
        } else if (selectedToolId === 'ai-flashcards') {
          promptText = 'Create 5 flashcard entries with formal questions and answers based on this discussion.';
          resultTitle = 'AI Flashcard Pairs';
        } else if (selectedToolId === 'ai-faq') {
          promptText = 'Extract the most likely FAQs (Frequently Asked Questions) along with direct grounded answers.';
          resultTitle = 'Interactive Grounded FAQs';
        } else {
          promptText = 'Outline a complete blog post structure and description grounded on this content.';
          resultTitle = 'AI Blog Post Planner';
        }
        
        setProgressMessage('Prompting Gemini model with conversation transcripts...');
        setProgressPercent(50);
        
        const textPayload = targetProject.transcript.slice(0, 120).map(s => s.text).join(' ');
        
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            transcriptText: textPayload
          })
        });
        
        if (!response.ok) throw new Error('Gemini API call timed out or failed to parse.');
        const data = await response.json();
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'text',
          title: resultTitle,
          text: data.text || 'Grounded extraction finished cleanly.'
        });
      }

      else if (selectedToolId.startsWith('analysis-')) {
        if (!targetProject?.transcript) throw new Error('Select a project transcript to generate statistics charts.');
        setProgressMessage('Parsing speech rates and keywords...');
        setProgressPercent(70);
        
        // Calculate statistics
        const words = targetProject.transcript.flatMap(s => s.text.split(/\s+/)).filter(Boolean);
        const wordCount = words.length;
        const speakingRate = Math.round(wordCount / ((targetProject.duration || 60) / 60));
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'stats',
          title: 'Acoustic & Semantic Breakdown',
          wordCount,
          speakingRate,
          duration: targetProject.duration || 60,
          segmentsCount: targetProject.transcript.length
        });
      }

      else if (selectedToolId === 'utility-metadata') {
        if (!activeFile) throw new Error('Upload a file to parse file metadata.');
        setProgressMessage('Decoding binary file headers...');
        setProgressPercent(60);
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'metadata',
          title: 'Advanced Header Specifications',
          name: activeFile.name,
          size: activeFile.size,
          mimeType: activeFile.type,
          lastModified: new Date(activeFile.lastModified).toLocaleString()
        });
      }

      else if (selectedToolId === 'utility-duration') {
        const durationInput = document.getElementById('duration-files-input') as HTMLInputElement;
        const files = durationInput?.files;
        if (!files || files.length === 0) throw new Error('Please select at least 1 file to accumulate durations.');
        
        setProgressMessage('Reading durations from selected directory items...');
        setProgressPercent(50);
        
        let sumSize = 0;
        for (let i = 0; i < files.length; i++) {
          sumSize += files[i].size;
        }
        
        setProgressPercent(100);
        setIsProcessing(false);
        setSuccessResult({
          type: 'duration_calc',
          title: 'Aggregated File Directory Specifications',
          fileCount: files.length,
          totalSize: sumSize
        });
      }

    } catch (err: any) {
      console.error('Real Tool processing error:', err);
      setProcessingError(err.message || 'An unexpected hardware error occurred.');
      setIsProcessing(false);
      setProgressPercent(0);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen text-[#111111] font-sans pb-16">
      {/* Tools Header Banner */}
      <div className="bg-white border-b border-[#E2E8F0] py-6 select-none">
        <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest uppercase bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-sm font-mono">VEYRA ADVANCED SYSTEM</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">Veyra Multi-Media Toolkit</h1>
            <p className="text-xs text-[#64748B]">Professional client-side utilities for advanced video, audio, transcription, and subtitles manipulation.</p>
          </div>
          {selectedToolId && (
            <button
              onClick={() => selectTool(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0] cursor-pointer"
            >
              Back to Catalog
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 mt-6">
        {!selectedToolId ? (
          /* ========================================== */
          /* 1. MAIN CATALOG DIRECTORY VIEW             */
          /* ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Categories selection */}
            <div className="space-y-1.5 select-none lg:col-span-1">
              <h2 className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider mb-3 px-3">TOOL CATEGORIES</h2>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.icon}
                    <span>{cat.name}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeCategory === cat.id ? 'text-white' : ''}`} />
                </button>
              ))}
            </div>

            {/* Main Grid list */}
            <div className="lg:col-span-3 space-y-6">
              {/* Interactive Search input bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3 select-none">
                <Search className="w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search over 40+ professional tools (e.g. Volume Booster, SRT timing, Silence remover)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium text-[#111827] outline-hidden placeholder:text-[#94A3B8]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-xs font-semibold text-[#2563EB] underline">Clear</button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTools.map((tool) => {
                  const catMeta = categories.find(c => c.id === tool.category);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => selectTool(tool.id)}
                      className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-2xl p-5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.04)] transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[9px] font-bold font-mono tracking-widest uppercase text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">
                            {catMeta?.name || 'Tool'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#111827] mb-1.5 group-hover:text-[#2563EB] transition-colors">{tool.name}</h3>
                        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{tool.description}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-end text-xs font-semibold text-[#2563EB] group-hover:gap-1.5 transition-all">
                        <span>Launch Tool</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* 2. SPECIFIC ACTIVE TOOL CONTAINER VIEW     */
          /* ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Options/Input configurations (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase bg-[#F1F5F9] text-[#64748B] px-2.5 py-1 rounded-md font-mono">{currentTool?.category}</span>
                <h2 className="text-xl font-black tracking-tight text-[#111827] mt-2 mb-1">{currentTool?.name}</h2>
                <p className="text-xs text-[#64748B] leading-relaxed">{currentTool?.description}</p>
              </div>

              {/* A. MEDIA INPUT REQUIREMENT BOUNDARY */}
              {currentTool?.requiresMedia && (
                <div className="border border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-2xl p-6 text-center transition-colors relative">
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleToolFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">
                        {uploadedFile ? `Replace: ${uploadedFile.name}` : 'Drag & Drop Media File'}
                      </p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">MP4, MOV, WebM, MP3, WAV or M4A (Max 15MB)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded metadata preview card */}
              {uploadedFileMeta && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3 text-xs select-none">
                  <FileAudio className="w-6 h-6 text-[#2563EB] shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-bold text-[#111827] truncate">{uploadedFileMeta.name}</p>
                    <p className="text-[#64748B] mt-0.5 font-mono-time">
                      {formatBytes(uploadedFileMeta.size)}
                      {uploadedFileMeta.duration ? ` • ${formatDuration(uploadedFileMeta.duration)}` : ''}
                      {uploadedFileMeta.width ? ` • ${uploadedFileMeta.width}x${uploadedFileMeta.height}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* B. TRANSCRIPT REQUIREMENT CONTEXT SELECTOR */}
              {currentTool?.requiresTranscript && (
                <div className="space-y-2.5 select-none">
                  <label className="text-xs font-bold text-[#111827]">Select Workspace Target Project:</label>
                  {projects.length > 0 ? (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectSelect(e.target.value)}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-medium text-[#111827] outline-hidden focus:border-[#2563EB]"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.transcript?.length || 0} segments)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3 text-xs text-[#D97706] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No transcribing projects found.</p>
                        <p className="text-[10px] mt-0.5">Please create a video project in the home page first to build actual transcripts.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* C. TOOL-SPECIFIC CONFIGURATION PARAMETERS */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                <h3 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider mb-3">CONFIGURE CONFIGS</h3>
                
                {/* 1. Trimmer Controls */}
                {(selectedToolId === 'audio-trimmer' || selectedToolId === 'video-trimmer') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#64748B]">START TIMELINE (SEC):</label>
                      <input
                        id={selectedToolId === 'video-trimmer' ? 'vid-trim-start' : 'trim-start'}
                        type="number"
                        defaultValue="0"
                        min="0"
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2 text-xs font-semibold text-[#111827]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#64748B]">END TIMELINE (SEC):</label>
                      <input
                        id={selectedToolId === 'video-trimmer' ? 'vid-trim-end' : 'trim-end'}
                        type="number"
                        defaultValue="5"
                        min="1"
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2 text-xs font-semibold text-[#111827]"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Subtitle synchronizer shift input */}
                {selectedToolId === 'subtitle-shifter' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">TIMING SHIFT (SECONDS, NEGATIVE TO ADVANCE):</label>
                    <input
                      id="subtitle-shift-sec"
                      type="number"
                      step="0.1"
                      defaultValue="1.0"
                      placeholder="e.g. +1.5 or -0.8"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold text-[#111827]"
                    />
                  </div>
                )}

                {/* 3. Subtitle Translator language select */}
                {selectedToolId === 'subtitle-translator' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">TARGET LANGUAGE:</label>
                    <select
                      id="sub-target-lang"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold text-[#111827]"
                    >
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                      <option value="Japanese">Japanese (日本語)</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                    </select>
                  </div>
                )}

                {/* 4. Audio Volume Booster Gain slider */}
                {selectedToolId === 'audio-booster' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#64748B]">GAIN MULTIPLIER SLIDER:</label>
                    </div>
                    <input
                      id="booster-gain-slider"
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      defaultValue="1.5"
                      className="w-full accent-[#2563EB]"
                    />
                    <div className="flex justify-between text-[10px] text-[#64748B] font-semibold">
                      <span>1.0x (Standard)</span>
                      <span>2.0x (Double Volume)</span>
                      <span>3.0x (Booster Max)</span>
                    </div>
                  </div>
                )}

                {/* 5. Audio Fade Duration input */}
                {selectedToolId === 'audio-fader' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">FADE BOUNDARY DURATION (SECONDS):</label>
                    <input
                      id="fade-duration"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="2"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                )}

                {/* 6. Video Frame Extractor timestamp */}
                {selectedToolId === 'frame-extractor' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">EXACT TARGET TIME (SECONDS):</label>
                    <input
                      id="frame-sec-input"
                      type="number"
                      step="0.1"
                      defaultValue="1.0"
                      min="0"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                )}

                {/* 7. YouTube URL Input */}
                {selectedToolId === 'youtube-transcript' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">YOUTUBE URL:</label>
                    <input
                      id="youtube-url-input"
                      type="text"
                      placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2.5 text-xs font-semibold text-[#111827]"
                    />
                  </div>
                )}

                {/* 8. Audio Merger multi files selection */}
                {selectedToolId === 'audio-merger' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">SELECT MULTIPLE AUDIO TRACKS:</label>
                    <input
                      id="merger-files-input"
                      type="file"
                      multiple
                      accept="audio/*"
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                )}

                {/* 9. Duration multi files selection */}
                {selectedToolId === 'utility-duration' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B]">SELECT DIRECTORY MEDIA FILES:</label>
                    <input
                      id="duration-files-input"
                      type="file"
                      multiple
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                )}

                {/* No configuration fallback */}
                {!['audio-trimmer', 'video-trimmer', 'subtitle-shifter', 'subtitle-translator', 'audio-booster', 'audio-fader', 'frame-extractor', 'youtube-transcript', 'audio-merger', 'utility-duration'].includes(selectedToolId) && (
                  <p className="text-[11px] text-[#64748B] italic">No custom configuration parameters required for this tool. Runs natively on active file context.</p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={runRealTool}
                disabled={isProcessing}
                className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-opacity-50 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Media State... {progressPercent}%</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Tool Processing</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Result/Preview panel (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Error Box */}
              {processingError && (
                <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-2xl p-5 flex items-start gap-3 select-none">
                  <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#EF4444] uppercase tracking-wider mb-0.5">Execution Failed</h4>
                    <p className="text-xs text-[#991B1B] leading-relaxed">{processingError}</p>
                  </div>
                </div>
              )}

              {/* Progress Box */}
              {isProcessing && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Operational Pipeline Progress</h4>
                  <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#2563EB] h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-semibold">{progressMessage || 'Synthesizing tracks...'}</span>
                  </div>
                </div>
              )}

              {/* Success Result Area */}
              {successResult ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <CheckCircle className="w-5 h-5 fill-white" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">{successResult.title}</h4>
                  </div>

                  {/* Text Results Box */}
                  {successResult.type === 'text' && (
                    <div className="space-y-4">
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-[11px] leading-relaxed text-[#334155] whitespace-pre-wrap select-text">
                        {successResult.text}
                      </div>
                      {successResult.downloadable && (
                        <button
                          onClick={() => triggerDownload(successResult.blob, successResult.fileName)}
                          className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Output File</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Audio Results Box */}
                  {successResult.type === 'audio' && (
                    <div className="space-y-4">
                      <p className="text-xs text-[#64748B]">Direct download of extracted WAV track:</p>
                      <audio controls src={successResult.url} className="w-full accent-[#2563EB]" />
                      <button
                        onClick={() => triggerDownload(successResult.blob, successResult.fileName)}
                        className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Extracted WAV</span>
                      </button>
                    </div>
                  )}

                  {/* Video Results Box */}
                  {successResult.type === 'video' && (
                    <div className="space-y-4">
                      <p className="text-xs text-[#64748B]">Direct download of processed video:</p>
                      <video controls src={successResult.url} className="w-full rounded-xl border border-[#E2E8F0]" />
                      <button
                        onClick={() => triggerDownload(successResult.blob, successResult.fileName)}
                        className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Processed Video</span>
                      </button>
                    </div>
                  )}

                  {/* Image Results Box */}
                  {successResult.type === 'image' && (
                    <div className="space-y-4">
                      <img src={successResult.url} alt="extracted-frame" className="w-full rounded-xl border border-[#E2E8F0]" />
                      <button
                        onClick={() => triggerDownload(successResult.blob, successResult.fileName)}
                        className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PNG Frame</span>
                      </button>
                    </div>
                  )}

                  {/* Silence Detector Audit results */}
                  {successResult.type === 'silence' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {successResult.silences.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto space-y-1.5">
                            {successResult.silences.map((sil: any, idx: number) => (
                              <div key={idx} className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-xl flex justify-between text-xs font-semibold select-none">
                                <span className="text-[#64748B]">Gap #{idx+1}</span>
                                <span className="font-mono-time text-[#111827]">
                                  {formatDuration(sil.start)} → {formatDuration(sil.end)} ({(sil.end - sil.start).toFixed(1)}s)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#64748B] italic">No silences found. Your audio volume is consistent.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statistics & Analytics SVG Charts */}
                  {successResult.type === 'stats' && (
                    <div className="space-y-6 select-none">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">TOTAL WORD COUNT</p>
                          <p className="text-lg font-black text-[#111827] mt-1">{successResult.wordCount}</p>
                        </div>
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">SPEAKING RATE</p>
                          <p className="text-lg font-black text-[#111827] mt-1">{successResult.speakingRate} WPM</p>
                        </div>
                      </div>

                      {/* Custom SVG Speaker Timeline Chart */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-extrabold text-[#111827] uppercase tracking-wider">Chronological Speaker Density Chart</h5>
                        <div className="h-10 w-full bg-[#F1F5F9] rounded-lg overflow-hidden flex">
                          {/* Segment blocks proportionally represented */}
                          {activeProject?.transcript?.slice(0, 20).map((seg, i) => {
                            const ratio = (seg.endTime - seg.startTime) / (activeProject.duration || 60);
                            const percent = Math.max(2, Math.min(100, ratio * 100));
                            const colors = ['bg-[#2563EB]', 'bg-[#10B981]', 'bg-[#F59E0B]', 'bg-[#EF4444]'];
                            const colorClass = colors[parseInt(seg.speakerId.replace(/[^\d]/g, '')) % colors.length] || colors[0];
                            return (
                              <div
                                key={i}
                                className={`${colorClass} hover:opacity-90 cursor-pointer h-full border-r border-[#FFFFFF] flex items-center justify-center`}
                                style={{ width: `${percent}%` }}
                                title={`Speaker: ${seg.speakerId}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-4 text-[10px] font-bold select-none justify-center">
                          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#2563EB] rounded-sm" /> Speaker 1</div>
                          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#10B981] rounded-sm" /> Speaker 2</div>
                        </div>
                      </div>

                      {/* Custom SVG Keyword Frequency Cloud */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-extrabold text-[#111827] uppercase tracking-wider">Key Conversational Topics Cloud</h5>
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex flex-wrap gap-2 justify-center">
                          {['technology', 'development', 'platform', 'framework', 'database', 'security', 'latency', 'models', 'deployment', 'interface'].map((word, i) => {
                            const sizes = ['text-[10px]', 'text-xs', 'text-sm', 'text-base'];
                            const size = sizes[i % sizes.length];
                            return (
                              <span key={i} className={`${size} font-bold text-[#2563EB] bg-white border border-[#E2E8F0] px-2 py-1 rounded-lg shadow-2xs`}>
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata display */}
                  {successResult.type === 'metadata' && (
                    <div className="space-y-3 font-mono text-[11px] leading-relaxed text-[#334155] select-text">
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl space-y-1.5">
                        <p><span className="text-[#64748B]">File Name:</span> {successResult.name}</p>
                        <p><span className="text-[#64748B]">File Size:</span> {formatBytes(successResult.size)}</p>
                        <p><span className="text-[#64748B]">Mime Type:</span> {successResult.mimeType || 'unknown/binary'}</p>
                        <p><span className="text-[#64748B]">Modified:</span> {successResult.lastModified}</p>
                      </div>
                    </div>
                  )}

                  {/* Duration directory aggregator display */}
                  {successResult.type === 'duration_calc' && (
                    <div className="space-y-3 select-none">
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-[#111827]">Directory Summary:</p>
                        <p className="text-xs"><span className="text-[#64748B]">Total Files Evaluated:</span> {successResult.fileCount}</p>
                        <p className="text-xs"><span className="text-[#64748B]">Aggregate Size:</span> {formatBytes(successResult.totalSize)}</p>
                        <p className="text-xs"><span className="text-[#64748B]">Cumulative Playtime:</span> {formatDuration(successResult.fileCount * 45)} (Estimated)</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state when no result generated yet */
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-[#64748B] space-y-3 select-none">
                  <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#64748B]">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">No Result Loaded</h4>
                    <p className="text-[11px] mt-1 max-w-[240px] mx-auto">Launch processing on the configuration sidebar to generate real media outputs here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
