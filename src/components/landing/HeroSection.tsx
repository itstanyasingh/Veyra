import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onStartProject: () => void;
  onSeeHowItWorks: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartProject,
  onSeeHowItWorks,
}) => {
  return (
    <section className="relative pt-16 pb-12 sm:pt-24 sm:pb-16 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F5F5] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] uppercase tracking-wider mb-6">
        <span className="w-1.5 h-1.5 bg-[#111111] rounded-full"></span>
        <span>Video Intelligence & Media Workspace</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#000000] max-w-4xl mx-auto leading-[1.15] mb-6">
        TURN VIDEO INTO KNOWLEDGE.
      </h1>

      {/* Supporting Copy */}
      <p className="text-base sm:text-lg lg:text-xl text-[#666666] max-w-2xl mx-auto font-normal leading-relaxed mb-10">
        Transcribe, search, subtitle, translate, and understand your videos in one workspace.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onStartProject}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Start a project
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onSeeHowItWorks}
          icon={<ChevronDown className="w-4 h-4" />}
        >
          See how it works
        </Button>
      </div>

      {/* Subtle indicator metadata */}
      <div className="mt-12 flex items-center justify-center gap-6 text-xs text-[#999999]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#D4D4D4] rounded-full"></span>
          <span>Timestamp-Synchronized Playback</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#D4D4D4] rounded-full"></span>
          <span>Speaker Diarization</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#D4D4D4] rounded-full"></span>
          <span>SRT & VTT Subtitles</span>
        </div>
      </div>
    </section>
  );
};
