# VEYRA — Product Requirements Document (PRD)

**Version:** 1.0.0  
**Status:** Approved Specification  
**Product:** VEYRA  
**Category:** Video Intelligence + Transcription + Media Workspace  
**Core Statement:** *"Turn videos into searchable, editable, understandable information."*

---

## 1. Product Overview

VEYRA is a professional, browser-native video-to-text intelligence platform and media workspace. It bridges the gap between raw video/audio media and actionable textual knowledge. Unlike simple one-shot speech-to-text APIs or generic conversational chatbots, VEYRA provides a unified environment where timecoded media, interactive transcripts, subtitle synchronization, multi-lingual translations, timecode-grounded AI intelligence (RAG), structured notes, and export pipelines operate in real time.

---

## 2. Product Vision

To become the standard high-precision workspace for creators, researchers, media producers, educators, legal analysts, and enterprise teams who need to extract, refine, search, translate, and synthesize knowledge from video and audio assets with zero hallucination and mathematical timestamp precision.

---

## 3. Product Goals

1. **Precision Synchronization:** Maintain real-time bi-directional synchronization between media playback and timecoded transcript paragraphs down to the exact second/sub-second.
2. **Zero-Friction Ingestion:** Enable seamless ingestion via local file upload (drag & drop), URL import, and direct web recording.
3. **True Grounded Intelligence:** Eliminate hallucinations by anchoring all AI summaries, question-answering, and key-moment extractions to verifiable timestamped citations.
4. **Professional Output Standards:** Support industry-standard broadcast and editing formats (SRT, VTT, TXT, DOCX, JSON).
5. **Calm, High-Density Ergonomics:** Deliver a distraction-free, light monochrome editorial aesthetic (pure white canvas, black text, subtle gray surfaces) optimized for long focus sessions.

---

## 4. Target Users

- **Media Producers & Video Editors:** Requiring accurate transcripts and subtitle timing (SRT/VTT) with quick search to find soundbites.
- **Journalists & Podcasters:** Conducting long-form interviews that need speaker identification, speaker renaming, quoting, and topic outlines.
- **Researchers & Academics:** Analyzing lectures, qualitative interviews, and focus groups with deep timecoded notes and search.
- **Corporate & Product Teams:** Reviewing customer research calls, webinars, and all-hands meetings with automatic action items and queryable intelligence.
- **Translators & Localization Teams:** Translating captions and transcriptions across global languages while preserving timecodes.

---

## 5. User Problems & Solutions

| Problem | Existing Inefficiency | VEYRA Solution |
|---|---|---|
| **Opaque Video Content** | Finding a 10-second quote requires scrubbing through hours of footage blindly. | Full-text searchable transcript with instant click-to-seek jump points. |
| **Hallucinatory AI Tools** | Generic chatbots summarize videos vaguely without citing actual timestamp proofs. | Evidence-backed RAG engine returning strict timestamp citations linked directly to the video player. |
| **Fragmented Toolchains** | Users use one tool for transcription, another for subtitles, another for translation, and a document editor for notes. | Integrated workspace containing transcript editing, subtitle burning/export, translation, notes, and AI intelligence in one screen. |
| **Cluttered, Flashy UIs** | AI SaaS platforms overwhelm with colorful gradient cards, fake animations, and slow interfaces. | Minimalist, monochrome, high-performance interface focused purely on data density and operational speed. |

---

## 6. Core User Journeys

```
LANDING PAGE / DASHBOARD
         │
         ▼
CREATE / IMPORT PROJECT (Upload / URL / Record)
         │
         ▼
MEDIA PROCESSING & SPEAKER DETECTION
         │
         ▼
SYNCHRONIZED VIDEO WORKSPACE
   ├── 1. Transcript Editor (Edit text, rename speakers, search & replace)
   ├── 2. Subtitle Station (Cues, limits, timing adjustments, preview)
   ├── 3. Translation Hub (Target language conversion, side-by-side review)
   ├── 4. Video Intelligence & RAG (Ask Video, key moments, summaries)
   └── 5. Notes & Highlights (Timecoded annotations, bookmarks)
         │
         ▼
EXPORT & DOWNLOAD (SRT, VTT, TXT, DOCX, JSON)
```

