import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

interface FinalCtaSectionProps {
  onStartProject: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onStartProject }) => {
  return (
    <section className="py-24 bg-white border-t border-[#E5E5E5] text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-3 font-mono-time">
          GET STARTED
        </p>
        
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#000000] mb-4">
          READY TO WORK WITH YOUR VIDEO?
        </h2>
        
        <p className="text-base text-[#666666] max-w-lg mx-auto mb-8 leading-relaxed">
          Turn your recordings into searchable, editable, and structured knowledge.
        </p>
        
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartProject}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Start a project
          </Button>
        </div>
      </div>
    </section>
  );
};
