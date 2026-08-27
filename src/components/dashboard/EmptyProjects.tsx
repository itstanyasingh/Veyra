import React from 'react';
import { Plus, Video } from 'lucide-react';
import { Button } from '../common/Button';

interface EmptyProjectsProps {
  onCreateProject: () => void;
}

export const EmptyProjects: React.FC<EmptyProjectsProps> = ({ onCreateProject }) => {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-12 sm:p-16 text-center max-w-2xl mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mx-auto mb-4">
        <Video className="w-5 h-5" />
      </div>

      <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#000000] mb-2">
        NO PROJECTS YET
      </h3>

      <p className="text-xs sm:text-sm text-[#666666] max-w-sm mx-auto leading-relaxed mb-6">
        Upload your first video to start transcribing, searching, and understanding your content.
      </p>

      <Button
        variant="primary"
        size="md"
        onClick={onCreateProject}
        icon={<Plus className="w-4 h-4" />}
      >
        Create your first project
      </Button>
    </div>
  );
};
