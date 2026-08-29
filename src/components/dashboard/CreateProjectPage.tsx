import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { HomeImportArea } from '../home/HomeImportArea';

interface CreateProjectPageProps {
  onNavigate: (path: string) => void;
}

export const CreateProjectPage: React.FC<CreateProjectPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Back Navigation */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#000000] mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Videos</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-1">
          NEW MEDIA TRANSCRIPTION
        </h1>
        <p className="text-xs sm:text-sm text-[#666666]">
          Upload a video or audio recording, or paste a link to transcribe with VEYRA.
        </p>
      </div>

      {/* Universal Media Input */}
      <div className="pt-2">
        <HomeImportArea onNavigate={onNavigate} />
      </div>
    </div>
  );
};

