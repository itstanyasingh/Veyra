import React from 'react';
import { Play, Edit2, Split, Merge, Trash2 } from 'lucide-react';
import { SubtitleCue, Speaker } from '../../types';
import { formatDuration } from '../../utils/formatters';

interface SubtitleCueItemProps {
  cue: SubtitleCue;
  idx: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onEdit: (cue: SubtitleCue) => void;
  onSplit: (cue: SubtitleCue) => void;
  onMerge: (idx: number) => void;
  onDelete: (id: string) => void;
}

export const SubtitleCueItem = React.memo(({ cue, idx, isPlaying, onSeek, onEdit, onSplit, onMerge, onDelete }: SubtitleCueItemProps) => {
  return (
    <div
      className={`p-3.5 border rounded-lg transition-all space-y-2 ${
        isPlaying
          ? 'bg-white border-[#111111] shadow-xs ring-1 ring-[#111111]'
          : 'bg-[#FAFAFA] hover:bg-white border-[#E5E5E5]'
      }`}
    >
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
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>{formatDuration(cue.startTime)} → {formatDuration(cue.endTime)}</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(cue)} className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSplit(cue)} className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer">
            <Split className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMerge(idx)} className="p-1.5 hover:bg-[#F0F0F0] rounded text-[#444444] hover:text-[#111111] transition-colors cursor-pointer">
            <Merge className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(cue.id)} className="p-1.5 hover:bg-[#FFF0F0] rounded text-[#CC0000] transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p onClick={() => onEdit(cue)} className="text-xs text-[#111111] leading-relaxed cursor-pointer hover:text-[#000000] font-medium">
        {cue.text}
      </p>
    </div>
  );
});
