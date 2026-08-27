import React, { useState } from 'react';
import { Video, Music, MoreVertical, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { Project } from '../../types';
import { formatBytes, formatDuration, formatDate } from '../../utils/formatters';

interface ProjectRowProps {
  project: Project;
  onOpen: (id: string) => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  onOpen,
  onRename,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F5F5] border border-[#D4D4D4] rounded text-[11px] font-mono-time font-medium text-[#111111]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded text-[11px] font-mono-time font-medium text-[#666666]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#999999] animate-pulse" />
            Processing
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F5F5] border border-[#D4D4D4] rounded text-[11px] font-mono-time font-medium text-[#111111]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            Error
          </span>
        );
      case 'created':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[11px] font-mono-time text-[#666666]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#999999]" />
            Created
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="group bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-md p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      {/* Left Column: Thumbnail/Icon + Title + Metadata */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {project.thumbnailUrl ? (
          <div className="w-14 h-10 rounded bg-black border border-[#E5E5E5] group-hover:border-[#111111] overflow-hidden shrink-0 flex items-center justify-center transition-colors">
            <img
              src={project.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="p-2.5 bg-[#FAFAFA] group-hover:bg-[#F5F5F5] border border-[#E5E5E5] rounded-md text-[#111111] shrink-0 transition-colors">
            {project.mediaType === 'video' ? (
              <Video className="w-4 h-4" />
            ) : (
              <Music className="w-4 h-4" />
            )}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#000000] truncate group-hover:text-[#111111]">
              {project.name}
            </h3>
            <span className="sm:hidden">{getStatusBadge(project.status)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#666666] mt-0.5 font-mono-time">
            <span>
              {project.mediaType === 'video' ? 'Video' : 'Audio'}
              {project.duration ? ` · ${formatDuration(project.duration)}` : ''}
            </span>
            {project.width && project.height && (
              <>
                <span className="text-[#D4D4D4]">·</span>
                <span>{project.width}×{project.height}</span>
              </>
            )}
            {project.fileSize > 0 && (
              <>
                <span className="text-[#D4D4D4]">·</span>
                <span>{formatBytes(project.fileSize)}</span>
              </>
            )}
            <span className="text-[#D4D4D4]">·</span>
            <span className="text-[#999999]">
              {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Status + Action Menu */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F5F5F5]">
        <div className="hidden sm:block">
          {getStatusBadge(project.status)}
        </div>

        {/* Action Menu dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors cursor-pointer"
            aria-label="Project options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-white border border-[#D4D4D4] rounded-md shadow-lg py-1 z-30 text-xs">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpen(project.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRename(project);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>
                <div className="my-1 border-t border-[#E5E5E5]" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(project);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
