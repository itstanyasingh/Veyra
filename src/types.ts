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

export type EvidenceSourceType = 'transcript' | 'chapter' | 'keyMoment';
export type SourceValidationStatus = 'VALID' | 'STALE' | 'INVALID';

export interface UnifiedSource {
  id: string;
  projectId: string;
  sourceType: EvidenceSourceType;
  transcriptHash?: string;
  segmentId?: string;
  startTime: number;
  endTime?: number;
  speakerId?: string;
  speakerName?: string;
  textSnippet: string;
}

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

export interface VideoClip {
  id: string;
  projectId: string;
  sourceMediaId?: string;
  name: string;
  startTime: number;
  endTime: number;
  createdAt: string;
  updatedAt: string;
  sourceType?: string;
  sourceReference?: string;
  description?: string;
  needsReview?: boolean;
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
  | 'keywords'
  | 'knowledgeMap'
  | 'meetingIntelligence'
  | 'researchMode';

export interface ResearchSource {
  timestamp: number;
  segmentId?: string;
  textSnippet?: string;
  speaker?: string;
}

export type ClaimType = 'fact' | 'opinion' | 'recommendation' | 'prediction' | 'hypothesis' | 'unresolved';
export type EvidenceCategory = 'SUPPORTING' | 'CONTRADICTING' | 'CONTEXT';

export interface ResearchFinding {
  id: string;
  claim: string;
  claimType: ClaimType;
  summary?: string;
  excerpt?: string;
  timestamp: number;
  sources: ResearchSource[];
  evidenceCategory: EvidenceCategory;
  speaker?: string;
  userNotes?: string;
  isBookmarked?: boolean;
  isManual?: boolean;
  createdAt?: string;
}

export interface ResearchContradiction {
  id: string;
  claimA: string;
  timestampA: number;
  claimB: string;
  timestampB: number;
  summary: string;
  resolution?: string;
}

export interface ResearchItem {
  id: string;
  query: string;
  title: string;
  summary?: string;
  mainFinding?: string;
  findings: ResearchFinding[];
  contradictions: ResearchContradiction[];
  unresolvedQuestions: string[];
  isInsufficientEvidence?: boolean;
  transcriptHash: string;
  createdAt: string;
  updatedAt: string;
  isOutdated?: boolean;
}

export interface MeetingDecision {
  id: string;
  text: string;
  timestamp: number;
  sources: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }>;
  speaker?: string;
  context?: string;
  isManual?: boolean;
  createdAt?: string;
}

export interface MeetingActionItem {
  id: string;
  task: string;
  owner: string; // "Tanya" or "Unassigned"
  deadline: string; // "Friday" or "No deadline"
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  timestamp: number;
  sources: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }>;
  isManual?: boolean;
  createdAt?: string;
}

export interface MeetingQuestion {
  id: string;
  question: string;
  status: 'OPEN' | 'RESOLVED';
  timestamp: number;
  resolutionTimestamp?: number;
  resolutionSnippet?: string;
  sources: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }>;
  isManual?: boolean;
  createdAt?: string;
}

export interface MeetingRisk {
  id: string;
  risk: string;
  impact?: 'high' | 'medium' | 'low';
  timestamp: number;
  sources: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }>;
  isManual?: boolean;
}

export interface MeetingAgreementDisagreement {
  id: string;
  type: 'agreement' | 'disagreement';
  topic: string;
  summary: string;
  timestamp: number;
  sources: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }>;
}

export interface MeetingIntelligenceData {
  summary?: string;
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  openQuestions: MeetingQuestion[];
  risks: MeetingRisk[];
  agreementsDisagreements: MeetingAgreementDisagreement[];
  transcriptHash: string;
  updatedAt: string;
  isOutdated?: boolean;
}

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

export interface KnowledgeMapSource {
  timestamp: number;
  segmentId?: string;
  textSnippet?: string;
  speaker?: string;
  chapterTitle?: string;
}

export interface KnowledgeMapNode {
  id: string;
  name: string;
  type: 'main_topic' | 'subtopic' | 'concept';
  summary: string;
  sources: KnowledgeMapSource[];
  relatedTopicIds: string[];
  importanceScore?: number;
  chapterId?: string;
  parentId?: string;
}

export interface KnowledgeMapRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type?: 'contains' | 'related' | 'explains' | 'contrasts' | 'example' | 'causes' | 'follows';
}

export interface KnowledgeMapData {
  nodes: KnowledgeMapNode[];
  relationships: KnowledgeMapRelationship[];
  transcriptHash: string;
  updatedAt: string;
  isOutdated?: boolean;
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
  clips?: VideoClip[];
  summary?: ProjectSummary;
  aiAnalysisResults?: AIAnalysisResults;
  knowledgeMap?: KnowledgeMapData;
  meetingIntelligence?: MeetingIntelligenceData;
  researchItems?: ResearchItem[];
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
