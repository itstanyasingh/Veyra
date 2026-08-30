import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileVideo,
  FileAudio,
  Trash2
} from 'lucide-react';
import { extractMediaMetadata } from '../../utils/mediaUtils';
import { saveMedia } from '../../services/mediaStorage';
import { createProject } from '../../services/projectStorage';
import { runMediaProcessingPipeline, transcribeMediaUrl, ProcessingProgressState } from '../../services/transcriptionService';
import { calculateTranscriptHash } from '../../services/aiAnalysisService';
import { ProcessingView } from './ProcessingView';
import { Project, MediaType } from '../../types';
import { formatBytes } from '../../utils/formatters';
import { isYouTubeUrl, extractYouTubeVideoId } from '../../utils/youtubeUtils';

interface HomeImportAreaProps {
  onNavigate: (path: string) => void;
}

const SUPPORTED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];
const ACCEPT_STRING = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.aac,.ogg,.flac';

export const HomeImportArea: React.FC<HomeImportAreaProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<{
    message: string;
    subMessage: string;
    actionText?: string;
  } | null>(null);
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
    if (!file) {
      setErrorMsg("No file selected.");
      return false;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg("This file is too large. Please upload a smaller file.");
      return false;
    }

    const fileName = file.name.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    const isAudioFile = file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext);
    const isVideoFile = file.type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

    if (!SUPPORTED_EXTENSIONS.includes(ext) && !isAudioFile && !isVideoFile) {
      if (isAudioFile || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName)) {
        setErrorMsg("This audio format isn't supported.");
      } else {
        setErrorMsg("This file format isn't supported.");
      }
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const handleProcessFile = async (file: File) => {
    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = file.name;
      const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const fileSize = file.size;
      const fileType = file.type || 'video/mp4';
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(fileName);
      const mediaType: MediaType = isAudio ? 'audio' : 'video';

      let duration = 60;
      let width: number | undefined;
      let height: number | undefined;
      let aspectRatio: string | undefined;
      let thumbnailUrl: string | undefined;

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

      setProcessingFileMeta({
        fileName,
        fileSize,
        mediaType,
        duration,
      });
      setIsProcessing(true);

      // Save binary file into IndexedDB for persistent offline playback
      await saveMedia(projectId, file);

      // Run real transcription pipeline
      const { speakers, transcript, subtitles, summary } = await runMediaProcessingPipeline(
        fileName,
        duration,
        file,
        (progress) => {
          setProcessingProgress(progress);
        }
      );

      const initialHash = calculateTranscriptHash(transcript);

      // Create and persist project
      const newProject: Project = {
        id: projectId,
        name: cleanName,
        fileName,
        fileType,
        fileSize,
        mediaType,
        sourceType: 'upload',
        duration,
        width,
        height,
        aspectRatio: aspectRatio || (mediaType === 'audio' ? undefined : '16:9'),
        thumbnailUrl,
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        speakers,
        transcript,
        subtitles,
        summary,
        transcriptHash: initialHash,
        subtitlesTranscriptHash: initialHash,
        subtitlesEdited: false,
      };

      createProject(newProject);

      // Navigate to workspace
      setTimeout(() => {
        onNavigate(`/project/${projectId}`);
      }, 300);
    } catch (err: any) {
      console.error('File processing error:', err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'An error occurred during file transcription.');
    }
  };

  const handleProcessUrl = async (url: string) => {
    try {
      const isYt = isYouTubeUrl(url);
      const ytId = extractYouTubeVideoId(url);
      const parsed = new URL(url);
      const inferredName = parsed.pathname.split('/').pop()?.split('?')[0] || (isYt ? 'YouTube Video' : 'Remote Media');
      const cleanName = inferredName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || (isYt ? 'YouTube Video' : 'Remote Video Stream');
      const isAudio = !isYt && /\.(mp3|wav|m4a|aac|ogg)$/i.test(inferredName);
      const mediaType: MediaType = isAudio ? 'audio' : 'video';

      setProcessingFileMeta({
        fileName: inferredName,
        fileSize: 0,
        mediaType,
        duration: 60,
      });
      setIsProcessing(true);

      const result = await transcribeMediaUrl(url, inferredName, (progress) => {
        setProcessingProgress(progress);
      });

      const initialHash = calculateTranscriptHash(result.transcript);

      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const finalTitle = result.fileName || cleanName;
      const newProject: Project = {
        id: projectId,
        name: finalTitle,
        fileName: result.fileName || inferredName,
        fileType: isYt ? 'video/youtube' : (isAudio ? 'audio/mp3' : 'video/mp4'),
        fileSize: result.fileSize || 0,
        mediaType,
        sourceType: isYt ? 'youtube' : 'upload',
        youtubeVideoId: ytId || undefined,
        originalUrl: url,
        duration: result.duration || 60,
        aspectRatio: isAudio ? undefined : '16:9',
        mediaUrl: isYt ? undefined : url,
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        speakers: result.speakers,
        transcript: result.transcript,
        subtitles: result.subtitles,
        summary: result.summary,
        transcriptHash: initialHash,
        subtitlesTranscriptHash: initialHash,
        subtitlesEdited: false,
      };

      createProject(newProject);

      setTimeout(() => {
        onNavigate(`/project/${projectId}`);
      }, 300);
    } catch (err: any) {
      console.error('URL processing error:', err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Failed to process media URL.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
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
    setUrlWarning(null);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a media URL.');
      setUrlWarning(null);
      return;
    }

    setIsUrlValidating(true);
    setErrorMsg(null);
    setUrlWarning(null);

    try {
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        setErrorMsg('Enter a valid supported video URL.');
        setIsUrlValidating(false);
        return;
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setErrorMsg('Enter a valid supported video URL.');
        setIsUrlValidating(false);
        return;
      }

      // Allow YouTube and direct media URLs
      setIsUrlValidating(false);
      handleProcessUrl(trimmed);
    } catch (err: any) {
      setIsUrlValidating(false);
      setErrorMsg(err.message || 'An error occurred while validating the media link.');
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
        onCancel={() => {
          setIsProcessing(false);
          setSelectedFile(null);
          setErrorMsg(null);
          setUrlWarning(null);
        }}
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
              setUrlWarning(null);
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
              setUrlWarning(null);
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
                  onClick={() => selectedFile && handleProcessFile(selectedFile)}
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
              <h3 className="text-sm font-bold text-[#111827]">
                Paste your video/audio link
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Paste a supported video or audio URL to import it directly.
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
                    setUrlWarning(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=... or media URL"
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
                    <span>Import from link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-[11px] text-[#64748B] font-mono">
              Supports YouTube links and direct MP4, MOV, MP3 or WAV URLs
            </div>

            {/* Compact inline warning for YouTube / external platforms */}
            {urlWarning && (
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#92400E] leading-tight">
                      {urlWarning.message}
                    </p>
                    <p className="text-[11px] text-[#B45309] leading-snug">
                      {urlWarning.subMessage}
                    </p>
                  </div>
                </div>

                {urlWarning.actionText && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('upload');
                      setUrlWarning(null);
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-xs font-semibold rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    {urlWarning.actionText}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message with recovery options */}
        {errorMsg && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => selectedFile && handleProcessFile(selectedFile)}
                  className="px-2.5 py-1 bg-white hover:bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] font-semibold text-[11px] rounded cursor-pointer transition-colors"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setSelectedFile(null);
                  setUrlInput('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-2.5 py-1 bg-white hover:bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] font-semibold text-[11px] rounded cursor-pointer transition-colors"
              >
                Choose another file
              </button>
            </div>
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
