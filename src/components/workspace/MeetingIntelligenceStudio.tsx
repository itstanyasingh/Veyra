import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckSquare, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  Scissors, 
  MessageSquare, 
  FileText, 
  RefreshCw, 
  Plus, 
  Search, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown, 
  Network,
  ShieldAlert,
  Users,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { 
  Project, 
  MeetingIntelligenceData, 
  MeetingDecision, 
  MeetingActionItem, 
  MeetingQuestion, 
  MeetingRisk, 
  MeetingAgreementDisagreement 
} from '../../types';
import { formatDuration } from '../../utils/formatters';
import { SourceBadge } from '../common/SourceBadge';
import { analyzeTranscriptTask, calculateTranscriptHash } from '../../services/aiAnalysisService';

interface MeetingIntelligenceStudioProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onOpenIntelligenceHubWithTopic?: (topicName: string, promptText: string) => void;
  onCreateClipFromTopic?: (name: string, startTime: number, endTime: number) => void;
  onRepurposeTopic?: (topicName: string, summary: string) => void;
  onSwitchTab?: (tab: string) => void;
}

export const MeetingIntelligenceStudio: React.FC<MeetingIntelligenceStudioProps> = ({
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

  // Data State
  const meetingData = project.meetingIntelligence;
  const isOutdated = useMemo(() => {
    if (!meetingData || !meetingData.transcriptHash) return false;
    return meetingData.transcriptHash !== currentTranscriptHash;
  }, [meetingData, currentTranscriptHash]);

  // View & Filter States
  const [activeFilter, setActiveFilter] = useState<'all' | 'decisions' | 'actionItems' | 'openQuestions' | 'risks' | 'agreements'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSortBy, setActionSortBy] = useState<'newest' | 'oldest' | 'owner' | 'deadline' | 'status'>('newest');

  // Generation & Status States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Modal / Form States for Adding Manual Items
  const [showAddModal, setShowAddModal] = useState<'decision' | 'action' | 'question' | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemOwner, setNewItemOwner] = useState('');
  const [newItemDeadline, setNewItemDeadline] = useState('');
  const [newItemSpeaker, setNewItemSpeaker] = useState('');

  // Editing Item States
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ text?: string; owner?: string; deadline?: string; speaker?: string }>({});

  // Generate or Regenerate Meeting Intelligence
  const handleGenerateIntelligence = async () => {
    if (isGenerating) return;
    if (transcript.length === 0) return;

    const targetProjectId = project.id;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Analyzing transcript content...');

    const t1 = setTimeout(() => setGenerationStep('Finding explicit decisions & agreements...'), 1200);
    const t2 = setTimeout(() => setGenerationStep('Extracting grounded action items & owners...'), 2400);
    const t3 = setTimeout(() => setGenerationStep('Checking source evidence timestamps...'), 3600);

    try {
      const newAnalysis: MeetingIntelligenceData = await analyzeTranscriptTask({
        transcript,
        task: 'meetingIntelligence',
        projectName: project.name,
        duration: project.duration,
        speakers: project.speakers,
      });

      if (project.id !== targetProjectId) return;

      // Preserve user edits and manual items if existing data is present
      if (meetingData) {
        // Retain manual decisions, action items, questions
        const manualDecisions = meetingData.decisions.filter(d => d.isManual);
        const manualActions = meetingData.actionItems.filter(a => a.isManual);
        const manualQuestions = meetingData.openQuestions.filter(q => q.isManual);

        // Merge status/owner/deadline user edits for existing action items
        const existingActionMap = new Map<string, MeetingActionItem>(meetingData.actionItems.map(a => [a.id, a]));
        const mergedActions = newAnalysis.actionItems.map(act => {
          const match = existingActionMap.get(act.id);
          if (match) {
            return {
              ...act,
              status: match.status,
              owner: match.owner !== 'Unassigned' ? match.owner : act.owner,
              deadline: match.deadline !== 'No deadline' ? match.deadline : act.deadline,
            };
          }
          return act;
        });

        // Merge question statuses
        const existingQuestionMap = new Map<string, MeetingQuestion>(meetingData.openQuestions.map(q => [q.id, q]));
        const mergedQuestions = newAnalysis.openQuestions.map(q => {
          const match = existingQuestionMap.get(q.id);
          if (match) {
            return {
              ...q,
              status: match.status,
            };
          }
          return q;
        });

        newAnalysis.decisions = [...manualDecisions, ...newAnalysis.decisions];
        newAnalysis.actionItems = [...manualActions, ...mergedActions];
        newAnalysis.openQuestions = [...manualQuestions, ...mergedQuestions];
      }

      onUpdateProject({ meetingIntelligence: newAnalysis });
    } catch (err: any) {
      console.error('Failed to generate meeting intelligence:', err);
      setGenerationError(err.message || 'Error parsing meeting intelligence.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Helper to update project meeting intelligence state cleanly
  const updateMeetingIntelligence = (updater: (prev: MeetingIntelligenceData) => MeetingIntelligenceData) => {
    if (!meetingData) return;
    const updated = updater(meetingData);
    onUpdateProject({ meetingIntelligence: updated });
  };

  // Status Handlers
  const handleToggleActionStatus = (id: string) => {
    updateMeetingIntelligence((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) => {
        if (item.id !== id) return item;
        const nextStatus = item.status === 'OPEN' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'DONE' : 'OPEN';
        return { ...item, status: nextStatus };
      }),
    }));
  };

  const handleToggleQuestionStatus = (id: string) => {
    updateMeetingIntelligence((prev) => ({
      ...prev,
      openQuestions: prev.openQuestions.map((q) => {
        if (q.id !== id) return q;
        return { ...q, status: q.status === 'OPEN' ? 'RESOLVED' : 'OPEN' };
      }),
    }));
  };

  // Deletion Handlers
  const handleDeleteItem = (category: 'decisions' | 'actionItems' | 'openQuestions' | 'risks', id: string) => {
    updateMeetingIntelligence((prev) => ({
      ...prev,
      [category]: prev[category].filter((item: any) => item.id !== id),
    }));
  };

  // Save Item Edits
  const handleSaveEdit = (category: 'decisions' | 'actionItems' | 'openQuestions', id: string) => {
    updateMeetingIntelligence((prev) => {
      if (category === 'actionItems') {
        return {
          ...prev,
          actionItems: prev.actionItems.map((a) => (a.id === id ? { ...a, task: editFields.text || a.task, owner: editFields.owner || a.owner, deadline: editFields.deadline || a.deadline } : a)),
        };
      }
      if (category === 'decisions') {
        return {
          ...prev,
          decisions: prev.decisions.map((d) => (d.id === id ? { ...d, text: editFields.text || d.text, speaker: editFields.speaker || d.speaker } : d)),
        };
      }
      if (category === 'openQuestions') {
        return {
          ...prev,
          openQuestions: prev.openQuestions.map((q) => (q.id === id ? { ...q, question: editFields.text || q.question } : q)),
        };
      }
      return prev;
    });
    setEditingItemId(null);
    setEditFields({});
  };

  // Add Manual Item
  const handleAddManualItem = () => {
    if (!newItemText.trim() || !meetingData) return;

    const nearSeg = transcript.length > 0 ? transcript[0] : null;
    const baseTs = nearSeg ? nearSeg.startTime : 0;
    const baseSource = nearSeg ? [{ timestamp: baseTs, segmentId: nearSeg.id, textSnippet: nearSeg.text.slice(0, 100) }] : [];

    if (showAddModal === 'decision') {
      const newDec: MeetingDecision = {
        id: `manual_dec_${Date.now()}`,
        text: newItemText.trim(),
        timestamp: baseTs,
        speaker: newItemSpeaker.trim() || undefined,
        sources: baseSource,
        isManual: true,
        createdAt: new Date().toISOString(),
      };
      updateMeetingIntelligence((prev) => ({ ...prev, decisions: [newDec, ...prev.decisions] }));
    } else if (showAddModal === 'action') {
      const newAct: MeetingActionItem = {
        id: `manual_act_${Date.now()}`,
        task: newItemText.trim(),
        owner: newItemOwner.trim() || 'Unassigned',
        deadline: newItemDeadline.trim() || 'No deadline',
        status: 'OPEN',
        timestamp: baseTs,
        sources: baseSource,
        isManual: true,
        createdAt: new Date().toISOString(),
      };
      updateMeetingIntelligence((prev) => ({ ...prev, actionItems: [newAct, ...prev.actionItems] }));
    } else if (showAddModal === 'question') {
      const newQ: MeetingQuestion = {
        id: `manual_q_${Date.now()}`,
        question: newItemText.trim(),
        status: 'OPEN',
        timestamp: baseTs,
        sources: baseSource,
        isManual: true,
        createdAt: new Date().toISOString(),
      };
      updateMeetingIntelligence((prev) => ({ ...prev, openQuestions: [newQ, ...prev.openQuestions] }));
    }

    setShowAddModal(null);
    setNewItemText('');
    setNewItemOwner('');
    setNewItemDeadline('');
    setNewItemSpeaker('');
  };

  // Integration Helpers
  const handleAskAboutItem = (title: string, contextSnippet: string) => {
    const promptText = `Provide insights about "${title}". Context: ${contextSnippet}`;
    if (onOpenIntelligenceHubWithTopic) {
      onOpenIntelligenceHubWithTopic(title, promptText);
    } else if (onSwitchTab) {
      onSwitchTab('ai');
    }
  };

  const handleCreateClipFromItem = (name: string, ts: number) => {
    const startTime = Math.max(0, ts - 5);
    const endTime = Math.min(project.duration || 60, ts + 25);
    if (onCreateClipFromTopic) {
      onCreateClipFromTopic(name, startTime, endTime);
    } else if (onSwitchTab) {
      onSwitchTab('clips');
    }
  };

  // Filtered & Sorted Data
  const filteredDecisions = useMemo(() => {
    if (!meetingData) return [];
    return meetingData.decisions.filter((d) => searchQuery.trim() === '' || d.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [meetingData, searchQuery]);

  const filteredActionItems = useMemo(() => {
    if (!meetingData) return [];
    let items = meetingData.actionItems.filter(
      (a) =>
        searchQuery.trim() === '' ||
        a.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.deadline.toLowerCase().includes(searchQuery.toLowerCase())
    );

    items = [...items].sort((a, b) => {
      if (actionSortBy === 'newest') return b.timestamp - a.timestamp;
      if (actionSortBy === 'oldest') return a.timestamp - b.timestamp;
      if (actionSortBy === 'owner') return a.owner.localeCompare(b.owner);
      if (actionSortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
      if (actionSortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });
    return items;
  }, [meetingData, searchQuery, actionSortBy]);

  const filteredOpenQuestions = useMemo(() => {
    if (!meetingData) return [];
    return meetingData.openQuestions.filter((q) => searchQuery.trim() === '' || q.question.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [meetingData, searchQuery]);

  const filteredRisks = useMemo(() => {
    if (!meetingData) return [];
    return meetingData.risks.filter((r) => searchQuery.trim() === '' || r.risk.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [meetingData, searchQuery]);

  const filteredAgreements = useMemo(() => {
    if (!meetingData) return [];
    return meetingData.agreementsDisagreements.filter((ad) => searchQuery.trim() === '' || ad.summary.toLowerCase().includes(searchQuery.toLowerCase()) || ad.topic.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [meetingData, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] font-sans text-[#111111] overflow-hidden select-none">
      
      {/* TOP CONTROLS & METRICS HEADER */}
      <div className="p-3 sm:p-4 border-b border-[#E5E5E5] bg-[#FAFAFA] flex flex-col gap-3 shrink-0">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Section Header & Overview Metrics */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold shadow-xs">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wide">Meeting & Decision Intelligence</h2>
              <p className="text-[10px] text-[#666666]">Grounded decisions, action items, owners, deadlines & evidence</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-[#E5E5E5] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setShowAddModal('decision')}
                disabled={!meetingData}
                className="px-2.5 py-1 text-[11px] font-bold text-[#111111] hover:bg-neutral-100 rounded flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Decision</span>
              </button>
              <button
                onClick={() => setShowAddModal('action')}
                disabled={!meetingData}
                className="px-2.5 py-1 text-[11px] font-bold text-[#111111] hover:bg-neutral-100 rounded flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Action Item</span>
              </button>
              <button
                onClick={() => setShowAddModal('question')}
                disabled={!meetingData}
                className="px-2.5 py-1 text-[11px] font-bold text-[#111111] hover:bg-neutral-100 rounded flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Question</span>
              </button>
            </div>

            <button
              onClick={handleGenerateIntelligence}
              disabled={isGenerating || transcript.length === 0}
              className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{meetingData ? 'Regenerate' : 'Analyze Meeting'}</span>
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        {meetingData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Decisions</span>
              <span className="text-sm font-mono-time font-bold text-[#111111] bg-neutral-100 px-2 py-0.5 rounded">
                {meetingData.decisions.length}
              </span>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-lg p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Action Items</span>
              <span className="text-sm font-mono-time font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {meetingData.actionItems.length}
              </span>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-lg p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Open Questions</span>
              <span className="text-sm font-mono-time font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {meetingData.openQuestions.filter((q) => q.status === 'OPEN').length}
              </span>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-lg p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Risks Identified</span>
              <span className="text-sm font-mono-time font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                {meetingData.risks.length}
              </span>
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        {meetingData && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, owners, decisions..."
                className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:border-[#111111]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#999999] hover:text-[#111111]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-white border border-[#E5E5E5] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  activeFilter === 'all' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('decisions')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  activeFilter === 'decisions' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Decisions ({meetingData.decisions.length})
              </button>
              <button
                onClick={() => setActiveFilter('actionItems')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  activeFilter === 'actionItems' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Actions ({meetingData.actionItems.length})
              </button>
              <button
                onClick={() => setActiveFilter('openQuestions')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  activeFilter === 'openQuestions' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Questions ({meetingData.openQuestions.length})
              </button>
              <button
                onClick={() => setActiveFilter('risks')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  activeFilter === 'risks' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Risks ({meetingData.risks.length})
              </button>
            </div>

            {/* Action Item Sorting */}
            {(activeFilter === 'all' || activeFilter === 'actionItems') && (
              <div className="flex items-center gap-1.5 bg-white border border-[#E5E5E5] px-2 py-1 rounded-lg text-[10px]">
                <ArrowUpDown className="w-3 h-3 text-[#666666]" />
                <span className="font-bold text-[#666666]">Sort:</span>
                <select
                  value={actionSortBy}
                  onChange={(e) => setActionSortBy(e.target.value as any)}
                  className="bg-transparent text-[#111111] font-bold cursor-pointer focus:outline-hidden"
                >
                  <option value="newest">Newest Timestamp</option>
                  <option value="oldest">Oldest Timestamp</option>
                  <option value="owner">Owner</option>
                  <option value="deadline">Deadline</option>
                  <option value="status">Status</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OUTDATED STATE WARNING BANNER */}
      {isOutdated && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Transcript updated. Meeting Intelligence may be outdated. User edits and manual items will be preserved during regeneration.</span>
          </div>
          <button
            onClick={handleGenerateIntelligence}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer shrink-0"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* EMPTY STATE */}
        {!meetingData && !isGenerating && !generationError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 shadow-xs">
              <CheckSquare className="w-8 h-8 text-[#111111] stroke-[1.5]" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-sm font-bold text-[#111111]">Meeting & Decision Intelligence</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Extract grounded decisions, action items, assigned owners, explicit deadlines, open questions, and risks mapped directly to verified video timestamps.
              </p>
            </div>
            {transcript.length === 0 ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                Generate a transcript to analyze this meeting.
              </p>
            ) : (
              <button
                onClick={handleGenerateIntelligence}
                className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 fill-current" />
                <span>Analyze Meeting Content</span>
              </button>
            )}
          </div>
        )}

        {/* LOADING INDICATOR */}
        {isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-16 text-center space-y-4">
            <Sparkles className="w-8 h-8 text-emerald-500 animate-spin fill-current" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#111111]">Processing Meeting Transcript</h4>
              <p className="text-xs text-[#666666] animate-pulse">{generationStep || 'Building structured intelligence...'}</p>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {generationError && !isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="space-y-1 max-w-sm">
              <h4 className="text-xs font-bold text-red-700">Analysis Error</h4>
              <p className="text-xs text-[#666666]">{generationError}</p>
            </div>
            <button
              onClick={handleGenerateIntelligence}
              className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* RENDERED MEETING INTELLIGENCE SECTIONS */}
        {meetingData && !isGenerating && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* EXECUTIVE SUMMARY BLOCK */}
            {meetingData.summary && (
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#111111]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Executive Meeting Summary</h3>
                </div>
                <p className="text-xs text-[#333333] leading-relaxed font-sans">{meetingData.summary}</p>
              </div>
            )}

            {/* 1. DECISIONS SECTION */}
            {(activeFilter === 'all' || activeFilter === 'decisions') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Decisions ({filteredDecisions.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddModal('decision')}
                    className="text-[11px] font-bold text-[#666666] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Decision</span>
                  </button>
                </div>

                {filteredDecisions.length === 0 ? (
                  <p className="text-xs text-[#999999] italic py-3">No decisions found matching criteria.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredDecisions.map((dec) => (
                      <div
                        key={dec.id}
                        className="p-3.5 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-xl shadow-xs transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            {editingItemId === dec.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editFields.text ?? dec.text}
                                  onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
                                  className="w-full text-xs bg-white border border-[#111111] rounded p-2 focus:outline-hidden"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveEdit('decisions', dec.id)}
                                    className="px-2.5 py-1 bg-[#111111] text-white text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingItemId(null)}
                                    className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <h4 className="text-xs font-bold text-[#111111] leading-snug flex-1">{dec.text}</h4>
                                {dec.isManual && (
                                  <span className="text-[8px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                                    Manual
                                  </span>
                                )}
                              </div>
                            )}

                            {dec.context && (
                              <p className="text-[11px] text-[#666666] leading-relaxed">{dec.context}</p>
                            )}
                          </div>

                          {/* Quick Edit & Delete Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItemId(dec.id);
                                setEditFields({ text: dec.text, speaker: dec.speaker });
                              }}
                              className="p-1 hover:bg-neutral-100 rounded text-[#666666] hover:text-[#111111] cursor-pointer"
                              title="Edit decision"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem('decisions', dec.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 cursor-pointer"
                              title="Delete decision"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Evidence & Timestamps Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F5F5F5] text-[10px]">
                          <div className="flex items-center gap-2">
                            {dec.speaker && (
                              <span className="font-semibold text-neutral-600 flex items-center gap-1">
                                <User className="w-3 h-3 text-neutral-400" />
                                {dec.speaker}
                              </span>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-[#666666]">Source Evidence:</span>
                              {dec.sources.map((src, idx) => (
                                <SourceBadge
                                  key={idx}
                                  timestamp={src.timestamp}
                                  segmentId={src.segmentId}
                                  speakerName={dec.speaker}
                                  textSnippet={dec.context || dec.text}
                                  status={isOutdated ? 'STALE' : 'VALID'}
                                  duration={project.duration}
                                  onSeek={onSeek}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Integration Quick Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAskAboutItem(dec.text, dec.context || dec.text)}
                              className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                              title="Ask about this decision in Intelligence Hub"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handleCreateClipFromItem(dec.text, dec.timestamp)}
                              className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                              title="Create Clip from Decision"
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
            )}

            {/* 2. ACTION ITEMS SECTION */}
            {(activeFilter === 'all' || activeFilter === 'actionItems') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Action Items ({filteredActionItems.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddModal('action')}
                    className="text-[11px] font-bold text-[#666666] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Action Item</span>
                  </button>
                </div>

                {filteredActionItems.length === 0 ? (
                  <p className="text-xs text-[#999999] italic py-3">No action items found matching criteria.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredActionItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 bg-white border rounded-xl shadow-xs transition-colors space-y-2.5 ${
                          item.status === 'DONE' ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#E5E5E5] hover:border-[#111111]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Checkbox Toggle Button */}
                            <button
                              onClick={() => handleToggleActionStatus(item.id)}
                              className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer ${
                                item.status === 'DONE'
                                  ? 'text-emerald-600 hover:text-emerald-700'
                                  : item.status === 'IN_PROGRESS'
                                  ? 'text-blue-600 hover:text-blue-700'
                                  : 'text-neutral-400 hover:text-neutral-700'
                              }`}
                              title={`Status: ${item.status}. Click to advance.`}
                            >
                              {item.status === 'DONE' ? (
                                <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                              ) : item.status === 'IN_PROGRESS' ? (
                                <Circle className="w-5 h-5 fill-blue-100 stroke-blue-600" />
                              ) : (
                                <Circle className="w-5 h-5 stroke-neutral-400" />
                              )}
                            </button>

                            {/* Task Content */}
                            <div className="space-y-1 flex-1">
                              {editingItemId === item.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editFields.text ?? item.task}
                                    onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
                                    placeholder="Task description..."
                                    className="w-full text-xs bg-white border border-[#111111] rounded p-1.5"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editFields.owner ?? item.owner}
                                      onChange={(e) => setEditFields({ ...editFields, owner: e.target.value })}
                                      placeholder="Owner..."
                                      className="text-xs bg-white border border-[#E5E5E5] rounded p-1 flex-1"
                                    />
                                    <input
                                      type="text"
                                      value={editFields.deadline ?? item.deadline}
                                      onChange={(e) => setEditFields({ ...editFields, deadline: e.target.value })}
                                      placeholder="Deadline..."
                                      className="text-xs bg-white border border-[#E5E5E5] rounded p-1 flex-1"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={() => handleSaveEdit('actionItems', item.id)}
                                      className="px-2.5 py-1 bg-[#111111] text-white text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingItemId(null)}
                                      className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <h4
                                    className={`text-xs font-bold leading-snug ${
                                      item.status === 'DONE' ? 'line-through text-neutral-400' : 'text-[#111111]'
                                    }`}
                                  >
                                    {item.task}
                                  </h4>

                                  {/* Metadata Pills: Owner, Deadline, Status */}
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                                    <span className="font-bold bg-neutral-100 border border-neutral-200 text-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                                      <User className="w-2.5 h-2.5 text-neutral-500" />
                                      <span>Owner: {item.owner}</span>
                                    </span>

                                    <span className="font-bold bg-neutral-100 border border-neutral-200 text-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Calendar className="w-2.5 h-2.5 text-neutral-500" />
                                      <span>Due: {item.deadline}</span>
                                    </span>

                                    <span
                                      className={`font-bold px-2 py-0.5 rounded border uppercase text-[9px] ${
                                        item.status === 'DONE'
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : item.status === 'IN_PROGRESS'
                                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {item.status.replace('_', ' ')}
                                    </span>

                                    {item.isManual && (
                                      <span className="text-[8px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                                        Manual
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Edit & Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditFields({ text: item.task, owner: item.owner, deadline: item.deadline });
                              }}
                              className="p-1 hover:bg-neutral-100 rounded text-[#666666] hover:text-[#111111] cursor-pointer"
                              title="Edit action item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem('actionItems', item.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 cursor-pointer"
                              title="Delete action item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Evidence & Timestamps Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F5F5F5] text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#666666]">Source Evidence:</span>
                            {item.sources.map((src, idx) => (
                              <SourceBadge
                                key={idx}
                                timestamp={src.timestamp}
                                segmentId={src.segmentId}
                                speakerName={item.owner}
                                textSnippet={item.task}
                                status={isOutdated ? 'STALE' : 'VALID'}
                                duration={project.duration}
                                onSeek={onSeek}
                              />
                            ))}
                          </div>

                          {/* Integration Quick Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAskAboutItem(item.task, `Owner: ${item.owner}, Deadline: ${item.deadline}`)}
                              className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                              title="Ask about this action item in Intelligence Hub"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handleCreateClipFromItem(item.task, item.timestamp)}
                              className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                              title="Create Clip from Action Item"
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
            )}

            {/* 3. OPEN QUESTIONS SECTION */}
            {(activeFilter === 'all' || activeFilter === 'openQuestions') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Open Questions ({filteredOpenQuestions.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddModal('question')}
                    className="text-[11px] font-bold text-[#666666] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Question</span>
                  </button>
                </div>

                {filteredOpenQuestions.length === 0 ? (
                  <p className="text-xs text-[#999999] italic py-3">No questions found matching criteria.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredOpenQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-xl shadow-xs transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1">
                            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1 flex-1">
                              {editingItemId === q.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editFields.text ?? q.question}
                                    onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
                                    className="w-full text-xs bg-white border border-[#111111] rounded p-2 focus:outline-hidden"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveEdit('openQuestions', q.id)}
                                      className="px-2.5 py-1 bg-[#111111] text-white text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingItemId(null)}
                                      className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <h4 className="text-xs font-bold text-[#111111] leading-snug">{q.question}</h4>
                              )}

                              {q.resolutionSnippet && (
                                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded leading-relaxed">
                                  <span className="font-bold">Resolution:</span> {q.resolutionSnippet}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleQuestionStatus(q.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                q.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {q.status}
                            </button>
                            <button
                              onClick={() => handleDeleteItem('openQuestions', q.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Grounded Source Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F5F5F5] text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#666666]">Source Evidence:</span>
                            {q.sources.map((src, idx) => (
                              <button
                                key={idx}
                                onClick={() => onSeek(src.timestamp)}
                                className="px-2 py-0.5 bg-neutral-100 hover:bg-[#111111] hover:text-white border border-neutral-200 rounded font-mono-time font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>{formatDuration(src.timestamp)}</span>
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handleAskAboutItem(q.question, q.question)}
                            className="p-1 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded cursor-pointer"
                            title="Ask about this question in Intelligence Hub"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. RISKS SECTION */}
            {(activeFilter === 'all' || activeFilter === 'risks') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Identified Risks ({filteredRisks.length})
                  </h3>
                </div>

                {filteredRisks.length === 0 ? (
                  <p className="text-xs text-[#999999] italic py-3">No risks identified.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredRisks.map((risk) => (
                      <div
                        key={risk.id}
                        className="p-3 bg-white border border-[#E5E5E5] hover:border-[#111111] rounded-xl shadow-xs transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#111111]">{risk.risk}</h4>
                              {risk.impact && (
                                <span
                                  className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                    risk.impact === 'high'
                                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                                      : risk.impact === 'medium'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                  }`}
                                >
                                  {risk.impact} Impact
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              {risk.sources.map((src, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => onSeek(src.timestamp)}
                                  className="font-mono-time font-bold text-[#666666] hover:text-[#111111] hover:underline cursor-pointer"
                                >
                                  Source: {formatDuration(src.timestamp)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem('risks', risk.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. AGREEMENTS & DISAGREEMENTS SECTION */}
            {activeFilter === 'all' && filteredAgreements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Agreements & Discussion Dynamics ({filteredAgreements.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {filteredAgreements.map((ad) => (
                    <div
                      key={ad.id}
                      className="p-3 bg-white border border-[#E5E5E5] rounded-xl shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            ad.type === 'agreement' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {ad.type}
                        </span>
                        <div className="flex items-center gap-1">
                          {ad.sources.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={() => onSeek(src.timestamp)}
                              className="font-mono-time text-[10px] font-bold text-[#666666] hover:text-[#111111] hover:underline cursor-pointer"
                            >
                              {formatDuration(src.timestamp)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-[#111111]">{ad.topic}</h4>
                      <p className="text-xs text-[#666666]">{ad.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL FOR ADDING MANUAL ITEM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl max-w-md w-full p-5 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                Add Manual {showAddModal.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowAddModal(null)}
                className="text-xs text-[#999999] hover:text-[#111111] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                  {showAddModal === 'decision' ? 'Decision Statement' : showAddModal === 'action' ? 'Task Description' : 'Question'}
                </label>
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Enter text..."
                  className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg p-2.5 focus:outline-hidden focus:border-[#111111]"
                />
              </div>

              {showAddModal === 'action' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Assign Owner
                    </label>
                    <input
                      type="text"
                      value={newItemOwner}
                      onChange={(e) => setNewItemOwner(e.target.value)}
                      placeholder="e.g. Tanya"
                      className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg p-2 focus:outline-hidden focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Deadline
                    </label>
                    <input
                      type="text"
                      value={newItemDeadline}
                      onChange={(e) => setNewItemDeadline(e.target.value)}
                      placeholder="e.g. Friday"
                      className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg p-2 focus:outline-hidden focus:border-[#111111]"
                    />
                  </div>
                </div>
              )}

              {showAddModal === 'decision' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                    Speaker / Proposer (Optional)
                  </label>
                  <input
                    type="text"
                    value={newItemSpeaker}
                    onChange={(e) => setNewItemSpeaker(e.target.value)}
                    placeholder="e.g. Speaker 1"
                    className="w-full text-xs bg-white border border-[#E5E5E5] rounded-lg p-2 focus:outline-hidden focus:border-[#111111]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(null)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualItem}
                disabled={!newItemText.trim()}
                className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
