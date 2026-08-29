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
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Project, SubtitleCue } from '../../types';
import { 
  generateSRT, 
  generateVTT, 
  generateFormattedTranscript, 
  generatePlainTXT, 
  generateCSV, 
  generateJSON, 
  triggerFileDownload,
  sanitizeFileName
} from '../../utils/exportUtils';

interface WorkspaceHeaderProps {
  project: Project;
  showSubtitlesOverlay: boolean;
  onToggleSubtitlesOverlay: () => void;
  onNavigate: (path: string) => void;
  onRename: (newName: string) => void;
  onOpenReplaceMedia: () => void;
  onOpenDeleteConfirm: () => void;
  activeCaptionLanguage?: string;
  setActiveCaptionLanguage?: (lang: string) => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  project,
  showSubtitlesOverlay,
  onToggleSubtitlesOverlay,
  onNavigate,
  onRename,
  onOpenReplaceMedia,
  onOpenDeleteConfirm,
  activeCaptionLanguage = 'source',
  setActiveCaptionLanguage,
}) => {
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 3500);
  };

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

  const safeName = sanitizeFileName(project.name);
  const hasTranscript = project.transcript && project.transcript.length > 0;
  const availableTranslations = project.translations ? Object.keys(project.translations) : [];

  const handleExport = (
    type: 'formatted_txt' | 'plain_txt' | 'csv' | 'json' | 'srt' | 'vtt' | 'trans_txt' | 'trans_srt' | 'trans_vtt',
    overrideLang?: string
  ) => {
    setIsExportOpen(false);

    // Validate transcript existence
    if (!hasTranscript) {
      showToast('No transcript available to export. Transcribe media first.', 'error');
      return;
    }

    const speakers = project.speakers || [];

    // Helper for source cues (prefer project.subtitles edited state)
    const getSourceCues = (): SubtitleCue[] => {
      if (project.subtitles && project.subtitles.length > 0) {
        return project.subtitles;
      }
      return (project.transcript || []).map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));
    };

    switch (type) {
      // 1. TRANSCRIPT EXPORTS
      case 'formatted_txt': {
        const content = generateFormattedTranscript(project, 'source');
        triggerFileDownload(content, `${safeName}_transcript.txt`, 'text/plain');
        showToast('Transcript exported (.TXT)');
        break;
      }
      case 'plain_txt': {
        const content = generatePlainTXT(project, 'source');
        triggerFileDownload(content, `${safeName}_raw.txt`, 'text/plain');
        showToast('Plain text transcript exported (.TXT)');
        break;
      }
      case 'csv': {
        const content = generateCSV(project, 'source');
        triggerFileDownload(content, `${safeName}.csv`, 'text/csv');
        showToast('Transcript spreadsheet exported (.CSV)');
        break;
      }
      case 'json': {
        const content = generateJSON(project, 'source');
        triggerFileDownload(content, `${safeName}.json`, 'application/json');
        showToast('Structured transcript data exported (.JSON)');
        break;
      }

      // 2. SUBTITLES EXPORTS
      case 'srt': {
        const cues = getSourceCues();
        if (cues.length === 0) {
          showToast('No subtitles available to export.', 'error');
          return;
        }
        const srt = generateSRT(cues, speakers);
        triggerFileDownload(srt, `${safeName}.srt`, 'text/plain');
        showToast('Subtitles exported (.SRT)');
        break;
      }
      case 'vtt': {
        const cues = getSourceCues();
        if (cues.length === 0) {
          showToast('No subtitles available to export.', 'error');
          return;
        }
        const vtt = generateVTT(cues, speakers);
        triggerFileDownload(vtt, `${safeName}.vtt`, 'text/vtt');
        showToast('WebVTT captions exported (.VTT)');
        break;
      }

      // 3. TRANSLATED EXPORTS
      case 'trans_txt': {
        const lang = overrideLang || (activeCaptionLanguage !== 'source' ? activeCaptionLanguage : availableTranslations[0]);
        if (!lang || !project.translations?.[lang] || project.translations[lang].length === 0) {
          showToast('No translation available. Translate the transcript first.', 'error');
          return;
        }
        const content = generateFormattedTranscript(project, lang);
        triggerFileDownload(content, `${safeName}_${lang.toLowerCase()}_transcript.txt`, 'text/plain');
        showToast(`Translated transcript exported (${lang} .TXT)`);
        break;
      }
      case 'trans_srt': {
        const lang = overrideLang || (activeCaptionLanguage !== 'source' ? activeCaptionLanguage : availableTranslations[0]);
        if (!lang || !project.translations?.[lang] || project.translations[lang].length === 0) {
          showToast('No translation available. Translate the transcript first.', 'error');
          return;
        }
        const transSegs = project.translations[lang];
        const transCues: SubtitleCue[] = transSegs.map((seg, idx) => ({
          id: seg.id || `sub_${idx}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        }));
        const srt = generateSRT(transCues, speakers);
        triggerFileDownload(srt, `${safeName}_${lang.toLowerCase()}.srt`, 'text/plain');
        showToast(`Translated subtitles exported (${lang} .SRT)`);
        break;
      }
      case 'trans_vtt': {
        const lang = overrideLang || (activeCaptionLanguage !== 'source' ? activeCaptionLanguage : availableTranslations[0]);
        if (!lang || !project.translations?.[lang] || project.translations[lang].length === 0) {
          showToast('No translation available. Translate the transcript first.', 'error');
          return;
        }
        const transSegs = project.translations[lang];
        const transCues: SubtitleCue[] = transSegs.map((seg, idx) => ({
          id: seg.id || `sub_${idx}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        }));
        const vtt = generateVTT(transCues, speakers);
        triggerFileDownload(vtt, `${safeName}_${lang.toLowerCase()}.vtt`, 'text/vtt');
        showToast(`Translated WebVTT captions exported (${lang} .VTT)`);
        break;
      }
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#E5E5E5] px-4 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Navigation & Project Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1.5 text-[#111111] hover:text-[#000000] font-bold text-sm tracking-tight transition-colors cursor-pointer shrink-0"
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
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#E5E5E5] rounded-lg shadow-xl py-1.5 z-50 text-xs divide-y divide-[#F0F0F0] max-h-[85vh] overflow-y-auto">
                {/* 1. TRANSCRIPT */}
                <div>
                  <div className="px-3 py-1 text-[10px] font-mono-time uppercase tracking-wider text-[#999999] bg-[#FAFAFA]">
                    Transcript
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('formatted_txt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Formatted Text (.TXT)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">Timestamps</span>
                    </button>
                    <button
                      onClick={() => handleExport('plain_txt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Plain Text (.TXT)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">Raw</span>
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Structured Data (.JSON)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">JSON</span>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Spreadsheet (.CSV)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">Table</span>
                    </button>
                  </div>
                </div>

                {/* 2. SUBTITLES */}
                <div>
                  <div className="px-3 py-1 text-[10px] font-mono-time uppercase tracking-wider text-[#999999] bg-[#FAFAFA]">
                    Subtitles &amp; Captions
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('srt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Subtitles (.SRT)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">SubRip</span>
                    </button>
                    <button
                      onClick={() => handleExport('vtt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">WebVTT (.VTT)</span>
                      <span className="text-[10px] font-mono-time text-[#888888]">HTML5</span>
                    </button>
                  </div>
                </div>

                {/* 3. TRANSLATED CONTENT */}
                <div>
                  <div className="px-3 py-1 text-[10px] font-mono-time uppercase tracking-wider text-[#999999] bg-[#FAFAFA] flex items-center justify-between">
                    <span>Translated Content</span>
                    {activeCaptionLanguage !== 'source' && (
                      <span className="text-[#111111] font-bold font-sans lowercase text-[10px]">
                        {activeCaptionLanguage}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('trans_txt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Translated Transcript (.TXT)</span>
                      <Globe className="w-3 h-3 text-[#888888]" />
                    </button>
                    <button
                      onClick={() => handleExport('trans_srt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Translated SRT (.SRT)</span>
                      <Globe className="w-3 h-3 text-[#888888]" />
                    </button>
                    <button
                      onClick={() => handleExport('trans_vtt')}
                      className="w-full px-3 py-1.5 text-left text-[#111111] hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">Translated WebVTT (.VTT)</span>
                      <Globe className="w-3 h-3 text-[#888888]" />
                    </button>
                  </div>
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

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white rounded-lg shadow-xl text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}
    </header>
  );
};
