import React, { useState } from 'react';
import { Play, AlertCircle, Info, User, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { navigateToSource, validateTimestamp } from '../../utils/sourceNavigation';
import { SourceValidationStatus } from '../../types';

interface SourceBadgeProps {
  timestamp: number;
  segmentId?: string;
  speakerName?: string;
  textSnippet?: string;
  status?: SourceValidationStatus;
  duration?: number;
  onSeek: (time: number) => void;
  className?: string;
  showPreviewPopover?: boolean;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  timestamp,
  segmentId,
  speakerName,
  textSnippet,
  status = 'VALID',
  duration = 86400,
  onSeek,
  className = '',
  showPreviewPopover = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const validatedTime = validateTimestamp(timestamp, duration);

  if (validatedTime === null || status === 'INVALID') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] font-medium rounded text-xs">
        <AlertCircle className="w-3 h-3 text-red-500" />
        <span>Source Unavailable</span>
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateToSource(validatedTime, segmentId, onSeek, duration);
  };

  const formattedTime = formatDuration(validatedTime);
  const ariaLabel = `Jump to transcript source at ${formattedTime}`;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        aria-label={ariaLabel}
        className={`px-2 py-0.5 rounded text-[10px] font-mono-time font-bold border transition-colors flex items-center gap-1 cursor-pointer select-none ${
          status === 'STALE'
            ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            : 'bg-neutral-100 border-neutral-200 text-neutral-800 hover:bg-[#111111] hover:text-white hover:border-[#111111]'
        } ${className}`}
      >
        <Play className="w-2.5 h-2.5 fill-current shrink-0" />
        <span>{formattedTime}</span>
        {status === 'STALE' && (
          <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-sans uppercase">Stale</span>
        )}
      </button>

      {/* Hover Preview Popover */}
      {showPreviewPopover && isHovered && (textSnippet || speakerName || status === 'STALE') && (
        <div className="absolute bottom-full left-0 mb-1.5 w-64 p-2.5 bg-[#111111] text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none space-y-1.5 border border-neutral-800">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800 pb-1">
            <span className="font-mono-time font-bold text-emerald-400">Source: {formattedTime}</span>
            {speakerName && (
              <span className="flex items-center gap-1 font-semibold text-neutral-300">
                <User className="w-2.5 h-2.5" />
                {speakerName}
              </span>
            )}
          </div>

          {textSnippet && (
            <p className="text-[11px] text-neutral-200 leading-snug font-serif italic line-clamp-3">
              "{textSnippet}"
            </p>
          )}

          {status === 'STALE' && (
            <div className="text-[10px] text-amber-400 flex items-center gap-1 pt-1 border-t border-neutral-800">
              <Info className="w-3 h-3 shrink-0" />
              <span>Source transcript updated since analysis.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
