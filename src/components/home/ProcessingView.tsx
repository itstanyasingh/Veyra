import React from 'react';
import { 
  Check, 
  Loader2, 
  FileVideo, 
  Music, 
  Clock, 
  HardDrive,
  Sparkles
} from 'lucide-react';
import { ProcessingProgressState, PROCESSING_STAGES } from '../../services/transcriptionService';
import { formatBytes, formatDuration } from '../../utils/formatters';

interface ProcessingViewProps {
  fileName: string;
  fileSize: number;
  mediaType: 'video' | 'audio';
  duration?: number;
  progress: ProcessingProgressState;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  fileName,
  fileSize,
  mediaType,
  duration,
  progress,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* Header: File Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] shrink-0">
              {mediaType === 'video' ? (
                <FileVideo className="w-5 h-5" />
              ) : (
                <Music className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#111827] truncate" title={fileName}>
                {fileName}
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono-time text-[#64748B] mt-0.5">
                <span className="uppercase">{mediaType}</span>
                <span>•</span>
                <span>{fileSize > 0 ? formatBytes(fileSize) : 'Direct Stream'}</span>
                {duration !== undefined && duration > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(duration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] border border-[#DBEAFE] rounded text-[11px] font-mono-time text-[#2563EB] font-bold self-start sm:self-auto shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
            <span>PROCESSING{progress.percentage > 0 ? ` (${progress.percentage}%)` : ''}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-time">
            <span className="text-[#111827] font-medium">{progress.message}</span>
            {progress.percentage > 0 && (
              <span className="font-semibold text-[#2563EB]">{progress.percentage}%</span>
            )}
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden relative">
            {progress.percentage > 0 ? (
              <div
                className="h-full bg-[#2563EB] transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            ) : (
              <div className="h-full bg-[#2563EB] w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full" />
            )}
          </div>
        </div>

        {/* Real Processing Stages Checklist */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] font-mono">
            Processing Pipeline
          </h3>

          <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
            {PROCESSING_STAGES.map((stage, idx) => {
              const isCompleted = idx < progress.stageIndex || progress.isComplete;
              const isCurrent = idx === progress.stageIndex && !progress.isComplete;
              const isPending = idx > progress.stageIndex;

              return (
                <div
                  key={stage.id}
                  className={`px-4 py-3 flex items-center justify-between transition-colors ${
                    isCurrent ? 'bg-white font-medium text-[#111827]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Stage icon status */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                      )}
                    </div>

                    <span
                      className={`text-xs ${
                        isCompleted
                          ? 'text-[#111827]'
                          : isCurrent
                          ? 'text-[#2563EB] font-bold'
                          : 'text-[#94A3B8]'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono-time uppercase text-[#94A3B8]">
                    {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Queued'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice */}
        <div className="p-3.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-xs text-[#1E40AF] flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
          <p className="leading-relaxed">
            Your media is being prepared locally. The synchronized workspace with searchable transcript, timeline markers, and export tools will open automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
