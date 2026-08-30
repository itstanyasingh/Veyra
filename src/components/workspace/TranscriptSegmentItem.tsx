import React from 'react';
import { Play, Edit2, Split, Merge, Plus, Trash2, ChevronDown, UserCheck, Check, X } from 'lucide-react';
import { TranscriptSegment } from '../../types';
import { formatDuration } from '../../utils/formatters';

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment;
  originalIndex: number;
  isActive: boolean;
  isEditing: boolean;
  speakerName: string;
  badgeStyle: { bg: string; text: string; border: string; dot: string };
  segmentsLength: number;
  editingText: string;
  setEditingText: (text: string) => void;
  onSeek: (time: number) => void;
  onEdit: (segment: TranscriptSegment) => void;
  onSaveEdit: (segmentId: string) => void;
  onCancelEdit: () => void;
  onReassign: (segment: TranscriptSegment) => void;
  onSplit: (index: number) => void;
  onMerge: (index: number) => void;
  onAdd: (index: number) => void;
  onDelete: (index: number) => void;
}

export const TranscriptSegmentItem = React.memo(({
  segment, originalIndex, isActive, isEditing, speakerName, badgeStyle, segmentsLength,
  editingText, setEditingText,
  onSeek, onEdit, onSaveEdit, onCancelEdit, onReassign, onSplit, onMerge, onAdd, onDelete
}: TranscriptSegmentItemProps) => {
  if (isEditing) {
    return (
      <div className="p-4 sm:p-5 bg-white border-l-2 border-l-[#111111] shadow-sm space-y-2">
        <textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          rows={3}
          autoFocus
          className="w-full p-2 text-xs sm:text-sm bg-white border border-[#111111] rounded focus:outline-none leading-relaxed text-[#111111]"
        />
        <div className="flex items-center gap-2">
          <button onClick={() => onSaveEdit(segment.id)} className="px-3 py-1 bg-[#111111] text-white text-xs font-semibold rounded hover:bg-black cursor-pointer flex items-center gap-1">
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={onCancelEdit} className="px-3 py-1 bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-[#F0F0F0] cursor-pointer flex items-center gap-1">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 sm:p-5 transition-colors group/seg ${
        isActive
          ? 'bg-[#FAFAFA] border-l-2 border-l-[#111111]'
          : 'hover:bg-[#FCFCFC]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSeek(segment.startTime)}
            className="px-2 py-0.5 bg-[#F0F0F0] hover:bg-[#111111] hover:text-white text-[#111111] rounded text-[11px] font-mono-time transition-colors flex items-center gap-1 cursor-pointer"
            title={`Jump to ${formatDuration(segment.startTime)}`}
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>{formatDuration(segment.startTime)}</span>
          </button>
          <div className="relative inline-flex items-center">
            <button
              onClick={() => onReassign(segment)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text} hover:shadow-2xs`}
              title="Click to rename or change speaker for this segment"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
              <span>{speakerName}</span>
              <ChevronDown className="w-3 h-3 opacity-60 group-hover/seg:opacity-100" />
            </button>
          </div>
        </div>
        <div className="opacity-0 group-hover/seg:opacity-100 transition-opacity flex items-center gap-1 text-[#888888]">
          <button onClick={() => onEdit(segment)} className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer" title="Edit text"><Edit2 className="w-3 h-3" /></button>
          <button onClick={() => onReassign(segment)} className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer" title="Change speaker"><UserCheck className="w-3 h-3" /></button>
          <button onClick={() => onSplit(originalIndex)} className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer" title="Split segment"><Split className="w-3 h-3" /></button>
          {originalIndex < segmentsLength - 1 && (
            <button onClick={() => onMerge(originalIndex)} className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer" title="Merge next"><Merge className="w-3 h-3" /></button>
          )}
          <button onClick={() => onAdd(originalIndex)} className="p-1 hover:text-[#111111] hover:bg-[#EEEEEE] rounded cursor-pointer" title="Insert below"><Plus className="w-3 h-3" /></button>
          <button onClick={() => onDelete(originalIndex)} className="p-1 hover:text-[#C53030] hover:bg-[#FFF5F5] rounded cursor-pointer" title="Delete"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      <p className="text-xs text-[#111111] leading-relaxed cursor-pointer hover:text-[#000000] font-medium" onClick={() => onEdit(segment)}>
        {segment.text}
      </p>
    </div>
  );
});
