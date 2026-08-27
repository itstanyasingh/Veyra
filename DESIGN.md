# VEYRA — Design System & UX Specifications

**Product:** VEYRA  
**Category:** Video Intelligence & Media Workspace  
**Theme:** Light Monochrome (White Canvas, Black Typography & Subtle Grays)  
**Document Status:** Approved Design System Specification

---

## 1. Visual Philosophy & Identity

VEYRA is a high-precision, distraction-free instrument for working with video and spoken language. The aesthetic is inspired by classic Swiss graphic design, modern editorial publishing, and minimalist high-density technical interfaces.

### Core Aesthetic Pillars
1. **Light Monochrome Clarity:** The entire user interface is built on a pristine white and off-white tonal spectrum with pure black text and precise neutral gray surfaces. Color is strictly prohibited except for faint semantic indicators.
2. **Editorial & Product-Focused:** Generous white space, clear typographic contrast, thin 1px borders (`#E5E5E5`), and rectangular 6–10px geometric corners.
3. **Calm, Fast & Functional:** Zero glowing effects, zero gradients, zero floating decorative cards or 3D blobs. The interface feels like a serious professional workstation ("This is a real tool").
4. **Continuous Light Experience:** The entire user journey—from the Landing Page to the Dashboard, Ingestion Modal, and the high-density Video Workspace—remains consistently in the light monochrome theme.

---

## 2. Color System & Design Tokens

### 2.1 The Light Monochrome Palette

| Token Name | Hex Code | Tailwind Equivalent / Class | Purpose & Usage |
|---|---|---|---|
| `canvas-bg` | `#FFFFFF` | `bg-white` | Primary global application background |
| `canvas-subtle` | `#FAFAFA` | `bg-[#FAFAFA]` | Secondary background, sidebars, dashboard grid background |
| `surface-base` | `#F5F5F5` | `bg-[#F5F5F5]` | Input containers, segment backgrounds, tab bar backdrops |
| `surface-elevated` | `#FFFFFF` | `bg-white` | Cards, modals, active editor panels, dropdown menus |
| `surface-hover` | `#F3F3F3` | `hover:bg-[#F3F3F3]` | Hover states on interactive list items, secondary buttons |
| `surface-selected`| `#EAEAEA` | `bg-[#EAEAEA]` | Selected segment, active playhead segment, pressed state |
| `border-standard` | `#E5E5E5` | `border-[#E5E5E5]` | Standard container borders, card dividers, table borders |
| `border-strong` | `#D4D4D4` | `border-[#D4D4D4]` | Secondary button borders, input borders, active panel outlines |
| `text-strong` | `#000000` | `text-black` | Hero headlines, active titles, speaker headers, bold accents |
| `text-primary` | `#111111` | `text-[#111111]` | Primary text, transcript body, readable paragraphs |
| `text-secondary` | `#666666` | `text-[#666666]` | Secondary descriptions, inactive transcript text, subtitle cues |
| `text-muted` | `#999999` | `text-[#999999]` | Inactive timestamps, keyboard shortcuts, metadata labels |
| `btn-primary-bg` | `#111111` | `bg-[#111111]` | Primary action button fill |
| `btn-primary-text`| `#FFFFFF` | `text-white` | Primary action button text |

### 2.2 Strict Color Rules
- ❌ **DO NOT** introduce Blue, Purple, Pink, Orange, Green gradients, Rainbow gradients, or Neon colors.
- ❌ **DO NOT** use glowing box shadows or glassmorphism effects.
- ⚠️ Small semantic colors may be used **ONLY** when necessary for functional system states (e.g. error alerts, recording dot). These must remain tiny, muted, and non-decorative.

---

## 3. Typography & Numerical Formatting

### 3.1 Font Families
- **Primary Body & Display Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`.
- **Timecode & Monospace Elements:** `JetBrains Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `monospace`.

### 3.2 Typographic Scale

| Level | Size | Weight | Line Height | Color | Usage |
|---|---|---|---|---|---|
| **Display Hero** | `32px – 40px` | `600 (Semibold)` | `1.15` | `#000000` | Landing Page Hero Headline |
| **Section H2** | `20px (1.25rem)` | `600 (Semibold)` | `1.3` | `#000000` | Dashboard Titles, Modal Headers, Section Headings |
| **Subheading H3**| `14px (0.875rem)`| `600 (Semibold)` | `1.4` | `#111111` | Speaker names, tab titles, tool headings |
| **Body Primary** | `14px (0.875rem)`| `400 (Regular)` | `1.6` | `#111111` | Transcript text, AI responses, notes |
| **Body Compact** | `13px (0.8125rem)`| `400 (Regular)` | `1.5` | `#666666` | Subtitle cue list, metadata rows |
| **Caption / Time**| `11px (0.6875rem)`| `500 (Medium)` | `1.4` | `#666666` | Timestamps, durations, hotkey badges |

