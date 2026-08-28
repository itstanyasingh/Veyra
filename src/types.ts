/**
 * VEYRA — Type Definitions
 * Source of Truth: PRD.md & DESIGN.md
 */

export type AppRoute = 
  | { path: '/' }
  | { path: '/projects' }
  | { path: '/projects/new' }
  | { path: '/project/:id'; projectId: string }
  | { path: '/search' }
  | { path: '/study' }
  | { path: '/settings' };

export type ProjectStatus = 'idle' | 'created' | 'preparing' | 'processing' | 'ready' | 'error';
export type MediaType = 'video' | 'audio';

export interface Speaker {
  id: string;
  name: string;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  startTime: number; // in seconds (float)
  endTime: number;   // in seconds (float)
  text: string;
}

export interface SubtitleCue {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface ProjectNote {
  id: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

export interface ProjectHighlight {
  id: string;
  segmentId: string;
  timestamp: number;
  text: string;
  speakerName: string;
  createdAt: string;
}

export interface ProjectSummary {
  overview: string;
  keyPoints: string[];
  chapters: {
    title: string;
    startTime: number;
    endTime: number;
    summary: string;
  }[];
  actionItems: string[];
}

export type SourceType = 'upload' | 'youtube';

export interface Project {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  mediaType: MediaType;
  sourceType?: SourceType;
  youtubeVideoId?: string;
  originalUrl?: string;
  duration?: number; // in seconds
  width?: number; // in pixels (for video)
  height?: number; // in pixels (for video)
  aspectRatio?: string; // e.g. "16:9", "4:3", "9:16"
  thumbnailUrl?: string; // data URL or frame snapshot
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  mediaUrl?: string; // Optional local blob / object url (for uploaded files)
  language?: string;
  speakers?: Speaker[];
  transcript?: TranscriptSegment[];
  subtitles?: SubtitleCue[];
  translations?: Record<string, TranscriptSegment[]>;
  notes?: ProjectNote[];
  highlights?: ProjectHighlight[];
  summary?: ProjectSummary;
}