---

## 7. Information Architecture

```
/ (Root)
├── Landing Page (Product definition, live workflow preview, CTAs)
├── Dashboard (Recent projects list, search, status, creation triggers)
├── New Project Flow (File upload dropzone, URL intake, live recorder, configuration)
└── Workspace View (/workspace/:projectId)
    ├── Primary Navigation Bar (Project title, status indicator, export modal trigger)
    ├── Workspace Stage (Split pane layout)
    │   ├── Left Pane: Video Player + Timecode Display + Scrub Bar + Playback Controls
    │   └── Right Pane: Tabbed Operational Workspace
    │       ├── Tab: Transcript (Interactive segments, speaker badges, find/replace)
    │       ├── Tab: Subtitles (Cue editor, character count guards, timecode shifts)
    │       ├── Tab: Translate (Target language selector, translated transcript stream)
    │       ├── Tab: Intelligence (Grounded Q&A chat, executive summary, chapters)
    │       └── Tab: Notes & Highlights (User timecoded notes, saved quote library)
    └── Global Modals (Export Engine, Speaker Renamer, Project Settings)
```

---

## 8. Application Pages & Views

1. **Landing Page:** Minimal, high-impact overview with clear value proposition, functional breakdown, and instant project start triggers.
2. **Dashboard:** Project repository displaying cards/table with video thumbnail, title, media duration, transcript status, language badge, and modification dates.
3. **New Project Modal / Page:** Ingestion hub supporting Drag & Drop video/audio, URL import, and Web Audio/Video live recording with configuration (Source language, Speaker Diarization toggle).
4. **Active Workspace:** The high-density synchronized media console.
5. **Project Settings & Metadata:** Project renaming, audio track replacement, language defaults, and deletion.

---

## 9. Feature Requirements

### 9.1 Ingestion & Media Support
- Video formats: MP4, WebM, MOV, OGG, MKV.
- Audio formats: MP3, WAV, M4A, AAC.
- Web Recording: Direct browser camera + microphone recording via `MediaRecorder` API with instant project creation.
- File Metadata Extraction: Resolution, duration, codec detection, audio channel count, file size.

### 9.2 Bi-Directional Synchronized Media Engine
- Continuous tracking of current playback time (`currentTime`).
- Auto-scrolling transcript window to keep current speaker segment in viewport (with user-override scroll lock).
- Click-to-seek: Clicking any word or timestamp instantly jumps media playback to that exact millisecond.
- Variable playback speeds: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x.

### 9.3 Transcript Management
- Speaker Diarization: Visual grouping of speech by detected speaker (`Speaker 1`, `Speaker 2`).
- Speaker Entity Renaming: Global rename tool updating all occurrences of a speaker across the entire transcript.
- In-place Inline Editing: Direct content-editable transcript segments with undo/redo stack.
- Find & Replace: Full regex and case-sensitive search and replace within transcript segments.

### 9.4 Subtitle Generator & Editor
- Automatic conversion of transcript into standard subtitle cues conforming to reading speed guidelines (max 42 chars/line, 2 lines/cue).
- Interactive cue timing adjustment (`startTime`, `endTime`).
- Live subtitle overlay rendering atop the video player.
- Subtitle validation: Flags cues that exceed CPS (Characters Per Second) limits.

### 9.5 Translation System
- Multi-lingual translation pipeline supporting 20+ major languages (Spanish, French, German, Japanese, Chinese, Arabic, Hindi, Portuguese, etc.).
- Segment-preserved alignment: Every translated paragraph retains the exact original start/end timecodes.
- Dual-pane or toggled translation view for side-by-side editorial verification.

