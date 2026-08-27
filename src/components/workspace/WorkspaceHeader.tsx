import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Pencil, 
  RefreshCw, 
  Trash2, 
  Download, 
  Video, 
  Music,
  Check,
  ChevronDown,
  Subtitles,
  FileText
} from 'lucide-react';
import { Project } from '../../types';
import { 
  generateSRT, 
  generateVTT, 
  generateFormattedTranscript, 
  generatePlainTXT, 
  generateCSV, 
  generateJSON, 
  triggerFileDownload 
} from '../../utils/exportUtils';

interface WorkspaceHeaderProps {
  project: Project;
  showSubtitlesOverlay: boolean;
  onToggleSubtitlesOverlay: () => void;
  onNavigate: (path: string) => void;
  onRename: (newName: string) => void;
  onOpenReplaceMedia: () => void;
  onOpenDeleteConfirm: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  project,
  showSubtitlesOverlay,
  onToggleSubtitlesOverlay,
  onNavigate,
  onRename,
  onOpenReplaceMedia,
  onOpenDeleteConfirm,
}) => {
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleSaveInline = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(trimmed);
    } else {
      setNameValue(project.name);
    }
    setIsEditingInline(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveInline();
    } else if (e.key === 'Escape') {
      setNameValue(project.name);
      setIsEditingInline(false);
    }
  };

  const baseFileName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  const handleExport = (type: 'srt' | 'vtt' | 'formatted' | 'txt' | 'csv' | 'json') => {
    setIsExportOpen(false);
    const cues = project.subtitles || project.transcript || [];
    const speakers = project.speakers || [];

    switch (type) {
      case 'srt': {
        const srtContent = generateSRT(cues, speakers);
        triggerFileDownload(srtContent, `${baseFileName}.srt`, 'text/plain');
        break;
      }
      case 'vtt': {
        const vttContent = generateVTT(cues, speakers);
        triggerFileDownload(vttContent, `${baseFileName}.vtt`, 'text/vtt');
        break;
      }
      case 'formatted': {
        const txt = generateFormattedTranscript(project);
        triggerFileDownload(txt, `${baseFileName}_transcript.txt`, 'text/plain');
        break;
      }
      case 'txt': {
        const raw = generatePlainTXT(project);
        triggerFileDownload(raw, `${baseFileName}_raw.txt`, 'text/plain');
        break;
      }
      case 'csv': {
        const csv = generateCSV(project);
        triggerFileDownload(csv, `${baseFileName}.csv`, 'text/csv');
        break;
      }
      case 'json': {
        const json = generateJSON(project);
        triggerFileDownload(json, `${baseFileName}.json`, 'application/json');
        break;
      }
    }
  };

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E5E5E5] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-40 select-none">
      {/* Left: Brand + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#000000] cursor-pointer shrink-0 transition-colors"
          title="Home"
        >
          <span className="font-extrabold tracking-widest text-sm">VEYRA</span>
        </button>

        <span className="text-[#D4D4D4] text-xs">/</span>

        <button
          onClick={() => onNavigate('/projects')}
          className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#111111] transition-colors cursor-pointer shrink-0"
        >
          <span>Videos</span>
        </button>

        <span className="text-[#D4D4D4] text-xs">/</span>

        {/* Project Name Editable Header */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingInline ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleSaveInline}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-[#FAFAFA] border border-[#111111] rounded px-2 py-0.5 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none max-w-[200px] sm:max-w-[320px]"
              />
              <button
                onClick={handleSaveInline}
                className="p-1 hover:bg-[#F3F3F3] rounded text-[#111111] cursor-pointer"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingInline(true)}
              className="group flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
              title="Click to rename"
            >
              <h1 className="text-xs sm:text-sm font-semibold text-[#111111] truncate max-w-[180px] sm:max-w-[320px]">
                {project.name}
              </h1>
              <Pencil className="w-3 h-3 text-[#999999] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          {/* Media Type Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[10px] font-mono-time uppercase text-[#666666] shrink-0">
            {project.mediaType === 'video' ? (
              <Video className="w-3 h-3 text-[#111111]" />
            ) : (
              <Music className="w-3 h-3 text-[#111111]" />
            )}
            <span>{project.mediaType}</span>
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Captions Overlay Toggle */}
        {project.mediaType === 'video' && (
          <button
            onClick={onToggleSubtitlesOverlay}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showSubtitlesOverlay
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white text-[#666666] border-[#E5E5E5] hover:text-[#111111] hover:border-[#111111]'
            }`}
            title="Toggle captions overlay on video"
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Captions</span>
          </button>
        )}

        {/* Real Export Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="px-3 py-1.5 bg-[#111111] hover:bg-[#000000] text-white font-semibold text-xs rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
          </button>

          {isExportOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsExportOpen(false)} 
              />
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E5E5E5] rounded-lg shadow-lg py-1.5 z-50 text-xs divide-y divide-[#F0F0F0]">
                <div className="px-3 py-1 text-[10px] font-mono-time uppercase tracking-wider text-[#999999]">
                  Export Captions
                </div>
                <div className="py-1">
                  <button
                    onClick={() => handleExport('srt')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">Subtitles (.SRT)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">SubRip</span>
                  </button>
                  <button
                    onClick={() => handleExport('vtt')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">WebVTT (.VTT)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">HTML5</span>
                  </button>
                </div>

                <div className="px-3 pt-2 pb-1 text-[10px] font-mono-time uppercase tracking-wider text-[#999999]">
                  Export Transcript
                </div>
                <div className="py-1">
                  <button
                    onClick={() => handleExport('formatted')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">With Timestamps (.TXT)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">Formatted</span>
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">Plain Text (.TXT)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">Raw</span>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">Spreadsheet (.CSV)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">Table</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#FAFAFA] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">Full Data (.JSON)</span>
                    <span className="text-[10px] font-mono-time text-[#888888]">Data</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Replace & Delete Buttons */}
        <button
          onClick={onOpenReplaceMedia}
          className="hidden sm:flex p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded transition-colors cursor-pointer"
          title="Replace media file"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenDeleteConfirm}
          className="p-1.5 text-[#666666] hover:text-[#C53030] hover:bg-[#FFF5F5] rounded transition-colors cursor-pointer"
          title="Delete video"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