### 3.3 Timecode Formatting
- Render all timecodes (`00:01:24`, `00:01:24.500`) in Monospace font for layout stability during playback.

---

## 4. Component Specifications

### 4.1 Buttons
- **Primary Button:**
  - Background: `#111111` (Near Black)
  - Text: `#FFFFFF`
  - Border: None
  - Hover: `bg-[#222222]`
  - Corner radius: `6px – 8px` (`rounded-md`)
- **Secondary Button:**
  - Background: `#FFFFFF`
  - Text: `#111111`
  - Border: `1px solid #D4D4D4`
  - Hover: `bg-[#F3F3F3] border-[#111111]`
  - Corner radius: `6px – 8px` (`rounded-md`)
- **Ghost / Icon Button:**
  - Background: `transparent`
  - Text: `#666666`
  - Hover: `text-[#111111] bg-[#F5F5F5]`

### 4.2 Form Inputs & Search
- Background: `#FFFFFF`
- Border: `1px solid #D4D4D4`
- Text: `#111111`
- Placeholder: `#999999`
- Focus State: `border-[#111111] ring-1 ring-[#111111] outline-none`
- Corner radius: `6px – 8px`

### 4.3 Tabs & Segmented Controls
- Container: Background `#F5F5F5`, border `1px solid #E5E5E5`, padding `3px`, rounded `6px`.
- Inactive Tab: Text `#666666`, hover `text-[#111111]`.
- Active Tab: Background `#FFFFFF`, text `#111111`, border `1px solid #D4D4D4`, rounded `4px`, `shadow-xs`.

---

## 5. Video Workspace Layout & Structure

The Video Workspace operates fully in the light monochrome aesthetic:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  VEYRA  /  [Project Name: Earnings_Call_Q3.mp4]                   [Status: Ready]   [Export] [Settings]│
├────────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│                                                    │  [Transcript]  [Subtitles]  [Translate] [AI] [Notes]│
│                  VIDEO PLAYER                      ├───────────────────────────────────────────────────┤
│                                                    │  🔍 [Search in transcript (⌘F)...]                │
│    ┌──────────────────────────────────────────┐    ├───────────────────────────────────────────────────┤
│    │                                          │    │  00:01:24                                         │
│    │               VIDEO FEED                 │    │  Speaker 1                                        │
│    │                                          │    │  Today we're going to discuss the core quarterly  │
│    │    [Subtitles: "Today we're going..."]   │    │  financial results and operating margins.         │
│    └──────────────────────────────────────────┘    │                                                   │
│                                                    │  00:01:31                                         │
│    ▶  ⏸  ⏪ 5s  ⏩ 5s   00:01:24 / 00:42:10  1.0x 🔊 │  Speaker 2                                        │
│    ──────────────────●─────────────────────────    │  The first important point is customer growth     │
│    TIMELINE / CHAPTERS SCRUBBER                    │  in enterprise accounts.                          │
│                                                    │                                                   │
│                                                    │  00:01:45                                         │
│                                                    │  Speaker 1                                        │
│                                                    │  Let's look at the breakdown.                     │
└────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

### Key Workspace Rules:
- **Left Stage (Video & Timeline):** High-contrast HTML5 player with sleek black/dark media viewport, clean white/light gray surround controls, monospace timecode counters, and frame scrubber.
- **Right Stage (Transcript & Tools):** White background (`#FFFFFF`), light gray borders (`#E5E5E5`), crisp black typography (`#111111`).
- **Active Playhead Segment:** Subtle `#EAEAEA` or `#F5F5F5` background with bold `#000000` text to indicate current playback position.
- **Click-to-Seek:** Clicking any timestamp (`00:01:24`) or paragraph instantly seeks the video to that moment.

---

## 6. Anti-AI-Generated Design Rules

1. **No Purple / Blue / Rainbow Gradients:** Background is strictly `#FFFFFF` with `#FAFAFA` and `#F5F5F5` surfaces.
2. **No Glowing Borders or Drop Shadows:** Only crisp `1px solid #E5E5E5` / `#D4D4D4` borders.
3. **No Decorative Blobs, 3D Spheres, or AI Brain Graphics:** Icons are clean technical line glyphs (`lucide-react`).
4. **No Fake Metrics or Exaggerated Marketing Claims:** Real, functional media workspace data only.
5. **Fast & Calm Transitions:** Minimal animation limited strictly to functional states (hover, active tab, upload progress, scrubber interaction).

