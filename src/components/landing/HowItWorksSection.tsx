import React from 'react';
import { Upload, FileText, Search, Download } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'UPLOAD',
      description: 'Upload your video or audio recording, paste a supported URL, or record directly in the browser.',
      icon: <Upload className="w-4 h-4 text-[#111111]" />,
    },
    {
      number: '02',
      title: 'TRANSCRIBE',
      description: 'Turn speech into an editable transcript with millisecond timestamps and automatic speaker identification.',
      icon: <FileText className="w-4 h-4 text-[#111111]" />,
    },
    {
      number: '03',
      title: 'UNDERSTAND',
      description: 'Search spoken moments, jump directly to timecodes, and query the video with grounded AI intelligence.',
      icon: <Search className="w-4 h-4 text-[#111111]" />,
    },
    {
      number: '04',
      title: 'EXPORT',
      description: 'Generate broadcast-ready subtitles (SRT, VTT), localized translations, or formatted documents.',
      icon: <Download className="w-4 h-4 text-[#111111]" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#FAFAFA] border-y border-[#E5E5E5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2 font-mono-time">
            WORKFLOW
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#000000]">
            HOW VEYRA WORKS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white border border-[#E5E5E5] rounded-md p-6 flex flex-col justify-between hover:border-[#111111] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono-time font-bold text-[#111111] bg-[#F5F5F5] px-2 py-1 rounded border border-[#E5E5E5]">
                    {step.number}
                  </span>
                  <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5]">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-sm font-bold tracking-tight text-[#000000] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
