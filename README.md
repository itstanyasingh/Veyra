# Veyra

Veyra is an AI-powered video and audio intelligence workspace that turns media into searchable, editable, timestamped information.

[Live Demo](https://veyra-one-tau.vercel.app/) · [GitHub Repository](https://github.com/itstanyasingh/Veyra)

## Overview

Veyra is a browser-based transcription and video-intelligence application for interviews, meetings, lectures, presentations, podcasts, and other spoken-media content.

It combines AI transcription, speaker diarization, timestamped transcript segments, AI summaries and analysis, transcript Q&A, multilingual translation, semantic search, study-material generation, structured document generation, subtitle workflows, and a minimal media workspace.

The interface follows a light-monochrome editorial aesthetic designed to feel like a professional tool rather than a generic AI dashboard.

## Core Workflow

```
Video / Audio / Supported URL
            │
            ▼
       Media Ingestion
            │
            ▼
     AI Transcription
            │
            ▼
 Speaker + Timestamped Segments
            │
      ┌─────┼──────────┬──────────────┐
      ▼     ▼          ▼              ▼
   Search  Summary   Translate     AI Analysis
      │     │          │              │
      └─────┴──────────┴──────────────┘
                     │
                     ▼
             Review / Edit / Export
```

## Key Features

- **AI Transcription**: Structured transcript segments with timestamps, speaker identification, subtitle formatting, and executive summaries.
- **Speaker Diarization**: Multi-speaker identification and consistent speaker attribution throughout the recording.
- **Timestamped Transcripts**: Associating exact timecodes with transcript segments for seamless click-to-seek video playback navigation.
- **AI Video Intelligence**: Grounded Q&A, executive summaries, key points, chronological chapters, action items, and decision mapping.
- **Multilingual Translation**: AI translation across target languages while preserving transcript segment alignment and timing.
- **Semantic & Conceptual Search**: Deep semantic search across transcript content beyond exact keyword matching.
- **Study & Quiz Generator**: Automated flashcards and multiple-choice quiz generation grounded in the media content.
- **Structured Document Generation**: Document synthesis (meeting notes, research reports, executive briefs) with inline timestamp citations.
- **Subtitle Workflows**: Export and management for industry-standard SRT and VTT subtitle formats.
- **URL & Media Ingestion**: Direct file upload or public web media / YouTube URL ingestion.
- **Resilient AI Pipeline**: Server-side Gemini integration with automatic retry logic and fallback models (`gemini-3.7-flash` and `gemini-3.1-flash-lite`) for high availability.
- **API Security & Rate Limiting**: Server-side credential isolation, rate limiting (`express-rate-limit`), and public URL safety validation (`isSafePublicUrl`).

## Supported Media

| Format | Type |
| --- | --- |
| MP4 | Video |
| MOV | Video |
| AVI | Video |
| MKV | Video |
| WebM | Video |
| MP3 | Audio |
| WAV | Audio |
| M4A | Audio |
| OGG | Audio |
| AAC | Audio |

*Note: File processing is subject to browser support, MIME type, Gemini API capabilities, file size limits (maximum 40MB for direct URL download), and runtime server execution timeouts.*

## YouTube Support

Veyra recognizes common YouTube URL patterns including `watch?v=...`, `youtu.be/...`, `/shorts/...`, and `/live/...`.

The server attempts accessible caption or audio retrieval and processes retrieved content using Gemini. However, YouTube frequently restricts automated cloud and serverless requests. Private, age-restricted, region-blocked, unavailable, or otherwise restricted videos may fail URL ingestion.

**Important**: A video being publicly viewable in a normal browser session does not guarantee that a serverless cloud request can retrieve it. When URL ingestion fails, direct media file upload provides the reliable fallback. Veyra intentionally returns clear error feedback and will never fabricate a transcript when source access fails.

## Architecture

```mermaid
flowchart LR
    U[User] --> F[React + Vite Frontend]
    F --> A[Express API]
    A --> T[/api/transcribe]
    A --> Y[/api/transcribe-url]
    T --> G[Google Gemini]
    Y --> M[YouTube / Public Media Retrieval]
    M --> G
    A --> Q[AI Intelligence Endpoints]
    Q --> G
    G --> R[Structured Results]
    R --> F
    F --> E[Search / Editing / Translation / Export]
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19 (`react` ^19.0.1) |
| **Build Tool** | Vite (`vite` ^6.2.3) |
| **Language** | TypeScript (`typescript` ~5.8.2) |
| **Styling** | Tailwind CSS (`tailwindcss` ^4.1.14) |
| **Backend** | Express (`express` ^4.21.2) |
| **Runtime** | Node.js |
| **AI SDK** | `@google/genai` (^2.4.0) |
| **AI Models** | Google Gemini (`gemini-3.7-flash`, `gemini-3.1-flash-lite`) |
| **Icons** | Lucide React (`lucide-react` ^0.546.0) |
| **Animation** | Motion (`motion` ^12.23.24) |
| **PDF Export** | jsPDF (`jspdf` ^4.2.1) |
| **Server Bundling** | `tsx` / `esbuild` |
| **Deployment** | Vercel-compatible serverless & Cloud Run |

## Project Structure

```
Veyra/
├── api/
│   └── index.ts
├── assets/
│   └── .aistudio/
├── server/
│   ├── app.ts
│   └── youtubeTranscriptService.ts
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── .env.example
├── DESIGN.md
├── PRD.md
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── bun.lock
```

## API Reference

### Health Check
- `GET /api/health` — Returns basic server status, environment mode, and whether `GEMINI_API_KEY` is present.

### Media Processing
- `POST /api/transcribe` — Accepts base64 encoded audio/video payload with MIME type and returns speaker diarization, timecoded transcript segments, formatted subtitles, and summary.
- `POST /api/transcribe-url` — Accepts YouTube or direct public media URLs for ingestion and transcription.
- `POST /api/fetch-link` — Validates public media URLs and extracts basic file metadata.

### AI Intelligence Endpoints
- `POST /api/ai/ask` — Q&A grounded strictly in video transcript content with timestamp citations.
- `POST /api/ai/analyze` — Universal structured analysis runner supporting tasks: `summary`, `keyPoints`, `chapters`, `keyMoments`, `actionItems`, `questions`, `topics`, `keywords`, `knowledgeMap`, `meetingIntelligence`, and `researchMode`.
- `POST /api/ai/summarize` — Generates executive summaries, key takeaways, and chronological chapters.
- `POST /api/ai/detect-language` — Identifies the primary spoken language of transcript content.
- `POST /api/ai/translate` — Translates transcript segments into target languages while preserving alignment.
- `POST /api/ai/study-quiz` — Generates study flashcards and multiple-choice questions grounded in the video.
- `POST /api/ai/semantic-search` — Performs semantic and conceptual matching over transcript segments.
- `POST /api/ai/generate-document` — Generates structured markdown documents (meeting notes, research briefs) with inline timestamp citations.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or Bun
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/itstanyasingh/Veyra.git
   cd Veyra
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables by creating `.env` from `.env.example`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   APP_URL=http://localhost:3000
   ```

### Development Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Starts the development server (`tsx server.ts`) on port 3000 |
| `npm run build` | Builds client static assets via Vite and bundles the Express server with esbuild to `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run preview` | Previews the Vite static build locally |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Removes compiled `dist/` directory and build artifacts |

## Deployment

Veyra includes a `vercel.json` configuration and a serverless entrypoint in `api/index.ts`.

### Recommended Verification Steps
1. Access `/api/health` to confirm the API reports healthy status and `hasGeminiKey: true`.
2. Test direct media upload transcription.
3. Test public media URL ingestion.
4. Test AI Q&A, translation, semantic search, and export workflows.
5. Verify YouTube URL error handling falls back gracefully to direct file upload when cloud retrieval is restricted.

## Security

The application backend enforces key security controls:
- **Server-Side API Keys**: All Gemini API calls execute server-side; secrets are never sent to the browser.
- **Rate Limiting**: `express-rate-limit` protects `/api/` routes against excessive automated requests.
- **URL Safety Verification**: Public URL ingestion validates HTTP/HTTPS protocols and blocks `localhost`, private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x), internal domain suffixes, and loopback addresses.
- **Remote Fetch Guardrails**: Timeout signal aborts and size caps (40MB limit) prevent memory exhaustion.

