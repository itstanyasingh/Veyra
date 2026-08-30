import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Subtitles, 
  Globe, 
  Sparkles, 
  BookOpen, 
  Play, 
  Edit2, 
  Check, 
  Plus, 
  Split, 
  Merge, 
  Trash2, 
  Download, 
  ArrowRight, 
  Send,
  HelpCircle,
  Copy,
  Clock,
  User,
  RotateCcw,
  X,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Bookmark,
  CheckSquare,
  Tag,
  Hash,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  SlidersHorizontal,
  Filter,
  ArrowLeftRight,
  Undo2,
  Redo2,
  Layers,
  PieChart,
  UserCheck,
  UserPlus,
  MoreVertical,
  Volume2,
  BarChart3,
  History,
} from 'lucide-react';
import { 
  Project, 
  TranscriptSegment, 
  Speaker, 
  SubtitleCue, 
  AIAnalysisTask, 
  AIAnalysisResults,
  AISummaryResult,
  AIKeyPoint,
  AIChapter,
  AIKeyMoment,
  AIActionItem,
  AIQuestion,
  AITopic,
  AIKeyword
} from '../../types';
import { formatDuration } from '../../utils/formatters';
import { generateSRT, generateVTT, triggerFileDownload, sanitizeFileName } from '../../utils/exportUtils';
import { analyzeTranscriptTask, calculateTranscriptHash } from '../../services/aiAnalysisService';
import { TranslationWorkspace } from './TranslationWorkspace';
import { TranscriptSegmentItem } from './TranscriptSegmentItem';
import { SubtitleCueItem } from './SubtitleCueItem';

export function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.000';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
  }
  return `${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
}

export function parseTimeString(str: string): number | null {
  if (!str) return null;
  const cleaned = str.trim().replace(',', '.');
  if (!isNaN(Number(cleaned))) {
    const val = Number(cleaned);
    return val >= 0 ? val : null;
  }
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (!isNaN(mins) && !isNaN(secs) && mins >= 0 && secs >= 0) {
      return mins * 60 + secs;
    }
  } else if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs) && hrs >= 0 && mins >= 0 && secs >= 0) {
      return hrs * 3600 + mins * 60 + secs;
    }
  }
  return null;
}

const HighlightedText: React.FC<{ 
  text: string; 
  query?: string; 
  mode?: 'all' | 'exact' | 'any';
  highlightWords?: string[];
}> = ({ text, query = '', mode = 'all', highlightWords = [] }) => {
  const q = query.trim();
  const wordsToHighlight: string[] = [];

  if (highlightWords && highlightWords.length > 0) {
    wordsToHighlight.push(...highlightWords.filter(Boolean));
  } else if (q) {
    if (mode === 'exact') {
      wordsToHighlight.push(q);
    } else {
      wordsToHighlight.push(...q.split(/\s+/).filter(Boolean));
    }
  }

  if (wordsToHighlight.length === 0) return <>{text}</>;

  const escapedWords = Array.from(new Set(wordsToHighlight))
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (escapedWords.length === 0) return <>{text}</>;

  try {
    const pattern = `(${escapedWords.join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-[#111111] font-semibold px-0.5 rounded-xs">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
};

export function getSpeakerBadgeStyle(speakerId: string) {
  const styles = [
    { bg: 'bg-[#F0F2F5]', text: 'text-[#1E293B]', border: 'border-[#CBD5E1]', dot: 'bg-[#475569]' },
    { bg: 'bg-[#F4F4F5]', text: 'text-[#18181B]', border: 'border-[#D4D4D8]', dot: 'bg-[#52525B]' },
    { bg: 'bg-[#F7F5F0]', text: 'text-[#2D241E]', border: 'border-[#DDD4C8]', dot: 'bg-[#786C5E]' },
    { bg: 'bg-[#F0F5F2]', text: 'text-[#162B25]', border: 'border-[#C8DDD5]', dot: 'bg-[#3D5A53]' },
    { bg: 'bg-[#F5F0F7]', text: 'text-[#2B163B]', border: 'border-[#DEC8DD]', dot: 'bg-[#5C3D5A]' },
    { bg: 'bg-[#F7F0F0]', text: 'text-[#3B1616]', border: 'border-[#DDC8C8]', dot: 'bg-[#5C3D3D]' },
  ];
  let hash = 0;
  for (let i = 0; i < (speakerId || '').length; i++) {
    hash = (hash << 5) - hash + speakerId.charCodeAt(i);
  }
  const idx = Math.abs(hash) % styles.length;
  return styles[idx];
}

interface HistorySnapshot {
  transcript: TranscriptSegment[];
  speakers: Speaker[];
  description: string;
}

interface WorkspaceToolsPanelProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onSearchMatchesChanged?: (timestamps: number[]) => void;
  activeCaptionLanguage?: string;
  setActiveCaptionLanguage?: (lang: string) => void;
}

type TabType = 'transcript' | 'search' | 'subtitles' | 'translate' | 'ai' | 'summary' | 'documents';

interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: number;
  createdAt: string;
}

