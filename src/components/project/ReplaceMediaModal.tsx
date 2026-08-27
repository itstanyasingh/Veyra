import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FileDropzone } from '../dashboard/FileDropzone';
import { extractMediaMetadata } from '../../utils/mediaUtils';
import { replaceMedia } from '../../services/mediaStorage';
import { updateProject } from '../../services/projectStorage';
import { Project, MediaType } from '../../types';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { Video, Music, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReplaceMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onMediaReplaced: (updatedProject: Project) => void;
}

export const ReplaceMediaModal: React.FC<ReplaceMediaModalProps> = ({
  isOpen,
  onClose,
  project,
  onMediaReplaced,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{
    duration?: number;
    width?: number;
    height?: number;
    aspectRatio?: string;
    thumbnailUrl?: string;
    mediaType: MediaType;
  } | null>(null);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsProcessing(true);

    try {
      const isAudio = file.type.startsWith('audio/') || 
        ['.mp3', '.wav', '.m4a', '.aac', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext));
      const calculatedMediaType: MediaType = isAudio ? 'audio' : 'video';

      const meta = await extractMediaMetadata(file, isAudio);
      setExtractedInfo({
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        aspectRatio: meta.aspectRatio,
        thumbnailUrl: meta.thumbnailUrl,
        mediaType: calculatedMediaType,
      });
    } catch (err) {
      console.warn('Failed to extract full metadata:', err);
      setError('Could not extract media information. You can still proceed with replacement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!selectedFile) {
      setError('Please choose a replacement file.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Save new file to IndexedDB
      await replaceMedia(project.id, selectedFile);

      // 2. Update project record
      const updates: Partial<Project> = {
        fileName: selectedFile.name,
        fileType: selectedFile.type || (extractedInfo?.mediaType === 'video' ? 'video/mp4' : 'audio/mp3'),
        fileSize: selectedFile.size,
        mediaType: extractedInfo?.mediaType || project.mediaType,
        duration: extractedInfo?.duration || project.duration,
        width: extractedInfo?.width,
        height: extractedInfo?.height,
        aspectRatio: extractedInfo?.aspectRatio,
        thumbnailUrl: extractedInfo?.thumbnailUrl,
        status: 'ready',
      };

      const updated = updateProject(project.id, updates);
      if (updated) {
        onMediaReplaced(updated);
        onClose();
      } else {
        setError('Failed to update project metadata.');
      }
    } catch (err) {
      console.error('Failed to replace media:', err);
      setError('Failed to save replacement file to browser storage.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedInfo(null);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Replace Project Media" maxWidth="md">
      <div className="space-y-5">
        <p className="text-xs text-[#666666] leading-relaxed">
          Select a new audio or video file to replace the current media for <strong>"{project.name}"</strong>. The existing media file will be safely overwritten.
        </p>

        {!selectedFile ? (
          <FileDropzone onFileSelected={handleFileSelected} />
        ) : (
          <div className="space-y-4">
            <div className="bg-[#FAFAFA] border border-[#D4D4D4] rounded-md p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-[#E5E5E5] rounded text-[#111111]">
                  {extractedInfo?.mediaType === 'video' ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#000000] break-all">
                    {selectedFile.name}
                  </h4>
                  <p className="text-[11px] font-mono-time text-[#666666] mt-0.5">
                    {formatBytes(selectedFile.size)}
                    {extractedInfo?.duration ? ` · ${formatDuration(extractedInfo.duration)}` : ''}
                    {extractedInfo?.width && extractedInfo?.height ? ` · ${extractedInfo.width}×${extractedInfo.height}` : ''}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#D4D4D4] rounded text-[11px] font-mono-time text-[#111111] shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready</span>
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#666666] hover:text-[#111111] underline cursor-pointer"
              >
                Choose a different file
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#F5F5F5] border border-[#D4D4D4] rounded-md flex items-center gap-2 text-xs text-[#111111]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5E5]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmReplace}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? 'Replacing Media...' : 'Confirm & Replace'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
