import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  Sparkles, 
  Play, 
  Scissors, 
  MessageSquare, 
  FileText, 
  RefreshCw, 
  Plus, 
  User, 
  Clock, 
  AlertTriangle, 
  Bookmark, 
  BookmarkCheck, 
  Edit3, 
  Trash2, 
  Download, 
  HelpCircle, 
  Layers, 
  Share2, 
  Check, 
  BookOpen, 
  ArrowRight,
  Filter,
  CheckCircle2,
  FileQuestion,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { 
  Project, 
  ResearchItem, 
  ResearchFinding, 
  ResearchContradiction, 
  ClaimType, 
  EvidenceCategory 
} from '../../types';
import { formatDuration } from '../../utils/formatters';
import { SourceBadge } from '../common/SourceBadge';
import { analyzeTranscriptTask, calculateTranscriptHash } from '../../services/aiAnalysisService';

interface ResearchModeStudioProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onOpenIntelligenceHubWithTopic?: (topicName: string, promptText: string) => void;
  onCreateClipFromTopic?: (name: string, startTime: number, endTime: number) => void;
  onRepurposeTopic?: (topicName: string, summary: string) => void;
  onSwitchTab?: (tab: string) => void;
}

export const ResearchModeStudio: React.FC<ResearchModeStudioProps> = ({
  project,
  currentTime,
  onSeek,
  onUpdateProject,
  onOpenIntelligenceHubWithTopic,
  onCreateClipFromTopic,
  onRepurposeTopic,
  onSwitchTab,
}) => {
  const transcript = project.transcript || [];
  const currentTranscriptHash = useMemo(() => calculateTranscriptHash(transcript), [transcript]);

  // Research items collection for current project
  const researchItems = project.researchItems || [];
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(
    researchItems.length > 0 ? researchItems[0].id : null
  );

  const activeResearch = useMemo(() => {
    if (!selectedResearchId) return researchItems[0] || null;
    return researchItems.find((r) => r.id === selectedResearchId) || researchItems[0] || null;
  }, [researchItems, selectedResearchId]);

  const isOutdated = useMemo(() => {
    if (!activeResearch || !activeResearch.transcriptHash) return false;
    return activeResearch.transcriptHash !== currentTranscriptHash;
  }, [activeResearch, currentTranscriptHash]);

  // Query and Search Inputs
  const [inputQuery, setInputQuery] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'ALL' | 'SUPPORTING' | 'CONTRADICTING' | 'CONTEXT' | 'BOOKMARKS' | 'QUESTIONS'
  >('ALL');

  // Loading & Error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Editing state for Title & Notes
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Handle running a new research query
  const handleRunResearch = async (overrideQuery?: string) => {
    if (isGenerating) return;
    const queryToRun = overrideQuery || inputQuery.trim();
    if (!queryToRun || transcript.length === 0) return;

    const targetProjectId = project.id;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Searching transcript segments for relevant evidence...');

    const t1 = setTimeout(() => setGenerationStep('Analyzing claims, opinions & recommendations...'), 1200);
    const t2 = setTimeout(() => setGenerationStep('Cross-referencing contradictions & unresolved questions...'), 2400);

    try {
      const rawResult: ResearchItem = await analyzeTranscriptTask({
        transcript,
        task: 'researchMode',
        projectName: project.name,
        duration: project.duration,
        speakers: project.speakers,
        query: queryToRun,
      });

      if (project.id !== targetProjectId) return;

      const newResearchItem: ResearchItem = {
        ...rawResult,
        id: `res_${Date.now()}`,
        query: queryToRun,
        title: rawResult.title || queryToRun,
        transcriptHash: currentTranscriptHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedList = [newResearchItem, ...researchItems];
      onUpdateProject({ researchItems: updatedList });
      setSelectedResearchId(newResearchItem.id);
      setInputQuery('');
    } catch (err: any) {
      console.error('Failed to run research analysis:', err);
      setGenerationError(err.message || 'Error conducting research analysis on transcript.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Helper to update active research item cleanly
  const updateActiveResearch = (updater: (prev: ResearchItem) => ResearchItem) => {
    if (!activeResearch) return;
    const updated = updater(activeResearch);
    const updatedList = researchItems.map((r) => (r.id === activeResearch.id ? updated : r));
    onUpdateProject({ researchItems: updatedList });
  };

  // Bookmark Toggle
  const handleToggleBookmark = (findingId: string) => {
    updateActiveResearch((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => (f.id === findingId ? { ...f, isBookmarked: !f.isBookmarked } : f)),
    }));
  };

  // Save User Note per finding
  const handleSaveNote = (findingId: string) => {
    updateActiveResearch((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => (f.id === findingId ? { ...f, userNotes: noteInput.trim() || undefined } : f)),
    }));
    setEditingNoteId(null);
    setNoteInput('');
  };

  // Rename Research Title
  const handleSaveTitle = (id: string) => {
    if (!titleInput.trim()) return;
    const updatedList = researchItems.map((r) => (r.id === id ? { ...r, title: titleInput.trim(), updatedAt: new Date().toISOString() } : r));
    onUpdateProject({ researchItems: updatedList });
    setEditingTitleId(null);
    setTitleInput('');
  };

  // Delete Research Item
  const handleDeleteResearch = (id: string) => {
    const updatedList = researchItems.filter((r) => r.id !== id);
    onUpdateProject({ researchItems: updatedList });
    if (selectedResearchId === id) {
      setSelectedResearchId(updatedList.length > 0 ? updatedList[0].id : null);
    }
  };

  // Regenerate Research for outdated transcript
  const handleRegenerateActive = () => {
    if (activeResearch) {
      handleRunResearch(activeResearch.query);
    }
  };

  // Export Research to Markdown
  const handleExportResearch = () => {
    if (!activeResearch) return;

    let md = `# Research Brief: ${activeResearch.title}\n`;
    md += `**Query:** ${activeResearch.query}\n`;
    md += `**Date:** ${new Date(activeResearch.createdAt).toLocaleDateString()}\n`;
    md += `**Source:** ${project.name} (Video Transcript)\n\n`;

    md += `## Summary of Findings\n${activeResearch.summary || 'No summary available.'}\n\n`;

    if (activeResearch.mainFinding) {
      md += `**Main Finding:** ${activeResearch.mainFinding}\n\n`;
    }

    md += `## Key Findings & Evidence (${activeResearch.findings.length})\n\n`;
    activeResearch.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.claimType.toUpperCase()}] ${f.claim}\n`;
      md += `- **Evidence Category:** ${f.evidenceCategory}\n`;
      if (f.speaker) md += `- **Speaker:** ${f.speaker}\n`;
      md += `- **Timestamp:** ${formatDuration(f.timestamp)}\n`;
      if (f.excerpt) md += `- **Excerpt:** "${f.excerpt}"\n`;
      if (f.userNotes) md += `- **My Notes:** ${f.userNotes}\n`;
      md += `\n`;
    });

    if (activeResearch.contradictions.length > 0) {
      md += `## Identified Contradictions\n\n`;
      activeResearch.contradictions.forEach((c, idx) => {
        md += `### Contradiction ${idx + 1}\n`;
        md += `- **Statement A (${formatDuration(c.timestampA)}):** ${c.claimA}\n`;
        md += `- **Statement B (${formatDuration(c.timestampB)}):** ${c.claimB}\n`;
        md += `- **Context:** ${c.summary}\n\n`;
      });
    }

    if (activeResearch.unresolvedQuestions.length > 0) {
      md += `## Unresolved Questions & Gaps\n\n`;
      activeResearch.unresolvedQuestions.forEach((q) => {
        md += `- ${q}\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeResearch.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_research.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Integration Handlers
  const handleAskAboutFinding = (finding: ResearchFinding) => {
    const promptText = `Investigate this claim from the transcript: "${finding.claim}". Context excerpt: "${finding.excerpt || finding.claim}" at time ${formatDuration(finding.timestamp)}.`;
    if (onOpenIntelligenceHubWithTopic) {
      onOpenIntelligenceHubWithTopic(finding.claim, promptText);
    } else if (onSwitchTab) {
      onSwitchTab('ai');
    }
  };

  const handleCreateClipFromFinding = (finding: ResearchFinding) => {
    const startTime = Math.max(0, finding.timestamp - 5);
    const endTime = Math.min(project.duration || 60, finding.timestamp + 25);
    if (onCreateClipFromTopic) {
      onCreateClipFromTopic(finding.claim, startTime, endTime);
    } else if (onSwitchTab) {
      onSwitchTab('clips');
    }
  };

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    if (!activeResearch) return [];
    return activeResearch.findings.filter((f) => {
      // Search text match
      const textMatch =
        filterSearch.trim() === '' ||
        f.claim.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (f.excerpt && f.excerpt.toLowerCase().includes(filterSearch.toLowerCase())) ||
        (f.userNotes && f.userNotes.toLowerCase().includes(filterSearch.toLowerCase()));

      if (!textMatch) return false;

      // Category filter match
      if (activeCategoryFilter === 'ALL') return true;
      if (activeCategoryFilter === 'BOOKMARKS') return Boolean(f.isBookmarked);
      return f.evidenceCategory === activeCategoryFilter;
    });
  }, [activeResearch, filterSearch, activeCategoryFilter]);

  // Claim Type Styling Helper
  const getClaimBadge = (claimType: ClaimType) => {
    switch (claimType) {
      case 'fact':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Fact</span>;
      case 'opinion':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Opinion</span>;
      case 'recommendation':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Recommendation</span>;
      case 'prediction':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Prediction</span>;
      case 'hypothesis':
        return <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Hypothesis</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Unresolved</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] font-sans text-[#111111] overflow-hidden select-none">
      
      {/* TOP SEARCH & TOPIC BAR HEADER */}
      <div className="p-3 sm:p-4 border-b border-[#E5E5E5] bg-[#FAFAFA] flex flex-col gap-3 shrink-0">
        
        {/* Title and Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold shadow-xs">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wide">Research Mode</h2>
                <span className="text-[9px] font-bold bg-neutral-200 text-neutral-800 border border-neutral-300 px-1.5 py-0.5 rounded uppercase">
                  Transcript Grounded
                </span>
              </div>
              <p className="text-[10px] text-[#666666]">Investigate claims, extract evidence & findings from video content</p>
            </div>
          </div>

          {/* Research Selector & Export */}
          <div className="flex items-center gap-2">
            {researchItems.length > 0 && (
              <select
                value={selectedResearchId || ''}
                onChange={(e) => setSelectedResearchId(e.target.value)}
                className="text-xs bg-white border border-[#E5E5E5] font-bold rounded-lg px-2.5 py-1.5 focus:outline-hidden text-[#111111] cursor-pointer"
              >
                {researchItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({new Date(item.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            {activeResearch && (
              <button
                onClick={handleExportResearch}
                className="px-2.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Export Research Brief to Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Brief</span>
              </button>
            )}
          </div>
        </div>

        {/* INPUT QUERY SEARCH BAR */}
        <div className="flex items-center gap-2 bg-white border border-[#E5E5E5] focus-within:border-[#111111] rounded-xl p-1.5 shadow-xs transition-all">
          <Search className="w-4 h-4 text-[#999999] ml-2 shrink-0" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRunResearch();
            }}
            placeholder="Search transcript or enter research topic/question... (e.g. 'What evidence is given for database scaling?')"
            className="w-full text-xs text-[#111111] placeholder-[#999999] bg-transparent focus:outline-hidden font-sans"
          />
          <button
            onClick={() => handleRunResearch()}
            disabled={isGenerating || !inputQuery.trim() || transcript.length === 0}
            className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Investigating...' : 'Start Research'}</span>
          </button>
        </div>

        {/* SUGGESTED SAMPLE RESEARCH QUERIES */}
        {!activeResearch && transcript.length > 0 && !isGenerating && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-bold text-[#666666]">Sample Topics:</span>
            {[
              'What are the main claims in this video?',
              'What evidence or examples are presented?',
              'Are there any contradictions or open questions?',
              'What recommendations are made by speakers?'
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleRunResearch(q)}
                className="px-2 py-0.5 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded text-[#333333] font-medium transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* CATEGORY & IN-RESULTS SEARCH BAR */}
        {activeResearch && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E5E5E5]">
            {/* Filter Category Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-white border border-[#E5E5E5] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCategoryFilter === 'ALL' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                All ({activeResearch.findings.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('SUPPORTING')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCategoryFilter === 'SUPPORTING' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Supporting ({activeResearch.findings.filter((f) => f.evidenceCategory === 'SUPPORTING').length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('CONTRADICTING')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCategoryFilter === 'CONTRADICTING' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Contradictions ({activeResearch.contradictions.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('BOOKMARKS')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeCategoryFilter === 'BOOKMARKS' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Bookmarked ({activeResearch.findings.filter((f) => f.isBookmarked).length})
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999999]" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search findings..."
                className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg pl-7 pr-2 py-1 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* OUTDATED STATE WARNING BANNER */}
      {isOutdated && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Transcript updated. Research brief may be outdated. User notes and bookmarks will be preserved.</span>
          </div>
          <button
            onClick={handleRegenerateActive}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer shrink-0"
          >
            Regenerate Brief
          </button>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* EMPTY STATE */}
        {!activeResearch && !isGenerating && !generationError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 shadow-xs">
              <Compass className="w-8 h-8 text-[#111111] stroke-[1.5]" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-sm font-bold text-[#111111]">Transcript Research Workspace</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Investigate claims, extract factual evidence, categorize recommendations and opinions, and surface contradictions strictly grounded in this video's real transcript.
              </p>
            </div>
            {transcript.length === 0 ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                Generate a transcript to start research.
              </p>
            ) : (
              <button
                onClick={() => handleRunResearch('What are the main claims and findings in this video?')}
                className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 fill-current" />
                <span>Run Initial Video Research</span>
              </button>
            )}
          </div>
        )}

        {/* LOADING INDICATOR */}
        {isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-16 text-center space-y-4">
            <Sparkles className="w-8 h-8 text-emerald-500 animate-spin fill-current" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#111111]">Analyzing Video Content</h4>
              <p className="text-xs text-[#666666] animate-pulse">{generationStep || 'Building research brief...'}</p>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {generationError && !isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="space-y-1 max-w-sm">
              <h4 className="text-xs font-bold text-red-700">Research Error</h4>
              <p className="text-xs text-[#666666]">{generationError}</p>
            </div>
            <button
              onClick={() => handleRunResearch()}
              className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Retry Research
            </button>
          </div>
        )}

        {/* RENDERED ACTIVE RESEARCH BRIEF */}
        {activeResearch && !isGenerating && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* BRIEF HEADER CARD */}
            <div className="p-4 sm:p-5 bg-white border border-[#E5E5E5] rounded-xl shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  {editingTitleId === activeResearch.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        className="text-sm font-bold bg-white border border-[#111111] rounded p-1 flex-1"
                      />
                      <button
                        onClick={() => handleSaveTitle(activeResearch.id)}
                        className="px-2 py-1 bg-[#111111] text-white text-[10px] font-bold rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#111111]">{activeResearch.title}</h3>
                      <button
                        onClick={() => {
                          setEditingTitleId(activeResearch.id);
                          setTitleInput(activeResearch.title);
                        }}
                        className="p-1 hover:bg-neutral-100 rounded text-[#999999] hover:text-[#111111] cursor-pointer"
                        title="Rename title"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[#666666]">
                    <span className="font-bold text-[#111111]">Query:</span> "{activeResearch.query}"
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteResearch(activeResearch.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700 cursor-pointer"
                    title="Delete research brief"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Executive Summary Block */}
              {activeResearch.summary && (
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs text-[#333333] leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#666666] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Executive Research Synthesis</span>
                  </div>
                  <p>{activeResearch.summary}</p>
                </div>
              )}

              {/* Insufficient Evidence Warning */}
              {activeResearch.isInsufficientEvidence && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>The video transcript contains insufficient evidence to thoroughly answer this specific query. Closest relevant excerpts are shown below.</span>
                </div>
              )}
            </div>

            {/* 1. FINDINGS & CLAIMS SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Grounded Findings & Evidence ({filteredFindings.length})
                  </h3>
                </div>
              </div>

              {filteredFindings.length === 0 ? (
                <p className="text-xs text-[#999999] italic py-3">No findings matching the selected filter.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className={`p-4 bg-white border rounded-xl shadow-xs transition-colors space-y-3 ${
                        finding.isBookmarked ? 'border-amber-300 bg-amber-50/10' : 'border-[#E5E5E5] hover:border-[#111111]'
                      }`}
                    >
                      {/* Top Bar: Claim Badges & Bookmark */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {getClaimBadge(finding.claimType)}

                          <span className="text-[9px] font-bold bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded uppercase">
                            {finding.evidenceCategory}
                          </span>

                          {finding.speaker && (
                            <span className="text-[10px] text-neutral-600 font-semibold flex items-center gap-1">
                              <User className="w-3 h-3 text-neutral-400" />
                              {finding.speaker}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleBookmark(finding.id)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            finding.isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-neutral-400 hover:text-amber-500'
                          }`}
                          title={finding.isBookmarked ? 'Bookmarked' : 'Bookmark finding'}
                        >
                          <Bookmark className={`w-4 h-4 ${finding.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Main Claim */}
                      <h4 className="text-xs font-bold text-[#111111] leading-snug">{finding.claim}</h4>

                      {/* Transcript Quote Excerpt */}
                      {finding.excerpt && (
                        <div className="p-2.5 bg-[#FAFAFA] border-l-2 border-[#111111] text-xs text-[#444444] font-serif italic rounded-r">
                          "{finding.excerpt}"
                        </div>
                      )}

                      {/* User Notes Section */}
                      {editingNoteId === finding.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Add your research notes..."
                            className="w-full text-xs bg-white border border-[#111111] rounded p-2 focus:outline-hidden font-sans"
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveNote(finding.id)}
                              className="px-2.5 py-1 bg-[#111111] text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Save Note
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                          {finding.userNotes ? (
                            <div className="flex items-start gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded w-full">
                              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                              <span className="flex-1 font-sans">
                                <strong>My Notes:</strong> {finding.userNotes}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingNoteId(finding.id);
                                  setNoteInput(finding.userNotes || '');
                                }}
                                className="text-[10px] text-emerald-700 font-bold hover:underline shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingNoteId(finding.id);
                                setNoteInput('');
                              }}
                              className="text-[10px] text-[#666666] hover:text-[#111111] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add My Notes</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Evidence Sources & Quick Actions Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F5F5F5] text-[10px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#666666]">Source Evidence:</span>
                          {finding.sources.map((src, idx) => (
                            <SourceBadge
                              key={idx}
                              timestamp={src.timestamp}
                              segmentId={src.segmentId}
                              speakerName={src.speaker || finding.speaker}
                              textSnippet={src.textSnippet || finding.excerpt}
                              status={isOutdated ? 'STALE' : 'VALID'}
                              duration={project.duration}
                              onSeek={onSeek}
                            />
                          ))}
                        </div>

                        {/* Integration Quick Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAskAboutFinding(finding)}
                            className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                            title="Ask about this finding in Intelligence Hub"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <button
                            onClick={() => handleCreateClipFromFinding(finding)}
                            className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                            title="Create Clip from Evidence"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. CONTRADICTIONS SECTION */}
            {activeResearch.contradictions.length > 0 && (activeCategoryFilter === 'ALL' || activeCategoryFilter === 'CONTRADICTING') && (
              <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Identified Contradictions ({activeResearch.contradictions.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {activeResearch.contradictions.map((contra) => (
                    <div key={contra.id} className="p-4 bg-amber-50/30 border border-amber-200 rounded-xl space-y-2">
                      <p className="text-xs text-amber-950 font-medium">{contra.summary}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 bg-white border border-amber-200 rounded space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                            <span>Statement A</span>
                            <SourceBadge
                              timestamp={contra.timestampA}
                              textSnippet={contra.claimA}
                              status={isOutdated ? 'STALE' : 'VALID'}
                              duration={project.duration}
                              onSeek={onSeek}
                            />
                          </div>
                          <p className="text-neutral-800">{contra.claimA}</p>
                        </div>

                        <div className="p-2.5 bg-white border border-amber-200 rounded space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                            <span>Statement B</span>
                            <SourceBadge
                              timestamp={contra.timestampB}
                              textSnippet={contra.claimB}
                              status={isOutdated ? 'STALE' : 'VALID'}
                              duration={project.duration}
                              onSeek={onSeek}
                            />
                          </div>
                          <p className="text-neutral-800">{contra.claimB}</p>
                        </div>
                      </div>

                      {contra.resolution && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 font-medium">
                          <strong>Resolution:</strong> {contra.resolution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. UNRESOLVED QUESTIONS & GAPS SECTION */}
            {activeResearch.unresolvedQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Unresolved Questions & Gaps ({activeResearch.unresolvedQuestions.length})
                  </h3>
                </div>

                <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5 space-y-2">
                  {activeResearch.unresolvedQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#333333]">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0"></span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
