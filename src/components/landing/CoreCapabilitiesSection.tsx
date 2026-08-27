import React from 'react';
import { AlignLeft, Search, Subtitles, Globe, Sparkles, CheckCircle2 } from 'lucide-react';

export const CoreCapabilitiesSection: React.FC = () => {
  const capabilities = [
    {
      title: 'TRANSCRIPTION',
      summary: 'Searchable, editable transcripts with timestamps and speaker diarization.',
      details: [
        'Automatic speaker labeling and global renaming',
        'Word-level and paragraph-level timestamp anchors',
        'Inline transcript editing with undo/redo capability',
      ],
      icon: <AlignLeft className="w-4 h-4" />,
    },
    {
      title: 'SEARCH',
      summary: 'Find exactly where something was said across hours of media.',
      details: [
        'Instantaneous full-text search with regex support',
        'Match cycling with automatic video seek triggers',
        'Visual jump points mapped across the timeline',
      ],
      icon: <Search className="w-4 h-4" />,
    },
    {
      title: 'SUBTITLES',
      summary: 'Create, synchronize, and edit broadcast-standard subtitles.',
      details: [
        'Export to industry-standard SRT and WebVTT formats',
        'Character-per-second (CPS) readability guards',
        'Direct on-screen subtitle preview overlay',
      ],
      icon: <Subtitles className="w-4 h-4" />,
    },
    {
      title: 'TRANSLATION',
      summary: 'Translate transcripts and subtitles while preserving timecodes.',
      details: [
        'Multi-lingual translation across 20+ global languages',
        'Exact timestamp synchronization on translated cues',
        'Side-by-side verification and text review',
      ],
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'VIDEO INTELLIGENCE',
      summary: 'Ask questions, synthesize insights, and extract key moments.',
      details: [
        'Zero-hallucination answers grounded in transcript evidence',
        'Clickable timestamp citations that seek the video',
        'Automated executive summaries and action items',
      ],
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2 font-mono-time">
            CAPABILITIES
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#000000] mb-4">
            PRECISION TOOLS FOR SPOKEN MEDIA
          </h2>
          <p className="text-sm text-[#666666] leading-relaxed">
            Everything needed to extract, search, structure, and repurpose information from video recordings in one unified system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => (
            <div
              key={cap.title}
              className={`border border-[#E5E5E5] rounded-md p-6 bg-white hover:border-[#111111] transition-colors flex flex-col justify-between ${
                idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-3 text-[#111111]">
                  <div className="p-1.5 bg-[#F5F5F5] rounded border border-[#E5E5E5]">
                    {cap.icon}
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                    {cap.title}
                  </h3>
                </div>

                <p className="text-xs text-[#111111] font-medium mb-4 leading-relaxed">
                  {cap.summary}
                </p>

                <ul className="space-y-2 border-t border-[#F5F5F5] pt-4">
                  {cap.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2 text-xs text-[#666666]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
