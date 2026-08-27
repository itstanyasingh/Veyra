import React, { useState } from 'react';
import { ArrowLeft, Video, Music, Trash2, ArrowRight, Link, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { FileDropzone } from './FileDropzone';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { createProject } from '../../services/projectStorage';
import { saveMedia } from '../../services/mediaStorage';
import { extractMediaMetadata, ExtractedMediaMetadata } from '../../utils/mediaUtils';
import { Project, MediaType } from '../../types';

interface CreateProjectPageProps {
  onNavigate: (path: string) => void;
}

export const CreateProjectPage: React.FC<CreateProjectPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [extractedMeta, setExtractedMeta] = useState<ExtractedMediaMetadata | null>(null);
  const [isExtractingMeta, setIsExtractingMeta] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // URL Import state
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlProjectName, setUrlProjectName] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // When a file is chosen, extract default name and full metadata
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setValidationError(null);
    setIsExtractingMeta(true);

    // Determine default project name (strip extension)
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    setProjectName(rawName || 'Untitled Project');

    // Determine media type
    const isAudio = file.type.startsWith('audio/') || 
      ['.mp3', '.wav', '.m4a', '.aac', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext));
    const calculatedMediaType: MediaType = isAudio ? 'audio' : 'video';
    setMediaType(calculatedMediaType);

    try {
      const meta = await extractMediaMetadata(file, isAudio);
      setExtractedMeta(meta);
    } catch (err) {
      console.warn('Metadata extraction had minor issue:', err);
    } finally {
      setIsExtractingMeta(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProjectName('');
    setExtractedMeta(null);
    setIsExtractingMeta(false);
    setValidationError(null);
  };

  const handleCreateFromFile = async () => {
    if (!selectedFile) {
      setValidationError('Please select a video or audio file.');
      return;
    }

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setValidationError('Please enter a project name.');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    try {
      // 1. Persist actual media Blob/File into IndexedDB
      await saveMedia(newId, selectedFile);

      // 2. Persist project metadata into local storage
      const newProject: Project = {
        id: newId,
        name: trimmedName,
        fileName: selectedFile.name,
        fileType: selectedFile.type || (mediaType === 'video' ? 'video/mp4' : 'audio/mp3'),
        fileSize: selectedFile.size,
        mediaType: mediaType,
        duration: extractedMeta?.duration,
        width: extractedMeta?.width,
        height: extractedMeta?.height,
        aspectRatio: extractedMeta?.aspectRatio,
        thumbnailUrl: extractedMeta?.thumbnailUrl,
        status: 'ready',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      createProject(newProject);
      onNavigate(`/project/${newId}`);
    } catch (err) {
      console.error('Failed to create project and store media:', err);
      setValidationError('Failed to persist media file to browser storage. Please ensure storage permissions are enabled.');
      setIsSaving(false);
    }
  };

  const handleCreateFromUrl = () => {
    setUrlError(null);
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      setUrlError('Please enter a valid media URL.');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://example.com/video.mp4)');
      return;
    }

    const defaultName = urlProjectName.trim() || trimmedUrl.split('/').pop()?.split('?')[0] || 'Imported Media';
    const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    const newProject: Project = {
      id: newId,
      name: defaultName,
      fileName: trimmedUrl.split('/').pop()?.split('?')[0] || 'remote_media.mp4',
      fileType: 'video/mp4',
      fileSize: 0,
      mediaType: 'video',
      mediaUrl: trimmedUrl,
      status: 'ready',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    createProject(newProject);
    onNavigate(`/project/${newId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Back Navigation */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#000000] mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#000000] mb-1">
          CREATE A NEW PROJECT
        </h1>
        <p className="text-sm text-[#666666]">
          Bring a video or audio file into VEYRA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E5E5] mb-8 space-x-8">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer relative ${
            activeTab === 'upload'
              ? 'text-[#000000]'
              : 'text-[#666666] hover:text-[#111111]'
          }`}
        >
          <span>Upload File</span>
          {activeTab === 'upload' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer relative ${
            activeTab === 'url'
              ? 'text-[#000000]'
              : 'text-[#666666] hover:text-[#111111]'
          }`}
        >
          <span>Import from URL</span>
          {activeTab === 'url' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111]" />
          )}
        </button>
      </div>

      {/* Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {!selectedFile ? (
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 sm:p-8">
              <FileDropzone onFileSelected={handleFileSelected} />
            </div>
          ) : (
            <div className="bg-white border border-[#D4D4D4] rounded-lg p-6 space-y-6">
              {/* Selected File Details Box */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                      Selected Media File
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 text-xs text-[#666666] hover:text-[#111111] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove file</span>
                  </button>
                </div>

                <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {extractedMeta?.thumbnailUrl ? (
                      <img
                        src={extractedMeta.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-12 h-10 object-cover rounded border border-[#D4D4D4]"
                      />
                    ) : (
                      <div className="p-2.5 bg-white border border-[#E5E5E5] rounded text-[#111111]">
                        {mediaType === 'video' ? (
                          <Video className="w-5 h-5" />
                        ) : (
                          <Music className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-[#000000] break-all">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs font-mono-time text-[#666666] mt-0.5">
                        {mediaType.toUpperCase()} · {formatBytes(selectedFile.size)}
                        {extractedMeta?.duration ? ` · ${formatDuration(extractedMeta.duration)}` : ''}
                        {extractedMeta?.width && extractedMeta?.height ? ` · ${extractedMeta.width}×${extractedMeta.height}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D4D4D4] rounded text-xs font-mono-time text-[#111111]">
                    {isExtractingMeta ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse" />
                        <span>Extracting Info...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
                        <span>File Ready</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Project Name Form */}
              <div className="space-y-2">
                <label
                  htmlFor="project-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#000000]"
                >
                  PROJECT NAME
                </label>
                <input
                  id="project-name-input"
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isSaving}
                  placeholder="Enter project name..."
                  className="w-full bg-[#FAFAFA] border border-[#D4D4D4] focus:border-[#111111] focus:bg-white rounded-md px-3.5 py-2.5 text-sm text-[#000000] focus:outline-none transition-colors disabled:opacity-60"
                />
                <p className="text-xs text-[#666666]">
                  A descriptive title for your video transcript and workspace.
                </p>
              </div>

              {validationError && (
                <div className="p-3 bg-[#F5F5F5] border border-[#D4D4D4] rounded-md flex items-center gap-2 text-xs text-[#111111]">
                  <AlertCircle className="w-4 h-4 text-[#111111] shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                <Button 
                  variant="secondary" 
                  size="md" 
                  onClick={handleRemoveFile}
                  disabled={isSaving}
                >
                  Choose different file
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateFromFile}
                  disabled={isSaving}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {isSaving ? 'Saving Project...' : 'Create Project'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Import from URL */}
      {activeTab === 'url' && (
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-4 h-4 text-[#111111]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#000000]">
                IMPORT FROM PUBLIC URL
              </h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              Enter a direct link to a supported media stream (.mp4, .m3u8, .webm) or public video file.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="media-url-input" className="block text-xs font-bold text-[#111111]">
                Media URL
              </label>
              <input
                id="media-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://storage.googleapis.com/example/keynote.mp4"
                className="w-full bg-[#FAFAFA] border border-[#D4D4D4] focus:border-[#111111] focus:bg-white rounded-md px-3.5 py-2.5 text-xs sm:text-sm font-mono-time text-[#000000] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="url-project-name" className="block text-xs font-bold text-[#111111]">
                Project Name (Optional)
              </label>
              <input
                id="url-project-name"
                type="text"
                value={urlProjectName}
                onChange={(e) => setUrlProjectName(e.target.value)}
                placeholder="Leave blank to use filename from URL"
                className="w-full bg-[#FAFAFA] border border-[#D4D4D4] focus:border-[#111111] focus:bg-white rounded-md px-3.5 py-2.5 text-sm text-[#000000] focus:outline-none transition-colors"
              />
            </div>

            {urlError && (
              <div className="p-3 bg-[#F5F5F5] border border-[#D4D4D4] rounded-md flex items-center gap-2 text-xs text-[#111111]">
                <AlertCircle className="w-4 h-4 text-[#111111] shrink-0" />
                <span>{urlError}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateFromUrl}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Import and Create Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
