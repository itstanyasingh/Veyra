import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Search, 
  Video, 
  Music, 
  Clock, 
  Trash2, 
  Pencil, 
  Download, 
  Play, 
  ArrowUpDown,
  Filter,
  FileText
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { RenameProjectModal } from './RenameProjectModal';
import { getStoredProjects, deleteProject, updateProject } from '../../services/projectStorage';
import { formatBytes, formatDuration, formatDate } from '../../utils/formatters';
import { generateSRT, generateVTT, triggerFileDownload } from '../../utils/exportUtils';
import { Project } from '../../types';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

type SortOption = 'recent' | 'name' | 'duration';

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const loadProjects = () => {
    setProjects(getStoredProjects());
  };

  useEffect(() => {
    loadProjects();

    const handleProjectsChanged = () => {
      loadProjects();
    };

    window.addEventListener('veyra_projects_changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('veyra_projects_changed', handleProjectsChanged);
    };
  }, []);

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      loadProjects();
    }
  };

  const handleSaveRename = (id: string, newName: string) => {
    updateProject(id, { name: newName });
    loadProjects();
  };

  const handleQuickExportSRT = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    const cues = p.subtitles || p.transcript || [];
    const srt = generateSRT(cues, p.speakers);
    triggerFileDownload(srt, `${p.name.replace(/\s+/g, '_')}.srt`, 'text/plain');
  };

  // Filter & Sort
  const processedProjects = React.useMemo(() => {
    let list = projects.filter((p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.fileName.toLowerCase().includes(searchFilter.toLowerCase())
    );

    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'duration') {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return list;
  }, [projects, searchFilter, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5] mb-8 select-none">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-1">
            VIDEOS
          </h1>
          <p className="text-xs sm:text-sm text-[#666666]">
            Your imported recordings, transcripts, and video intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="px-4 py-2 bg-[#111111] hover:bg-[#000000] text-white font-semibold text-xs uppercase tracking-wider rounded shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload video</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {projects.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-12 sm:p-16 text-center space-y-5 max-w-xl mx-auto my-6 select-none">
          <div className="w-14 h-14 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mx-auto shadow-xs">
            <Video className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-[#111111]">
              No videos yet
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] max-w-sm mx-auto">
              Upload a video or audio file to transcribe, search, and generate subtitles.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/')}
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#000000] text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload your first video</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 select-none">
          {/* Filter & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] border border-[#E5E5E5] p-3 rounded-lg">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#999999]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search videos & filenames..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] focus:bg-white"
              />
            </div>

            {/* Sort Selector & Count */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#666666]">
              <span className="font-mono-time text-[11px]">
                {processedProjects.length} video{processedProjects.length === 1 ? '' : 's'}
              </span>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#999999]" />
                <span className="text-[11px] font-mono-time">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-[#FAFAFA] border border-[#E5E5E5] rounded px-2 py-1 text-xs text-[#111111] focus:outline-none cursor-pointer"
                >
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {processedProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate(`/project/${p.id}`)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] hover:border-[#111111] rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Top Thumbnail / Media Preview Canvas */}
                <div className="relative aspect-video bg-[#111111] flex items-center justify-center overflow-hidden border-b border-[#E5E5E5]">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400 gap-1">
                      {p.mediaType === 'video' ? (
                        <Video className="w-8 h-8 text-neutral-500" />
                      ) : (
                        <Music className="w-8 h-8 text-neutral-500" />
                      )}
                      <span className="text-[10px] font-mono-time uppercase tracking-widest text-neutral-400">
                        {p.mediaType}
                      </span>
                    </div>
                  )}

                  {/* Duration Badge */}
                  {p.duration !== undefined && p.duration > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white rounded text-[10px] font-mono-time flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDuration(p.duration)}</span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white text-[#111111] flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#111111] truncate group-hover:text-black" title={p.name}>
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-mono-time text-[#666666]">
                      <span>{p.fileSize > 0 ? formatBytes(p.fileSize) : 'Direct'}</span>
                      <span>•</span>
                      <span>{formatDate(p.updatedAt || p.createdAt)}</span>
                    </div>
                  </div>

                  {/* Card Bottom Quick Actions */}
                  <div className="pt-2 border-t border-[#F5F5F5] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono-time text-[#888888] flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{p.transcript ? `${p.transcript.length} segments` : 'Ready'}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleQuickExportSRT(e, p)}
                        className="p-1 hover:bg-[#F3F3F3] text-[#666666] hover:text-[#111111] rounded cursor-pointer"
                        title="Download Subtitles (SRT)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToRename(p);
                        }}
                        className="p-1 hover:bg-[#F3F3F3] text-[#666666] hover:text-[#111111] rounded cursor-pointer"
                        title="Rename video"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(p);
                        }}
                        className="p-1 hover:bg-[#FFF5F5] text-[#666666] hover:text-[#C53030] rounded cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {projectToRename && (
        <RenameProjectModal
          isOpen={Boolean(projectToRename)}
          initialName={projectToRename.name}
          onClose={() => setProjectToRename(null)}
          onRename={(newName) => handleSaveRename(projectToRename.id, newName)}
        />
      )}

      {/* Delete Modal */}
      {projectToDelete && (
        <ConfirmDialog
          isOpen={Boolean(projectToDelete)}
          title="Delete Video"
          message={`Are you sure you want to delete "${projectToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete Video"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onClose={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
};
