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
  color?: string;
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

export type AIAnalysisTask =
  | 'summary'
  | 'keyPoints'
  | 'chapters'
  | 'keyMoments'
  | 'actionItems'
  | 'questions'
  | 'topics'
  | 'keywords';

export interface AIKeyPoint {
  id: string;
  number: string;
  title: string;
  description: string;
  timestamp?: number;
}

export interface AIChapter {
  title: string;
  startTime: number;
  endTime: number;
  summary: string;
}

export interface AIKeyMoment {
  timestamp: number;
  title: string;
  explanation: string;
}

export interface AIActionItem {
  task: string;
  owner: string;
  deadline: string;
  completed?: boolean;
}

export interface AIQuestion {
  question: string;
  askedBy?: string;
  timestamp?: number;
  isAnswered: boolean;
  answerOrReason?: string;
  reason?: string;
}

export interface AITopic {
  name: string;
  description: string;
  timestamps: number[];
}

export interface AIKeyword {
  term: string;
  category?: string;
  count: number;
  relevance: number;
}

export interface AISummaryResult {
  overview: string;
  keyPoints: string[];
  length?: 'short' | 'medium' | 'detailed';
}

export interface AIAnalysisResults {
  summary?: AISummaryResult;
  keyPoints?: AIKeyPoint[];
  chapters?: AIChapter[];
  keyMoments?: AIKeyMoment[];
  actionItems?: AIActionItem[];
  questions?: {
    asked: AIQuestion[];
    unanswered: AIQuestion[];
  };
  topics?: AITopic[];
  keywords?: AIKeyword[];
  transcriptHash?: string;
  updatedAt?: string;
}

export type SourceType = 'upload' | 'youtube';

export interface TranslationMetadata {
  targetLanguage: string;
  sourceLanguage?: string;
  transcriptHash?: string;
  createdAt: string;
  updatedAt: string;
  segmentCount: number;
  isEdited?: boolean;
}

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
  translationMetadata?: Record<string, TranslationMetadata>;
  notes?: ProjectNote[];
  highlights?: ProjectHighlight[];
  summary?: ProjectSummary;
  aiAnalysisResults?: AIAnalysisResults;
  transcriptHash?: string;
  subtitlesTranscriptHash?: string;
  subtitlesEdited?: boolean;
  generatedDocs?: Record<string, {
    title: string;
    content: string;
    isInsufficient: boolean;
    sections: Array<{ id: string; title: string; text: string; startTime: number; segmentIds: string[] }>;
    transcriptHash: string;
    updatedAt: string;
  }>;
}
