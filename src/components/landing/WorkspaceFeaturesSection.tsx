import React from 'react';
import { Layers, Check, Clock, Edit3, MessageSquareText } from 'lucide-react';

export const WorkspaceFeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'Bi-Directional Video & Text Sync',
      description: 'The video playhead and transcript stay mathematically synchronized. Clicking any sentence jumps the player to that millisecond, and playback highlights the speaking paragraph.',
      icon: <Clock className="w-4 h-4 text-[#111111]" />,
    },
    {
      title: 'Instant In-Transcript Search',
      description: 'Search through hours of interviews or presentations in milliseconds. Step through every occurrence with automatic video jump points.',
      icon: <Layers className="w-4 h-4 text-[#111111]" />,
    },
    {
      title: 'Inline Transcript & Speaker Editing',
      description: 'Correct words, split paragraphs, and rename speakers across the entire document with instantaneous global updates.',
      icon: <Edit3 className="w-4 h-4 text-[#111111]" />,
    },
    {
      title: 'Evidence-Grounded Intelligence',
      description: 'Ask deep analytical questions about your media. Answers are synthesized strictly from the transcript and anchored to clickable timestamp proof badges.',
      icon: <MessageSquareText className="w-4 h-4 text-[#111111]" />,
    },
  ];

  return (
    <section className="py-20 bg-[#FAFAFA] border-t border-[#E5E5E5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2 font-mono-time">
            ARCHITECTURE
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#000000] mb-3">
            ONE WORKSPACE FOR YOUR VIDEO
          </h2>
          <p className="text-sm text-[#666666]">
            Engineered for high-focus analysis without switching between media players and text documents.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-[#E5E5E5] rounded-md p-6 hover:border-[#111111] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#F5F5F5] rounded border border-[#E5E5E5]">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-[#000000]">
                  {feature.title}
                </h3>
              </div>
              <p className="text-xs text-[#666666] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
