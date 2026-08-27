import React, { useState, useEffect } from 'react';
import { Search, Play, FileText, Video, ArrowRight, Clock } from 'lucide-react';
import { getStoredProjects } from '../../services/projectStorage';
import { formatDuration, formatDate } from '../../utils/formatters';
import { Project, TranscriptSegment } from '../../types';

interface GlobalSearchPageProps {
  onNavigate: (path: string) => void;
}

interface SearchMatchResult {
  project: Project;
  segment: TranscriptSegment;
  speakerName: string;
}

export const GlobalSearchPage: React.FC<GlobalSearchPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(getStoredProjects());
  }, []);

  const results: SearchMatchResult[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchMatchResult[] = [];

    projects.forEach((proj) => {
      const speakerMap = new Map((proj.speakers || []).map((s) => [s.id, s.name]));
      (proj.transcript || []).forEach((seg) => {
        const spk = speakerMap.get(seg.speakerId) || seg.speakerId;
        if (seg.text.toLowerCase().includes(q) || spk.toLowerCase().includes(q) || proj.name.toLowerCase().includes(q)) {
          matches.push({
            project: proj,
            segment: seg,
            speakerName: spk,
          });
        }
      });
    });

    return matches;
  }, [query, projects]);

  const handleSelectResult = (result: SearchMatchResult) => {
    onNavigate(`/project/${result.project.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 select-none">
      {/* Header */}
      <div className="space-y-2 pb-6 border-b border-[#E5E5E5] mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
          SEARCH KNOWLEDGE
        </h1>
        <p className="text-xs sm:text-sm text-[#666666]">
          Search spoken words, topics, and speakers across all your imported videos.
        </p>
      </div>

      {/* Main Search Input */}
      <div className="space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#999999]">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a concept, keyword, or speaker name..."
            autoFocus
            className="w-full pl-12 pr-4 py-3.5 bg-[#FFFFFF] border border-[#D4D4D4] focus:border-[#111111] rounded-xl text-sm text-[#111111] placeholder:text-[#999999] shadow-xs focus:outline-none transition-colors"
          />
        </div>

        {/* Results Metadata */}
        {query.trim() && (
          <div className="flex items-center justify-between text-xs font-mono-time text-[#666666]">
            <span>
              {results.length} result{results.length === 1 ? '' : 's'} across {projects.length} videos
            </span>
            <span>Click any result to jump to that moment</span>
          </div>
        )}

        {/* Results Stream */}
        <div className="space-y-3">
          {query.trim() === '' ? (
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-12 text-center space-y-3">
              <Search className="w-8 h-8 text-[#CCCCCC] mx-auto" />
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                Search dialogue, transcript sentences, and speaker names instantly across all stored recordings.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-12 text-center text-xs text-[#888888]">
              No matches found for "{query}".
            </div>
          ) : (
            results.map((res, idx) => (
              <div
                key={`${res.project.id}_${res.segment.id}_${idx}`}
                onClick={() => handleSelectResult(res)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] hover:border-[#111111] rounded-xl p-4 sm:p-5 transition-all cursor-pointer shadow-xs hover:shadow-sm space-y-2.5 group"
              >
                {/* Result Top Row: Video Title + Timestamp */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[#111111]">
                      <Video className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-[#111111] truncate">{res.project.name}</span>
                    <span className="text-[#999999]">•</span>
                    <span className="text-[11px] font-mono-time text-[#666666]">{res.speakerName}</span>
                  </div>

                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#111111] text-white rounded text-[11px] font-mono-time shrink-0">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{formatDuration(res.segment.startTime)}</span>
                  </div>
                </div>

                {/* Highlighted text snippet */}
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed group-hover:text-black">
                  {res.segment.text}
                </p>

                <div className="flex items-center gap-1 text-[11px] text-[#666666] group-hover:text-[#111111] pt-1">
                  <span>Open in Video Workspace</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