### 9.6 AI Video Intelligence & Grounded RAG
- **Ask Your Video:** Natural language conversational interface grounded strictly in the transcript index.
- **Evidence Citations:** Every assertion in an AI response provides clickable `[HH:MM:SS]` badges that seek the player to the exact proof point.
- **Executive Summary:** Synthesized high-level overview of the video narrative.
- **Key Takeaways & Action Items:** Bulleted extraction of decisions made and next steps.
- **Topic & Chapter Segmentation:** Automatic detection of chapter bounds with titles and time spans.

### 9.7 Notes & Highlights
- **Timecoded Notes:** Markdown-capable scratchpad where users can log annotations tied to the current video playback position.
- **Highlight Collection:** One-click clipping of transcript sentences into a dedicated "Highlights / Quotes" drawer with direct jump-backs.

### 9.8 Export Engine
- **Transcript:** Plain Text (`.txt`), Formatted Document (`.docx` structure / HTML print), JSON data with full word-level timestamps.
- **Subtitles:** SubRip Subtitle (`.srt`), Web Video Text Tracks (`.vtt`).
- **Intelligence Report:** Summary and Q&A digest export.

---

## 10. Functional Requirements

1. **FR-01:** System must allow importing media up to 500MB via file upload or local blob URL.
2. **FR-02:** System must extract audio stream or directly process video files using AI/Gemini server endpoints.
3. **FR-03:** System must generate segmented transcript items containing `id`, `speakerId`, `startTime`, `endTime`, and `text`.
4. **FR-04:** Video player must update active segment ID at 60Hz or `timeupdate` frequency.
5. **FR-05:** Search query execution must compute all matching indices across the transcript within < 50ms and provide instantaneous navigational stepper (Next/Prev result).
6. **FR-06:** All user edits to transcript text, speaker names, notes, and highlights must be persisted in local workspace state / persistent storage.
7. **FR-07:** Export files must generate proper MIME-types and trigger immediate browser downloads without external redirects.

---

## 11. Non-Functional Requirements

1. **NFR-01 (Performance):** UI response to video seek operations must be instantaneous (< 16ms render loop).
2. **NFR-02 (Reliability):** State persistence must prevent loss of edits on page refresh.
3. **NFR-03 (Security):** Media files processed locally or via server proxies must not expose unauthorized credentials to client code.
4. **NFR-04 (Design Discipline):** Strict adherence to Light Monochrome palette (White `#FFFFFF`, Near Black `#111111`, Subtle Grays `#E5E5E5` / `#F5F5F5`) without distracting gradients, glow effects, or visual clutter.
5. **NFR-05 (Accessibility):** Full keyboard shortcuts for playback (Space for Play/Pause, J/L for backward/forward seek, K for pause, Esc for search clear).

---

## 12. Data Requirements & Schemas

### Project Model
```typescript
interface Project {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'video' | 'audio';
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: string;
  updatedAt: string;
  status: 'ready' | 'processing' | 'error';
  language: string;
  speakers: Speaker[];
  transcript: TranscriptSegment[];
  subtitles: SubtitleCue[];
  translations: Record<string, TranscriptSegment[]>; // langCode -> segments
  notes: ProjectNote[];
  highlights: ProjectHighlight[];
  summary?: ProjectSummary;
}

interface Speaker {
  id: string;
  name: string;
  colorIndex?: number;
}

interface TranscriptSegment {
  id: string;
  speakerId: string;
  startTime: number; // in seconds (float)
  endTime: number; // in seconds (float)
  text: string;
}

interface SubtitleCue {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface ProjectNote {
  id: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

interface ProjectHighlight {
  id: string;
  segmentId: string;
  timestamp: number;
  text: string;
  speakerName: string;
  createdAt: string;
}

interface ProjectSummary {
  overview: string;
  keyPoints: string[];
  chapters: { title: string; startTime: number; endTime: number; summary: string }[];
  actionItems: string[];
}
```

---

## 13. AI Requirements

