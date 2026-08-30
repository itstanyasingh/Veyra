import React, { useRef, useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  BookOpen, 
  Sparkles, 
  Search, 
  MapPin, 
  Maximize2,
  Minimize2,
  Scissors
} from 'lucide-react';
import { Project, TranscriptSegment } from '../../types';
import { formatDuration } from '../../utils/formatters';

interface SmartTimelineProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  searchMatchTimestamps?: number[];
}

export const SmartTimeline: React.FC<SmartTimelineProps> = ({
  project,
  currentTime,
  onSeek,
  searchMatchTimestamps = [],
}) => {
  const duration = project.duration || 60;
  const hasTranscript = project.transcript && project.transcript.length > 0;

  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [hoverDetails, setHoverDetails] = useState<{
    type: 'chapter' | 'keyMoment' | 'topic' | 'speaker' | 'general';
    title: string;
    subtitle?: string;
  } | null>(null);

  // Extract chapters from either aiAnalysisResults or summary
  const chapters = React.useMemo(() => {
    if (project.aiAnalysisResults?.chapters && project.aiAnalysisResults.chapters.length > 0) {
      return project.aiAnalysisResults.chapters;
    }
    if (project.summary?.chapters && project.summary.chapters.length > 0) {
      return project.summary.chapters;
    }
    return [];
  }, [project.aiAnalysisResults?.chapters, project.summary?.chapters]);

  // Extract key moments
  const keyMoments = React.useMemo(() => {
    return project.aiAnalysisResults?.keyMoments || [];
  }, [project.aiAnalysisResults?.keyMoments]);

  // Extract topics
  const topics = React.useMemo(() => {
    return project.aiAnalysisResults?.topics || [];
  }, [project.aiAnalysisResults?.topics]);

  // Extract speaker ranges from the transcript
  const speakerRanges = React.useMemo(() => {
    if (!project.transcript || project.transcript.length === 0) return [];
    
    interface TempRange {
      speakerId: string;
      startTime: number;
      endTime: number;
    }
    
    const ranges: TempRange[] = [];
    let currentRange: TempRange | null = null;

    project.transcript.forEach((seg) => {
      if (!currentRange) {
        currentRange = {
          speakerId: seg.speakerId,
          startTime: seg.startTime,
          endTime: seg.endTime,
        };
      } else if (currentRange.speakerId === seg.speakerId && seg.startTime - currentRange.endTime < 2.0) {
        // Coalesce segments within 2 seconds of each other
        currentRange.endTime = seg.endTime;
      } else {
        ranges.push(currentRange);
        currentRange = {
          speakerId: seg.speakerId,
          startTime: seg.startTime,
          endTime: seg.endTime,
        };
      }
    });

    if (currentRange) {
      ranges.push(currentRange);
    }

    return ranges;
  }, [project.transcript]);

  // Distinct unique list of speakers present in the ranges
  const speakersList = React.useMemo(() => {
    const ids = Array.from(new Set(speakerRanges.map((r) => r.speakerId)));
    return ids.map((id) => {
      const match = project.speakers?.find((s) => s.id === id);
      return {
        id,
        name: match?.name || id,
      };
    });
  }, [speakerRanges, project.speakers]);

  // Compute speaker colors (restrained, highly accessible pastel palette)
  const getSpeakerStyleClasses = (speakerId: string) => {
    const idx = speakersList.findIndex((s) => s.id === speakerId);
    const colorClasses = [
      {
        track: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
        text: 'text-blue-800 border-blue-400',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        track: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300',
        text: 'text-emerald-800 border-emerald-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        track: 'bg-amber-100 hover:bg-amber-200 border-amber-300',
        text: 'text-amber-800 border-amber-400',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        track: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300',
        text: 'text-indigo-800 border-indigo-400',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        track: 'bg-rose-100 hover:bg-rose-200 border-rose-300',
        text: 'text-rose-800 border-rose-400',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        track: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
        text: 'text-purple-800 border-purple-400',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
      },
    ];
    return colorClasses[idx !== -1 ? idx % colorClasses.length : 0];
  };

  // Helper to seek on click or drag
  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!timelineTrackRef.current || duration <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = percentage * duration;
    onSeek(targetTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    handleTimelineInteraction(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleTimelineInteraction(e);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  // Handle timeline hovering tooltip
  const handleMouseMoveHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current || duration <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = pct * duration;

    setHoverTime(targetTime);
    setHoverPosition(x);

    // Identify if mouse is hovering over an active region
    let foundDetails: typeof hoverDetails = null;

    // Check chapters first
    const activeChapter = chapters.find(
      (ch) => targetTime >= ch.startTime && targetTime <= ch.endTime
    );
    if (activeChapter) {
      foundDetails = {
        type: 'chapter',
        title: activeChapter.title,
        subtitle: `${formatDuration(activeChapter.startTime)} - ${formatDuration(activeChapter.endTime)}`,
      };
    }

    // Check key moments
    const nearbyKeyMoment = keyMoments.find(
      (km) => Math.abs(km.timestamp - targetTime) <= Math.max(4, duration * 0.015)
    );
    if (nearbyKeyMoment) {
      foundDetails = {
        type: 'keyMoment',
        title: nearbyKeyMoment.title,
        subtitle: `Key Moment at ${formatDuration(nearbyKeyMoment.timestamp)}`,
      };
    }

    // Check topics
    const nearbyTopic = topics.find((top) => 
      top.timestamps && top.timestamps.some((t) => Math.abs(t - targetTime) <= Math.max(4, duration * 0.015))
    );
    if (nearbyTopic) {
      foundDetails = {
        type: 'topic',
        title: `Topic: ${nearbyTopic.name}`,
        subtitle: nearbyTopic.description,
      };
    }

    // Check active speaker range
    if (!foundDetails) {
      const activeSpkRange = speakerRanges.find(
        (r) => targetTime >= r.startTime && targetTime <= r.endTime
      );
      if (activeSpkRange) {
        const name = speakersList.find((s) => s.id === activeSpkRange.speakerId)?.name || activeSpkRange.speakerId;
        foundDetails = {
          type: 'speaker',
          title: `Speaker: ${name}`,
          subtitle: `Active from ${formatDuration(activeSpkRange.startTime)} to ${formatDuration(activeSpkRange.endTime)}`,
        };
      }
    }

    setHoverDetails(foundDetails);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverDetails(null);
  };

  if (!hasTranscript) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0F0F0]">
          <Clock className="w-4 h-4 text-[#111111]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Smart Timeline
          </h2>
        </div>
        <div className="py-6 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-neutral-300 mx-auto animate-pulse" />
          <p className="text-xs font-medium text-[#111111]">No Smart Timeline Available</p>
          <p className="text-[11px] text-[#666666] max-w-sm mx-auto">
            Generate a transcript to automatically build your interactive timeline map.
          </p>
        </div>
      </div>
    );
  }

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 sm:p-5 space-y-5">
      {/* Title Header with Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#111111]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Smart Timeline
          </h2>
        </div>
        
        {/* Visual Map Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#666666] font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-neutral-100 border border-neutral-300" />
            Chapters
          </span>
          {keyMoments.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-[#3B82F6] font-bold">◆</span>
              Key Moments
            </span>
          )}
          {topics.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-[#10B981] font-bold">●</span>
              Topics
            </span>
          )}
          {speakersList.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-1.5 rounded bg-blue-100 border border-blue-300" />
              Speakers
            </span>
          )}
          {searchMatchTimestamps.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Search Matches
            </span>
          )}
        </div>
      </div>

      {/* Main Interactive Visualizer */}
      <div className="relative space-y-4">
        {/* 1. Playhead Slider Container */}
        <div 
          ref={timelineTrackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveHover}
          onMouseLeave={handleMouseLeave}
          className="relative h-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg cursor-pointer overflow-visible select-none"
        >
          {/* Chapter segments visually drawn in slider background */}
          {chapters.map((ch, idx) => {
            const leftPct = (ch.startTime / duration) * 100;
            const widthPct = ((ch.endTime - ch.startTime) / duration) * 100;
            const isActive = currentTime >= ch.startTime && currentTime <= ch.endTime;
            return (
              <div
                key={`ch-bg-${idx}`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                className={`absolute top-0 bottom-0 border-r border-[#E5E5E5] transition-colors ${
                  isActive ? 'bg-[#FAFAFA]/70' : 'bg-[#FAFAFA]/20'
                }`}
              />
            );
          })}

          {/* Search Match Ticks */}
          {searchMatchTimestamps.map((t, idx) => {
            const leftPct = (t / duration) * 100;
            return (
              <div
                key={`search-match-tick-${idx}`}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 animate-pulse"
              />
            );
          })}

          {/* Hover Playhead Guide */}
          {hoverTime !== null && (
            <div 
              style={{ left: `${hoverPosition}px` }}
              className="absolute top-0 bottom-0 w-px bg-[#111111] opacity-30 z-20 pointer-events-none"
            />
          )}

          {/* Actual Current Position Playhead Line */}
          <div 
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-[#111111] z-20 pointer-events-none"
          />

          {/* Playhead circular knob */}
          <div 
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3.5 h-3.5 bg-[#111111] hover:bg-black rounded-full border-2 border-white shadow-md z-30 pointer-events-none transition-transform duration-75 scale-100"
          />

          {/* Floating Live Hover Tooltip */}
          {hoverTime !== null && (
            <div 
              style={{ left: `${Math.max(10, Math.min(timelineTrackRef.current?.getBoundingClientRect().width || 0, hoverPosition) - 90)}px` }}
              className="absolute -top-16 bg-[#111111] text-white text-[10px] rounded p-2 shadow-xl w-44 z-50 pointer-events-none space-y-0.5 font-sans"
            >
              <div className="flex items-center justify-between font-mono border-b border-white/20 pb-1">
                <span>Position</span>
                <span className="font-bold">{formatDuration(hoverTime)}</span>
              </div>
              {hoverDetails ? (
                <div className="pt-1">
                  <p className="font-bold truncate text-[11px]">{hoverDetails.title}</p>
                  {hoverDetails.subtitle && (
                    <p className="opacity-80 truncate text-[9px]">{hoverDetails.subtitle}</p>
                  )}
                </div>
              ) : (
                <p className="opacity-60 pt-1 text-[9px]">Click to seek here</p>
              )}
            </div>
          )}
        </div>

        {/* 2. Timing Scale Labels */}
        <div className="flex justify-between items-center text-[10px] text-[#999999] font-mono-time">
          <span>0:00</span>
          <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[#111111] font-bold rounded">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* 3. Chapters Segment Slider Track */}
        {chapters.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-[10px] font-mono-time uppercase tracking-widest text-[#999999]">
              Chapters
            </span>
            <div className="flex w-full gap-0.5 h-7 bg-neutral-50 rounded border border-neutral-200 overflow-hidden">
              {chapters.map((ch, idx) => {
                const widthPct = ((ch.endTime - ch.startTime) / duration) * 100;
                const isActive = currentTime >= ch.startTime && currentTime <= ch.endTime;
                return (
                  <button
                    key={`ch-btn-${idx}`}
                    onClick={() => onSeek(ch.startTime)}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full text-left px-2 flex flex-col justify-center min-w-[20px] transition-colors border-r last:border-0 border-neutral-200 ${
                      isActive 
                        ? 'bg-[#111111] text-white' 
                        : 'bg-white hover:bg-neutral-100 text-[#111111]'
                    }`}
                    title={`${ch.title} (${formatDuration(ch.startTime)} - ${formatDuration(ch.endTime)})`}
                  >
                    <span className="text-[9px] font-bold truncate block w-full">
                      {ch.title}
                    </span>
                    <span className={`text-[8px] font-mono-time block opacity-70 ${isActive ? 'text-neutral-200' : 'text-neutral-500'}`}>
                      {formatDuration(ch.startTime)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Speaker Timeline Swimlanes */}
        {speakersList.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-[10px] font-mono-time uppercase tracking-widest text-[#999999]">
              Speaker Activity
            </span>
            <div className="space-y-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-2.5">
              {speakersList.map((spk) => {
                const spkStyle = getSpeakerStyleClasses(spk.id);
                return (
                  <div key={`spk-lane-${spk.id}`} className="flex items-center gap-3 h-5 relative">
                    {/* Name block */}
                    <div className="w-20 shrink-0 text-left truncate text-[10px] font-bold text-[#111111] flex items-center gap-1">
                      <User className="w-3 h-3 text-[#666666]" />
                      <span>{spk.name}</span>
                    </div>

                    {/* Timeline track for speaker */}
                    <div className="flex-1 relative h-3 bg-neutral-100/50 rounded overflow-hidden">
                      {speakerRanges
                        .filter((r) => r.speakerId === spk.id)
                        .map((range, rIdx) => {
                          const leftPct = (range.startTime / duration) * 100;
                          const widthPct = ((range.endTime - range.startTime) / duration) * 100;
                          const isActive = currentTime >= range.startTime && currentTime <= range.endTime;
                          return (
                            <button
                              key={`spk-range-${spk.id}-${rIdx}`}
                              onClick={() => onSeek(range.startTime)}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`${spk.name} active ${formatDuration(range.startTime)} - ${formatDuration(range.endTime)}`}
                              className={`absolute top-0 bottom-0 border border-solid rounded-sm cursor-pointer transition-colors ${spkStyle.track} ${
                                isActive ? 'ring-1 ring-[#111111] ring-offset-[1px] opacity-100' : 'opacity-80'
                              }`}
                            />
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Key Moments, Topics, and Meeting Decision Markers Line */}
        {(keyMoments.length > 0 || topics.length > 0 || (project.meetingIntelligence && (project.meetingIntelligence.decisions.length > 0 || project.meetingIntelligence.actionItems.length > 0))) && (
          <div className="space-y-2">
            <span className="block text-[10px] font-mono-time uppercase tracking-widest text-[#999999]">
              AI Insight & Decision Markers
            </span>
            
            <div className="relative h-8 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center px-2">
              {/* Draw timeline bar inside insights area */}
              <div className="absolute left-2 right-2 h-0.5 bg-neutral-200 pointer-events-none" />

              {/* Render Key Moments Markers */}
              {keyMoments.map((km, idx) => {
                const posPct = (km.timestamp / duration) * 100;
                const isActive = Math.abs(currentTime - km.timestamp) < 3;
                return (
                  <button
                    key={`km-marker-${idx}`}
                    onClick={() => onSeek(km.timestamp)}
                    style={{ left: `calc(${posPct}% - 4px)` }}
                    className={`absolute z-10 font-bold transition-all hover:scale-125 focus:outline-none text-[12px] cursor-pointer ${
                      isActive ? 'text-[#DC2626] scale-110 drop-shadow-md' : 'text-[#3B82F6]'
                    }`}
                    title={`Key Moment: ${km.title} at ${formatDuration(km.timestamp)}`}
                  >
                    ◆
                  </button>
                );
              })}

              {/* Render Topics Markers */}
              {topics.map((top, idx) => {
                const ts = top.timestamps?.[0];
                if (ts === undefined) return null;
                const posPct = (ts / duration) * 100;
                const isActive = Math.abs(currentTime - ts) < 3;
                return (
                  <button
                    key={`topic-marker-${idx}`}
                    onClick={() => onSeek(ts)}
                    style={{ left: `calc(${posPct}% - 4px)` }}
                    className={`absolute z-10 transition-all hover:scale-125 focus:outline-none text-[12px] cursor-pointer ${
                      isActive ? 'text-[#DC2626] scale-110' : 'text-[#10B981]'
                    }`}
                    title={`Topic: ${top.name} at ${formatDuration(ts)}`}
                  >
                    ●
                  </button>
                );
              })}

              {/* Render Meeting Decisions Markers */}
              {project.meetingIntelligence?.decisions.map((dec, idx) => {
                const posPct = (dec.timestamp / duration) * 100;
                const isActive = Math.abs(currentTime - dec.timestamp) < 3;
                return (
                  <button
                    key={`dec-marker-${idx}`}
                    onClick={() => onSeek(dec.timestamp)}
                    style={{ left: `calc(${posPct}% - 4px)` }}
                    className={`absolute z-10 font-bold transition-all hover:scale-125 focus:outline-none text-[11px] cursor-pointer ${
                      isActive ? 'text-[#DC2626] scale-125' : 'text-blue-600'
                    }`}
                    title={`Decision: ${dec.text} at ${formatDuration(dec.timestamp)}`}
                  >
                    ■
                  </button>
                );
              })}

              {/* Render Action Item Markers */}
              {project.meetingIntelligence?.actionItems.map((act, idx) => {
                const posPct = (act.timestamp / duration) * 100;
                const isActive = Math.abs(currentTime - act.timestamp) < 3;
                return (
                  <button
                    key={`act-marker-${idx}`}
                    onClick={() => onSeek(act.timestamp)}
                    style={{ left: `calc(${posPct}% - 4px)` }}
                    className={`absolute z-10 font-bold transition-all hover:scale-125 focus:outline-none text-[11px] cursor-pointer ${
                      isActive ? 'text-[#DC2626] scale-125' : 'text-emerald-600'
                    }`}
                    title={`Action Item: ${act.task} (${act.owner}) at ${formatDuration(act.timestamp)}`}
                  >
                    ▲
                  </button>
                );
              })}

              {/* Render Research Evidence Markers */}
              {project.researchItems?.flatMap((r) => r.findings).map((finding, idx) => {
                const posPct = (finding.timestamp / duration) * 100;
                const isActive = Math.abs(currentTime - finding.timestamp) < 3;
                return (
                  <button
                    key={`res-finding-marker-${idx}`}
                    onClick={() => onSeek(finding.timestamp)}
                    style={{ left: `calc(${posPct}% - 4px)` }}
                    className={`absolute z-10 font-bold transition-all hover:scale-125 focus:outline-none text-[11px] cursor-pointer ${
                      isActive ? 'text-[#DC2626] scale-125' : 'text-purple-600'
                    }`}
                    title={`Research Finding [${finding.claimType}]: ${finding.claim} at ${formatDuration(finding.timestamp)}`}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Saved Highlights & Clips Track */}
        {project.clips && project.clips.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-[10px] font-mono-time uppercase tracking-widest text-[#999999]">
              Saved Clip Timeframes
            </span>
            <div className="relative h-7 bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden flex items-center">
              {project.clips.map((clip) => {
                const leftPct = (clip.startTime / duration) * 100;
                const widthPct = ((clip.endTime - clip.startTime) / duration) * 100;
                const isActive = currentTime >= clip.startTime && currentTime <= clip.endTime;
                return (
                  <button
                    key={clip.id}
                    onClick={() => onSeek(clip.startTime)}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-0.5 bottom-0.5 border border-[#111111]/30 rounded-md text-[9px] font-bold px-1.5 flex items-center justify-start truncate cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-[#111111] text-white border-[#111111]' 
                        : 'bg-white hover:bg-neutral-100 text-[#111111]'
                    }`}
                    title={`Clip: ${clip.name} (${formatDuration(clip.startTime)} - ${formatDuration(clip.endTime)})`}
                  >
                    <Scissors className="w-2.5 h-2.5 shrink-0 mr-1 opacity-70" />
                    <span className="truncate">{clip.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