## Error Handling

Veyra provides explicit error handling for missing API keys, invalid URL formats, restricted internal URLs, HTTP download failures, oversized media, empty payloads, Gemini API errors, and YouTube access restrictions.

For YouTube, the application explicitly returns structured error feedback (`YOUTUBE_RESTRICTED` or `YOUTUBE_INVALID_URL`) offering direct media upload rather than generating fabricated or placeholder transcripts.

## Current Limitations

- **YouTube Cloud Access**: Automated cloud access to YouTube can be restricted by YouTube's rate limiting and bot detection mechanisms. Direct file upload is the primary reliable ingestion method.
- **AI Processing Limits**: Transcription, diarization, translation, and analysis are generated by Google Gemini models and should be reviewed for critical accuracy requirements.
- **API Quotas**: Gemini requests are governed by the quotas and rate limits of your Google Cloud / AI Studio project.
- **Payload Limits**: Serverless runtimes enforce execution time limits and request body size constraints (50MB request body limit).

## Design Philosophy

Veyra intentionally avoids the visual clichés of generic AI SaaS templates.

The design system emphasizes:
- Light monochrome surfaces
- Clear black typography
- Subtle gray borders (`#E2E8F0` / `#E5E5E5`)
- Editorial hierarchy and generous negative space
- High information density for media workflows
- Zero decorative gradients, neon glowing boxes, or glassmorphism

*Refer to `DESIGN.md` for full design tokens and UX specifications.*

## Documentation

- `PRD.md` — Product requirements document and functional specification
- `DESIGN.md` — Design system, color tokens, and layout guidelines
- `.env.example` — Environment variable template

## Roadmap

- Enhanced external media stream proxy providers
- Cloud storage workspace integrations (Google Drive, Dropbox)
- Multi-user real-time collaborative editing
- Custom domain vocabulary and pronunciation dictionaries
- Advanced video clip trimming and exporter workflows
- Persistent project database persistence

## License

This project does not currently specify an explicit open-source license. Please contact the author before distribution or commercial reuse.

## Author & Contact

**Tanya Singh**
- GitHub: [itstanyasingh](https://github.com/itstanyasingh)
- Repository: [https://github.com/itstanyasingh/Veyra](https://github.com/itstanyasingh/Veyra)
- Live App: [https://veyra-one-tau.vercel.app/](https://veyra-one-tau.vercel.app/)