1. **Model Backbone:** Gemini 2.5 / 2.0 Flash via server-side API proxy (`/api/transcribe`, `/api/intelligence`, `/api/translate`).
2. **Transcription Prompting:** Zero-hallucination structured JSON output requiring strict segment timecodes and speaker diarization.
3. **Intelligence RAG Prompting:** Strict system prompt instructing the model to answer queries solely from the transcript context and attach timestamp citations in the exact format `[timestamp: SS]` or `[HH:MM:SS]`.
4. **Graceful Degradation:** When media or transcript has ambiguous audio, return confidence flags rather than fabricating dialogues.

---

## 14. Video Processing Requirements

- HTML5 `<video>` element abstraction with custom skin/controls.
- Custom scrubbing bar rendering loaded buffer, current playhead, and chapter markers.
- Frame-accurate jump controls (-5s, +5s, -1s, +1s).
- Subtitle canvas overlay with high-contrast text shadow for readability over bright video backgrounds.

---

## 15. Transcription Requirements

- Automatically split speech into coherent conversational blocks (1-3 sentences per segment).
- Associate each block with consistent speaker IDs.
- Render clean typography with inline speaker badge, timestamp badge, and editable paragraph body.

---

## 16. Subtitle Requirements

- Subtitle cue generation algorithms that respect max words per line (approx 8-10 words).
- Real-time cue editing with immediate visual feedback on the video overlay.
- Timing shift utility (+/- 100ms, +/- 500ms) to synchronize drifting audio.

---

## 17. Translation Requirements

- Language selection with localized language names.
- Translation engine that preserves exact timestamp structure.
- Ability to export subtitles or transcripts in the selected target language.

---

## 18. Search Requirements

- Client-side instantaneous full-text fuzzy and exact search.
- Highlight matching substrings with high-contrast inverted marks.
- Navigation bar displaying `Match X of Y` with keyboard shortcuts (Enter for Next, Shift+Enter for Prev).
- Clicking any search match seeks the video immediately to that segment.

---

## 19. Video Intelligence Requirements

- **Ask Video Query Engine:** Interactive query bar with pre-built prompt suggestions ("What are the key conclusions?", "Summarize decisions made", "List all discussed topics").
- **Timestamp Proofs:** AI responses parse timestamp tokens into interactive buttons.

---

## 20. RAG / Evidence Architecture

```
VIDEO MEDIA / TRANSCRIPT
         │
         ▼
SEMANTIC CHUNKING (Segments + Timecodes + Speakers)
         │
         ▼
INDEX BUILDER & IN-MEMORY TOKEN CACHE
         │
         ▼
RELEVANT CONTEXT RETRIEVAL (Query matching against segments)
         │
         ▼
LLM GENERATION (Grounded Prompt with strict citation rules)
         │
         ▼
SYNTHESIZED ANSWER WITH TIMESTAMP CITATION ANCHORS
         │
         ▼
CLICKABLE SEEK ACTION IN VIDEO WORKSPACE
```

---

## 21. Export Requirements

- **SRT Format:** Standard SubRip syntax (`1 \n 00:00:01,000 --> 00:00:04,000 \n Text \n\n`).
- **VTT Format:** Standard WebVTT syntax (`WEBVTT \n\n 00:00:01.000 --> 00:00:04.000 \n Text \n\n`).
- **TXT Format:** Clean speaker-annotated transcript with timestamps.
- **DOCX / HTML Format:** Formatted document with project metadata, summary, and organized transcript table.
- **JSON Format:** Raw structured data for developer ingest.

---

## 22. Project Management

- Projects stored with persistent identifiers.
- Dashboard with project search, sorting by date/name, and batch deletion.
- Project duplication and project renaming.

---

## 23. Error Handling

- File size and format validation on dropzone with clear user feedback.
- Network and API timeout recovery with retry triggers.
- Video playback error traps (unsupported codecs, corrupted headers) with descriptive fallback messages.

---

## 24. Accessibility (a11y)

