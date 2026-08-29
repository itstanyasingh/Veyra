import React, { useState, useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  acceptedFormatsText?: string;
}

const SUPPORTED_EXTENSIONS = [
  '.mp4', '.mov', '.webm', '.avi', '.mkv',
  '.mp3', '.wav', '.m4a', '.aac', '.flac'
];

const SUPPORTED_MIME_TYPES = [
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac'
];

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  acceptedFormatsText = 'MP4, MOV, WEBM, MP3, WAV, M4A, AAC, FLAC (Max 2GB)',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage("This file is too large. Please upload a smaller file.");
      return;
    }

    const fileName = file.name.toLowerCase();
    const isExtensionValid = SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const isMimeValid = file.type ? SUPPORTED_MIME_TYPES.includes(file.type) || file.type.startsWith('video/') || file.type.startsWith('audio/') : false;

    if (!isExtensionValid && !isMimeValid) {
      const isAudioName = /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName);
      if (isAudioName) {
        setErrorMessage("This audio format isn't supported.");
      } else {
        setErrorMessage("This file format isn't supported.");
      }
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="video/*,audio/*,.mp4,.mov,.webm,.avi,.mkv,.mp3,.wav,.m4a,.aac,.flac"
        className="hidden"
        id="veyra-file-input"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-[#000000] bg-[#F5F5F5]'
            : 'border-[#D4D4D4] hover:border-[#111111] bg-[#FAFAFA] hover:bg-[#F9F9F9]'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-4 shadow-xs">
            <Upload className="w-5 h-5" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-[#000000] mb-1">
            Choose a video or audio file
          </h3>

          <p className="text-xs text-[#666666] mb-6 max-w-xs leading-relaxed">
            Drag and drop your file here, or click to browse files from your computer.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Choose file
          </Button>

          <p className="text-[11px] font-mono-time text-[#999999] mt-6">
            {acceptedFormatsText}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-[#F5F5F5] border border-[#D4D4D4] rounded-md flex items-start gap-2.5 text-xs text-[#111111]">
          <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Invalid file</p>
            <p className="text-[#666666]">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
