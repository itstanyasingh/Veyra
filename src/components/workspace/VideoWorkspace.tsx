import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { VideoPlayerDeck } from './VideoPlayerDeck';
import { MediaInfoDeck } from './MediaInfoDeck';
import { WorkspaceToolsPanel } from './WorkspaceToolsPanel';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { RenameProjectModal } from '../dashboard/RenameProjectModal';
import { ReplaceMediaModal } from '../project/ReplaceMediaModal';
import { Button } from '../common/Button';
import { getProjectById, deleteProject, updateProject } from '../../services/projectStorage';
import { getMedia } from '../../services/mediaStorage';
import { Project } from '../../types';
import { isYouTubeUrl } from '../../utils/youtubeUtils';

interface VideoWorkspaceProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const VideoWorkspace: React.FC<VideoWorkspaceProps> = ({
  projectId,
  onNavigate,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showSubtitlesOverlay, setShowSubtitlesOverlay] = useState<boolean>(true);
  const [searchMatchTimestamps, setSearchMatchTimestamps] = useState<number[]>([]);
  const [activeCaptionLanguage, setActiveCaptionLanguage] = useState<string>('source');

  // Automatically reset active caption language back to 'source' if translations are invalidated/cleared
  useEffect(() => {
    if (project && (!project.translations || Object.keys(project.translations).length === 0)) {
      setActiveCaptionLanguage('source');
    }
  }, [project?.translations]);

  // Map translated segments to subtitle cues if a translation is active
  const activeSubtitles = React.useMemo(() => {
    if (!project) return [];
    if (activeCaptionLanguage === 'source') {
      if (project.subtitles && project.subtitles.length > 0) {
        return project.subtitles;
      }
      return (project.transcript || []).map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));
    }
    const trans = project.translations?.[activeCaptionLanguage];
    if (trans && Array.isArray(trans)) {
      return trans.map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));
    }
    if (project.subtitles && project.subtitles.length > 0) {
      return project.subtitles;
    }
    return (project.transcript || []).map((seg, idx) => ({
      id: seg.id || `sub_${idx}`,
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));
  }, [project?.subtitles, project?.transcript, project?.translations, activeCaptionLanguage]);

  // Modals
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState<boolean>(false);

  // Active blob URL ref for memory cleanup
  const activeBlobUrlRef = useRef<string | null>(null);

  // Player controller ref for seeking from external panels
  const playerControllerRef = useRef<{
    seek: (time: number) => void;
    play: () => void;
    pause: () => void;
  } | null>(null);

  const cleanupBlobUrl = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  const loadProjectAndMedia = async () => {
    setIsLoadingMedia(true);
    setMediaError(null);

    const proj = getProjectById(projectId);
    if (!proj) {
      setProject(null);
      setIsLoadingMedia(false);
      return;
    }

    setProject(proj);

    // Detect YouTube project
    const isYt = proj.sourceType === 'youtube' || Boolean(proj.youtubeVideoId) || isYouTubeUrl(proj.originalUrl || '') || isYouTubeUrl(proj.mediaUrl || '');
    if (isYt) {
      cleanupBlobUrl();
      setMediaBlobUrl(null);
      setIsLoadingMedia(false);
      return;
    }

    // If project has remote mediaUrl for direct file download, use that
    if (proj.mediaUrl) {
      cleanupBlobUrl();
      setMediaBlobUrl(proj.mediaUrl);
      setIsLoadingMedia(false);
      return;
    }

    // Retrieve Blob from IndexedDB
    try {
      const blob = await getMedia(proj.id);
      if (blob) {
        cleanupBlobUrl();
        const objectUrl = URL.createObjectURL(blob);
        activeBlobUrlRef.current = objectUrl;
        setMediaBlobUrl(objectUrl);
        setMediaError(null);
      } else {
        cleanupBlobUrl();
        setMediaBlobUrl(null);
        setMediaError('Media file is not found in local browser storage. You can attach a replacement file below.');
      }
    } catch (err) {
      console.error('Error fetching media from IndexedDB:', err);
      setMediaError('Unable to access media storage.');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadProjectAndMedia();

    return () => {
      cleanupBlobUrl();
    };
  }, [projectId]);

  const handleDelete = () => {
    if (project) {
      deleteProject(project.id);
      onNavigate('/projects');
    }
  };

  const handleRename = (newName: string) => {
    if (project) {
      const updated = updateProject(project.id, { name: newName });
      if (updated) {
        setProject(updated);
      }
    }
  };

  const handleUpdateProject = useCallback((updates: Partial<Project>) => {
    if (project) {
      const updated = updateProject(project.id, updates);
      if (updated) {
        setProject(updated);
      }
    }
  }, [project]);

  const handleMediaReplaced = (updatedProj: Project) => {
    setProject(updatedProj);
    loadProjectAndMedia();
  };

  const handleDurationLoaded = useCallback((duration: number, width?: number, height?: number) => {
    if (project) {
      const currentDur = project.duration || 0;
      const durChanged = !project.duration || Math.abs(currentDur - duration) > 1.0;
      const widthChanged = Boolean(width && width !== project.width);
      const heightChanged = Boolean(height && height !== project.height);

      if (durChanged || widthChanged || heightChanged) {
        const updates: Partial<Project> = {};
        if (durChanged) updates.duration = Math.round(duration);
        if (widthChanged) updates.width = width;
        if (heightChanged) updates.height = height;

        const updated = updateProject(project.id, updates);
        if (updated) {
          setProject(updated);
        }
      }
    }
  }, [project]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (playerControllerRef.current) {
      playerControllerRef.current.seek(time);
      playerControllerRef.current.play();
    }
  }, []);

  const handleTimeUpdateCallback = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handlePlayerRefCallback = useCallback((ctrl: any) => {
    playerControllerRef.current = ctrl;
  }, []);

  const handleSearchMatchesChanged = useCallback((matches: number[]) => {
    setSearchMatchTimestamps((prev) => {
      if (prev.length === matches.length && prev.every((val, idx) => val === matches[idx])) {
        return prev;
      }
      return matches;
    });
  }, []);

  // Not Found State
  if (!project && !isLoadingMedia) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 text-center bg-[#FFFFFF]">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wider text-[#000000]">
            Video Not Found
          </h2>
          <p className="text-xs text-[#666666]">
            The video you requested does not exist or has been removed.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/projects')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Videos Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 text-center bg-[#FFFFFF]">
        <div className="space-y-3">
          <div className="w-2 h-2 rounded-full bg-[#111111] animate-ping mx-auto" />
          <p className="text-xs font-mono-time uppercase tracking-widest text-[#666666]">
            LOADING WORKSPACE
          </p>
        </div>
      </div>
    );
  }

  const isYtProject = project.sourceType === 'youtube' || Boolean(project.youtubeVideoId) || isYouTubeUrl(project.originalUrl || '') || isYouTubeUrl(project.mediaUrl || '');

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* 1. Compact Application Header */}
      <WorkspaceHeader
        project={project}
        showSubtitlesOverlay={showSubtitlesOverlay}
        onToggleSubtitlesOverlay={() => setShowSubtitlesOverlay(!showSubtitlesOverlay)}
        onNavigate={onNavigate}
        onRename={handleRename}
        onOpenReplaceMedia={() => setIsReplaceOpen(true)}
        onOpenDeleteConfirm={() => setIsDeleteOpen(true)}
        activeCaptionLanguage={activeCaptionLanguage}
        setActiveCaptionLanguage={setActiveCaptionLanguage}
      />

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 w-full max-w-[1680px] mx-auto p-3 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Player + Controls + Media Specs (7 cols on lg, 7 cols on xl) */}
          <section className="lg:col-span-7 xl:col-span-7 space-y-4">
            {(isYtProject || mediaBlobUrl) ? (
              <VideoPlayerDeck
                sourceType={isYtProject ? 'youtube' : 'upload'}
                youtubeVideoId={project.youtubeVideoId}
                originalUrl={project.originalUrl || (isYtProject ? project.mediaUrl : undefined)}
                mediaUrl={isYtProject ? undefined : mediaBlobUrl || undefined}
                mediaType={project.mediaType}
                fileName={project.fileName}
                aspectRatio={project.aspectRatio}
                currentTime={currentTime}
                duration={project.duration || 60}
                showSubtitlesOverlay={showSubtitlesOverlay}
                transcriptSegments={project.transcript}
                subtitles={activeSubtitles}
                searchMatchTimestamps={searchMatchTimestamps}
                onDurationLoaded={handleDurationLoaded}
                onOpenReplaceMedia={() => setIsReplaceOpen(true)}
                onSeek={handleSeek}
                onTimeUpdateCallback={handleTimeUpdateCallback}
                playerRefCallback={handlePlayerRefCallback}
              />
            ) : (
              /* Missing Media Fallback Area */
              <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#666666] mx-auto">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-1">
                    No Media File Attached
                  </h3>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    {mediaError || 'The binary media asset for this video is missing from browser storage.'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsReplaceOpen(true)}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Attach Media File
                </Button>
              </div>
            )}

            {/* Media Specifications Deck */}
            <MediaInfoDeck project={project} />
          </section>

          {/* Right Column: Tools & Transcript Deck (5 cols on lg, 5 cols on xl) */}
          <section className="lg:col-span-5 xl:col-span-5 h-[calc(100vh-140px)] sticky top-16">
            <WorkspaceToolsPanel 
              project={project} 
              currentTime={currentTime}
              onSeek={handleSeek}
              onUpdateProject={handleUpdateProject}
              onSearchMatchesChanged={handleSearchMatchesChanged}
              activeCaptionLanguage={activeCaptionLanguage}
              setActiveCaptionLanguage={setActiveCaptionLanguage}
            />
          </section>
        </div>
      </main>

      {/* MODALS */}
      {/* Rename Modal */}
      {isRenameOpen && (
        <RenameProjectModal
          isOpen={isRenameOpen}
          initialName={project.name}
          onClose={() => setIsRenameOpen(false)}
          onRename={(newName) => handleRename(newName)}
        />
      )}

      {/* Replace Media Modal */}
      {isReplaceOpen && (
        <ReplaceMediaModal
          isOpen={isReplaceOpen}
          project={project}
          onClose={() => setIsReplaceOpen(false)}
          onMediaReplaced={handleMediaReplaced}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          title="Delete Video"
          message={`Are you sure you want to permanently delete "${project.name}" and its associated media storage? This action cannot be undone.`}
          confirmLabel="Delete Video"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={handleDelete}
          onClose={() => setIsDeleteOpen(false)}
        />
      )}
    </div>
  );
};