- WCAG AA contrast ratio compliance across all dark-mode monochrome levels.
- Keyboard focus rings using `#FFFFFF` with offset.
- `aria-label` tags on all icon-only buttons (Play, Pause, Mute, Seek, Settings, Close).
- Screen-reader accessible transcript semantic tags (`<article>`, `<time>`, `<section>`).

---

## 25. Responsive Behavior

- **Desktop (>= 1024px):** Split-view side-by-side layout (Video fixed on left, multi-tab workspace on right).
- **Tablet (768px - 1023px):** Stacked responsive view with collapsible video preview.
- **Mobile (< 768px):** Sticky top video player with tabbed tool switcher below.

---

## 26. Security Considerations

- All Gemini API calls routed via server-side endpoints without client-side key leaks.
- Sanitized markdown rendering to prevent XSS in user notes or AI summaries.
- Local blob URL memory management (invoking `URL.revokeObjectURL` on teardown).

---

## 27. Performance Requirements

- Initial bundle load < 200KB gzipped.
- Zero UI lag while scrubbing 4K video files.
- Virtualized or optimized transcript rendering supporting up to 10,000 transcript segments without DOM thrashing.

---

## 28. MVP Scope (Minimum Viable Product)

1. Modern Landing Page with direct project creation triggers.
2. Dashboard with project management and demo project loader.
3. Real file upload (Video/Audio) + Recording engine.
4. Custom synchronized video player with playback controls and speed adjustments.
5. Server-backed real AI transcription with speaker diarization.
6. Interactive Transcript Editor with in-place text editing and speaker renaming.
7. Instant transcript search with click-to-seek synchronization.
8. Subtitle generation & interactive cue editor.
9. Grounded AI Video Intelligence (Summary + Ask Video with timestamp citations).
10. Complete multi-format export (TXT, SRT, VTT, JSON).

---

## 29. Future Scope (Post-MVP)

- Collaborative real-time multi-user editing via WebSockets.
- Direct Cloud Storage integrations (Google Drive, Dropbox, YouTube import).
- Custom vocabulary dictionaries for specialized domain glossaries (medical, legal).
- Automated AI video clip generator creating short social clips from highlighted quotes.

---

## 30. Development Phases

- **Phase 1:** Application foundation, Design System tokens, global layout shell, and Landing Page.
- **Phase 2:** Dashboard project repository, project state store, and demo fixtures.
- **Phase 3:** Real media ingestion engine (Upload dropzone, URL intake, live Web Recorder).
- **Phase 4:** Synchronized Video Player component with custom playback engine.
- **Phase 5:** AI Transcription pipeline with speaker diarization and server proxy.
- **Phase 6:** Transcript Editor with inline edits, speaker renaming, and search/replace.
- **Phase 7:** Subtitle Cue Generator, timing adjustments, and live player overlay.
- **Phase 8:** Translation Hub with multi-language preservation.
- **Phase 9:** AI Video Intelligence (Grounded Q&A, Executive Summary, Action Items).
- **Phase 10:** Timestamp-grounded Evidence RAG system with clickable seek badges.
- **Phase 11:** Timecoded Notes & Highlight Quote Collector.
- **Phase 12:** Export Engine (SRT, VTT, TXT, DOCX/HTML, JSON).
- **Phase 13:** Performance optimization, keyboard shortcuts, accessibility, and end-to-end verification.

---

## 31. Acceptance Criteria

- [x] Uploading or recording a video produces a functional project in the workspace.
- [x] Transcript segments render accurate start and end timestamps.
- [x] Clicking any transcript segment seeks the video player to that exact time.
- [x] Playing the video highlights the corresponding active transcript segment automatically.
- [x] Renaming a speaker updates all segment labels globally in the project.
- [x] Transcript search highlights all matching query instances and permits direct navigation.
- [x] AI Q&A responses cite timestamps that seek the video when clicked.
- [x] Subtitle cues export into valid `.srt` and `.vtt` formats.
- [x] The UI adheres strictly to the monochrome black & white design system without AI tropes or gradients.
