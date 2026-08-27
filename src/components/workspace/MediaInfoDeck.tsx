import React from 'react';
import { Project } from '../../types';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { FileVideo, Music } from 'lucide-react';

interface MediaInfoDeckProps {
  project: Project;
}

export const MediaInfoDeck: React.FC<MediaInfoDeckProps> = ({ project }) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-md p-4 space-y-3 select-none">
      {/* File & Type Identification */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[#111111] shrink-0">
            {project.mediaType === 'video' ? (
              <FileVideo className="w-3.5 h-3.5" />
            ) : (
              <Music className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#111111] block truncate" title={project.fileName}>
              {project.fileName}
            </span>
            <span className="text-[11px] font-mono-time text-[#999999] block">
              {project.fileType || (project.mediaType === 'video' ? 'video/mp4' : 'audio/mp3')}
            </span>
          </div>
        </div>

        <span className="px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[10px] font-mono-time uppercase text-[#666666] shrink-0">
          {project.mediaType}
        </span>
      </div>

      {/* Specifications Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono-time">
        <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded p-2">
          <span className="text-[10px] text-[#999999] block uppercase mb-0.5">Duration</span>
          <span className="font-semibold text-[#111111] block">
            {formatDuration(project.duration)}
          </span>
        </div>

        <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded p-2">
          <span className="text-[10px] text-[#999999] block uppercase mb-0.5">Resolution</span>
          <span className="font-semibold text-[#111111] block">
            {project.width && project.height
              ? `${project.width} × ${project.height}`
              : project.mediaType === 'audio'
              ? 'Audio Stream'
              : 'Auto'}
          </span>
        </div>

        <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded p-2">
          <span className="text-[10px] text-[#999999] block uppercase mb-0.5">Aspect</span>
          <span className="font-semibold text-[#111111] block">
            {project.aspectRatio || (project.mediaType === 'audio' ? 'N/A' : '16:9')}
          </span>
        </div>

        <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded p-2">
          <span className="text-[10px] text-[#999999] block uppercase mb-0.5">Size</span>
          <span className="font-semibold text-[#111111] block">
            {project.fileSize > 0 ? formatBytes(project.fileSize) : 'Direct Stream'}
          </span>
        </div>
      </div>
    </div>
  );
};
