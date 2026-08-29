import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { Project, TranscriptSegment, Speaker, SubtitleCue } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { generateSRT, generateVTT, triggerFileDownload, sanitizeFileName } from '../../utils/exportUtils';

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

const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;

  const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
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
};

interface WorkspaceToolsPanelProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onSearchMatchesChanged?: (timestamps: number[]) => void;
  activeCaptionLanguage?: string;
  setActiveCaptionLanguage?: (lang: string) => void;
}

type TabType = 'transcript' | 'search' | 'subtitles' | 'translate' | 'ai' | 'summary';

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

  // Transcript Editing State
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState<string>('');
  const [renamingSpeaker, setRenamingSpeaker] = useState<{ id: string; name: string } | null>(null);

  // Subtitle Editing State
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editingCueText, setEditingCueText] = useState<string>('');
  const [editingCueStart, setEditingCueStart] = useState<string>('');
  const [editingCueEnd, setEditingCueEnd] = useState<string>('');
  const [cueValidationError, setCueValidationError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState<string>('source');
  const [focusedMatchIndex, setFocusedMatchIndex] = useState<number>(0);
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

  // Summary State
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  // Save updated subtitle list to project state
  const saveSubtitlesList = (newCues: SubtitleCue[]) => {
    const sorted = [...newCues]
      .sort((a, b) => a.startTime - b.startTime)
      .map((cue, idx) => ({
        ...cue,
        index: idx + 1,
      }));

    if (activeCaptionLanguage === 'source') {
      onUpdateProject({ subtitles: sorted });
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

  // Current active transcript segment based on currentTime
  const activeSegmentIndex = React.useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    );
  }, [segments, currentTime]);

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
    setSummaryError(null);
    setIsAiGenerating(false);
    setIsTranslating(false);
    setIsGeneratingSummary(false);
  }, [project.name, project.mediaUrl]);

  // Search matches with intelligent ranking & multi-language support
  const searchResults = React.useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return [];

    const q = rawQuery.toLowerCase();
    const queryWords = q.split(/\s+/).filter(Boolean);

    const targetSegs = (searchLang !== 'source' && project.translations?.[searchLang])
      ? project.translations[searchLang]
      : segments;

    const scoredMatches: { seg: TranscriptSegment; score: number }[] = [];

    targetSegs.forEach((seg) => {
      const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      const textLower = seg.text.toLowerCase();
      const spkLower = spkName.toLowerCase();

      let score = 0;

      // Priority 1: Exact phrase match in text or speaker
      if (textLower.includes(q)) {
        score += 100;
      } else if (spkLower.includes(q)) {
        score += 50;
      }

      // Priority 2: All query words present
      const allWordsInText = queryWords.every((word) => textLower.includes(word) || spkLower.includes(word));
      if (allWordsInText && queryWords.length > 1) {
        score += 30;
      }

      // Priority 3: Some query words present
      const matchedWordsCount = queryWords.filter((word) => textLower.includes(word) || spkLower.includes(word)).length;
      if (matchedWordsCount > 0) {
        score += matchedWordsCount * 5;
      }

      if (score > 0) {
        scoredMatches.push({ seg, score });
      }
    });

    return scoredMatches
      .sort((a, b) => b.score - a.score || a.seg.startTime - b.seg.startTime)
      .map((item) => item.seg);
  }, [searchQuery, segments, project.translations, searchLang, speakerMap]);

  // Reset focused match index when search query or target language changes
  useEffect(() => {
    setFocusedMatchIndex(0);
  }, [searchQuery, searchLang]);

  // Handle Search Result Next / Prev Navigation
  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (focusedMatchIndex + 1) % searchResults.length;
    setFocusedMatchIndex(nextIdx);
    const targetSeg = searchResults[nextIdx];
    if (targetSeg) {
      onSeek(targetSeg.startTime);
    }
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (focusedMatchIndex - 1 + searchResults.length) % searchResults.length;
    setFocusedMatchIndex(prevIdx);
    const targetSeg = searchResults[prevIdx];
    if (targetSeg) {
      onSeek(targetSeg.startTime);
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
      const tsList = searchQuery.trim() ? searchResults.map((r) => r.startTime) : [];
      const key = tsList.join(',');
      if (prevMatchesStrRef.current !== key) {
        prevMatchesStrRef.current = key;
        onSearchMatchesChangedRef.current(tsList);
      }
    }
  }, [searchQuery, searchResults]);

  // Handle Speaker Renaming (replaces across all segments & project state)
  const handleSaveSpeakerName = () => {
    if (!renamingSpeaker) return;
    const newName = renamingSpeaker.name.trim();
    if (!newName) {
      setRenamingSpeaker(null);
      return;
    }

    const updatedSpeakers = speakers.map((s) =>
      s.id === renamingSpeaker.id ? { ...s, name: newName } : s
    );

    onUpdateProject({ speakers: updatedSpeakers });
    setRenamingSpeaker(null);
  };

  // Centralized Transcript Edit Sync Helper
  const handleTranscriptChange = (newTranscript: TranscriptSegment[]) => {
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
    handleTranscriptChange(updated);
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
    handleTranscriptChange(newSegments);
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
    handleTranscriptChange(newSegments);
  };

  // Delete Segment
  const handleDeleteSegment = (index: number) => {
    if (segments.length <= 1) return;
    const newSegments = segments.filter((_, idx) => idx !== index);
    handleTranscriptChange(newSegments);
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
    handleTranscriptChange(newSegments);
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

  // Real AI Summary generation handler
  const handleGenerateSummary = async (selectedLength: 'short' | 'medium' | 'detailed') => {
    if (segments.length === 0) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          length: selectedLength,
          projectName: project.name,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate summary (HTTP ${response.status})`);
      }

      const data = await response.json();
      onUpdateProject({ summary: data });
    } catch (err: any) {
      console.error('Summary generation error:', err);
      setSummaryError(err?.message || 'Failed to generate summary. Please check your API key configuration and try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
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
        </div>

        {/* Sync Auto-Scroll Toggle in Transcript mode */}
        {activeTab === 'transcript' && (
          <label className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono-time text-[#666666] pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScrollTranscript}
              onChange={(e) => setAutoScrollTranscript(e.target.checked)}
              className="accent-[#111111] rounded cursor-pointer"
            />
            <span>Sync playhead</span>
          </label>
        )}
      </div>

      {/* Speaker Rename Modal / Inline popup */}
      {renamingSpeaker && (
        <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#111111]" />
            <span className="font-semibold text-[#111111]">Rename Speaker:</span>
            <input
              type="text"
              value={renamingSpeaker.name}
              onChange={(e) => setRenamingSpeaker({ ...renamingSpeaker, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSpeakerName()}
              autoFocus
              className="px-2 py-1 bg-white border border-[#111111] rounded text-xs text-[#111111] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveSpeakerName}
              className="px-3 py-1 bg-[#111111] text-white rounded font-medium text-xs hover:bg-black cursor-pointer"
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
          <div className="divide-y divide-[#F5F5F5]">
            {segments.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#888888]">
                No transcript segments available.
              </div>
            ) : (
              segments.map((segment, index) => {
                const isActive = index === activeSegmentIndex;
                const isEditing = editingSegmentId === segment.id;
                const speakerName = speakerMap.get(segment.speakerId) || segment.speakerId;

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
                      <div className="flex items-center gap-2">
                        {/* Clickable timestamp seeks video */}
                        <button
                          onClick={() => onSeek(segment.startTime)}
                          className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white text-[#111111] rounded text-[11px] font-mono-time transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Jump to ${formatDuration(segment.startTime)}`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatDuration(segment.startTime)}</span>
                        </button>

                        {/* Speaker tag (click to rename) */}
                        <button
                          onClick={() => setRenamingSpeaker({ id: segment.speakerId, name: speakerName })}
                          className="text-xs font-bold text-[#111111] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Click to rename speaker"
                        >
                          <span>{speakerName}</span>
                          <Edit2 className="w-2.5 h-2.5 text-[#999999] opacity-0 group-hover/seg:opacity-100" />
                        </button>
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
                          onClick={() => handleSplitSegment(index)}
                          className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                          title="Split segment"
                        >
                          <Split className="w-3 h-3" />
                        </button>
                        {index < segments.length - 1 && (
                          <button
                            onClick={() => handleMergeNext(index)}
                            className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                            title="Merge with next segment"
                          >
                            <Merge className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAddSegmentAfter(index)}
                          className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer"
                          title="Insert segment below"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSegment(index)}
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
                        {segment.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SEARCH */}
        {/* ============================================================ */}
        {activeTab === 'search' && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Search Input Box & Controls */}
            <div className="space-y-3">
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#999999]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        handlePrevMatch();
                      } else {
                        handleNextMatch();
                      }
                    }
                  }}
                  placeholder="Search transcript, concepts, speakers..."
                  autoFocus
                  className="w-full pl-9 pr-9 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFocusedMatchIndex(0);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999999] hover:text-[#111111] transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Multi-language Search Selection */}
              {project.translations && Object.keys(project.translations).length > 0 && (
                <div className="flex items-center justify-between text-xs text-[#666666]">
                  <span className="font-medium text-[#111111]">Search Target Language:</span>
                  <select
                    value={searchLang}
                    onChange={(e) => setSearchLang(e.target.value)}
                    className="px-2 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
                  >
                    <option value="source">Original (Source Language)</option>
                    {Object.keys(project.translations).map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Results Header & Navigation Controls */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between text-xs text-[#666666] font-mono-time pb-1 border-b border-[#F0F0F0]">
                <span>
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} found
                </span>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#888888]">
                      {focusedMatchIndex + 1} of {searchResults.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePrevMatch}
                        className="p-1 hover:bg-[#F0F0F0] rounded text-[#111111] transition-colors cursor-pointer"
                        title="Previous match (Shift+Enter)"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleNextMatch}
                        className="p-1 hover:bg-[#F0F0F0] rounded text-[#111111] transition-colors cursor-pointer"
                        title="Next match (Enter)"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Stream / Empty States */}
            <div className="space-y-3">
              {segments.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                  <Search className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                  <p className="font-semibold text-[#111111]">No transcript available</p>
                  <p className="text-[#666666]">Transcribe the video first to search its contents.</p>
                </div>
              ) : searchQuery.trim() === '' ? (
                <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                  <Search className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                  <p className="font-semibold text-[#111111]">Search this video's transcript</p>
                  <p className="text-[#666666]">Find words, phrases, topics, or moments in the video.</p>
                  <div className="pt-2 text-[10px] text-[#999999] font-mono-time">
                    Press <kbd className="px-1.5 py-0.5 bg-[#F0F0F0] border border-[#E0E0E0] rounded font-semibold text-[#111111]">Cmd/Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#F0F0F0] border border-[#E0E0E0] rounded font-semibold text-[#111111]">F</kbd> anytime to search
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#888888] space-y-1">
                  <p className="font-semibold text-[#111111]">No matches found</p>
                  <p className="text-[#666666]">No transcript segments match "{searchQuery}".</p>
                </div>
              ) : (
                searchResults.map((seg, idx) => {
                  const spk = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
                  const isFocused = idx === focusedMatchIndex;
                  const isPlaying = currentTime >= seg.startTime && currentTime <= seg.endTime;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => {
                        setFocusedMatchIndex(idx);
                        onSeek(seg.startTime);
                      }}
                      className={`p-3.5 border rounded-lg transition-all cursor-pointer space-y-1.5 ${
                        isFocused
                          ? 'bg-white border-[#111111] shadow-xs ring-1 ring-[#111111]'
                          : isPlaying
                          ? 'bg-[#FAFAFA] border-[#D4D4D4]'
                          : 'bg-[#FAFAFA] hover:bg-white border-[#E5E5E5]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono-time">
                        <span className="font-bold text-[#111111]">
                          <HighlightedText text={spk} query={searchQuery} />
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                          isPlaying ? 'bg-[#111111] text-white' : 'bg-white border border-[#E5E5E5] text-[#111111]'
                        }`}>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatDuration(seg.startTime)}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#333333] leading-relaxed">
                        <HighlightedText text={seg.text} query={searchQuery} />
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
                {activeSubtitlesList.map((cue, idx) => {
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
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Translate Video Content
              </h3>
              <p className="text-xs text-[#666666]">
                Select a target language to generate aligned multi-lingual subtitles using Gemini AI.
              </p>
            </div>

            {/* Language Selector + Translate CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={targetLang}
                onChange={(e) => {
                  const lang = e.target.value;
                  setTargetLang(lang);
                  if (project.translations?.[lang]) {
                    setTranslatedSegments(project.translations[lang]);
                    setShowTranslatedView(true);
                    setTranslationError(null);
                  } else {
                    setTranslatedSegments(null);
                    setShowTranslatedView(false);
                  }
                }}
                className="w-full sm:w-52 px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {[
                  'English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Italian',
                  'Japanese', 'Korean', 'Chinese', 'Arabic', 'Russian', 'Bengali', 'Marathi',
                  'Telugu', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu',
                  'Dutch', 'Swedish'
                ].map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="w-full sm:w-auto px-5 py-2 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isTranslating ? (translationProgress || 'Translating...') : `Translate to ${targetLang}`}</span>
              </button>
            </div>

            {translationError && (
              <div className="p-3.5 bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] rounded-lg text-xs leading-relaxed">
                <span className="font-bold">Error:</span> {translationError}
              </div>
            )}

            {/* Original / Translated View Toggle & Segments Display */}
            {translatedSegments && (
              <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTranslatedView(false)}
                      className={`px-3 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                        !showTranslatedView
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#111111]'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setShowTranslatedView(true)}
                      className={`px-3 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                        showTranslatedView
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#111111]'
                      }`}
                    >
                      {targetLang} ({translatedSegments.length} segments)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const targetSegs = showTranslatedView ? translatedSegments : segments;
                        const srt = generateSRT(targetSegs.map((seg, idx) => ({
                          id: seg.id || `sub_${idx}`,
                          index: idx + 1,
                          startTime: seg.startTime,
                          endTime: seg.endTime,
                          text: seg.text,
                        })), project.speakers || []);
                        const suffix = showTranslatedView ? `_${targetLang.toLowerCase()}` : '_original';
                        triggerFileDownload(srt, `${sanitizeFileName(project.name)}${suffix}.srt`, 'text/plain');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs font-semibold text-[#111111] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export SRT</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#F5F5F5] border border-[#E5E5E5] rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                  {(showTranslatedView ? translatedSegments : segments).map((seg) => {
                    const spk = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
                    return (
                      <div
                        key={seg.id}
                        onClick={() => onSeek(seg.startTime)}
                        className="p-3.5 bg-[#FAFAFA] hover:bg-white transition-colors cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-mono-time">
                          <span className="font-bold text-[#111111]">{spk}</span>
                          <span className="px-2 py-0.5 bg-white border border-[#E5E5E5] rounded text-[11px] text-[#111111] flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{formatDuration(seg.startTime)}</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#333333] leading-relaxed">
                          {seg.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
        {/* TAB 6: SUMMARY & CHAPTERS */}
        {/* ============================================================ */}
        {activeTab === 'summary' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Length Selector + Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#111111]">Summary Length:</span>
                <div className="flex gap-1 bg-[#F0F0F0] p-0.5 rounded">
                  {(['short', 'medium', 'detailed'] as const).map((l) => (
                    <button
                      key={l}
                      disabled={isGeneratingSummary}
                      onClick={() => setSummaryLength(l)}
                      className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${
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

              <button
                disabled={isGeneratingSummary || segments.length === 0}
                onClick={() => handleGenerateSummary(summaryLength)}
                className="w-full sm:w-auto px-4 py-1.5 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingSummary ? 'Generating...' : summary ? 'Regenerate' : 'Generate'}</span>
              </button>
            </div>

            {summaryError && (
              <div className="p-3.5 bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] rounded-lg text-xs leading-relaxed">
                <span className="font-bold">Error:</span> {summaryError}
              </div>
            )}

            {isGeneratingSummary ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <span className="w-5 h-5 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
                <span className="text-xs text-[#666666] text-center">VEYRA AI is analyzing the transcript and synthesizing the summary...</span>
              </div>
            ) : summary ? (
              <>
                {/* Executive Overview */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Executive Overview
                  </h3>
                  <p className="text-xs sm:text-sm text-[#333333] leading-relaxed bg-[#FAFAFA] border border-[#E5E5E5] p-4 rounded-lg">
                    {summary.overview}
                  </p>
                </div>

                {/* Key Points */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Key Takeaways
                  </h3>
                  <div className="space-y-2">
                    {summary.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#333333]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#111111] mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Chapters */}
                {summary.chapters && summary.chapters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Video Chapters
                    </h3>
                    <div className="divide-y divide-[#F5F5F5] border border-[#E5E5E5] rounded-lg overflow-hidden">
                      {summary.chapters.map((chapter, idx) => (
                        <div
                          key={idx}
                          onClick={() => onSeek(chapter.startTime)}
                          className="p-3.5 bg-white hover:bg-[#FAFAFA] transition-colors cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#111111]">{chapter.title}</span>
                            <span className="px-2 py-0.5 bg-[#F0F0F0] rounded text-[11px] font-mono-time text-[#111111] flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{formatDuration(chapter.startTime)}</span>
                            </span>
                          </div>
                          <p className="text-xs text-[#666666] leading-relaxed">
                            {chapter.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Action Items
                    </h3>
                    <div className="space-y-2">
                      {summary.actionItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-[#333333]">
                          <input type="checkbox" className="accent-[#111111] rounded" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                <p>No summary has been generated for this video yet.</p>
                <p className="text-[11px] text-[#999999]">Choose a summary length above and click "Generate".</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