export const WorkspaceToolsPanel: React.FC<WorkspaceToolsPanelProps> = ({
  project,
  currentTime,
  onSeek,
  onUpdateProject,
  onSearchMatchesChanged,
  activeCaptionLanguage = 'source',
  setActiveCaptionLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);

  // Transcript Editing & Speaker State
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState<string>('');
  const [renamingSpeaker, setRenamingSpeaker] = useState<{ id: string; name: string } | null>(null);
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<'all' | string>('all');
  const [showAllSegmentsOverride, setShowAllSegmentsOverride] = useState<boolean>(false);
  const [showAllSubtitlesOverride, setShowAllSubtitlesOverride] = useState<boolean>(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [reassigningSegment, setReassigningSegment] = useState<TranscriptSegment | null>(null);
  const [mergingSpeakerSource, setMergingSpeakerSource] = useState<string | null>(null);
  const [mergingSpeakerTarget, setMergingSpeakerTarget] = useState<string | null>(null);
  const [newSpeakerNameInput, setNewSpeakerNameInput] = useState('');

  // History Stack for Undo / Redo
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Subtitle Editing State
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editingCueText, setEditingCueText] = useState<string>('');
  const [editingCueStart, setEditingCueStart] = useState<string>('');
  const [editingCueEnd, setEditingCueEnd] = useState<string>('');
  const [cueValidationError, setCueValidationError] = useState<string | null>(null);

  // Enhanced Search State (Phase 18)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'exact' | 'any'>('all');
  const [searchSpeakerFilter, setSearchSpeakerFilter] = useState<'all' | string>('all');
  const [searchChapterFilter, setSearchChapterFilter] = useState<'all' | string>('all');
  const [searchTimeRangeEnabled, setSearchTimeRangeEnabled] = useState(false);
  const [searchTimeStart, setSearchTimeStart] = useState('');
  const [searchTimeEnd, setSearchTimeEnd] = useState('');
  const [searchSortOrder, setSearchSortOrder] = useState<'time' | 'relevance'>('time');
  const [searchLang, setSearchLang] = useState<string>('source');
  const [focusedMatchIndex, setFocusedMatchIndex] = useState<number>(0);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('veyra_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showFindAndReplace, setShowFindAndReplace] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [replaceMatchCase, setReplaceMatchCase] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Semantic / AI Conceptual Search State
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<{
    matches: Array<{ segmentId: string; relevance: number; matchedConcept: string; highlightWords: string[] }>;
    relatedConcepts: string[];
  } | null>(null);
  const [semanticError, setSemanticError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Translation State
  const [targetLang, setTargetLang] = useState('Spanish');
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptSegment[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [showTranslatedView, setShowTranslatedView] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Synchronize translatedSegments state with selected caption language or project translations
  useEffect(() => {
    if (activeCaptionLanguage && activeCaptionLanguage !== 'source') {
      const trans = project.translations?.[activeCaptionLanguage];
      if (trans && Array.isArray(trans)) {
        setTranslatedSegments(trans);
        setTargetLang(activeCaptionLanguage);
        setShowTranslatedView(true);
      } else {
        setTranslatedSegments(null);
        setShowTranslatedView(false);
      }
    } else {
      setTranslatedSegments(null);
      setShowTranslatedView(false);
    }
  }, [activeCaptionLanguage, project.translations]);

  // AI Q&A State
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'init_1',
      sender: 'ai',
      text: `Hello! I'm your VEYRA Video Intelligence Assistant for "${project.name}". Ask me anything about this video or click any suggested question below.`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Summary & AI Intelligence Tools State
  const [activeAITool, setActiveAITool] = useState<AIAnalysisTask>('summary');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState(false);

  // AI Document Generation State
  const [activeDocType, setActiveDocType] = useState<string>('summary');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docCopied, setDocCopied] = useState<boolean>(false);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Validate, clean, and sort transcript segments
  const segments = React.useMemo(() => {
    const raw = project.transcript || [];
    return [...raw]
      .filter((seg) => seg && typeof seg.id === 'string')
      .map((seg) => {
        const startTime = typeof seg.startTime === 'number' ? seg.startTime : parseFloat(seg.startTime as any) || 0;
        const endTime = typeof seg.endTime === 'number' ? seg.endTime : parseFloat(seg.endTime as any) || (startTime + 2);
        return {
          ...seg,
          startTime: Math.max(0, startTime),
          endTime: Math.max(startTime + 0.01, endTime),
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
  }, [project.transcript]);

  const speakers = project.speakers || [];
  const subtitles = project.subtitles || [];
  const summary = project.summary;
  const currentTranscriptHash = React.useMemo(() => calculateTranscriptHash(segments), [segments]);
  const aiAnalysisResults: AIAnalysisResults = project.aiAnalysisResults || {};

  // Derive active subtitles list from project.subtitles or project.transcript
  const activeSubtitlesList: SubtitleCue[] = React.useMemo(() => {
    if (activeCaptionLanguage === 'source') {
      if (project.subtitles && project.subtitles.length > 0) {
        return project.subtitles;
      }
      return segments.map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));
    }
    const trans = project.translations?.[activeCaptionLanguage];
    if (trans && Array.isArray(trans)) {
      return trans.map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));
    }
    if (project.subtitles && project.subtitles.length > 0) {
      return project.subtitles;
    }
    return segments.map((seg, idx) => ({
      id: seg.id || `sub_${idx}`,
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));
  }, [project.subtitles, project.translations, segments, activeCaptionLanguage]);

  const areSubtitlesOutdated = React.useMemo(() => {
    if (activeCaptionLanguage !== 'source') return false;
    if (!project.subtitles || project.subtitles.length === 0) return false;
    if (!project.subtitlesTranscriptHash) return false;
    return project.subtitlesTranscriptHash !== currentTranscriptHash;
  }, [project.subtitles, project.subtitlesTranscriptHash, currentTranscriptHash, activeCaptionLanguage]);

  const handleRegenerateSubtitles = () => {
    const freshSubtitles = segments.map((seg, idx) => ({
      id: seg.id || `sub_${idx}`,
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));
    onUpdateProject({
      subtitles: freshSubtitles,
      subtitlesTranscriptHash: currentTranscriptHash,
      subtitlesEdited: false
    });
  };

  // Save updated subtitle list to project state
  const saveSubtitlesList = (newCues: SubtitleCue[]) => {
    const sorted = [...newCues]
      .sort((a, b) => a.startTime - b.startTime)
      .map((cue, idx) => ({
        ...cue,
        index: idx + 1,
      }));

    if (activeCaptionLanguage === 'source') {
      onUpdateProject({
        subtitles: sorted,
        subtitlesEdited: true,
        subtitlesTranscriptHash: currentTranscriptHash
      });
    } else {
      const asSegments: TranscriptSegment[] = sorted.map((cue) => ({
        id: cue.id,
        speakerId: 'Speaker',
        startTime: cue.startTime,
        endTime: cue.endTime,
        text: cue.text,
      }));
      const updatedTranslations = {
        ...(project.translations || {}),
        [activeCaptionLanguage]: asSegments,
      };
      onUpdateProject({ translations: updatedTranslations });
    }
  };

  // Subtitle Handlers
  const handleStartEditCue = (cue: SubtitleCue) => {
    setEditingCueId(cue.id);
    setEditingCueText(cue.text);
    setEditingCueStart(formatTimecode(cue.startTime));
    setEditingCueEnd(formatTimecode(cue.endTime));
    setCueValidationError(null);
  };

  const handleCancelEditCue = () => {
    setEditingCueId(null);
    setCueValidationError(null);
  };

  const handleSaveEditCue = (cueId: string) => {
    const startSec = parseTimeString(editingCueStart);
    const endSec = parseTimeString(editingCueEnd);

    if (startSec === null || isNaN(startSec)) {
      setCueValidationError('Invalid start time format (e.g. 00:04.5)');
      return;
    }
    if (endSec === null || isNaN(endSec)) {
      setCueValidationError('Invalid end time format (e.g. 00:08.2)');
      return;
    }
    if (startSec < 0) {
      setCueValidationError('Start time cannot be negative');
      return;
    }
    if (endSec <= startSec) {
      setCueValidationError('End time must be greater than start time');
      return;
    }
    if (!editingCueText.trim()) {
      setCueValidationError('Subtitle text cannot be empty');
      return;
    }

    const updated = activeSubtitlesList.map((c) => {
      if (c.id === cueId) {
        return {
          ...c,
          startTime: startSec,
          endTime: endSec,
          text: editingCueText.trim(),
        };
      }
      return c;
    });

    saveSubtitlesList(updated);
    setEditingCueId(null);
    setCueValidationError(null);
  };

  const handleAddSubtitle = () => {
    let newStart = 0;
    if (activeSubtitlesList.length > 0) {
      const lastCue = activeSubtitlesList[activeSubtitlesList.length - 1];
      newStart = Math.round((lastCue.endTime + 0.5) * 100) / 100;
    } else if (currentTime > 0) {
      newStart = Math.round(currentTime * 100) / 100;
    }
    const newEnd = Math.round((newStart + 3.0) * 100) / 100;
    const newCue: SubtitleCue = {
      id: `sub_${Date.now()}`,
      index: activeSubtitlesList.length + 1,
      startTime: newStart,
      endTime: newEnd,
      text: 'New subtitle cue text',
    };

    const updated = [...activeSubtitlesList, newCue];
    saveSubtitlesList(updated);
    handleStartEditCue(newCue);
  };

  const handleDeleteSubtitle = (cueId: string) => {
    const updated = activeSubtitlesList.filter((c) => c.id !== cueId);
    saveSubtitlesList(updated);
    if (editingCueId === cueId) {
      setEditingCueId(null);
    }
  };

  const handleSplitSubtitle = (cue: SubtitleCue) => {
    let mid = cue.startTime + (cue.endTime - cue.startTime) / 2;
    if (currentTime > cue.startTime + 0.2 && currentTime < cue.endTime - 0.2) {
      mid = currentTime;
    }
    mid = Math.round(mid * 1000) / 1000;

    const words = cue.text.trim().split(/\s+/);
    const midIdx = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, midIdx).join(' ');
    const text2 = words.slice(midIdx).join(' ') || '...';

    const cue1: SubtitleCue = {
      ...cue,
      endTime: mid,
      text: text1,
    };
    const cue2: SubtitleCue = {
      id: `sub_${Date.now()}_split`,
      index: cue.index + 1,
      startTime: mid,
      endTime: cue.endTime,
      text: text2,
    };

    const updated: SubtitleCue[] = [];
    for (const c of activeSubtitlesList) {
      if (c.id === cue.id) {
        updated.push(cue1, cue2);
      } else {
        updated.push(c);
      }
    }

    saveSubtitlesList(updated);
  };

  const handleMergeSubtitle = (idx: number) => {
    if (idx >= activeSubtitlesList.length - 1) return;
    const current = activeSubtitlesList[idx];
    const next = activeSubtitlesList[idx + 1];

    const merged: SubtitleCue = {
      ...current,
      endTime: next.endTime,
      text: `${current.text.trim()} ${next.text.trim()}`,
    };

    const updated: SubtitleCue[] = [];
    for (let i = 0; i < activeSubtitlesList.length; i++) {
      if (i === idx) {
        updated.push(merged);
      } else if (i === idx + 1) {
        continue;
      } else {
        updated.push(activeSubtitlesList[i]);
      }
    }

    saveSubtitlesList(updated);
  };

  const speakerMap = React.useMemo(() => {
    return new Map(speakers.map((s) => [s.id, s.name]));
  }, [speakers]);

  // Compute rich, accurate speaker metrics and dialogue distribution
  const speakerStats = React.useMemo(() => {
    const statsMap = new Map<string, {
      id: string;
      name: string;
      totalDuration: number;
      wordCount: number;
      segmentCount: number;
      firstTime: number;
      lastTime: number;
    }>();

    speakers.forEach((spk) => {
      statsMap.set(spk.id, {
        id: spk.id,
        name: spk.name,
        totalDuration: 0,
        wordCount: 0,
        segmentCount: 0,
        firstTime: Infinity,
        lastTime: 0,
      });
    });

    let totalSpokenDuration = 0;
    let totalWordsCount = 0;

    segments.forEach((seg) => {
      const spkId = seg.speakerId || 'spk_1';
      const dur = Math.max(0, seg.endTime - seg.startTime);
      const words = seg.text ? seg.text.trim().split(/\s+/).filter(Boolean).length : 0;

      totalSpokenDuration += dur;
      totalWordsCount += words;

      if (!statsMap.has(spkId)) {
        const spkName = speakerMap.get(spkId) || spkId;
        statsMap.set(spkId, {
          id: spkId,
          name: spkName,
          totalDuration: 0,
          wordCount: 0,
          segmentCount: 0,
          firstTime: Infinity,
          lastTime: 0,
        });
      }

      const item = statsMap.get(spkId)!;
      item.totalDuration += dur;
      item.wordCount += words;
      item.segmentCount += 1;
      if (seg.startTime < item.firstTime) item.firstTime = seg.startTime;
      if (seg.endTime > item.lastTime) item.lastTime = seg.endTime;
    });

    const list = Array.from(statsMap.values()).map((s) => ({
      ...s,
      firstTime: s.firstTime === Infinity ? 0 : s.firstTime,
      durationPercentage: totalSpokenDuration > 0 ? (s.totalDuration / totalSpokenDuration) * 100 : 0,
      wordPercentage: totalWordsCount > 0 ? (s.wordCount / totalWordsCount) * 100 : 0,
    })).sort((a, b) => b.totalDuration - a.totalDuration);

    return {
      list,
      totalSpokenDuration,
      totalWordsCount,
      totalSpeakers: list.length,
    };
  }, [speakers, segments, speakerMap]);

  // Filtered transcript segments for display
  const displayedSegments = React.useMemo(() => {
    if (selectedSpeakerFilter === 'all') return segments;
    return segments.filter((s) => (s.speakerId || 'spk_1') === selectedSpeakerFilter);
  }, [segments, selectedSpeakerFilter]);

  // Current active transcript segment based on currentTime with fast O(log N) binary search
  const activeSegmentIndex = React.useMemo(() => {
    const len = segments.length;
    if (len === 0) return -1;
    
    let low = 0;
    let high = len - 1;
    let bestIndex = -1;
    
    while (low <= high) {
      const mid = (low + high) >> 1;
      const seg = segments[mid];
      if (currentTime >= seg.startTime && currentTime <= seg.endTime) {
        return mid;
      }
      if (currentTime >= seg.startTime) {
        bestIndex = mid; // seg starts before/at currentTime, but ends before it
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return bestIndex;
  }, [segments, currentTime]);

  const activeSegment = segments[activeSegmentIndex];

  const activeSpeakerId = activeSegment?.speakerId;
  const activeSpeakerName = activeSpeakerId ? (speakerMap.get(activeSpeakerId) || activeSpeakerId) : null;

  const lastActiveIndexRef = useRef<number>(-1);

  // Auto-scroll active segment into view ONLY when the active index changes to prevent jittery scrolling
  useEffect(() => {
    if (autoScrollTranscript && activeTab === 'transcript' && activeSegmentRef.current) {
      if (activeSegmentIndex !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = activeSegmentIndex;
        if (activeSegmentIndex !== -1) {
          activeSegmentRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    }
  }, [activeSegmentIndex, autoScrollTranscript, activeTab]);

  // History Recording Helper for Undo / Redo
  const pushHistory = (description: string) => {
    setUndoStack((prev) => [
      ...prev.slice(-30),
      {
        transcript: JSON.parse(JSON.stringify(segments)),
        speakers: JSON.parse(JSON.stringify(speakers)),
        description,
      },
    ]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    setRedoStack((prev) => [
      ...prev,
      {
        transcript: JSON.parse(JSON.stringify(segments)),
        speakers: JSON.parse(JSON.stringify(speakers)),
        description: last.description,
      },
    ]);
    setUndoStack(newUndo);

    onUpdateProject({
      transcript: last.transcript,
      speakers: last.speakers,
      subtitles: last.transcript.map((seg, idx) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      })),
      translations: {},
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    setUndoStack((prev) => [
      ...prev,
      {
        transcript: JSON.parse(JSON.stringify(segments)),
        speakers: JSON.parse(JSON.stringify(speakers)),
        description: next.description,
      },
    ]);
    setRedoStack(newRedo);

    onUpdateProject({
      transcript: next.transcript,
      speakers: next.speakers,
      subtitles: next.transcript.map((seg, idx) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      })),
      translations: {},
    });
  };

  // Keyboard shortcut listener for Undo / Redo (Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z / Cmd/Ctrl + Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isInput) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y' && !isInput) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, segments, speakers]);

  // Reset states when project changes to prevent state leakage & stale requests
  useEffect(() => {
    setAiMessages([
      {
        id: 'init_1',
        sender: 'ai',
        text: `Hello! I'm your VEYRA Video Intelligence Assistant for "${project.name}". Ask me anything about this video or click any suggested question below.`,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTranslatedSegments(null);
    setShowTranslatedView(false);
    setTranslationError(null);
    setAnalysisError(null);
    setIsAiGenerating(false);
    setIsTranslating(false);
    setIsAnalyzing(false);
    setSelectedSpeakerFilter('all');
    setSearchSpeakerFilter('all');
    setShowAllSegmentsOverride(false);
    setShowAllSubtitlesOverride(false);
  }, [project.name, project.mediaUrl]);

  // Available chapters in project (Phase 18)
  const availableChapters = React.useMemo(() => {
    if (project.summary?.chapters && Array.isArray(project.summary.chapters) && project.summary.chapters.length > 0) {
      return project.summary.chapters;
    }
    if (project.aiAnalysisResults?.chapters && Array.isArray(project.aiAnalysisResults.chapters) && project.aiAnalysisResults.chapters.length > 0) {
      return project.aiAnalysisResults.chapters;
    }
    return [];
  }, [project.summary?.chapters, project.aiAnalysisResults?.chapters]);

  const getChapterForTime = useCallback((time: number): string | undefined => {
    const ch = availableChapters.find((c) => time >= c.startTime && time <= c.endTime);
    return ch?.title;
  }, [availableChapters]);

  const addSearchHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('veyra_search_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('veyra_search_history');
    } catch {}
  }, []);

  // Real Semantic / Conceptual Search Execution via Server-Side Gemini
  const handleExecuteSemanticSearch = async (queryText?: string) => {
    const q = (queryText || searchQuery).trim();
    if (!q) return;

    setIsSearchingSemantic(true);
    setSemanticError(null);
    try {
      const response = await fetch('/api/ai/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          query: q,
          projectName: project.name,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Semantic search failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      setSemanticResults(data);
      setIsSemanticMode(true);
      addSearchHistory(q);
    } catch (err: any) {
      console.error('Semantic search error:', err);
      setSemanticError(err.message || 'Semantic search unavailable. Switching to keyword search.');
      setIsSemanticMode(false);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  // Search matches with multi-mode intelligence, chapter/speaker/timerange filtering, and relevance ranking
  const searchResults = React.useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return [];

    // Semantic Mode matches (if active and results present)
    if (isSemanticMode && semanticResults && semanticResults.matches && semanticResults.matches.length > 0) {
      const semanticMap = new Map<string, { segmentId: string; relevance: number; matchedConcept: string; highlightWords: string[] }>(
        semanticResults.matches.map((m) => [m.segmentId, m])
      );
      const list: Array<{
        segment: TranscriptSegment;
        speakerName: string;
        score: number;
        chapterTitle?: string;
        matchedConcept?: string;
        semanticRelevance?: number;
        highlightWords?: string[];
      }> = [];

      segments.forEach((seg) => {
        const sem = semanticMap.get(seg.id);
        if (!sem) return;

        // Speaker filter
        if (searchSpeakerFilter !== 'all' && (seg.speakerId || 'spk_1') !== searchSpeakerFilter) {
          return;
        }

        // Chapter filter
        if (searchChapterFilter !== 'all') {
          const ch = availableChapters.find((c) => c.title === searchChapterFilter);
          if (ch && (seg.endTime < ch.startTime || seg.startTime > ch.endTime)) {
            return;
          }
        }

        // Time Range filter
        if (searchTimeRangeEnabled) {
          const startSec = searchTimeStart ? parseTimeString(searchTimeStart) : 0;
          const endSec = searchTimeEnd ? parseTimeString(searchTimeEnd) : Infinity;
          if (startSec !== null && endSec !== null) {
            if (seg.endTime < startSec || seg.startTime > endSec) return;
          }
        }

        const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
        list.push({
          segment: seg,
          speakerName: spkName,
          score: sem.relevance,
          chapterTitle: getChapterForTime(seg.startTime),
          matchedConcept: sem.matchedConcept,
          semanticRelevance: sem.relevance,
          highlightWords: sem.highlightWords,
        });
      });

      if (searchSortOrder === 'time') {
        return list.sort((a, b) => a.segment.startTime - b.segment.startTime);
      }
      return list.sort((a, b) => (b.semanticRelevance || 0) - (a.semanticRelevance || 0));
    }

    // Standard Multi-mode Search (All, Exact, Any)
    const qLower = rawQuery.toLowerCase();
    const queryTokens = qLower.split(/\s+/).filter(Boolean);

    let targetSegs = (searchLang !== 'source' && project.translations?.[searchLang])
      ? project.translations[searchLang]
      : segments;

    // Filter by speaker
    if (searchSpeakerFilter !== 'all') {
      targetSegs = targetSegs.filter((s) => (s.speakerId || 'spk_1') === searchSpeakerFilter);
    }

    // Filter by chapter
    if (searchChapterFilter !== 'all') {
      const ch = availableChapters.find((c) => c.title === searchChapterFilter);
      if (ch) {
        targetSegs = targetSegs.filter((s) => s.startTime <= ch.endTime && s.endTime >= ch.startTime);
      }
    }

    // Filter by time range
    if (searchTimeRangeEnabled) {
      const startSec = searchTimeStart ? parseTimeString(searchTimeStart) : 0;
      const endSec = searchTimeEnd ? parseTimeString(searchTimeEnd) : Infinity;
      if (startSec !== null && endSec !== null) {
        targetSegs = targetSegs.filter((s) => s.startTime <= endSec && s.endTime >= startSec);
      }
    }

    const matches: Array<{
      segment: TranscriptSegment;
      speakerName: string;
      score: number;
      chapterTitle?: string;
      matchedConcept?: string;
      semanticRelevance?: number;
      highlightWords?: string[];
    }> = [];

    targetSegs.forEach((seg) => {
      const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      const textLower = seg.text.toLowerCase();
      const spkLower = spkName.toLowerCase();

      let isMatch = false;
      let score = 0;

      if (searchMode === 'exact') {
        if (textLower.includes(qLower)) {
          isMatch = true;
          score += 150;
        } else if (spkLower.includes(qLower)) {
          isMatch = true;
          score += 80;
        }
      } else if (searchMode === 'all') {
        const allInText = queryTokens.every((token) => textLower.includes(token) || spkLower.includes(token));
        if (allInText) {
          isMatch = true;
          if (textLower.includes(qLower)) {
            score += 120; // exact phrase bonus
          } else {
            score += 60;
          }
          // frequency bonus
          queryTokens.forEach((tok) => {
            const regex = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const count = (textLower.match(regex) || []).length;
            score += count * 10;
          });
        }
      } else {
        // 'any' mode
        const matchedTokens = queryTokens.filter((token) => textLower.includes(token) || spkLower.includes(token));
        if (matchedTokens.length > 0) {
          isMatch = true;
          score += matchedTokens.length * 20;
          if (textLower.includes(qLower)) score += 50;
        }
      }

      if (isMatch) {
        matches.push({
          segment: seg,
          speakerName: spkName,
          score,
          chapterTitle: getChapterForTime(seg.startTime),
        });
      }
    });

    if (searchSortOrder === 'time') {
      return matches.sort((a, b) => a.segment.startTime - b.segment.startTime);
    }
    return matches.sort((a, b) => b.score - a.score || a.segment.startTime - b.segment.startTime);
  }, [
    searchQuery,
    searchMode,
    isSemanticMode,
    semanticResults,
    segments,
    project.translations,
    searchLang,
    speakerMap,
    searchSpeakerFilter,
    searchChapterFilter,
    availableChapters,
    getChapterForTime,
    searchTimeRangeEnabled,
    searchTimeStart,
    searchTimeEnd,
    searchSortOrder,
  ]);

  // Reset focused match index when search query, filter, or target language changes
  useEffect(() => {
    setFocusedMatchIndex(0);
  }, [searchQuery, searchMode, searchLang, searchSpeakerFilter, searchChapterFilter, searchTimeRangeEnabled, searchSortOrder, isSemanticMode]);

  // Optimized sliding window of segments to render for long-video stability
  const renderedSegmentsList = React.useMemo(() => {
    if (showAllSegmentsOverride || displayedSegments.length <= 150) {
      return displayedSegments;
    }

    // Identify index of active segment within displayedSegments
    const activeIndexInDisplayed = displayedSegments.findIndex(
      (s) => s.id === activeSegment?.id
    );

    // Track matching search result IDs to always keep them visible
    const searchMatchIds = new Set<string>();
    if (searchQuery.trim()) {
      searchResults.forEach((r) => {
        if (r.segment.id) searchMatchIds.add(r.segment.id);
      });
    }

    const center = activeIndexInDisplayed !== -1 ? activeIndexInDisplayed : 0;
    const windowSize = 80;
    const half = Math.floor(windowSize / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(displayedSegments.length, center + half);

    return displayedSegments.filter((seg, idx) => {
      // Keep segment if it lies within the sliding window
      if (idx >= start && idx < end) return true;
      // Keep segment if it is an active search match
      if (searchMatchIds.has(seg.id)) return true;
      return false;
    });
  }, [displayedSegments, activeSegment?.id, searchQuery, searchResults, showAllSegmentsOverride]);

  // Optimized sliding window of subtitle cues to render for long-video stability
  const renderedSubtitlesList = React.useMemo(() => {
    if (showAllSubtitlesOverride || activeSubtitlesList.length <= 150) {
      return activeSubtitlesList;
    }

    // Find index of the currently active subtitle cue
    const activeCueIndex = activeSubtitlesList.findIndex(
      (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
    );

    const center = activeCueIndex !== -1 ? activeCueIndex : 0;
    const windowSize = 80;
    const half = Math.floor(windowSize / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(activeSubtitlesList.length, center + half);

    return activeSubtitlesList.filter((_, idx) => {
      // Keep if within window
      if (idx >= start && idx < end) return true;
      return false;
    });
  }, [activeSubtitlesList, currentTime, showAllSubtitlesOverride]);

  // Handle Search Result Next / Prev Navigation
  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (focusedMatchIndex + 1) % searchResults.length;
    setFocusedMatchIndex(nextIdx);
    const targetResult = searchResults[nextIdx];
    if (targetResult && targetResult.segment) {
      onSeek(targetResult.segment.startTime);
    }
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (focusedMatchIndex - 1 + searchResults.length) % searchResults.length;
    setFocusedMatchIndex(prevIdx);
    const targetResult = searchResults[prevIdx];
    if (targetResult && targetResult.segment) {
      onSeek(targetResult.segment.startTime);
    }
  };

  // Keyboard shortcut (Cmd/Ctrl + F) to switch to Search tab and focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput || activeTab === 'search') {
          e.preventDefault();
          setActiveTab('search');
          setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }, 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Update parent search match timestamps for timeline pins
  const prevMatchesStrRef = useRef<string>('');
  const onSearchMatchesChangedRef = useRef(onSearchMatchesChanged);
  useEffect(() => {
    onSearchMatchesChangedRef.current = onSearchMatchesChanged;
  }, [onSearchMatchesChanged]);

  useEffect(() => {
    if (onSearchMatchesChangedRef.current) {
      const tsList = searchQuery.trim() ? searchResults.map((r) => r.segment.startTime) : [];
      const key = tsList.join(',');
      if (prevMatchesStrRef.current !== key) {
        prevMatchesStrRef.current = key;
        onSearchMatchesChangedRef.current(tsList);
      }
    }
  }, [searchQuery, searchResults]);

  // Find & Replace Single Match in Current Focused Segment
  const handleReplaceCurrentMatch = () => {
    if (!searchQuery || searchResults.length === 0) return;
    const currentResult = searchResults[focusedMatchIndex];
    if (!currentResult) return;

    const segId = currentResult.segment.id;
    const originalText = currentResult.segment.text;

    let newText = originalText;
    if (replaceMatchCase) {
      newText = originalText.replace(searchQuery, replaceQuery);
    } else {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      newText = originalText.replace(regex, replaceQuery);
    }

    if (newText === originalText) return;

    pushHistory(`Replace "${searchQuery}" with "${replaceQuery}" in segment`);

    const updatedSegments = segments.map((s) => (s.id === segId ? { ...s, text: newText } : s));
    const updatedSubtitles = (project.subtitles || []).map((sub) => {
      if (sub.id === `sub_${segId.replace('seg_', '')}` || Math.abs(sub.startTime - currentResult.segment.startTime) < 0.2) {
        return { ...sub, text: newText };
      }
      return sub;
    });

    onUpdateProject({
      transcript: updatedSegments,
      subtitles: updatedSubtitles,
      updatedAt: new Date().toISOString(),
    });
  };

  // Find & Replace All Occurrences across the Transcript
  const handleReplaceAllMatches = () => {
    if (!searchQuery.trim()) return;

    let totalReplacements = 0;
    const regex = new RegExp(
      searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      replaceMatchCase ? 'g' : 'gi'
    );

    const updatedSegments = segments.map((s) => {
      const matchCount = (s.text.match(regex) || []).length;
      if (matchCount > 0) {
        totalReplacements += matchCount;
        return {
          ...s,
          text: s.text.replace(regex, replaceQuery),
        };
      }
      return s;
    });

    if (totalReplacements === 0) return;

    pushHistory(`Replace all ${totalReplacements} occurrences of "${searchQuery}" with "${replaceQuery}"`);

    const updatedSubtitles = (project.subtitles || []).map((sub) => {
      const matchCount = (sub.text.match(regex) || []).length;
      if (matchCount > 0) {
        return {
          ...sub,
          text: sub.text.replace(regex, replaceQuery),
        };
      }
      return sub;
    });

    onUpdateProject({
      transcript: updatedSegments,
      subtitles: updatedSubtitles,
      updatedAt: new Date().toISOString(),
    });
  };

  // Export Filtered Search Results as TXT / CSV / JSON
  const handleExportSearchResults = (format: 'txt' | 'csv' | 'json') => {
    if (searchResults.length === 0) return;
    const projName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${projName}_search_results_${Date.now()}.${format}`;

    let content = '';
    let mimeType = 'text/plain';

    if (format === 'txt') {
      const header = `SEARCH RESULTS FOR: "${searchQuery}"\nProject: ${project.name}\nTotal Matches: ${searchResults.length}\nDate: ${new Date().toLocaleString()}\n${'='.repeat(60)}\n\n`;
      const body = searchResults.map((r, i) => {
        const timeStr = formatDuration(r.segment.startTime);
        const chStr = r.chapterTitle ? ` [Chapter: ${r.chapterTitle}]` : '';
        return `[${i + 1}] ${timeStr} | ${r.speakerName}${chStr}\n${r.segment.text}\n`;
      }).join('\n');
      content = header + body;
    } else if (format === 'csv') {
      mimeType = 'text/csv';
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      const header = 'Index,Timestamp,Seconds,Speaker,Chapter,Text\n';
      const rows = searchResults.map((r, i) => {
        return [
          i + 1,
          escapeCsv(formatDuration(r.segment.startTime)),
          r.segment.startTime.toFixed(2),
          escapeCsv(r.speakerName),
          escapeCsv(r.chapterTitle || ''),
          escapeCsv(r.segment.text),
        ].join(',');
      }).join('\n');
      content = header + rows;
    } else if (format === 'json') {
      mimeType = 'application/json';
      content = JSON.stringify(
        {
          query: searchQuery,
          mode: searchMode,
          totalMatches: searchResults.length,
          project: project.name,
          exportedAt: new Date().toISOString(),
          matches: searchResults.map((r, i) => ({
            index: i + 1,
            segmentId: r.segment.id,
            startTime: r.segment.startTime,
            endTime: r.segment.endTime,
            timeFormatted: formatDuration(r.segment.startTime),
            speaker: r.speakerName,
            chapter: r.chapterTitle || null,
            text: r.segment.text,
            score: r.score,
            concept: r.matchedConcept || null,
          })),
        },
        null,
        2
      );
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Analyze Search Results with AI Assistant
  const handleAnalyzeSearchResultsWithAi = () => {
    if (searchResults.length === 0) return;
    const topMatches = searchResults.slice(0, 15);
    const excerpts = topMatches
      .map((r) => `[${formatDuration(r.segment.startTime)}] ${r.speakerName}: "${r.segment.text}"`)
      .join('\n');
    const promptMessage = `Please analyze and synthesize the following ${searchResults.length} occurrences of "${searchQuery}" in the transcript:\n\n${excerpts}\n\nWhat are the main insights, decisions, and takeaways discussed regarding "${searchQuery}"?`;

    setActiveTab('ai');
    setTimeout(() => {
      handleSendAiPrompt(promptMessage);
    }, 100);
  };

  // Handle Speaker Renaming (replaces across all segments & project state)
  const handleSaveSpeakerName = () => {
    if (!renamingSpeaker) return;
    const newName = renamingSpeaker.name.trim();
    if (!newName) {
      setRenamingSpeaker(null);
      return;
    }

    pushHistory(`Rename speaker to ${newName}`);

    // If speaker already in project.speakers, update it; otherwise add it
    let updatedSpeakers = [...speakers];
    const existingIdx = updatedSpeakers.findIndex((s) => s.id === renamingSpeaker.id);
    if (existingIdx >= 0) {
      updatedSpeakers[existingIdx] = { ...updatedSpeakers[existingIdx], name: newName };
    } else {
      updatedSpeakers.push({ id: renamingSpeaker.id, name: newName });
    }

    onUpdateProject({ speakers: updatedSpeakers });
    setRenamingSpeaker(null);
  };

  // Reassign a single segment's speaker
  const handleReassignSegmentSpeaker = (segmentId: string, targetSpeakerId: string, customName?: string) => {
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;

    pushHistory('Reassign segment speaker');
    let updatedSpeakers = [...speakers];
    let finalSpeakerId = targetSpeakerId;

    if (targetSpeakerId === '__new__' && customName && customName.trim()) {
      finalSpeakerId = `spk_${Date.now()}`;
      updatedSpeakers.push({ id: finalSpeakerId, name: customName.trim() });
    }

    const updatedTranscript = segments.map((s) =>
      s.id === segmentId ? { ...s, speakerId: finalSpeakerId } : s
    );

    onUpdateProject({
      transcript: updatedTranscript,
      speakers: updatedSpeakers,
    });
    setReassigningSegment(null);
  };

  // Merge Speaker: Reassigns all instances of sourceId to targetId and removes sourceId
  const handleMergeSpeakers = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceName = speakerMap.get(sourceId) || sourceId;
    const targetName = speakerMap.get(targetId) || targetId;

    pushHistory(`Merge "${sourceName}" into "${targetName}"`);

    const updatedTranscript = segments.map((s) =>
      (s.speakerId || 'spk_1') === sourceId ? { ...s, speakerId: targetId } : s
    );

    const updatedSpeakers = speakers.filter((s) => s.id !== sourceId);

    if (selectedSpeakerFilter === sourceId) {
      setSelectedSpeakerFilter(targetId);
    }
    if (searchSpeakerFilter === sourceId) {
      setSearchSpeakerFilter(targetId);
    }

    onUpdateProject({
      transcript: updatedTranscript,
      speakers: updatedSpeakers,
    });
    setMergingSpeakerSource(null);
    setMergingSpeakerTarget(null);
  };

  // Add new speaker to project list
  const handleAddNewSpeaker = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    pushHistory(`Add speaker "${trimmed}"`);
    const newId = `spk_${Date.now()}`;
    const updated = [...speakers, { id: newId, name: trimmed }];
    onUpdateProject({ speakers: updated });
    setNewSpeakerNameInput('');
  };

  // Centralized Transcript Edit Sync Helper
  const handleTranscriptChange = (newTranscript: TranscriptSegment[], changeDesc = 'Edit transcript') => {
    pushHistory(changeDesc);

    // Synchronize subtitle cues
    const newSubtitles = newTranscript.map((seg, idx) => ({
      id: `sub_${idx + 1}`,
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));

    // Save and clear stale translations
    onUpdateProject({
      transcript: newTranscript,
      subtitles: newSubtitles,
      translations: {}, // Invalidate all translations if transcript is edited
    });

    if (setActiveCaptionLanguage) {
      setActiveCaptionLanguage('source');
    }
    setTranslatedSegments(null);
    setShowTranslatedView(false);
  };

  // Handle Transcript Segment Text Edit Save
  const handleSaveSegmentEdit = (segmentId: string) => {
    const updated = segments.map((seg) =>
      seg.id === segmentId ? { ...seg, text: editingSegmentText.trim() } : seg
    );
    handleTranscriptChange(updated, 'Edit segment text');
    setEditingSegmentId(null);
  };

  // Split Segment in half
  const handleSplitSegment = (index: number) => {
    const seg = segments[index];
    if (!seg) return;

    const midTime = Number(((seg.startTime + seg.endTime) / 2).toFixed(2));
    const words = seg.text.split(' ');
    const midWord = Math.ceil(words.length / 2);
    const text1 = words.slice(0, midWord).join(' ');
    const text2 = words.slice(midWord).join(' ') || '...';

    const seg1: TranscriptSegment = {
      ...seg,
      endTime: midTime,
      text: text1,
    };
    const seg2: TranscriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      speakerId: seg.speakerId,
      startTime: midTime,
      endTime: seg.endTime,
      text: text2,
    };

    const newSegments = [...segments.slice(0, index), seg1, seg2, ...segments.slice(index + 1)];
    handleTranscriptChange(newSegments, 'Split segment');
  };

  // Merge Segment with next
  const handleMergeNext = (index: number) => {
    if (index >= segments.length - 1) return;
    const curr = segments[index];
    const next = segments[index + 1];

    const merged: TranscriptSegment = {
      id: curr.id,
      speakerId: curr.speakerId,
      startTime: curr.startTime,
      endTime: next.endTime,
      text: `${curr.text.trim()} ${next.text.trim()}`,
    };

    const newSegments = [...segments.slice(0, index), merged, ...segments.slice(index + 2)];
    handleTranscriptChange(newSegments, 'Merge segments');
  };

  // Delete Segment
  const handleDeleteSegment = (index: number) => {
    if (segments.length <= 1) return;
    const newSegments = segments.filter((_, idx) => idx !== index);
    handleTranscriptChange(newSegments, 'Delete segment');
  };

  // Add Segment After
  const handleAddSegmentAfter = (index: number) => {
    const curr = segments[index];
    const next = segments[index + 1];
    const startTime = curr ? curr.endTime : 0;
    const endTime = next ? next.startTime : startTime + 5;

    const newSeg: TranscriptSegment = {
      id: `seg_${Date.now()}`,
      speakerId: curr ? curr.speakerId : 'spk_1',
      startTime,
      endTime: Math.max(startTime + 2, endTime),
      text: 'New transcript segment...',
    };

    const newSegments = [...segments.slice(0, index + 1), newSeg, ...segments.slice(index + 1)];
    handleTranscriptChange(newSegments, 'Add segment');
  };

  // Translation Handler - Now uses safe multi-batch chunking to mitigate API quota errors
  const handleTranslate = async () => {
    if (segments.length === 0) {
      setTranslationError('No transcript available. Transcribe the video first.');
      return;
    }

    // Check cache first
    if (project.translations?.[targetLang] && project.translations[targetLang].length > 0) {
      setTranslatedSegments(project.translations[targetLang]);
      setShowTranslatedView(true);
      setTranslationError(null);
      if (setActiveCaptionLanguage) {
        setActiveCaptionLanguage(targetLang);
      }
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);
    setTranslationProgress('Starting translation...');

    try {
      const batchSize = 25; // Safe batch size
      const batches: TranscriptSegment[][] = [];
      for (let i = 0; i < segments.length; i += batchSize) {
        batches.push(segments.slice(i, i + batchSize));
      }

      const allTranslated: TranscriptSegment[] = [];
      for (let i = 0; i < batches.length; i++) {
        setTranslationProgress(`Translating batch ${i + 1} of ${batches.length}...`);
        
        const batch = batches[i];
        const response = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: batch,
            targetLanguage: targetLang,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Translation batch failed (HTTP ${response.status}: ${response.statusText})`);
        }

        const data = await response.json();
        if (data.translatedSegments && Array.isArray(data.translatedSegments)) {
          // Align translated output exactly with original times and speaker IDs
          const alignedBatch = data.translatedSegments.map((tSeg: any, idx: number) => {
            const original = batch[idx];
            return {
              id: original?.id || tSeg.id || `seg_t_${allTranslated.length + idx}`,
              speakerId: original?.speakerId || tSeg.speakerId || 'spk_1',
              startTime: original?.startTime !== undefined ? original.startTime : (tSeg.startTime || 0),
              endTime: original?.endTime !== undefined ? original.endTime : (tSeg.endTime || 0),
              text: tSeg.text || '',
            };
          });
          allTranslated.push(...alignedBatch);
        } else {
          throw new Error('Received malformed translated data from server.');
        }
      }

      if (allTranslated.length > 0) {
        setTranslatedSegments(allTranslated);
        setShowTranslatedView(true);

        const updatedTranslations = {
          ...(project.translations || {}),
          [targetLang]: allTranslated,
        };

        onUpdateProject({
          translations: updatedTranslations,
        });

        if (setActiveCaptionLanguage) {
          setActiveCaptionLanguage(targetLang);
        }
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(err?.message || 'Translation failed. Please try again.');
      setTranslatedSegments(null);
      setShowTranslatedView(false);
    } finally {
      setIsTranslating(false);
      setTranslationProgress(null);
    }
  };

  // AI Document Generation Handler & Markdown Renderer
  const handleGenerateDocument = async (type: string) => {
    if (segments.length === 0) {
      setDocError('No transcript available. Transcribe the video first.');
      return;
    }

    setIsGeneratingDoc(true);
    setDocError(null);

    try {
      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          docType: type,
          projectName: project.name,
          duration: project.duration || 0,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      
      const updatedDocs = {
        ...(project.generatedDocs || {}),
        [type]: {
          title: data.title || '',
          content: data.content || '',
          isInsufficient: !!data.isInsufficient,
          sections: data.sections || [],
          transcriptHash: currentTranscriptHash,
          updatedAt: new Date().toISOString(),
        }
      };

      onUpdateProject({
        generatedDocs: updatedDocs
      });

    } catch (err: any) {
      console.error('Error generating document:', err);
      setDocError(err.message || 'Error occurred while generating document.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const renderMarkdownToHtml = (text: string) => {
    if (!text) return null;

    // Split text into paragraphs/headers/etc.
    const blocks = text.split(/\n\n+/);

    return (
      <div className="space-y-4 text-xs sm:text-sm text-[#333333] leading-relaxed">
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // H1 header
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-lg sm:text-xl font-extrabold text-[#111111] border-b pb-2 pt-4">
                {renderGroundedTextWithClickableTimestamps(trimmed.slice(2))}
              </h1>
            );
          }

          // H2 header
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-sm sm:text-base font-bold text-[#111111] pt-3 pb-1 border-b border-[#F0F0F0]">
                {renderGroundedTextWithClickableTimestamps(trimmed.slice(3))}
              </h2>
            );
          }

          // H3 header
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xs sm:text-sm font-bold text-[#111111] pt-2">
                {renderGroundedTextWithClickableTimestamps(trimmed.slice(4))}
              </h3>
            );
          }

          // Bullets
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const lines = trimmed.split('\n').filter(Boolean);
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2">
                {lines.map((line, lIdx) => {
                  const cleanedLine = line.replace(/^[-*]\s+/, '');
                  return (
                    <li key={lIdx} className="text-xs sm:text-sm text-[#333333]">
                      {renderGroundedTextWithClickableTimestamps(cleanedLine)}
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Numbered lists
          if (/^\d+\.\s+/.test(trimmed)) {
            const lines = trimmed.split('\n').filter(Boolean);
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5 my-2">
                {lines.map((line, lIdx) => {
                  const cleanedLine = line.replace(/^\d+\.\s+/, '');
                  return (
                    <li key={lIdx} className="text-xs sm:text-sm text-[#333333]">
                      {renderGroundedTextWithClickableTimestamps(cleanedLine)}
                    </li>
                  );
                })}
              </ol>
            );
          }

          // Checklist items
          if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
            const lines = trimmed.split('\n').filter(Boolean);
            return (
              <div key={idx} className="space-y-1.5 my-2">
                {lines.map((line, lIdx) => {
                  const isChecked = line.includes('[x]');
                  const cleanedLine = line.replace(/^[-*]\s+\[[ x]\]\s+/, '');
                  return (
                    <div key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="accent-[#111111] w-3.5 h-3.5 rounded mt-0.5 shrink-0"
                      />
                      <span>{renderGroundedTextWithClickableTimestamps(cleanedLine)}</span>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Table rendering
          if (trimmed.includes('|') && trimmed.split('\n')[1]?.includes('-')) {
            const rows = trimmed.split('\n').filter(Boolean);
            const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
            const dataRows = rows.slice(2).map(r => r.split('|').map(c => c.trim()).filter(c => c !== undefined));

            return (
              <div key={idx} className="overflow-x-auto my-3 border border-[#E5E5E5] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                      {headers.map((h, i) => (
                        <th key={i} className="p-2.5 font-bold text-[#111111]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {dataRows.map((row, rI) => {
                      const cells = row.filter((_, cI) => cI > 0 && cI <= headers.length);
                      return (
                        <tr key={rI} className="hover:bg-[#F9F9F9] transition-colors">
                          {cells.map((cell, cI) => (
                            <td key={cI} className="p-2.5 text-[#333333]">
                              {renderGroundedTextWithClickableTimestamps(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-xs sm:text-sm leading-relaxed text-[#333333]">
              {renderGroundedTextWithClickableTimestamps(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // AI Q&A Submit Handler
  const handleSendAiPrompt = async (customPrompt?: string) => {
    const query = customPrompt || aiInput.trim();
    if (!query) return;

    const userMsg: AIChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: query,
      createdAt: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setAiInput('');
    setIsAiGenerating(true);

    const fullTranscript = segments
      .map((s) => `[${formatDuration(s.startTime)} - ${formatDuration(s.endTime)}] ${speakerMap.get(s.speakerId) || s.speakerId}: ${s.text}`)
      .join('\n');

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          transcriptText: fullTranscript,
          projectName: project.name,
          conversationHistory: aiMessages.slice(-6).filter(m => m.id !== 'init_1'),
        }),
      });

      let replyText = '';
      if (response.ok) {
        const data = await response.json();
        replyText = data.answer || 'No answer generated.';
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `AI request failed with HTTP status ${response.status}`);
      }

      const aiMsg: AIChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        createdAt: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Q&A error:', err);
      const aiMsg: AIChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: `Error: ${err?.message || 'Sorry, I encountered an issue analyzing the video. Please verify your GEMINI_API_KEY config.'}`,
        createdAt: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Real AI Universal Analysis Task Runner
  const handleRunAITask = async (targetTask?: AIAnalysisTask) => {
    const task = targetTask || activeAITool;
    if (segments.length === 0) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await analyzeTranscriptTask({
        transcript: segments,
        task,
        options: task === 'summary' ? { length: summaryLength } : undefined,
        projectName: project.name,
        duration: project.duration,
        speakers: speakers,
      });

      const updatedResults: AIAnalysisResults = {
        ...project.aiAnalysisResults,
        [task]: task === 'summary' ? { ...res, length: summaryLength } : (res[task] || res),
        transcriptHash: currentTranscriptHash,
        updatedAt: new Date().toISOString(),
      };

      // Ensure backwards compatibility with project.summary for existing code
      let updatedSummary = project.summary;
      if (task === 'summary') {
        updatedSummary = {
          overview: res.overview || '',
          keyPoints: res.keyPoints || [],
          chapters: updatedResults.chapters || project.summary?.chapters || [],
          actionItems: updatedResults.actionItems?.map((a: any) => typeof a === 'string' ? a : a.task) || project.summary?.actionItems || [],
        };
      } else if (task === 'chapters') {
        updatedSummary = {
          overview: project.summary?.overview || '',
          keyPoints: project.summary?.keyPoints || [],
          chapters: res.chapters || [],
          actionItems: project.summary?.actionItems || [],
        };
      }

      onUpdateProject({
        aiAnalysisResults: updatedResults,
        transcriptHash: currentTranscriptHash,
        summary: updatedSummary,
      });
    } catch (err: any) {
      console.error(`AI Analysis error for task ${task}:`, err);
      setAnalysisError(err?.message || `Failed to generate ${task}. Please check your GEMINI_API_KEY configuration and try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAnalysisTextForCopy = (tool: AIAnalysisTask): string => {
    const data = aiAnalysisResults[tool];
    if (!data) return '';

    if (tool === 'summary') {
      const s = data as AISummaryResult;
      return `EXECUTIVE SUMMARY (${(s.length || 'medium').toUpperCase()})\n\nOVERVIEW:\n${s.overview}\n\nKEY TAKEAWAYS:\n` + (s.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
    }
    if (tool === 'keyPoints') {
      return (data as AIKeyPoint[]).map((p, i) => `${i + 1}. ${p.title}\n${p.description}`).join('\n\n');
    }
    if (tool === 'chapters') {
      return (data as AIChapter[]).map(c => `[${formatDuration(c.startTime)} - ${formatDuration(c.endTime)}] ${c.title}\n${c.summary}`).join('\n\n');
    }
    if (tool === 'keyMoments') {
      return (data as AIKeyMoment[]).map(m => `[${formatDuration(m.timestamp)}] ${m.title}\n${m.explanation}`).join('\n\n');
    }
    if (tool === 'actionItems') {
      return (data as AIActionItem[]).map(a => `- [ ] ${a.task} | Owner: ${a.owner} | Deadline: ${a.deadline}`).join('\n');
    }
    if (tool === 'questions') {
      const q = data as { asked: AIQuestion[]; unanswered: AIQuestion[] };
      const askedText = (q.asked || []).map(i => `Q: ${i.question}\nA: ${i.answerOrReason || 'Answered'}`).join('\n\n');
      const unansweredText = (q.unanswered || []).map(i => `Q: ${i.question}\nReason: ${i.reason || 'Unanswered'}`).join('\n\n');
      return `ANSWERED QUESTIONS:\n${askedText}\n\nUNANSWERED QUESTIONS:\n${unansweredText}`;
    }
    if (tool === 'topics') {
      return (data as AITopic[]).map(t => `# ${t.name}\n${t.description}\nTimestamps: ${t.timestamps?.map(formatDuration).join(', ') || 'N/A'}`).join('\n\n');
    }
    if (tool === 'keywords') {
      return (data as AIKeyword[]).map(k => `${k.term} [Category: ${k.category || 'General'}] - ${k.count} mentions`).join('\n');
    }
    return '';
  };

  const handleCopyAnalysis = (tool: AIAnalysisTask) => {
    const text = getAnalysisTextForCopy(tool);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleExportAnalysisTXT = (tool: AIAnalysisTask) => {
    const text = getAnalysisTextForCopy(tool);
    if (!text) return;
    triggerFileDownload(text, `${sanitizeFileName(project.name)}_${tool}.txt`, 'text/plain');
  };

  const handleExportAnalysisJSON = (tool: AIAnalysisTask) => {
    const data = aiAnalysisResults[tool];
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    triggerFileDownload(jsonStr, `${sanitizeFileName(project.name)}_${tool}.json`, 'application/json');
  };

  // Helper to parse and render clickable timestamps in text like [01:24]
  const renderGroundedTextWithClickableTimestamps = (text: string) => {
    const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const timeStr = match[1];
      // convert timeStr to seconds
      const timeParts = timeStr.split(':').map(Number);
      let sec = 0;
      if (timeParts.length === 2) {
        sec = timeParts[0] * 60 + timeParts[1];
      } else if (timeParts.length === 3) {
        sec = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      }

      parts.push(
        <button
          key={match.index}
          onClick={() => onSeek(sec)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#111111] hover:bg-[#000000] text-white font-mono-time text-[10px] rounded mx-0.5 cursor-pointer"
          title={`Seek to ${timeStr}`}
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{timeStr}</span>
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl flex flex-col overflow-hidden shadow-xs select-none">
      {/* Top Tab Switcher */}
      <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-2 pt-2 flex items-center justify-between overflow-x-auto gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transcript</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            {searchQuery && searchResults.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#111111] text-white text-[9px] flex items-center justify-center font-mono-time">
                {searchResults.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('subtitles')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'subtitles'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span>Subtitles</span>
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'translate'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Translate</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Video AI</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-t border-t border-x transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-white border-[#E5E5E5] text-[#111111] -mb-[1px] border-b-white'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>AI Documents</span>
          </button>
        </div>

        {/* Top Controls on Tab Bar */}
        <div className="flex items-center gap-1.5 pb-1">
          {/* Undo / Redo buttons */}
          <div className="flex items-center border border-[#E5E5E5] rounded bg-white overflow-hidden shadow-2xs">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title={`Undo (Cmd+Z)${undoStack.length > 0 ? `: ${undoStack[undoStack.length - 1].description}` : ''}`}
              className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#E5E5E5]" />
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={`Redo (Cmd+Shift+Z)${redoStack.length > 0 ? `: ${redoStack[redoStack.length - 1].description}` : ''}`}
              className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sync Auto-Scroll Toggle in Transcript mode */}
          {activeTab === 'transcript' && (
            <label className="hidden md:flex items-center gap-1.5 text-[11px] font-mono-time text-[#666666] px-2 py-1 bg-white border border-[#E5E5E5] rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScrollTranscript}
                onChange={(e) => setAutoScrollTranscript(e.target.checked)}
                className="accent-[#111111] rounded cursor-pointer w-3 h-3"
              />
              <span>Sync playhead</span>
            </label>
          )}
        </div>
      </div>

      {/* Speaker Rename Inline Popup */}
      {renamingSpeaker && (
        <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <User className="w-4 h-4 text-[#111111] shrink-0" />
            <span className="font-semibold text-[#111111] whitespace-nowrap">Rename Speaker Everywhere:</span>
            <input
              type="text"
              value={renamingSpeaker.name}
              onChange={(e) => setRenamingSpeaker({ ...renamingSpeaker, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSpeakerName()}
              autoFocus
              className="px-2.5 py-1 bg-white border border-[#111111] rounded text-xs text-[#111111] focus:outline-none flex-1 max-w-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveSpeakerName}
              className="px-3 py-1 bg-[#111111] text-white rounded font-medium text-xs hover:bg-black cursor-pointer shadow-2xs"
            >
              Save Everywhere
            </button>
            <button
              onClick={() => setRenamingSpeaker(null)}
              className="px-2.5 py-1 bg-white border border-[#D4D4D4] rounded text-xs text-[#666666] hover:text-[#111111] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white" ref={transcriptScrollRef}>
        {/* ============================================================ */}
        {/* TAB 1: TRANSCRIPT */}
        {/* ============================================================ */}
        {activeTab === 'transcript' && (
          <div className="flex flex-col">
            {/* Speaker Filter & Management Bar */}
            <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
                <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#888888]" />
                  Speakers:
                </span>
                
                {/* 'All' Filter Pill */}
                <button
                  onClick={() => setSelectedSpeakerFilter('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedSpeakerFilter === 'all'
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-white border border-[#E5E5E5] text-[#555555] hover:border-[#111111] hover:text-[#111111]'
                  }`}
                >
                  All ({segments.length})
                </button>

                {/* Individual Speaker Filter Pills */}
                {speakerStats.list.map((spk) => {
                  const isSelected = selectedSpeakerFilter === spk.id;
                  const style = getSpeakerBadgeStyle(spk.id);
                  return (
                    <button
                      key={spk.id}
                      onClick={() => setSelectedSpeakerFilter(isSelected ? 'all' : spk.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? `${style.bg} ${style.text} ring-1.5 ${style.border} shadow-2xs font-bold`
                          : 'bg-white border border-[#E5E5E5] text-[#555555] hover:border-[#CCCCCC]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span>{spk.name}</span>
                      <span className="text-[10px] font-mono-time opacity-75">
                        ({spk.segmentCount})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Speaker Management Button */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <button
                  onClick={() => setShowSpeakerModal(true)}
                  className="px-2.5 py-1 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Manage Speakers ({speakerStats.totalSpeakers})</span>
                </button>
              </div>
            </div>

            {/* Filtered View Notification Banner */}
            {selectedSpeakerFilter !== 'all' && (
              <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>
                    Viewing segments for <strong>{speakerMap.get(selectedSpeakerFilter) || selectedSpeakerFilter}</strong> ({displayedSegments.length} of {segments.length} segments)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSpeakerFilter('all')}
                  className="text-xs font-bold underline hover:text-black cursor-pointer"
                >
                  Show All Segments
                </button>
              </div>
            )}

            {/* Transcript Segment List */}
            {displayedSegments.length > 150 && !showAllSegmentsOverride && (
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] text-[#666666] font-medium">
                <span>
                  Showing {renderedSegmentsList.length} of {displayedSegments.length} segments near playback position for stability.
                </span>
                <button
                  onClick={() => setShowAllSegmentsOverride(true)}
                  className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-[#111111] hover:bg-neutral-50 hover:border-neutral-400 cursor-pointer text-[10px] font-semibold transition-colors"
                >
                  Show All
                </button>
              </div>
            )}
            {showAllSegmentsOverride && displayedSegments.length > 150 && (
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] text-[#666666] font-medium">
                <span>
                  Showing all {displayedSegments.length} segments (performance may degrade slightly).
                </span>
                <button
                  onClick={() => setShowAllSegmentsOverride(false)}
                  className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-[#111111] hover:bg-neutral-50 hover:border-neutral-400 cursor-pointer text-[10px] font-semibold transition-colors"
                >
                  Optimize
                </button>
              </div>
            )}

            <div className="divide-y divide-[#F5F5F5]">
              {displayedSegments.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#888888] space-y-2">
                  <User className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                  <p className="font-semibold text-[#111111]">No segments for this speaker</p>
                  <button
                    onClick={() => setSelectedSpeakerFilter('all')}
                    className="px-3 py-1 bg-[#111111] text-white rounded text-xs font-medium cursor-pointer"
                  >
                    View All Speakers
                  </button>
                </div>
              ) : (
                renderedSegmentsList.map((segment) => {
                  const originalIndex = segments.findIndex((s) => s.id === segment.id);
                  const isActive = originalIndex === activeSegmentIndex;
                  const isEditing = editingSegmentId === segment.id;
                  const speakerId = segment.speakerId || 'spk_1';
                  const speakerName = speakerMap.get(speakerId) || speakerId;
                  const badgeStyle = getSpeakerBadgeStyle(speakerId);

                  return (
                    <div
                      key={segment.id}
                      ref={isActive ? activeSegmentRef : undefined}
                      className={`p-4 sm:p-5 transition-colors group/seg ${
                        isActive
                          ? 'bg-[#FAFAFA] border-l-2 border-l-[#111111]'
                          : 'hover:bg-[#FCFCFC]'
                      }`}
                    >
                      {/* Segment Header: Speaker + Timestamp + Action Toolbar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Clickable timestamp seeks video */}
                          <button
                            onClick={() => onSeek(segment.startTime)}
                            className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white text-[#111111] rounded text-[11px] font-mono-time transition-colors flex items-center gap-1 cursor-pointer"
                            title={`Jump to ${formatDuration(segment.startTime)}`}
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{formatDuration(segment.startTime)}</span>
                          </button>

                          {/* Speaker Badge with Quick Action Menu */}
                          <div className="relative inline-flex items-center">
                            <button
                              onClick={() => setReassigningSegment(segment)}
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text} hover:shadow-2xs`}
                              title="Click to rename or change speaker for this segment"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                              <span>{speakerName}</span>
                              <ChevronDown className="w-3 h-3 opacity-60 group-hover/seg:opacity-100" />
                            </button>
                          </div>
                        </div>

                        {/* Segment Action Toolbar */}
                        <div className="opacity-0 group-hover/seg:opacity-100 transition-opacity flex items-center gap-1 text-[#888888]">
                          <button
                            onClick={() => {
                              setEditingSegmentId(segment.id);
                              setEditingSegmentText(segment.text);
                            }}
                            className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                            title="Edit text"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setReassigningSegment(segment)}
                            className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                            title="Change speaker for this segment"
                          >
                            <UserCheck className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleSplitSegment(originalIndex)}
                            className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                            title="Split segment"
                          >
                            <Split className="w-3 h-3" />
                          </button>
                          {originalIndex < segments.length - 1 && (
                            <button
                              onClick={() => handleMergeNext(originalIndex)}
                              className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                              title="Merge with next segment"
                            >
                              <Merge className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAddSegmentAfter(originalIndex)}
                            className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                            title="Insert segment below"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSegment(originalIndex)}
                            className="p-1 hover:text-[#C53030] hover:bg-[#FFF5F5] rounded cursor-pointer"
                            title="Delete segment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Segment Body: Text or Inline Editor */}
                      {isEditing ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={editingSegmentText}
                            onChange={(e) => setEditingSegmentText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full p-2 text-xs sm:text-sm bg-white border border-[#111111] rounded focus:outline-none leading-relaxed text-[#111111]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveSegmentEdit(segment.id)}
                              className="px-3 py-1 bg-[#111111] text-white text-xs font-semibold rounded hover:bg-black cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingSegmentId(null)}
                              className="px-3 py-1 bg-white border border-[#D4D4D4] text-xs font-medium text-[#666666] rounded hover:text-[#111111] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => onSeek(segment.startTime)}
                          className={`text-xs sm:text-sm leading-relaxed cursor-pointer ${
                            isActive ? 'text-[#111111] font-medium' : 'text-[#333333]'
                          }`}
                        >
                          <HighlightedText 
                            text={segment.text} 
                            query={searchQuery} 
                            mode={searchMode} 
                          />
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SEARCH */}
        {/* ============================================================ */}
        {activeTab === 'search' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Main Search Bar & Quick Controls */}
            <div className="space-y-2.5">
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#888888]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (isSemanticMode) {
                      setIsSemanticMode(false);
                      setSemanticResults(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        handlePrevMatch();
                      } else {
                        if (isSemanticMode) {
                          handleExecuteSemanticSearch();
                        } else {
                          handleNextMatch();
                        }
                      }
                      addSearchHistory(searchQuery);
                    }
                  }}
                  placeholder={
                    isSemanticMode
                      ? 'Ask a conceptual question (e.g., "How much does it cost?", "Why did the launch fail?")...'
                      : 'Search words, exact phrases, topics, speakers...'
                  }
                  autoFocus
                  className={`w-full pl-9 pr-20 py-2.5 bg-[#FAFAFA] border rounded-lg text-xs sm:text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:bg-white transition-all shadow-2xs ${
                    isSemanticMode ? 'border-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500' : 'border-[#D4D4D4] focus:border-[#111111]'
                  }`}
                />

                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFocusedMatchIndex(0);
                        setSemanticResults(null);
                        setIsSemanticMode(false);
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-[#888888] hover:text-[#111111] transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSemanticMode && (
                    <button
                      onClick={() => handleExecuteSemanticSearch()}
                      disabled={isSearchingSemantic || !searchQuery.trim()}
                      className="px-2.5 py-1 bg-[#111111] hover:bg-black text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSearchingSemantic ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      )}
                      <span>Run AI</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mode Selectors, Filter Toggles, Find & Replace Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                {/* Search Matching Modes */}
                <div className="flex items-center gap-1 bg-[#F5F5F5] p-0.5 rounded-lg border border-[#E5E5E5]">
                  <button
                    onClick={() => {
                      setSearchMode('all');
                      setIsSemanticMode(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      !isSemanticMode && searchMode === 'all'
                        ? 'bg-white text-[#111111] font-bold shadow-2xs'
                        : 'text-[#666666] hover:text-[#111111]'
                    }`}
                    title="Matches if all words exist in the transcript segment"
                  >
                    All Words
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode('exact');
                      setIsSemanticMode(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      !isSemanticMode && searchMode === 'exact'
                        ? 'bg-white text-[#111111] font-bold shadow-2xs'
                        : 'text-[#666666] hover:text-[#111111]'
                    }`}
                    title="Matches the exact phrase in order"
                  >
                    Exact Phrase
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode('any');
                      setIsSemanticMode(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      !isSemanticMode && searchMode === 'any'
                        ? 'bg-white text-[#111111] font-bold shadow-2xs'
                        : 'text-[#666666] hover:text-[#111111]'
                    }`}
                    title="Matches if any of the words exist in the segment"
                  >
                    Any Word
                  </button>
                  <button
                    onClick={() => {
                      const next = !isSemanticMode;
                      setIsSemanticMode(next);
                      if (next && searchQuery.trim()) {
                        handleExecuteSemanticSearch();
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isSemanticMode
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs'
                        : 'text-[#666666] hover:text-[#111111]'
                    }`}
                    title="Search conceptually with server-side AI (e.g. pricing, objections, ideas)"
                  >
                    <Sparkles className={`w-3 h-3 ${isSemanticMode ? 'text-amber-600' : 'text-[#888888]'}`} />
                    <span>Semantic AI</span>
                  </button>
                </div>

                {/* Secondary Toggles: Find & Replace + Advanced Filters */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => setShowFindAndReplace(!showFindAndReplace)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer border transition-all ${
                      showFindAndReplace
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]'
                    }`}
                    title="Toggle Find & Replace"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Replace</span>
                  </button>

                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer border transition-all ${
                      showAdvancedFilters || searchSpeakerFilter !== 'all' || searchChapterFilter !== 'all' || searchTimeRangeEnabled
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]'
                    }`}
                    title="Filter by Speaker, Chapter, Time Range, or Sort Order"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Filters</span>
                    {(searchSpeakerFilter !== 'all' || searchChapterFilter !== 'all' || searchTimeRangeEnabled) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Find & Replace Panel */}
              {showFindAndReplace && (
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <div className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#111111]" />
                      <span>Find & Replace in Transcript</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-normal text-[#666666] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceMatchCase}
                        onChange={(e) => setReplaceMatchCase(e.target.checked)}
                        className="rounded text-[#111111] focus:ring-0 cursor-pointer"
                      />
                      <span>Match Case</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#666666]">Find</span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Text to find..."
                        className="w-full px-2.5 py-1.5 bg-white border border-[#D4D4D4] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#666666]">Replace With</span>
                      <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Replacement text..."
                        className="w-full px-2.5 py-1.5 bg-white border border-[#D4D4D4] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EAEAEA]">
                    <span className="text-[11px] text-[#666666] font-mono-time">
                      {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} ready for replacement
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReplaceCurrentMatch}
                        disabled={searchResults.length === 0 || !searchQuery.trim()}
                        className="px-3 py-1 bg-white border border-[#D4D4D4] hover:border-[#111111] hover:text-[#111111] text-[#333333] rounded text-xs font-semibold cursor-pointer disabled:opacity-40 shadow-2xs"
                      >
                        Replace Current
                      </button>
                      <button
                        onClick={handleReplaceAllMatches}
                        disabled={searchResults.length === 0 || !searchQuery.trim()}
                        className="px-3 py-1 bg-[#111111] hover:bg-black text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-40 shadow-2xs"
                      >
                        Replace All ({searchResults.length})
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-3 shadow-2xs text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAEAEA]">
                    <span className="font-bold text-[#111111] flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-[#111111]" />
                      Search Filters & Ordering
                    </span>
                    {(searchSpeakerFilter !== 'all' || searchChapterFilter !== 'all' || searchTimeRangeEnabled) && (
                      <button
                        onClick={() => {
                          setSearchSpeakerFilter('all');
                          setSearchChapterFilter('all');
                          setSearchTimeRangeEnabled(false);
                          setSearchTimeStart('');
                          setSearchTimeEnd('');
                        }}
                        className="text-[11px] text-[#C53030] hover:underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Speaker Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#666666] flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Speaker:
                      </label>
                      <select
                        value={searchSpeakerFilter}
                        onChange={(e) => setSearchSpeakerFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value="all">All Speakers ({speakers.length})</option>
                        {speakerStats.list.map((spk) => (
                          <option key={spk.id} value={spk.id}>
                            {spk.name} ({spk.segmentCount})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chapter Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#666666] flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        Chapter:
                      </label>
                      <select
                        value={searchChapterFilter}
                        onChange={(e) => setSearchChapterFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value="all">All Chapters ({availableChapters.length})</option>
                        {availableChapters.map((ch, idx) => (
                          <option key={`${ch.title}_${idx}`} value={ch.title}>
                            {ch.title} ({formatDuration(ch.startTime)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#666666] flex items-center gap-1">
                        <ListOrdered className="w-3 h-3" />
                        Sort Order:
                      </label>
                      <select
                        value={searchSortOrder}
                        onChange={(e) => setSearchSortOrder(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value="time">Chronological (Time)</option>
                        <option value="relevance">Relevance & Match Score</option>
                      </select>
                    </div>
                  </div>

                  {/* Time Range Filter Row */}
                  <div className="pt-2 border-t border-[#EAEAEA] flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-[#111111] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchTimeRangeEnabled}
                        onChange={(e) => setSearchTimeRangeEnabled(e.target.checked)}
                        className="rounded text-[#111111] focus:ring-0 cursor-pointer"
                      />
                      <Clock className="w-3.5 h-3.5 text-[#666666]" />
                      <span>Limit Search to Time Range:</span>
                    </label>

                    {searchTimeRangeEnabled && (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="text"
                          value={searchTimeStart}
                          onChange={(e) => setSearchTimeStart(e.target.value)}
                          placeholder="00:00"
                          className="w-20 px-2 py-1 bg-white border border-[#D4D4D4] rounded text-center font-mono-time focus:outline-none focus:border-[#111111]"
                        />
                        <span className="text-[#888888]">to</span>
                        <input
                          type="text"
                          value={searchTimeEnd}
                          onChange={(e) => setSearchTimeEnd(e.target.value)}
                          placeholder={formatDuration(project.duration || 60)}
                          className="w-20 px-2 py-1 bg-white border border-[#D4D4D4] rounded text-center font-mono-time focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Search Queries Chips (shown when input is empty) */}
              {!searchQuery && searchHistory.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#666666]">
                  <span className="text-[11px] font-semibold flex items-center gap-1 text-[#888888]">
                    <History className="w-3 h-3" />
                    Recent:
                  </span>
                  {searchHistory.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setSearchQuery(q);
                        addSearchHistory(q);
                      }}
                      className="px-2 py-0.5 bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#333333] hover:text-[#111111] rounded-full text-[11px] transition-colors cursor-pointer border border-[#E5E5E5]"
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    onClick={clearSearchHistory}
                    className="text-[10px] text-[#999999] hover:text-[#666666] underline ml-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Semantic Search Error guidance */}
            {semanticError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Semantic Search Notice</p>
                  <p className="text-red-700">{semanticError}</p>
                </div>
              </div>
            )}

            {/* Semantic Related Concepts Badges */}
            {isSemanticMode && semanticResults && semanticResults.relatedConcepts && semanticResults.relatedConcepts.length > 0 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Related Concepts Detected by Gemini:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {semanticResults.relatedConcepts.map((concept) => (
                    <button
                      key={concept}
                      onClick={() => {
                        setSearchQuery(concept);
                        handleExecuteSemanticSearch(concept);
                      }}
                      className="px-2.5 py-0.5 bg-white border border-amber-300 rounded-full text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      {concept}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header: Count, Navigation, AI Analysis, Export Tools */}
            {searchQuery.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666] font-mono-time pb-2 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#111111]">
                    {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} found
                  </span>
                  {searchResults.length > 0 && (
                    <span className="text-[11px] text-[#888888]">
                      (Match {focusedMatchIndex + 1} of {searchResults.length})
                    </span>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-0.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded p-0.5">
                      <button
                        onClick={handlePrevMatch}
                        className="p-1 hover:bg-white rounded text-[#111111] transition-colors cursor-pointer"
                        title="Previous match (Shift+Enter)"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleNextMatch}
                        className="p-1 hover:bg-white rounded text-[#111111] transition-colors cursor-pointer"
                        title="Next match (Enter)"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Ask AI about search matches */}
                    <button
                      onClick={handleAnalyzeSearchResultsWithAi}
                      className="px-2.5 py-1 bg-white border border-[#D4D4D4] hover:border-[#111111] text-[#111111] rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Analyze and synthesize these search matches with Gemini AI"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Analyze with AI</span>
                    </button>

                    {/* Export Results Dropdown */}
                    <div className="relative group">
                      <button
                        className="px-2 py-1 bg-white border border-[#D4D4D4] hover:border-[#111111] text-[#111111] rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Export search results"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-[#E5E5E5] rounded-lg shadow-md py-1 hidden group-hover:block z-20">
                        <button
                          onClick={() => handleExportSearchResults('txt')}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA] text-[#111111] flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-[#666666]" />
                          <span>Text (.txt)</span>
                        </button>
                        <button
                          onClick={() => handleExportSearchResults('csv')}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA] text-[#111111] flex items-center gap-1.5 cursor-pointer"
                        >
                          <ListOrdered className="w-3 h-3 text-[#666666]" />
                          <span>CSV (.csv)</span>
                        </button>
                        <button
                          onClick={() => handleExportSearchResults('json')}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA] text-[#111111] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Hash className="w-3 h-3 text-[#666666]" />
                          <span>JSON (.json)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Stream / Empty States */}
            <div className="space-y-3">
              {segments.length === 0 ? (
                <div className="text-center py-14 text-xs text-[#888888] space-y-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
                  <Search className="w-7 h-7 mx-auto text-[#CCCCCC]" />
                  <p className="font-semibold text-[#111111] text-sm">No transcript available</p>
                  <p className="text-[#666666]">Transcribe the media first to enable instant dialogue search.</p>
                </div>
              ) : searchQuery.trim() === '' ? (
                <div className="text-center py-14 text-xs text-[#888888] space-y-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
                  <Search className="w-7 h-7 mx-auto text-[#CCCCCC]" />
                  <p className="font-semibold text-[#111111] text-sm">Search this video's transcript</p>
                  <p className="text-[#666666] max-w-sm mx-auto">
                    Type words, phrases, concepts, or speaker names. Click any match to jump the player directly to that segment.
                  </p>
                  <div className="pt-2 text-[10px] text-[#888888] font-mono-time">
                    Press <kbd className="px-1.5 py-0.5 bg-white border border-[#D4D4D4] rounded font-semibold text-[#111111]">Cmd/Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-[#D4D4D4] rounded font-semibold text-[#111111]">F</kbd> anytime to search
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#888888] space-y-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-6">
                  <p className="font-semibold text-[#111111] text-sm">No matches found</p>
                  <p className="text-[#666666]">No transcript segments match "{searchQuery}" under the current filters.</p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setSearchMode('any');
                        setSearchSpeakerFilter('all');
                        setSearchChapterFilter('all');
                        setSearchTimeRangeEnabled(false);
                      }}
                      className="px-3 py-1 bg-white border border-[#D4D4D4] hover:border-[#111111] text-[#111111] rounded text-xs font-medium cursor-pointer"
                    >
                      Broaden Search (Any Words & All Filters)
                    </button>
                    {!isSemanticMode && (
                      <button
                        onClick={() => {
                          setIsSemanticMode(true);
                          handleExecuteSemanticSearch();
                        }}
                        className="px-3 py-1 bg-[#111111] text-white rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Try AI Semantic Search</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const seg = item.segment;
                  const spk = item.speakerName;
                  const isFocused = idx === focusedMatchIndex;
                  const isPlaying = currentTime >= seg.startTime && currentTime <= seg.endTime;
                  const badgeStyle = getSpeakerBadgeStyle(seg.speakerId);

                  return (
                    <div
                      key={`${seg.id}_${idx}`}
                      onClick={() => {
                        setFocusedMatchIndex(idx);
                        onSeek(seg.startTime);
                      }}
                      className={`p-4 border rounded-xl transition-all cursor-pointer space-y-2 ${
                        isFocused
                          ? 'bg-white border-[#111111] shadow-xs ring-1.5 ring-[#111111]'
                          : isPlaying
                          ? 'bg-[#FAFAFA] border-[#D4D4D4]'
                          : 'bg-[#FAFAFA] hover:bg-white border-[#E5E5E5] hover:border-[#CCCCCC]'
                      }`}
                    >
                      {/* Top Row: Speaker Badge + Chapter + Timestamp */}
                      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Speaker Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                            <span>
                              <HighlightedText text={spk} query={searchQuery} mode={searchMode} />
                            </span>
                          </span>

                          {/* Chapter Tag (if in a chapter) */}
                          {item.chapterTitle && (
                            <span className="px-2 py-0.5 bg-white border border-[#E5E5E5] rounded text-[10px] text-[#666666] font-medium flex items-center gap-1 truncate max-w-[180px]">
                              <Bookmark className="w-2.5 h-2.5 text-[#888888]" />
                              <span className="truncate">{item.chapterTitle}</span>
                            </span>
                          )}

                          {/* Semantic Rationale Badge */}
                          {item.matchedConcept && (
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[10px] font-medium flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              <span>{item.matchedConcept}</span>
                              {item.semanticRelevance && (
                                <span className="font-bold text-amber-700">({item.semanticRelevance}%)</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Timestamp Button */}
                        <div className="flex items-center gap-1 font-mono-time">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                              isPlaying
                                ? 'bg-[#111111] text-white'
                                : 'bg-white border border-[#E5E5E5] text-[#111111] hover:bg-[#111111] hover:text-white'
                            }`}
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{formatDuration(seg.startTime)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Highlighted text snippet */}
                      <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                        <HighlightedText
                          text={seg.text}
                          query={searchQuery}
                          mode={searchMode}
                          highlightWords={item.highlightWords}
                        />
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SUBTITLES */}
        {/* ============================================================ */}
        {activeTab === 'subtitles' && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F0F0]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Subtitles &amp; Captions
                  </h3>
                  {activeCaptionLanguage !== 'source' && (
                    <span className="px-2 py-0.5 bg-[#111111] text-white rounded text-[10px] font-semibold">
                      {activeCaptionLanguage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#666666] font-mono-time">
                    {activeSubtitlesList.length} synchronized subtitle cue{activeSubtitlesList.length === 1 ? '' : 's'}
                  </span>
                  {project.translations && Object.keys(project.translations).length > 0 && (
                    <>
                      <span className="text-[#D4D4D4] text-xs">|</span>
                      <select
                        value={activeCaptionLanguage}
                        onChange={(e) => setActiveCaptionLanguage?.(e.target.value)}
                        className="px-1.5 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[10px] text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
                      >
                        <option value="source">Original (Source Language)</option>
                        {Object.keys(project.translations).map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddSubtitle}
                  className="px-3 py-1.5 bg-white hover:bg-[#F5F5F5] border border-[#D4D4D4] text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Add a new subtitle segment"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subtitle</span>
                </button>

                <button
                  onClick={() => {
                    const srt = generateSRT(activeSubtitlesList, speakers);
                    const suffix = activeCaptionLanguage !== 'source' ? `_${activeCaptionLanguage.toLowerCase()}` : '';
                    triggerFileDownload(srt, `${sanitizeFileName(project.name)}${suffix}.srt`, 'text/plain');
                  }}
                  disabled={activeSubtitlesList.length === 0}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SRT</span>
                </button>

                <button
                  onClick={() => {
                    const vtt = generateVTT(activeSubtitlesList, speakers);
                    const suffix = activeCaptionLanguage !== 'source' ? `_${activeCaptionLanguage.toLowerCase()}` : '';
                    triggerFileDownload(vtt, `${sanitizeFileName(project.name)}${suffix}.vtt`, 'text/vtt');
                  }}
                  disabled={activeSubtitlesList.length === 0}
                  className="px-3 py-1.5 bg-white hover:bg-[#F5F5F5] border border-[#D4D4D4] hover:border-[#111111] disabled:opacity-50 text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download VTT</span>
                </button>
              </div>
            </div>

            {/* Outdated Subtitles Banner */}
            {areSubtitlesOutdated && (
              <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#92400E]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Subtitles are out of sync with transcript</p>
                    <p className="text-[11px] text-[#B45309] mt-0.5">
                      The original transcript has been modified. Your custom subtitles may not align perfectly with the current text and timestamps.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRegenerateSubtitles}
                    className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Resync with Transcript
                  </button>
                  <button
                    onClick={() => onUpdateProject({ subtitlesTranscriptHash: currentTranscriptHash })}
                    className="px-3 py-1.5 bg-white border border-[#D4D4D4] hover:bg-[#FAFAFA] text-[#111111] rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    title="Dismiss warning and accept current subtitles as up-to-date"
                  >
                    Accept Current
                  </button>
                </div>
              </div>
            )}

            {/* Empty States */}
            {segments.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                <Subtitles className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                <p className="font-semibold text-[#111111]">No transcript available.</p>
                <p className="text-[#666666]">Transcribe the video first to generate subtitles.</p>
              </div>
            ) : activeCaptionLanguage !== 'source' && (!project.translations?.[activeCaptionLanguage] || project.translations[activeCaptionLanguage].length === 0) ? (
              <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                <Globe className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                <p className="font-semibold text-[#111111]">Translate the transcript first.</p>
                <p className="text-[#666666]">Use the Translate tab to generate {activeCaptionLanguage} subtitles.</p>
              </div>
            ) : activeSubtitlesList.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                <Subtitles className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                <p className="font-semibold text-[#111111]">No subtitle cues yet</p>
                <button
                  onClick={handleAddSubtitle}
                  className="px-3 py-1.5 bg-[#111111] text-white rounded text-xs font-semibold cursor-pointer"
                >
                  + Add First Subtitle
                </button>
              </div>
            ) : (
              /* Editable Subtitles Cues Stream */
              <div className="space-y-3">
                {activeSubtitlesList.length > 150 && !showAllSubtitlesOverride && (
                  <div className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between text-[11px] text-[#666666] font-medium">
                    <span>
                      Showing {renderedSubtitlesList.length} of {activeSubtitlesList.length} subtitle cues near playback position for stability.
                    </span>
                    <button
                      onClick={() => setShowAllSubtitlesOverride(true)}
                      className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-[#111111] hover:bg-neutral-50 hover:border-neutral-400 cursor-pointer text-[10px] font-semibold transition-colors"
                    >
                      Show All
                    </button>
                  </div>
                )}
                {showAllSubtitlesOverride && activeSubtitlesList.length > 150 && (
                  <div className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between text-[11px] text-[#666666] font-medium">
                    <span>
                      Showing all {activeSubtitlesList.length} subtitle cues (performance may degrade slightly).
                    </span>
                    <button
                      onClick={() => setShowAllSubtitlesOverride(false)}
                      className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-[#111111] hover:bg-neutral-50 hover:border-neutral-400 cursor-pointer text-[10px] font-semibold transition-colors"
                    >
                      Optimize
                    </button>
                  </div>
                )}

                {renderedSubtitlesList.map((cue) => {
                  const idx = activeSubtitlesList.findIndex((c) => c.id === cue.id);
                  const isPlaying = currentTime >= cue.startTime && currentTime <= cue.endTime;
                  const isEditing = editingCueId === cue.id;

                  if (isEditing) {
                    return (
                      <div
                        key={cue.id}
                        className="p-4 bg-white border-2 border-[#111111] rounded-lg shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#111111]">
                            Editing Subtitle #{idx + 1}
                          </span>
                          <span className="text-[10px] text-[#888888] font-mono-time">
                            ID: {cue.id}
                          </span>
                        </div>

                        {/* Timestamp Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#666666] mb-1">
                              Start Time (MM:SS.mmm)
                            </label>
                            <input
                              type="text"
                              value={editingCueStart}
                              onChange={(e) => setEditingCueStart(e.target.value)}
                              placeholder="00:00.000"
                              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs font-mono-time text-[#111111] focus:outline-none focus:border-[#111111]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#666666] mb-1">
                              End Time (MM:SS.mmm)
                            </label>
                            <input
                              type="text"
                              value={editingCueEnd}
                              onChange={(e) => setEditingCueEnd(e.target.value)}
                              placeholder="00:04.500"
                              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs font-mono-time text-[#111111] focus:outline-none focus:border-[#111111]"
                            />
                          </div>
                        </div>

                        {/* Textarea */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#666666] mb-1">
                            Subtitle Text
                          </label>
                          <textarea
                            value={editingCueText}
                            onChange={(e) => setEditingCueText(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111] leading-relaxed resize-y"
                          />
                        </div>

                        {cueValidationError && (
                          <div className="p-2 bg-[#FFF0F0] border border-[#FFCCCC] rounded text-xs text-[#CC0000]">
                            {cueValidationError}
                          </div>
                        )}

                        {/* Edit Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={handleCancelEditCue}
                            className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#333333] rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => handleSaveEditCue(cue.id)}
                            className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cue.id}
                      className={`p-3.5 border rounded-lg transition-all space-y-2 ${
                        isPlaying
                          ? 'bg-white border-[#111111] shadow-xs ring-1 ring-[#111111]'
                          : 'bg-[#FAFAFA] hover:bg-white border-[#E5E5E5]'
                      }`}
                    >
                      {/* Top Header: Index, Playhead Seek, Timestamps, Actions */}
                      <div className="flex items-center justify-between gap-2 text-xs font-mono-time">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111111] text-[11px] bg-[#EAEAEA] px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <button
                            onClick={() => onSeek(cue.startTime)}
                            className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                              isPlaying
                                ? 'bg-[#111111] text-white font-semibold'
                                : 'bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                            }`}
                            title="Seek video to subtitle start time"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{formatDuration(cue.startTime)} → {formatDuration(cue.endTime)}</span>
                          </button>
                          {isPlaying && (
                            <span className="text-[10px] font-bold text-[#111111] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded uppercase tracking-wider animate-pulse">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Cue Actions: Edit, Split, Merge, Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditCue(cue)}
                            className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer"
                            title="Edit subtitle text & timestamps"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSplitSubtitle(cue)}
                            className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer"
                            title="Split subtitle at playhead or midpoint"
                          >
                            <Split className="w-3.5 h-3.5" />
                          </button>
                          {idx < activeSubtitlesList.length - 1 && (
                            <button
                              onClick={() => handleMergeSubtitle(idx)}
                              className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer"
                              title="Merge with next subtitle"
                            >
                              <Merge className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSubtitle(cue.id)}
                            className="p-1.5 hover:bg-[#FFF0F0] rounded text-[#CC0000] transition-colors cursor-pointer"
                            title="Delete subtitle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subtitle Text */}
                      <p
                        onClick={() => handleStartEditCue(cue)}
                        className="text-xs text-[#111111] leading-relaxed cursor-pointer hover:text-[#000000] font-medium"
                        title="Click to edit text"
                      >
                        {cue.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: TRANSLATE */}
        {/* ============================================================ */}
        {activeTab === 'translate' && (
          <TranslationWorkspace
            project={project}
            segments={segments}
            speakers={speakers}
            speakerMap={speakerMap}
            currentTime={currentTime}
            onSeek={onSeek}
            onUpdateProject={onUpdateProject}
            activeCaptionLanguage={activeCaptionLanguage}
            setActiveCaptionLanguage={setActiveCaptionLanguage}
            currentTranscriptHash={currentTranscriptHash}
            pushHistory={pushHistory}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 5: VIDEO AI */}
        {/* ============================================================ */}
        {activeTab === 'ai' && (
          <div className="h-full flex flex-col justify-between p-4 sm:p-6 space-y-4">
            {/* AI Messages Stream */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111]'
                    }`}
                  >
                    <div className="whitespace-pre-line">
                      {renderGroundedTextWithClickableTimestamps(msg.text)}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono-time text-[#999999] mt-1 px-1">
                    {msg.sender === 'user' ? 'You' : 'VEYRA AI'}
                  </span>
                </div>
              ))}

              {isAiGenerating && (
                <div className="flex items-center gap-2 p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg max-w-[60%] text-xs text-[#666666]">
                  <span className="w-2 h-2 rounded-full bg-[#111111] animate-ping" />
                  <span>Analyzing video transcript...</span>
                </div>
              )}
            </div>

            {/* Suggested Question Pills */}
            <div className="space-y-2 pt-2 border-t border-[#F0F0F0]">
              <span className="text-[10px] font-mono-time uppercase tracking-wider text-[#999999]">
                Suggested Questions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Summarize this video',
                  'What are the core topics?',
                  'What is the technical pipeline?',
                  'Key takeaways and conclusions',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendAiPrompt(prompt)}
                    className="px-2.5 py-1 bg-[#FAFAFA] hover:bg-[#111111] hover:text-white border border-[#E5E5E5] rounded text-[11px] text-[#333333] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiPrompt();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask any question grounded in this video..."
                className="flex-1 px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!aiInput.trim() || isAiGenerating}
                className="px-4 py-2 bg-[#111111] hover:bg-black disabled:opacity-40 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: AI TRANSCRIPT INTELLIGENCE SUITE */}
        {/* ============================================================ */}
        {activeTab === 'summary' && (
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {/* Sub-tool Selector Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[#E5E5E5] scrollbar-thin">
              {([
                { id: 'summary', label: 'Summary', icon: BookOpen },
                { id: 'keyPoints', label: 'Key Points', icon: ListOrdered },
                { id: 'chapters', label: 'Chapters', icon: Bookmark },
                { id: 'keyMoments', label: 'Key Moments', icon: Clock },
                { id: 'actionItems', label: 'Action Items', icon: CheckSquare },
                { id: 'questions', label: 'Questions', icon: HelpCircle },
                { id: 'topics', label: 'Topics', icon: Tag },
                { id: 'keywords', label: 'Keywords', icon: Hash },
              ] as const).map(({ id, label, icon: Icon }) => {
                const hasResult = !!aiAnalysisResults[id];
                const isActive = activeAITool === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveAITool(id);
                      setAnalysisError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#111111] text-white shadow-xs'
                        : 'bg-[#FAFAFA] text-[#666666] border border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                    {hasResult && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Outdated Transcript Banner */}
            {aiAnalysisResults[activeAITool] && aiAnalysisResults.transcriptHash && aiAnalysisResults.transcriptHash !== currentTranscriptHash && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Transcript has been edited. AI results may be outdated.</span>
                </div>
                <button
                  disabled={isAnalyzing || segments.length === 0}
                  onClick={() => handleRunAITask(activeAITool)}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Update</span>
                </button>
              </div>
            )}

            {/* Tool Toolbar & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
              {/* Tool specific options */}
              {activeAITool === 'summary' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#111111]">Length:</span>
                  <div className="flex gap-1 bg-[#F0F0F0] p-0.5 rounded-md">
                    {(['short', 'medium', 'detailed'] as const).map((l) => (
                      <button
                        key={l}
                        disabled={isAnalyzing}
                        onClick={() => setSummaryLength(l)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${
                          summaryLength === l
                            ? 'bg-[#111111] text-white'
                            : 'text-[#666666] hover:text-[#111111]'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
                  <span>AI Tool:</span>
                  <span className="capitalize text-[#666666] font-normal">{activeAITool.replace(/([AZ])/g, ' $1')}</span>
                </div>
              )}

              {/* Actions: Generate, Copy, Export */}
              <div className="flex items-center gap-2 shrink-0">
                {aiAnalysisResults[activeAITool] && (
                  <>
                    <button
                      onClick={() => handleCopyAnalysis(activeAITool)}
                      title="Copy result to clipboard"
                      className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedStatus ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStatus ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleExportAnalysisTXT(activeAITool)}
                      title="Download as TXT"
                      className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>TXT</span>
                    </button>

                    <button
                      onClick={() => handleExportAnalysisJSON(activeAITool)}
                      title="Download as JSON"
                      className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>
                  </>
                )}

                <button
                  disabled={isAnalyzing || segments.length === 0}
                  onClick={() => handleRunAITask(activeAITool)}
                  className="px-4 py-1.5 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isAnalyzing
                      ? 'Analyzing...'
                      : aiAnalysisResults[activeAITool]
                      ? 'Regenerate'
                      : 'Generate'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {analysisError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error:</span> {analysisError}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <span className="w-6 h-6 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
                <span className="text-xs text-[#666666] font-medium text-center">
                  VEYRA AI is analyzing transcript content for {activeAITool.replace(/([A-Z])/g, ' $1').toLowerCase()}...
                </span>
              </div>
            ) : aiAnalysisResults[activeAITool] ? (
              <div className="space-y-6">
                {/* 1. SUMMARY TOOL */}
                {activeAITool === 'summary' && (() => {
                  const data = aiAnalysisResults.summary || { overview: summary?.overview || '', keyPoints: summary?.keyPoints || [] };
                  return (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                          Executive Overview
                        </h3>
                        <p className="text-xs sm:text-sm text-[#333333] leading-relaxed bg-[#FAFAFA] border border-[#E5E5E5] p-4 rounded-xl">
                          {renderGroundedTextWithClickableTimestamps(data.overview)}
                        </p>
                      </div>

                      {data.keyPoints && data.keyPoints.length > 0 && (
                        <div className="space-y-2.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                            Key Takeaways
                          </h3>
                          <div className="space-y-2">
                            {data.keyPoints.map((point, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs text-[#333333] bg-white border border-[#E5E5E5] p-3 rounded-lg">
                                <span className="w-5 h-5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed flex-1">{renderGroundedTextWithClickableTimestamps(point)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* 2. KEY POINTS TOOL */}
                {activeAITool === 'keyPoints' && (() => {
                  const points = aiAnalysisResults.keyPoints || [];
                  if (points.length === 0) return <p className="text-xs text-[#666666]">No key points extracted.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Core Key Points ({points.length})</h3>
                      <div className="space-y-3">
                        {points.map((kp, idx) => (
                          <div key={kp.id || idx} className="p-4 bg-white border border-[#E5E5E5] rounded-xl space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {kp.number || idx + 1}
                                </span>
                                <h4 className="text-xs font-bold text-[#111111]">{kp.title}</h4>
                              </div>
                              {typeof kp.timestamp === 'number' && (
                                <button
                                  onClick={() => onSeek(kp.timestamp!)}
                                  className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white rounded text-[11px] font-mono-time text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>{formatDuration(kp.timestamp)}</span>
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-[#555555] leading-relaxed pl-7">
                              {renderGroundedTextWithClickableTimestamps(kp.description)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. CHAPTERS TOOL */}
                {activeAITool === 'chapters' && (() => {
                  const chapters = aiAnalysisResults.chapters || [];
                  if (chapters.length === 0) return <p className="text-xs text-[#666666]">No chapters generated.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Media Chapters ({chapters.length})</h3>
                      <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden bg-white shadow-2xs">
                        {chapters.map((ch, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSeek(ch.startTime)}
                            className="p-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#111111] flex items-center gap-2">
                                <Bookmark className="w-3.5 h-3.5 text-[#111111]" />
                                <span>{ch.title}</span>
                              </span>
                              <span className="px-2.5 py-1 bg-[#F0F0F0] rounded-md text-[11px] font-mono-time text-[#111111] font-semibold flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>{formatDuration(ch.startTime)} - {formatDuration(ch.endTime)}</span>
                              </span>
                            </div>
                            <p className="text-xs text-[#666666] leading-relaxed pl-5">
                              {renderGroundedTextWithClickableTimestamps(ch.summary)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. KEY MOMENTS TOOL */}
                {activeAITool === 'keyMoments' && (() => {
                  const moments = aiAnalysisResults.keyMoments || [];
                  if (moments.length === 0) return <p className="text-xs text-[#666666]">No key moments extracted.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Key Moments & Highlights ({moments.length})</h3>
                      <div className="space-y-2.5">
                        {moments.map((km, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSeek(km.timestamp)}
                            className="p-3.5 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-xl transition-all cursor-pointer flex items-start gap-3 shadow-2xs"
                          >
                            <button className="px-2.5 py-1 bg-[#111111] text-white rounded text-[11px] font-mono-time font-bold flex items-center gap-1 shrink-0 mt-0.5">
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{formatDuration(km.timestamp)}</span>
                            </button>
                            <div className="space-y-1 flex-1">
                              <h4 className="text-xs font-bold text-[#111111]">{km.title}</h4>
                              <p className="text-xs text-[#666666] leading-relaxed">
                                {renderGroundedTextWithClickableTimestamps(km.explanation)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. ACTION ITEMS TOOL */}
                {activeAITool === 'actionItems' && (() => {
                  const items = aiAnalysisResults.actionItems || [];
                  if (items.length === 0) return <p className="text-xs text-[#666666]">No action items identified in transcript.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Action Items & Tasks ({items.length})</h3>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="p-3.5 bg-white border border-[#E5E5E5] rounded-xl flex items-start gap-3">
                            <input
                              type="checkbox"
                              defaultChecked={item.completed}
                              className="accent-[#111111] rounded mt-0.5 cursor-pointer w-4 h-4"
                            />
                            <div className="space-y-1.5 flex-1 text-xs">
                              <p className="font-semibold text-[#111111] leading-relaxed">{item.task}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#666666]">
                                <span className="px-2 py-0.5 bg-[#F0F0F0] rounded font-medium">
                                  Owner: <strong className="text-[#111111]">{item.owner || 'Not specified'}</strong>
                                </span>
                                <span className="px-2 py-0.5 bg-[#F0F0F0] rounded font-medium">
                                  Deadline: <strong className="text-[#111111]">{item.deadline || 'Not specified'}</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. QUESTIONS TOOL */}
                {activeAITool === 'questions' && (() => {
                  const qData = aiAnalysisResults.questions || { asked: [], unanswered: [] };
                  const asked = qData.asked || [];
                  const unanswered = qData.unanswered || [];

                  return (
                    <div className="space-y-6">
                      {/* Answered Questions */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                          Answered Questions ({asked.length})
                        </h3>
                        {asked.length === 0 ? (
                          <p className="text-xs text-[#666666]">No answered questions extracted.</p>
                        ) : (
                          <div className="space-y-3">
                            {asked.map((q, idx) => (
                              <div key={idx} className="p-4 bg-white border border-[#E5E5E5] rounded-xl space-y-2">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-bold text-[#111111] flex items-center gap-1.5">
                                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{q.question}</span>
                                  </span>
                                  {typeof q.timestamp === 'number' && (
                                    <button
                                      onClick={() => onSeek(q.timestamp!)}
                                      className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white rounded text-[11px] font-mono-time text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span>{formatDuration(q.timestamp)}</span>
                                    </button>
                                  )}
                                </div>
                                <div className="p-2.5 bg-[#FAFAFA] border border-[#EEEEEE] rounded-lg text-xs text-[#444444] space-y-1">
                                  <span className="font-semibold text-[#111111] block text-[11px]">Answer Summary:</span>
                                  <p>{renderGroundedTextWithClickableTimestamps(q.answerOrReason || 'Answered in transcript.')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Unanswered Questions */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                          Unanswered Questions ({unanswered.length})
                        </h3>
                        {unanswered.length === 0 ? (
                          <p className="text-xs text-[#666666]">No unanswered questions detected.</p>
                        ) : (
                          <div className="space-y-2">
                            {unanswered.map((q, idx) => (
                              <div key={idx} className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-1 text-xs">
                                <p className="font-semibold text-[#111111] flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{q.question}</span>
                                </p>
                                <p className="text-[#666666] pl-5 text-[11px]">
                                  Reason: {q.reason || 'Not addressed in recording.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 7. TOPICS TOOL */}
                {activeAITool === 'topics' && (() => {
                  const topics = aiAnalysisResults.topics || [];
                  if (topics.length === 0) return <p className="text-xs text-[#666666]">No topics identified.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Discussed Topics ({topics.length})</h3>
                      <div className="space-y-3">
                        {topics.map((top, idx) => (
                          <div key={idx} className="p-4 bg-white border border-[#E5E5E5] rounded-xl space-y-2">
                            <h4 className="text-xs font-bold text-[#111111] flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-[#111111]" />
                              <span>{top.name}</span>
                            </h4>
                            <p className="text-xs text-[#555555] leading-relaxed">
                              {renderGroundedTextWithClickableTimestamps(top.description)}
                            </p>
                            {top.timestamps && top.timestamps.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] text-[#888888] font-medium">Mentions at:</span>
                                {top.timestamps.map((ts, i) => (
                                  <button
                                    key={i}
                                    onClick={() => onSeek(ts)}
                                    className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white rounded text-[10px] font-mono-time text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Play className="w-2 h-2 fill-current" />
                                    <span>{formatDuration(ts)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 8. KEYWORDS TOOL */}
                {activeAITool === 'keywords' && (() => {
                  const keywords = aiAnalysisResults.keywords || [];
                  if (keywords.length === 0) return <p className="text-xs text-[#666666]">No keywords extracted.</p>;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Keywords & Technical Terms ({keywords.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {keywords.map((kw, idx) => (
                          <div key={idx} className="p-3 bg-white border border-[#E5E5E5] rounded-xl flex items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-[#111111] block">{kw.term}</span>
                              <span className="text-[10px] text-[#888888] font-medium uppercase tracking-wider">
                                {kw.category || 'General'}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 bg-[#F0F0F0] rounded-full text-[11px] font-mono-time font-bold text-[#111111]">
                              {kw.count} {kw.count === 1 ? 'mention' : 'mentions'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-[#888888] space-y-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-6">
                <Sparkles className="w-8 h-8 text-[#CCCCCC] mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#111111]">No analysis generated for {activeAITool.replace(/([A-Z])/g, ' $1').toLowerCase()} yet.</p>
                  <p className="text-[11px] text-[#777777]">Click "Generate" above to analyze your transcript with VEYRA AI.</p>
                </div>
                <button
                  disabled={isAnalyzing || segments.length === 0}
                  onClick={() => handleRunAITask(activeAITool)}
                  className="px-4 py-2 bg-[#111111] hover:bg-black text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate {activeAITool.replace(/([A-Z])/g, ' $1')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: AI CONTENT & DOCUMENT GENERATION */}
        {/* ============================================================ */}
        {activeTab === 'documents' && (() => {
          const DOC_TYPES = [
            { id: 'summary', name: 'Executive Summary', description: 'Executive overview of key themes, topics, and conclusions.' },
            { id: 'detailed_notes', name: 'Detailed Notes', description: 'Comprehensive study and fact documentation with hierarchical outlines.' },
            { id: 'meeting_minutes', name: 'Meeting Minutes', description: 'Standard business notes: agenda, discussion points, decisions, and actions.' },
            { id: 'study_notes', name: 'Study Notes', description: 'Focuses on definitions, core concepts, theories, and instructional summaries.' },
            { id: 'blog_draft', name: 'Blog Post Draft', description: 'Enthralling publishable blog draft with header hook, narrative body, and CTA.' },
            { id: 'article_outline', name: 'Article Outline', description: 'Rigorous structural breakdown with thesis, references, and expanders.' },
            { id: 'executive_brief', name: 'Executive Brief', description: 'Strategic strategic briefing outlining high-level advice for executives.' },
            { id: 'action_items', name: 'Action Items', description: 'Strict task tracker specifying owners, deliverables, and timetables.' },
            { id: 'faq', name: 'FAQ Sheet', description: 'Highly relevant viewer/reader questions coupled with precise answers.' },
            { id: 'key_takeaways', name: 'Key Takeaways', description: 'Top takeaways and main breakthroughs summarized for instant consumption.' },
            { id: 'interview_notes', name: 'Interview Notes', description: 'A structured breakdown mapping interviewer questions to guest answers.' },
            { id: 'revision_notes', name: 'Revision Cram Sheet', description: 'Cram check-lists, definitions, and compact summaries designed for review.' }
          ];

          const doc = project.generatedDocs?.[activeDocType];
          const isOutdated = doc && doc.transcriptHash !== currentTranscriptHash;

          return (
            <div className="p-4 sm:p-6 flex flex-col h-full min-h-0 overflow-y-auto space-y-6">
              
              {/* Header / Config Bar */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#FAFAFA] border border-[#E5E5E5] p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono-time uppercase tracking-wider text-[#777777]">
                    Document Builder Workspace
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={activeDocType}
                      onChange={(e) => {
                        setActiveDocType(e.target.value);
                        setDocError(null);
                      }}
                      className="px-3 py-1.5 bg-white border border-[#D4D4D4] rounded-lg text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                    >
                      {DOC_TYPES.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-[#666666] hidden md:inline">
                      ({DOC_TYPES.find(d => d.id === activeDocType)?.description})
                    </span>
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end">
                  {doc && (
                    <>
                      {/* Copy */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(doc.content);
                          setDocCopied(true);
                          setTimeout(() => setDocCopied(false), 2000);
                        }}
                        className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Copy raw content"
                      >
                        {docCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{docCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Export Markdown */}
                      <button
                        onClick={() => {
                          triggerFileDownload(
                            `# ${doc.title}\n\n${doc.content}`,
                            `${sanitizeFileName(project.name)}_${activeDocType}.md`,
                            'text/markdown'
                          );
                        }}
                        className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download as Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>MD</span>
                      </button>

                      {/* Export TXT */}
                      <button
                        onClick={() => {
                          triggerFileDownload(
                            `${doc.title}\n\n${doc.content}`,
                            `${sanitizeFileName(project.name)}_${activeDocType}.txt`,
                            'text/plain'
                          );
                        }}
                        className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Download as Text"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>TXT</span>
                      </button>
                    </>
                  )}

                  {/* Main Generate / Regenerate */}
                  <button
                    disabled={isGeneratingDoc || segments.length === 0}
                    onClick={() => handleGenerateDocument(activeDocType)}
                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-black text-white disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isGeneratingDoc ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>
                      {isGeneratingDoc
                        ? 'Generating...'
                        : doc
                        ? 'Regenerate'
                        : 'Generate Document'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {docError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error:</span> {docError}
                  </div>
                </div>
              )}

              {/* Loading / Empty / Content View */}
              {isGeneratingDoc ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-6">
                  <span className="w-6 h-6 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
                  <span className="text-xs text-[#111111] font-semibold text-center">
                    VEYRA AI is reading transcript, establishing timestamps, and building your document...
                  </span>
                  <span className="text-[11px] text-[#666666] text-center max-w-sm">
                    This takes a few seconds to perform safe source segment tracking.
                  </span>
                </div>
              ) : doc ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Outdated Notice */}
                  {isOutdated && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-in pulse duration-1000">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Transcript has been edited. Previously generated content may be outdated.</span>
                      </div>
                      <button
                        disabled={isGeneratingDoc || segments.length === 0}
                        onClick={() => handleGenerateDocument(activeDocType)}
                        className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-md text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Update Document</span>
                      </button>
                    </div>
                  )}

                  {/* Insufficient Information Banner */}
                  {doc.isInsufficient && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                      <div className="font-semibold mb-1 flex items-center gap-1.5 text-blue-800">
                        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Limited Transcript Depth Detected</span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        The video transcript is too short or doesn't have enough substance to compile a full template of this type. VEYRA has generated a truthful synthesis of what was said, without inventing placeholder details.
                      </p>
                    </div>
                  )}

                  {/* Split Dashboard for Document Content & Sections */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    
                    {/* Left/Top Sidebar: Chronological sections (traceability) */}
                    {doc.sections && doc.sections.length > 0 && (
                      <div className="xl:col-span-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                            Chronological Sections
                          </h4>
                          <span className="text-[10px] font-semibold bg-[#EAEAEA] px-1.5 py-0.5 rounded text-[#444444]">
                            {doc.sections.length} divisions
                          </span>
                        </div>
                        
                        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                          {doc.sections.map((sec: any, sIdx: number) => (
                            <button
                              key={sec.id || sIdx}
                              onClick={() => {
                                if (typeof sec.startTime === 'number') {
                                  onSeek(sec.startTime);
                                }
                              }}
                              className="w-full p-3 bg-white hover:bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#111111] rounded-xl text-left transition-all space-y-1.5 group/card cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#111111] text-[11px] leading-tight block group-hover/card:text-black">
                                  {sec.title || `Section ${sIdx + 1}`}
                                </span>
                                {typeof sec.startTime === 'number' && (
                                  <span className="px-1.5 py-0.5 bg-[#F0F0F0] text-[#111111] text-[10px] font-mono-time rounded font-semibold flex items-center gap-0.5 group-hover/card:bg-[#111111] group-hover/card:text-white transition-colors">
                                    <Play className="w-2 h-2 fill-current" />
                                    <span>{formatDuration(sec.startTime)}</span>
                                  </span>
                                )}
                              </div>
                              {sec.text && (
                                <p className="text-[11px] text-[#666666] line-clamp-2 leading-relaxed">
                                  {sec.text}
                                </p>
                              )}
                              {sec.segmentIds && sec.segmentIds.length > 0 && (
                                <span className="text-[9px] text-[#999999] font-medium block">
                                  Grounded in {sec.segmentIds.length} segments
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Right/Bottom Main Pane: Beautiful rendered text */}
                    <div className="xl:col-span-2 bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                      <div className="border-b border-[#F0F0F0] pb-4 space-y-1.5">
                        <span className="text-[10px] font-bold text-[#888888] tracking-widest uppercase block">
                          VEYRA Synthesized Document
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-[#111111]">
                          {doc.title || DOC_TYPES.find(d => d.id === activeDocType)?.name}
                        </h2>
                        <span className="text-[10px] text-[#888888] font-mono-time">
                          Last built: {new Date(doc.updatedAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Content Render */}
                      <div className="prose max-w-none pt-2">
                        {renderMarkdownToHtml(doc.content)}
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                // Empty State
                <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center text-[#999999] shadow-2xs">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="font-bold text-[#111111] text-sm">
                      Generate {DOC_TYPES.find(d => d.id === activeDocType)?.name}
                    </h3>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Instantly compile a beautifully grounded, source-traceable document from your actual video transcript. Select section segments to jump directly to those moments.
                    </p>
                  </div>
                  <button
                    disabled={isGeneratingDoc || segments.length === 0}
                    onClick={() => handleGenerateDocument(activeDocType)}
                    className="px-4 py-2 bg-[#111111] hover:bg-black text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Document</span>
                  </button>
                </div>
              )}

            </div>
          );
        })()}
      </div>

      {/* ============================================================ */}
      {/* MODAL: SPEAKER MANAGEMENT & DIARIZATION */}
      {/* ============================================================ */}
      {showSpeakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E5E5E5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">Speaker Management & Diarization</h3>
                  <p className="text-[11px] text-[#666666]">
                    Manage speaker identities, merge duplicates, and inspect speech distribution.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSpeakerModal(false);
                  setMergingSpeakerSource(null);
                  setMergingSpeakerTarget(null);
                }}
                className="p-1.5 text-[#888888] hover:text-[#111111] hover:bg-[#EEEEEE] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#888888] block">
                    Speakers
                  </span>
                  <span className="text-lg font-bold text-[#111111] font-mono-time">
                    {speakerStats.totalSpeakers}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#888888] block">
                    Total Speech Time
                  </span>
                  <span className="text-lg font-bold text-[#111111] font-mono-time">
                    {formatDuration(speakerStats.totalSpokenDuration)}
                  </span>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#888888] block">
                    Total Words
                  </span>
                  <span className="text-lg font-bold text-[#111111] font-mono-time">
                    {speakerStats.totalWordsCount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Speaker List with Metrics */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Detected Speakers ({speakerStats.totalSpeakers})
                </h4>

                <div className="space-y-2.5">
                  {speakerStats.list.map((spk) => {
                    const style = getSpeakerBadgeStyle(spk.id);
                    return (
                      <div
                        key={spk.id}
                        className="p-3.5 bg-white border border-[#E5E5E5] rounded-xl space-y-2 hover:border-[#D4D4D4] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${style.bg} ${style.text} border ${style.border}`}
                            >
                              {spk.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-bold text-[#111111] text-xs block">{spk.name}</span>
                              <span className="text-[10px] font-mono-time text-[#777777]">
                                ID: {spk.id} · {spk.segmentCount} segments
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-xs font-bold text-[#111111] font-mono-time block">
                                {formatDuration(spk.totalDuration)} ({spk.durationPercentage.toFixed(1)}%)
                              </span>
                              <span className="text-[10px] text-[#888888] font-mono-time">
                                {spk.wordCount} words
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setRenamingSpeaker({ id: spk.id, name: spk.name });
                                setShowSpeakerModal(false);
                              }}
                              className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-[#111111] hover:text-white rounded text-[11px] font-semibold text-[#111111] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Rename speaker"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Rename</span>
                            </button>
                          </div>
                        </div>

                        {/* Speech Proportion Progress Bar */}
                        <div className="w-full bg-[#F0F0F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${style.dot} transition-all duration-300`}
                            style={{ width: `${Math.max(2, spk.durationPercentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Merge Speakers Tool */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Merge className="w-4 h-4 text-[#111111]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">Merge Duplicate Speakers</h4>
                    <p className="text-[11px] text-[#666666]">
                      Reassign all transcript segments from one speaker to another.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                    <span className="text-[11px] text-[#666666]">Merge:</span>
                    <select
                      value={mergingSpeakerSource || ''}
                      onChange={(e) => setMergingSpeakerSource(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none"
                    >
                      <option value="">Select source speaker...</option>
                      {speakers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-[#888888] font-bold">into</span>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                    <span className="text-[11px] text-[#666666]">Target:</span>
                    <select
                      value={mergingSpeakerTarget || ''}
                      onChange={(e) => setMergingSpeakerTarget(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none"
                    >
                      <option value="">Select target speaker...</option>
                      {speakers
                        .filter((s) => s.id !== mergingSpeakerSource)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    disabled={!mergingSpeakerSource || !mergingSpeakerTarget}
                    onClick={() => {
                      if (mergingSpeakerSource && mergingSpeakerTarget) {
                        handleMergeSpeakers(mergingSpeakerSource, mergingSpeakerTarget);
                      }
                    }}
                    className="px-4 py-1.5 bg-[#111111] hover:bg-black disabled:opacity-40 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Merge Speakers
                  </button>
                </div>
              </div>

              {/* Add New Speaker */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Add New Speaker</span>
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSpeakerNameInput}
                    onChange={(e) => setNewSpeakerNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewSpeaker(newSpeakerNameInput)}
                    placeholder="e.g. Dr. Jane Smith, Moderator..."
                    className="flex-1 px-3 py-1.5 bg-white border border-[#D4D4D4] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                  <button
                    disabled={!newSpeakerNameInput.trim()}
                    onClick={() => handleAddNewSpeaker(newSpeakerNameInput)}
                    className="px-4 py-1.5 bg-[#111111] hover:bg-black disabled:opacity-40 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Add Speaker
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-end">
              <button
                onClick={() => {
                  setShowSpeakerModal(false);
                  setMergingSpeakerSource(null);
                  setMergingSpeakerTarget(null);
                }}
                className="px-4 py-1.5 bg-[#111111] text-white hover:bg-black rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REASSIGN SEGMENT SPEAKER */}
      {/* ============================================================ */}
      {reassigningSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#111111]" />
                <h3 className="text-xs font-bold text-[#111111]">
                  Change Speaker for Segment [{formatDuration(reassigningSegment.startTime)}]
                </h3>
              </div>
              <button
                onClick={() => setReassigningSegment(null)}
                className="p-1 text-[#888888] hover:text-[#111111] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Segment Preview */}
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#888888] block">Segment Text:</span>
                <p className="text-xs text-[#333333] line-clamp-3 leading-relaxed italic">
                  "{reassigningSegment.text}"
                </p>
              </div>

              {/* Assign to existing speaker */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block">
                  Select Speaker:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {speakers.map((spk) => {
                    const isCurrent = (reassigningSegment.speakerId || 'spk_1') === spk.id;
                    const style = getSpeakerBadgeStyle(spk.id);
                    return (
                      <button
                        key={spk.id}
                        onClick={() => handleReassignSegmentSpeaker(reassigningSegment.id, spk.id)}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FAFAFA] border-[#111111] font-bold'
                            : 'bg-white border-[#E5E5E5] hover:border-[#111111] hover:bg-[#FCFCFC]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                          <span className="text-xs text-[#111111]">{spk.name}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider text-[#111111] font-bold">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shortcut to rename speaker across project */}
              <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    const currName = speakerMap.get(reassigningSegment.speakerId) || reassigningSegment.speakerId;
                    setRenamingSpeaker({ id: reassigningSegment.speakerId, name: currName });
                    setReassigningSegment(null);
                  }}
                  className="text-xs font-semibold text-[#111111] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Rename "{speakerMap.get(reassigningSegment.speakerId) || reassigningSegment.speakerId}" everywhere</span>
                </button>
                <button
                  onClick={() => setReassigningSegment(null)}
                  className="px-3 py-1 bg-white border border-[#D4D4D4] rounded text-xs text-[#666666] hover:text-[#111111] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
