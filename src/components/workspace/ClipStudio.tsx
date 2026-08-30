import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Download, 
  Copy, 
  Sparkles, 
  Check, 
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Project, VideoClip, TranscriptSegment } from '../../types';
import { formatDuration } from '../../utils/formatters';

interface ClipStudioProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  playerControllerRef: React.MutableRefObject<any>;
  // Support draft clips passed from external triggers (e.g. key moments, chapters, intelligence hub)
  externalDraft: { name: string; startTime: number; endTime: number } | null;
  clearExternalDraft: () => void;
}

export const ClipStudio: React.FC<ClipStudioProps> = ({
  project,
  currentTime,
  onSeek,
  onUpdateProject,
  playerControllerRef,
  externalDraft,
  clearExternalDraft,
}) => {
  const duration = project.duration || 60;
  const clips = project.clips || [];

  // Local state for clip builder
  const [clipName, setClipName] = useState('My Clip');
  const [startTimeStr, setStartTimeStr] = useState('0:00');
  const [endTimeStr, setEndTimeStr] = useState('0:30');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Editing state
  const [editingClipId, setEditingClipId] = useState<string | null>(null);

  // Preview Mode State
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewStart, setPreviewStart] = useState<number | null>(null);
  const [previewEnd, setPreviewEnd] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  // Status indicators
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [suggestingClips, setSuggestingClips] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    title: string;
    startTime: number;
    endTime: number;
    reason: string;
    sourceType: string;
  }>>([]);

  // Parse custom format strings e.g. "01:24:12" or "12:34" or raw seconds
  const parseTimeInput = (str: string): number | null => {
    if (!str) return null;
    const clean = str.trim();
    if (!isNaN(Number(clean))) {
      const val = Number(clean);
      return val >= 0 ? val : null;
    }
    const parts = clean.split(':').map(Number);
    if (parts.some(isNaN)) return null;

    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  };

  // Synchronize external drafts (like from Chapters, Key Moments, or Intelligence Hub)
  useEffect(() => {
    if (externalDraft) {
      setClipName(externalDraft.name);
      setStartTimeStr(formatDuration(externalDraft.startTime));
      setEndTimeStr(formatDuration(externalDraft.endTime));
      setEditingClipId(null); // Reset editing mode
      setValidationError(null);
      clearExternalDraft();
    }
  }, [externalDraft]);

  // Handle active preview boundaries during playback ticks
  useEffect(() => {
    if (isPreviewMode && previewStart !== null && previewEnd !== null) {
      if (currentTime >= previewEnd) {
        if (isLooping) {
          onSeek(previewStart);
        } else {
          // Pause player
          if (playerControllerRef.current) {
            playerControllerRef.current.pause();
          }
          setIsPreviewMode(false);
        }
      } else if (currentTime < previewStart - 1) {
        // Safe play boundary adjustment if playhead is totally outside
        onSeek(previewStart);
      }
    }
  }, [currentTime, isPreviewMode, previewStart, previewEnd, isLooping]);

  // Triggering Suggest Highlights based on REAL Transcript/Chapters Data
  const handleSuggestHighlights = () => {
    setSuggestingClips(true);
    setSuggestions([]);
    
    setTimeout(() => {
      const foundSuggestions: typeof suggestions = [];

      // 1. Chapters suggestions
      const chapters = project.aiAnalysisResults?.chapters || project.summary?.chapters || [];
      chapters.forEach((ch, idx) => {
        if (ch.title && ch.startTime < ch.endTime) {
          foundSuggestions.push({
            title: ch.title,
            startTime: ch.startTime,
            endTime: ch.endTime,
            reason: `Generated from chapter "${ch.title}": ${ch.summary || 'Summary of section.'}`,
            sourceType: 'chapter',
          });
        }
      });

      // 2. Key moments suggestions
      const keyMoments = project.aiAnalysisResults?.keyMoments || [];
      keyMoments.forEach((km, idx) => {
        const start = Math.max(0, km.timestamp - 10);
        const end = Math.min(duration, km.timestamp + 30);
        if (start < end) {
          foundSuggestions.push({
            title: km.title,
            startTime: start,
            endTime: end,
            reason: `Grounded key moment explaining: "${km.explanation}"`,
            sourceType: 'key_moment',
          });
        }
      });

      // 3. Fallback to transcript clusters if none exist
      if (foundSuggestions.length === 0 && project.transcript && project.transcript.length > 0) {
        // Group first 10 segments as a suggestion
        const len = project.transcript.length;
        const segmentGroupSize = Math.min(10, len);
        const firstSeg = project.transcript[0];
        const lastSeg = project.transcript[segmentGroupSize - 1];
        foundSuggestions.push({
          title: 'Opening Segment',
          startTime: firstSeg.startTime,
          endTime: lastSeg.endTime,
          reason: 'Beginning discussion and introduction of topics.',
          sourceType: 'transcript',
        });
      }

      setSuggestions(foundSuggestions.slice(0, 5)); // cap at 5 premium candidates
      setSuggestingClips(false);
    }, 1200);
  };

  const handleSetStartToCurrent = () => {
    setStartTimeStr(formatDuration(currentTime));
  };

  const handleSetEndToCurrent = () => {
    setEndTimeStr(formatDuration(currentTime));
  };

  const validateTimes = (start: number, end: number): boolean => {
    if (isNaN(start) || isNaN(end)) {
      setValidationError('Start and end times must be valid numbers or formats (e.g. MM:SS).');
      return false;
    }
    if (start < 0) {
      setValidationError('Start time cannot be negative.');
      return false;
    }
    if (end <= start) {
      setValidationError('End time must be strictly after the start time.');
      return false;
    }
    if (end > duration) {
      setValidationError(`End time cannot exceed the total video duration (${formatDuration(duration)}).`);
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Save or Update clip
  const handleSaveClip = () => {
    const startSec = parseTimeInput(startTimeStr);
    const endSec = parseTimeInput(endTimeStr);

    if (startSec === null || endSec === null) {
      setValidationError('Invalid time format. Please use SS.SS, MM:SS, or HH:MM:SS.');
      return;
    }

    if (!validateTimes(startSec, endSec)) {
      return;
    }

    if (!clipName.trim()) {
      setValidationError('Please enter a name for the clip.');
      return;
    }

    const timestamp = new Date().toISOString();

    if (editingClipId) {
      // Update existing
      const updatedClips = clips.map((c) => {
        if (c.id === editingClipId) {
          return {
            ...c,
            name: clipName,
            startTime: startSec,
            endTime: endSec,
            updatedAt: timestamp,
          };
        }
        return c;
      });
      onUpdateProject({ clips: updatedClips });
      setEditingClipId(null);
    } else {
      // Create new
      const newClip: VideoClip = {
        id: `clip-${Date.now()}`,
        projectId: project.id,
        sourceMediaId: project.fileName,
        name: clipName,
        startTime: startSec,
        endTime: endSec,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      onUpdateProject({ clips: [...clips, newClip] });
    }

    // Reset fields
    setClipName(`Clip ${clips.length + 2}`);
    setStartTimeStr('0:00');
    setEndTimeStr('0:30');
    setValidationError(null);
  };

  const handleEditClick = (clip: VideoClip) => {
    setEditingClipId(clip.id);
    setClipName(clip.name);
    setStartTimeStr(formatDuration(clip.startTime));
    setEndTimeStr(formatDuration(clip.endTime));
    setValidationError(null);
  };

  const handleDeleteClip = (id: string) => {
    const updated = clips.filter((c) => c.id !== id);
    onUpdateProject({ clips: updated });
    if (editingClipId === id) {
      setEditingClipId(null);
    }
  };

  // Preview actual range
  const handlePreviewClip = (start: number, end: number) => {
    setPreviewStart(start);
    setPreviewEnd(end);
    setIsPreviewMode(true);
    onSeek(start);
    if (playerControllerRef.current) {
      playerControllerRef.current.play();
    }
  };

  const handleExitPreview = () => {
    setIsPreviewMode(false);
    setPreviewStart(null);
    setPreviewEnd(null);
    if (playerControllerRef.current) {
      playerControllerRef.current.pause();
    }
  };

  const handleCopyTimestamp = (clip: VideoClip) => {
    const timestampStr = `${formatDuration(clip.startTime)} – ${formatDuration(clip.endTime)}`;
    navigator.clipboard.writeText(timestampStr);
    setCopiedClipId(clip.id);
    setTimeout(() => setCopiedClipId(null), 2000);
  };

  // Export clip definitions as JSON or text metadata
  const handleExportClips = (format: 'json' | 'txt') => {
    if (clips.length === 0) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(clips, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${project.name.toLowerCase().replace(/\s+/g, '_')}_clips.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      let txtContent = `VEYRA HIGHLIGHTS & CLIPS EXPORT\n`;
      txtContent += `Project: ${project.name}\n`;
      txtContent += `Source File: ${project.fileName}\n`;
      txtContent += `Exported: ${new Date().toLocaleDateString()}\n\n`;
      txtContent += `--------------------------------------------------\n\n`;

      clips.forEach((c, idx) => {
        txtContent += `Clip #${idx + 1}: ${c.name}\n`;
        txtContent += `Timeframe: ${formatDuration(c.startTime)} – ${formatDuration(c.endTime)}\n`;
        txtContent += `Duration: ${formatDuration(c.endTime - c.startTime)}\n`;
        txtContent += `--------------------------------------------------\n\n`;
      });

      const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(txtContent);
      const exportFileDefaultName = `${project.name.toLowerCase().replace(/\s+/g, '_')}_clips.txt`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  // Generate highlight suggestions directly into the edit panel
  const handleApplySuggestion = (sug: typeof suggestions[0]) => {
    setClipName(sug.title);
    setStartTimeStr(formatDuration(sug.startTime));
    setEndTimeStr(formatDuration(sug.endTime));
    setValidationError(null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 p-4 sm:p-5 select-none font-sans text-[#111111]">
      
      {/* Active Preview Banner Info */}
      {isPreviewMode && previewStart !== null && previewEnd !== null && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3.5 flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            <span>
              Previewing Clip Mode:{' '}
              <strong className="font-semibold">{formatDuration(previewStart)}</strong> to{' '}
              <strong className="font-semibold">{formatDuration(previewEnd)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                isLooping 
                  ? 'bg-amber-200 border-amber-300 text-amber-900' 
                  : 'bg-white hover:bg-neutral-100 border-amber-200 text-amber-800'
              }`}
            >
              {isLooping ? 'Looping Active' : 'Loop Playback'}
            </button>
            <button
              onClick={handleExitPreview}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Grid: Editor + Saved Clips list */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Side: Active Clip Builder */}
        <div className="md:col-span-7 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#111111]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                {editingClipId ? 'Edit Selected Clip' : 'Create New Clip'}
              </h3>
            </div>
            {editingClipId && (
              <button
                onClick={() => {
                  setEditingClipId(null);
                  setClipName(`Clip ${clips.length + 1}`);
                  setStartTimeStr('0:00');
                  setEndTimeStr('0:30');
                  setValidationError(null);
                }}
                className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* Validation Warnings */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Clip Metadata Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                Clip Name
              </label>
              <input
                type="text"
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
                placeholder="e.g. Machine Learning Overview"
                className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#111111] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                  Start Time
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    placeholder="0:00"
                    className="w-full text-xs font-mono bg-white border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 focus:outline-hidden text-center"
                  />
                  <button
                    onClick={handleSetStartToCurrent}
                    title="Set to current playhead"
                    className="px-2 py-1 bg-white hover:bg-neutral-100 border border-[#E5E5E5] rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Current
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                  End Time
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    placeholder="0:30"
                    className="w-full text-xs font-mono bg-white border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 focus:outline-hidden text-center"
                  />
                  <button
                    onClick={handleSetEndToCurrent}
                    title="Set to current playhead"
                    className="px-2 py-1 bg-white hover:bg-neutral-100 border border-[#E5E5E5] rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Current
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated duration summary tag */}
            {(() => {
              const startVal = parseTimeInput(startTimeStr);
              const endVal = parseTimeInput(endTimeStr);
              if (startVal !== null && endVal !== null && endVal > startVal) {
                return (
                  <div className="flex justify-between items-center bg-white border border-[#E5E5E5] rounded-lg p-2.5 text-xs text-[#666666]">
                    <span>Calculated Clip Duration:</span>
                    <strong className="text-[#111111] font-mono-time">
                      {formatDuration(endVal - startVal)}
                    </strong>
                  </div>
                );
              }
              return null;
            })()}

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-1.5">
              <button
                onClick={() => {
                  const startSec = parseTimeInput(startTimeStr);
                  const endSec = parseTimeInput(endTimeStr);
                  if (startSec !== null && endSec !== null) {
                    handlePreviewClip(startSec, endSec);
                  }
                }}
                className="flex-1 py-2 bg-white hover:bg-neutral-50 border border-[#E5E5E5] text-[#111111] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Preview Range</span>
              </button>

              <button
                onClick={handleSaveClip}
                className="flex-1 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingClipId ? 'Save Changes' : 'Save Clip Range'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Saved Clips Listing */}
        <div className="md:col-span-5 border border-[#E5E5E5] rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#111111]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Saved Clip Definitions ({clips.length})
              </h3>
            </div>
            {clips.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportClips('json')}
                  title="Export definitions as JSON"
                  className="p-1 hover:bg-neutral-100 rounded text-[#666666] hover:text-[#111111] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* List of clips */}
          {clips.length === 0 ? (
            <div className="py-12 text-center text-[#666666] space-y-1">
              <Scissors className="w-6 h-6 mx-auto text-neutral-300 stroke-[1.5]" />
              <p className="text-xs font-medium">No saved clips yet</p>
              <p className="text-[10px] max-w-[200px] mx-auto text-[#999999]">
                Select a timeframe range in the builder or click any key moment or chapter to create one.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {clips.map((clip) => {
                const clipDur = clip.endTime - clip.startTime;
                return (
                  <div
                    key={clip.id}
                    className="p-3 bg-white border border-[#E5E5E5] rounded-lg space-y-2 hover:border-[#111111] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold truncate max-w-[180px] text-[#111111]">
                          {clip.name}
                        </p>
                        <p className="text-[10px] text-[#666666] font-mono-time flex items-center gap-1">
                          <span>{formatDuration(clip.startTime)}</span>
                          <span>–</span>
                          <span>{formatDuration(clip.endTime)}</span>
                          <span className="text-neutral-300">|</span>
                          <span className="font-semibold text-neutral-500">
                            {formatDuration(clipDur)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePreviewClip(clip.startTime, clip.endTime)}
                          title="Preview highlight"
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-[#111111] cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          onClick={() => handleCopyTimestamp(clip)}
                          title="Copy timecode duration"
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-[#111111] cursor-pointer"
                        >
                          {copiedClipId === clip.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditClick(clip)}
                          title="Edit definition"
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-[#111111] cursor-pointer"
                        >
                          <Scissors className="w-3 h-3 text-neutral-400 hover:text-black" />
                        </button>
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          title="Delete clip"
                          className="p-1 hover:bg-neutral-100 rounded text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Export clip definition actions */}
          {clips.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F0F0F0] text-[10px] font-bold">
              <button
                onClick={() => handleExportClips('txt')}
                className="py-1.5 bg-neutral-100 hover:bg-neutral-200 text-[#111111] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export TXT</span>
              </button>
              <button
                onClick={() => handleExportClips('json')}
                className="py-1.5 bg-neutral-100 hover:bg-neutral-200 text-[#111111] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI SUGGESTED CLIPS INSIGHT BLOCK */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#111111]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              AI Suggested Clips & Highlights
            </h3>
          </div>
          <button
            onClick={handleSuggestHighlights}
            disabled={suggestingClips}
            className="px-3 py-1 bg-white hover:bg-neutral-100 border border-[#E5E5E5] text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
          >
            {suggestingClips ? (
              <>Analyzing...</>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-500 fill-current" />
                <span>Suggest Highlights</span>
              </>
            )}
          </button>
        </div>

        {suggestingClips && (
          <div className="py-8 text-center text-xs text-[#666666] space-y-2">
            <Sparkles className="w-5 h-5 mx-auto text-amber-500 animate-pulse fill-current" />
            <p className="font-semibold">Finding potential highlights...</p>
            <p className="text-[10px] text-[#999999]">Analyzing transcript segments and chapters...</p>
          </div>
        )}

        {!suggestingClips && suggestions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((sug, idx) => (
              <div 
                key={`sug-${idx}`} 
                className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg flex flex-col justify-between space-y-2 hover:border-[#111111] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {sug.sourceType.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-neutral-500">
                      {formatDuration(sug.startTime)} – {formatDuration(sug.endTime)}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-bold text-[#111111] truncate">{sug.title}</h4>
                  <p className="text-[9px] text-[#666666] line-clamp-2 mt-0.5">{sug.reason}</p>
                </div>
                <div className="flex gap-1.5 pt-1 border-t border-dashed border-[#E5E5E5] text-[10px] font-bold">
                  <button
                    onClick={() => handlePreviewClip(sug.startTime, sug.endTime)}
                    className="flex-1 py-1 bg-white hover:bg-neutral-100 border border-[#E5E5E5] rounded flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => handleApplySuggestion(sug)}
                    className="flex-1 py-1 bg-[#111111] hover:bg-black text-white rounded flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Use Definition</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!suggestingClips && suggestions.length === 0 && (
          <p className="text-[10px] text-[#666666] text-center py-4">
            Click "Suggest Highlights" to query the AI transcript layers for premium highlights and clip segments.
          </p>
        )}
      </div>

    </div>
  );
};
