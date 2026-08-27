import React from 'react';
import { VideoWorkspace } from '../workspace/VideoWorkspace';

interface ProjectMediaPageProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectMediaPage: React.FC<ProjectMediaPageProps> = ({
  projectId,
  onNavigate,
}) => {
  return <VideoWorkspace projectId={projectId} onNavigate={onNavigate} />;
};
