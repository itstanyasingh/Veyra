import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Info,
  Loader2,
  FileVideo,
  FileAudio,
  Trash2,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { extractMediaMetadata } from '../../utils/mediaUtils';
import { saveMedia } from '../../services/mediaStorage';
import { createProject } from '../../services/projectStorage';
import { runMediaProcessingPipeline, ProcessingProgressState } from '../../services/transcriptionService';
import { ProcessingView } from './ProcessingView';
import { Project, MediaType } from '../../types';
import { formatBytes } from '../../utils/formatters';

interface HomeImportAreaProps {
  onNavigate: (path: string) => void;
}

const SUPPORTED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'ogg', 'aac'];
const ACCEPT_STRING = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a';

export const HomeImportArea: React.FC<HomeImportAreaProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlStatus, setUrlStatus] = useState<{ type: 'notice' | 'success'; message: string } | null>(null);
  const [isUrlValidating, setIsUrlValidating] = useState(false);

  // Active Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileMeta, setProcessingFileMeta] = useState<{
    fileName: string;
    fileSize: number;
    mediaType: MediaType;
    duration?: number;
  } | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgressState>({
    stage: 'upload',
    stageIndex: 0,
    percentage: 0,
    message: 'Starting ingestion...',
    isComplete: false,
  });

  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        setErrorMsg(`Unsupported file format (.${ext || 'unknown'}). Supported formats: MP4, MOV, AVI, MKV, MP3, WAV.`);
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const handleProcessAndOpen = async (file: File | null, remoteUrl?: string, remoteName?: string) => {
    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = file ? file.name : (remoteName || 'Remote Media');
      const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const fileSize = file ? file.size : 0;
      const fileType = file ? file.type || 'video/mp4' : 'video/mp4';
      const isAudio = file 
        ? file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(fileName)
        : /\.(mp3|wav|m4a|aac|ogg)$/i.test(fileName);
      const mediaType: MediaType = isAudio ? 'audio' : 'video';

      let duration = 60;
      let width: number | undefined;
      let height: number | undefined;
      let aspectRatio: string | undefined;
      let thumbnailUrl: string | undefined;

      // Extract metadata if local file
      if (file) {
        try {
          const meta = await extractMediaMetadata(file, isAudio);
          if (meta.duration && meta.duration > 0) duration = meta.duration;
          width = meta.width;
          height = meta.height;
          aspectRatio = meta.aspectRatio;
          thumbnailUrl = meta.thumbnailUrl;
        } catch (err) {
          console.warn('Metadata extraction non-fatal warning:', err);
        }
      }

      setProcessingFileMeta({
        fileName,
        fileSize,
        mediaType,
        duration,
      });
      setIsProcessing(true);

      // Save binary file into IndexedDB for persistent offline playback
      if (file) {
        await saveMedia(projectId, file);
      }

      // Run transcription pipeline
      const { speakers, transcript, subtitles, summary } = await runMediaProcessingPipeline(
        fileName,
        duration,
        file,
        (progress) => {
          setProcessingProgress(progress);
        }
      );

      // Create and persist project
      const newProject: Project = {
        id: projectId,
        name: cleanName,
        fileName,
        fileType,
        fileSize,
        mediaType,
        duration,
        width,
        height,
        aspectRatio: aspectRatio || (mediaType === 'audio' ? undefined : '16:9'),
        thumbnailUrl,
        mediaUrl: remoteUrl,
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        speakers,
        transcript,
        subtitles,
        summary,
      };

      createProject(newProject);

      // Navigate to the video workspace
      setTimeout(() => {
        onNavigate(`/project/${projectId}`);
      }, 300);
    } catch (err) {
      console.error('Processing error:', err);
      setIsProcessing(false);
      setErrorMsg('An unexpected error occurred during processing. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid video or audio URL.');
      return;
    }

    setIsUrlValidating(true);
    setErrorMsg(null);
    setUrlStatus(null);

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setErrorMsg('Please enter a valid URL starting with http:// or https://');
        setIsUrlValidating(false);
        return;
      }

      // Check if it's direct media
      const isDirectMedia = /\.(mp4|webm|mov|avi|mkv|mp3|wav|m4a|ogg|aac)(\?.*)?$/i.test(parsed.pathname);

      if (isDirectMedia) {
        const inferredName = parsed.pathname.split('/').pop()?.split('?')[0] || 'Remote Media';
        setIsUrlValidating(false);
        handleProcessAndOpen(null, trimmed, inferredName);
      } else {
        // Platform or external streaming URL
        setTimeout(() => {
          setIsUrlValidating(false);
          setUrlStatus({
            type: 'notice',
            message: 'Link received. Connect a transcription backend to process this URL or upload the video file directly for browser transcription.'
          });
        }, 600);
      }
    } catch {
      setIsUrlValidating(false);
      setErrorMsg('Please enter a valid URL (e.g., https://example.com/recording.mp4).');
    }
  };

  if (isProcessing && processingFileMeta) {
    return (
      <ProcessingView
        fileName={processingFileMeta.fileName}
        fileSize={processingFileMeta.fileSize}
        mediaType={processingFileMeta.mediaType}
        duration={processingFileMeta.duration}
        progress={processingProgress}
      />
    );
  }

  return (
    <div id="import-section" className="w-full max-w-[640px] mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload video or audio file"
      />

      {/* Main Ingestion Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] select-none space-y-4 text-left">
        {/* Segmented Control Tabs */}
        <div className="flex items-center justify-center p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg max-w-[280px] mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setErrorMsg(null);
              setUrlStatus(null);
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>File upload</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('link');
              setErrorMsg(null);
              setUrlStatus(null);
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Paste link</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          /* SECTION 1: FILE UPLOAD TAB */
          selectedFile ? (
            /* Selected File State */
            <div className="border border-[#E2E8F0] bg-[#F8FAFC] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                    {selectedFile.type.startsWith('audio/') ? (
                      <FileAudio className="w-5 h-5" />
                    ) : (
                      <FileVideo className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111827] truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      {formatBytes(selectedFile.size)} • {selectedFile.type || 'Media file'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveSelectedFile}
                  className="p-2 text-[#64748B] hover:text-[#EF4444] hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleRemoveSelectedFile}
                  className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#374151] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessAndOpen(selectedFile)}
                  className="flex-1 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Transcribe</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-9 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#2563EB] bg-[#EFF6FF]'
                  : 'border-[#CBD5E1] hover:border-[#2563EB] bg-[#F8FAFC]/80 hover:bg-[#EFF6FF]/40'
              }`}
            >
              {/* Audio / Video Badge Illustration */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shadow-xs">
                  <FileVideo className="w-4 h-4" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shadow-xs">
                  <FileAudio className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-[#111827]">
                  Upload your video &amp; get transcript
                </p>
                <p className="text-xs text-[#64748B]">
                  Drag &amp; drop your file here
                </p>
              </div>

              {/* Upload a file primary button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-1 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload a file</span>
              </button>
            </div>
          )
        ) : (
          /* SECTION 2: URL LINK IMPORT TAB */
          <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3.5">
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#2563EB] font-mono">
                PASTE YOUR VIDEO/AUDIO LINK
              </span>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Paste a public media link or cloud recording to process directly.
              </p>
            </div>

            <form onSubmit={handleUrlImport} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  id="url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setErrorMsg(null);
                    setUrlStatus(null);
                  }}
                  placeholder="https://example.com/recording.mp4"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={!urlInput.trim() || isUrlValidating}
                className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {isUrlValidating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Import Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* URL Notice/Status */}
        {urlStatus && (
          <div className="p-3.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-xs text-[#1E40AF] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{urlStatus.message}</span>
          </div>
        )}

        {/* Supported Formats Info */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B] border-t border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#64748B]">
            <span>Supported formats: MP4, MOV, AVI, MKV, MP3, WAV</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Encrypted local browser storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
