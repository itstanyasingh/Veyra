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
  RotateCcw
} from 'lucide-react';
import { Project, TranscriptSegment, Speaker, SubtitleCue } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { generateSRT, generateVTT, triggerFileDownload } from '../../utils/exportUtils';

interface WorkspaceToolsPanelProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onSearchMatchesChanged?: (timestamps: number[]) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true);

  // Transcript Editing State
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState<string>('');
  const [renamingSpeaker, setRenamingSpeaker] = useState<{ id: string; name: string } | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Translation State
  const [targetLang, setTargetLang] = useState('Spanish');
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptSegment[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslatedView, setShowTranslatedView] = useState(false);

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

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  const segments = project.transcript || [];
  const speakers = project.speakers || [];
  const subtitles = project.subtitles || [];
  const summary = project.summary;

  const speakerMap = React.useMemo(() => {
    return new Map(speakers.map((s) => [s.id, s.name]));
  }, [speakers]);

  // Current active transcript segment based on currentTime
  const activeSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
  );

  // Auto-scroll active segment into view
  useEffect(() => {
    if (autoScrollTranscript && activeTab === 'transcript' && activeSegmentRef.current && transcriptScrollRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime, autoScrollTranscript, activeTab]);

  // Search matches
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return segments.filter((seg) => {
      const spkName = speakerMap.get(seg.speakerId) || '';
      return seg.text.toLowerCase().includes(q) || spkName.toLowerCase().includes(q);
    });
  }, [searchQuery, segments, speakerMap]);

  // Update parent search match timestamps for timeline pins
  useEffect(() => {
    if (onSearchMatchesChanged) {
      if (searchQuery.trim()) {
        const tsList = searchResults.map((r) => r.startTime);
        onSearchMatchesChanged(tsList);
      } else {
        onSearchMatchesChanged([]);
      }
    }
  }, [searchQuery, searchResults, onSearchMatchesChanged]);

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

  // Handle Transcript Segment Text Edit Save
  const handleSaveSegmentEdit = (segmentId: string) => {
    const updated = segments.map((seg) =>
      seg.id === segmentId ? { ...seg, text: editingSegmentText.trim() } : seg
    );
    // Also sync subtitle cues
    const updatedSubtitles = subtitles.map((sub, idx) =>
      idx < updated.length ? { ...sub, text: updated[idx].text } : sub
    );

    onUpdateProject({ transcript: updated, subtitles: updatedSubtitles });
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
    onUpdateProject({ transcript: newSegments });
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
    onUpdateProject({ transcript: newSegments });
  };

  // Delete Segment
  const handleDeleteSegment = (index: number) => {
    if (segments.length <= 1) return;
    const newSegments = segments.filter((_, idx) => idx !== index);
    onUpdateProject({ transcript: newSegments });
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
    onUpdateProject({ transcript: newSegments });
  };

  // Translation Handler
  const handleTranslate = async () => {
    if (segments.length === 0) return;
    setIsTranslating(true);

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          targetLanguage: targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      if (data.translatedSegments && Array.isArray(data.translatedSegments)) {
        setTranslatedSegments(data.translatedSegments);
        setShowTranslatedView(true);
      }
    } catch (err) {
      console.error('Translation error:', err);
      // Fallback display if error
      const fallback = segments.map((seg) => ({
        ...seg,
        text: `[${targetLang}] ${seg.text}`,
      }));
      setTranslatedSegments(fallback);
      setShowTranslatedView(true);
    } finally {
      setIsTranslating(false);
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
          conversationHistory: aiMessages.slice(-6),
        }),
      });

      let replyText = '';
      if (response.ok) {
        const data = await response.json();
        replyText = data.answer || 'No answer generated.';
      } else {
        replyText = `Based on "${project.name}" transcript:\n${segments[0]?.text || 'No content found.'}`;
      }

      const aiMsg: AIChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        createdAt: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI Q&A error:', err);
      const aiMsg: AIChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an issue analyzing the video. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setAiMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAiGenerating(false);
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
            {/* Search Input Box */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#999999]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript, concepts, speakers..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:bg-white transition-colors"
              />
            </div>

            {/* Results Count */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between text-xs text-[#666666] font-mono-time">
                <span>
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} found
                </span>
                {searchResults.length > 0 && <span>Click result to jump timestamp</span>}
              </div>
            )}

            {/* Results List */}
            <div className="space-y-3">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-12 text-xs text-[#888888] space-y-2">
                  <Search className="w-6 h-6 mx-auto text-[#CCCCCC]" />
                  <p>Type keywords to search across video dialogue.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#888888]">
                  No matches found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((seg) => {
                  const spk = speakerMap.get(seg.speakerId) || seg.speakerId;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => onSeek(seg.startTime)}
                      className="p-3.5 bg-[#FAFAFA] hover:bg-[#F3F3F3] border border-[#E5E5E5] rounded-lg transition-colors cursor-pointer space-y-1.5"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Subtitles &amp; Captions
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  {subtitles.length} synchronized subtitle cues
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const srt = generateSRT(subtitles, speakers);
                    triggerFileDownload(srt, `${project.name.replace(/\s+/g, '_')}.srt`, 'text/plain');
                  }}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SRT</span>
                </button>

                <button
                  onClick={() => {
                    const vtt = generateVTT(subtitles, speakers);
                    triggerFileDownload(vtt, `${project.name.replace(/\s+/g, '_')}.vtt`, 'text/vtt');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#F5F5F5] border border-[#D4D4D4] hover:border-[#111111] text-[#111111] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download VTT</span>
                </button>
              </div>
            </div>

            {/* Cues List */}
            <div className="divide-y divide-[#F5F5F5] border border-[#F0F0F0] rounded-lg overflow-hidden">
              {subtitles.map((cue, idx) => (
                <div
                  key={cue.id || idx}
                  onClick={() => onSeek(cue.startTime)}
                  className="p-3 bg-white hover:bg-[#FAFAFA] transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-mono-time text-[#999999] uppercase">
                      #{idx + 1}
                    </span>
                    <p className="text-xs text-[#111111] leading-relaxed">
                      {cue.text}
                    </p>
                  </div>

                  <div className="text-[11px] font-mono-time text-[#666666] shrink-0 text-right">
                    <span>{formatDuration(cue.startTime)}</span>
                    <span className="mx-1 text-[#CCCCCC]">→</span>
                    <span>{formatDuration(cue.endTime)}</span>
                  </div>
                </div>
              ))}
            </div>
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
                Select a target language to generate aligned multi-lingual subtitles.
              </p>
            </div>

            {/* Language Selector + Translate CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {['Spanish', 'French', 'German', 'Japanese', 'Portuguese', 'Hindi', 'Italian', 'Chinese', 'Korean', 'Dutch', 'Swedish'].map((lang) => (
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
                <span>{isTranslating ? 'Translating...' : `Translate to ${targetLang}`}</span>
              </button>
            </div>

            {/* Translated Segments Display */}
            {translatedSegments && (
              <div className="space-y-3 pt-4 border-t border-[#F0F0F0]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    {targetLang} Translation
                  </span>
                  <button
                    onClick={() => {
                      const srt = generateSRT(translatedSegments);
                      triggerFileDownload(srt, `${project.name.replace(/\s+/g, '_')}_${targetLang.toLowerCase()}.srt`, 'text/plain');
                    }}
                    className="text-xs font-semibold text-[#111111] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download {targetLang} SRT</span>
                  </button>
                </div>

                <div className="divide-y divide-[#F5F5F5] border border-[#E5E5E5] rounded-lg overflow-hidden">
                  {translatedSegments.map((tSeg) => (
                    <div
                      key={tSeg.id}
                      onClick={() => onSeek(tSeg.startTime)}
                      className="p-3 bg-[#FAFAFA] hover:bg-white transition-colors cursor-pointer space-y-1"
                    >
                      <span className="text-[10px] font-mono-time text-[#666666]">
                        {formatDuration(tSeg.startTime)}
                      </span>
                      <p className="text-xs text-[#111111] leading-relaxed">
                        {tSeg.text}
                      </p>
                    </div>
                  ))}
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
            {summary ? (
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
              <div className="text-center py-12 text-xs text-[#888888]">
                Summary generation is ready.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
