import React from 'react';
import { ArrowLeft, Clock, Layers } from 'lucide-react';
import { Button } from './Button';

interface PlaceholderViewProps {
  title: string;
  subtitle: string;
  phaseNumber: number;
  onNavigate: (path: string) => void;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  subtitle,
  phaseNumber,
  onNavigate,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 sm:py-28 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F5F5] border border-[#E5E5E5] rounded-md text-xs font-mono-time text-[#666666] mb-6">
        <Clock className="w-3.5 h-3.5 text-[#111111]" />
        <span>DEVELOPMENT ROADMAP · PHASE {phaseNumber}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold text-[#000000] tracking-tight mb-4">
        {title}
      </h1>

      <p className="text-[#666666] max-w-lg mx-auto mb-8 text-sm sm:text-base leading-relaxed">
        {subtitle}
      </p>

      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6 max-w-md mx-auto text-left mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#111111] mb-2 uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Implementation Architecture</span>
        </div>
        <p className="text-xs text-[#666666] leading-relaxed">
          Phase 1 establishes the design system, routing foundation, and editorial landing page. This module will be activated in upcoming phases per the VEYRA specification.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onNavigate('/')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to Overview
        </Button>
      </div>
    </div>
  );
};
