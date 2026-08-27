import React, { useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, Search, Sparkles, MessageSquare, Subtitles, Languages, FileText, CheckCircle2 } from 'lucide-react';

export const ProductPreview: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'subtitles' | 'translate' | 'ai'>('transcript');
  const [selectedSegmentId, setSelectedSegmentId] = useState('seg-1');
  const [searchQuery, setSearchQuery] = useState('architecture');

  const transcriptData = [
    {
      id: 'seg-1',
      time: '00:01:24',
      speaker: 'Speaker 1 (Alex Rivera)',
      text: "Today we're going to discuss the core architectural breakthrough in our vector indexing pipeline.",
      highlight: true,
    },
    {
      id: 'seg-2',
      time: '00:01:31',
      speaker: 'Speaker 2 (Dr. Thorne)',
      text: "The primary advancement here is sub-millisecond timestamp synchronization with paragraph-level semantic chunking.",
      highlight: false,
    },
    {
      id: 'seg-3',
      time: '00:01:45',
      speaker: 'Speaker 1 (Alex Rivera)',
      text: "When an engineer or researcher searches for a specific concept, the video player seeks directly to the exact millisecond.",
      highlight: false,
    },
  ];

  return (
    <div className="w-full">
      {/* Container Frame */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden text-left">
        {/* Workspace Window Header */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]/80"></span>
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]/80"></span>
              <span className="w-3 h-3 rounded-full bg-[#10B981]/80"></span>
            </div>
            <span className="text-xs font-mono text-[#64748B] border-l border-[#E2E8F0] pl-3 font-medium">
              keynote_strategy_session.mp4
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[11px] font-mono text-[#0F172A] shadow-2xs">
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span>
              <span>SYNCHRONIZED · 00:42:15</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
              99.8% Confidence
            </span>
          </div>
        </div>

        {/* Workspace Body: Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
          {/* Left Column: Video Player Stage */}
          <div className="lg:col-span-6 bg-[#0F172A] p-4 sm:p-6 flex flex-col justify-between">
            {/* Video Viewport Simulated Canvas */}
            <div className="relative aspect-video bg-[#020617] rounded-xl overflow-hidden flex flex-col justify-between p-4 shadow-inner border border-white/10">
              {/* Media Status Pill */}
              <div className="flex justify-between items-center text-white/70 text-xs">
                <span className="font-mono text-[11px]">1080p 60fps · Stereo</span>
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-[10px] uppercase font-semibold text-white tracking-wider">
                  Live Preview
                </span>
              </div>

              {/* Center Play Button */}
              <div className="flex items-center justify-center my-auto">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:scale-105 hover:bg-[#1D4ED8] transition-all cursor-pointer shadow-lg shadow-[#2563EB]/40"
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Subtitle Overlay */}
              <div className="bg-black/90 text-white px-4 py-2 rounded-lg text-center text-xs font-medium max-w-sm mx-auto shadow-md border border-white/10 backdrop-blur-sm">
                "Today we're going to discuss the core architectural breakthrough..."
              </div>
            </div>

            {/* Playback Controls & Timeline */}
            <div className="mt-4 bg-[#1E293B] border border-white/10 rounded-xl p-3.5 space-y-2.5">
              {/* Scrubber Bar */}
              <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                <div className="absolute top-0 left-0 h-full w-[28%] bg-[#2563EB] rounded-full"></div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 hover:bg-white/10 rounded-md text-white cursor-pointer transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white cursor-pointer transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white cursor-pointer transition-colors">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] text-white/90 ml-1">
                    00:01:24 / 00:42:15
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-white/70">
                  <span className="px-2 py-0.5 bg-white/10 rounded font-mono text-white/90">
                    1.0x
                  </span>
                  <Volume2 className="w-4 h-4 text-white/80" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Workspace Engine */}
          <div className="lg:col-span-6 bg-white p-4 sm:p-6 flex flex-col justify-between">
            {/* Tool Tabs Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5 mb-3.5">
                <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTab === 'transcript'
                        ? 'bg-white text-[#2563EB] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Transcript</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('subtitles')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTab === 'subtitles'
                        ? 'bg-white text-[#2563EB] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    <span>Subtitles</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('translate')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTab === 'translate'
                        ? 'bg-white text-[#2563EB] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>Translate</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTab === 'ai'
                        ? 'bg-white text-[#7C3AED] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Video AI</span>
                  </button>
                </div>
              </div>

              {/* In-Transcript Search Bar */}
              <div className="relative mb-3.5">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dialogue keywords..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs pl-9 pr-24 py-2 text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded font-semibold">
                  1 of 3 matches
                </span>
              </div>

              {/* Transcript Segment List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {transcriptData.map((seg) => {
                  const isSelected = selectedSegmentId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setSelectedSegmentId(seg.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]'
                          : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] text-[#475569]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-[#0F172A]">{seg.speaker}</span>
                        <span className="font-mono text-[11px] text-[#2563EB] font-semibold hover:underline">
                          {seg.time}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#334155]">
                        {seg.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <div className="flex items-center gap-1.5 text-[#10B981] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Click any segment to seek video</span>
              </div>
              <span className="font-mono text-[11px] text-[#64748B]">3 speakers detected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
