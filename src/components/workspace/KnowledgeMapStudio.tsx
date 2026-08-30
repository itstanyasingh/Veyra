import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles, 
  Play, 
  Scissors, 
  MessageSquare, 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Layers, 
  List, 
  Share2, 
  HelpCircle,
  ExternalLink,
  User,
  Clock,
  Bookmark
} from 'lucide-react';
import { Project, KnowledgeMapData, KnowledgeMapNode, KnowledgeMapRelationship, TranscriptSegment } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { SourceBadge } from '../common/SourceBadge';
import { analyzeTranscriptTask, calculateTranscriptHash } from '../../services/aiAnalysisService';

interface KnowledgeMapStudioProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  onOpenIntelligenceHubWithTopic?: (topicName: string, promptText: string) => void;
  onCreateClipFromTopic?: (name: string, startTime: number, endTime: number) => void;
  onRepurposeTopic?: (topicName: string, summary: string) => void;
  onSwitchTab?: (tab: string) => void;
}

export const KnowledgeMapStudio: React.FC<KnowledgeMapStudioProps> = ({
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

  // View & Filter States
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'main_topic' | 'subtopic' | 'concept'>('all');

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Generation & Status States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Canvas Pan & Zoom States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const knowledgeMap = project.knowledgeMap;
  const isOutdated = useMemo(() => {
    if (!knowledgeMap || !knowledgeMap.transcriptHash) return false;
    return knowledgeMap.transcriptHash !== currentTranscriptHash;
  }, [knowledgeMap, currentTranscriptHash]);

  // Auto-select first node when knowledge map loads if none selected
  useEffect(() => {
    if (knowledgeMap && knowledgeMap.nodes.length > 0 && !selectedNodeId) {
      setSelectedNodeId(knowledgeMap.nodes[0].id);
    }
  }, [knowledgeMap]);

  // Reset zoom & pan when switching project or loading new map
  const handleFitMap = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Generate or Refresh Knowledge Map
  const handleGenerateMap = async () => {
    if (isGenerating) return;
    if (transcript.length === 0) return;

    const targetProjectId = project.id;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Analyzing transcript content...');

    const t1 = setTimeout(() => setGenerationStep('Extracting topics, subtopics & concepts...'), 1000);
    const t2 = setTimeout(() => setGenerationStep('Building evidence-based relationships...'), 2200);

    try {
      const mapData: KnowledgeMapData = await analyzeTranscriptTask({
        transcript,
        task: 'knowledgeMap',
        projectName: project.name,
        duration: project.duration,
        speakers: project.speakers,
      });

      if (project.id !== targetProjectId) return;

      onUpdateProject({ knowledgeMap: mapData });
      if (mapData.nodes.length > 0) {
        setSelectedNodeId(mapData.nodes[0].id);
      }
      handleFitMap();
    } catch (err: any) {
      console.error('Failed to generate knowledge map:', err);
      setGenerationError(err.message || 'Error constructing knowledge map.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    if (!knowledgeMap || !knowledgeMap.nodes) return [];
    return knowledgeMap.nodes.filter(node => {
      const matchesSearch = searchQuery.trim() === '' || 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || node.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [knowledgeMap, searchQuery, typeFilter]);

  const selectedNode = useMemo(() => {
    if (!knowledgeMap || !selectedNodeId) return null;
    return knowledgeMap.nodes.find(n => n.id === selectedNodeId) || null;
  }, [knowledgeMap, selectedNodeId]);

  // Layout Node Positioning Engine (Deterministic Hierarchical Layout)
  const nodePositions = useMemo(() => {
    if (!knowledgeMap || knowledgeMap.nodes.length === 0) return new Map<string, { x: number; y: number }>();

    const posMap = new Map<string, { x: number; y: number }>();
    const nodes = knowledgeMap.nodes;

    const mainTopics = nodes.filter(n => n.type === 'main_topic' || (!n.parentId && n.type !== 'concept'));
    const otherNodes = nodes.filter(n => !mainTopics.find(m => m.id === n.id));

    // Layout dimensions
    const startY = 80;
    const layerSpacingY = 160;
    const minNodeDistX = 220;

    // Layer 1: Main Topics horizontally distributed
    const mainCount = mainTopics.length;
    const totalMainWidth = (mainCount - 1) * minNodeDistX;
    const startX = 400 - totalMainWidth / 2;

    mainTopics.forEach((mNode, idx) => {
      const x = startX + idx * minNodeDistX;
      const y = startY;
      posMap.set(mNode.id, { x, y });

      // Child subtopics / concepts under this main topic
      const children = otherNodes.filter(c => c.parentId === mNode.id || c.relatedTopicIds.includes(mNode.id));
      const childCount = children.length;
      if (childCount > 0) {
        const childDistX = Math.min(180, 400 / (childCount || 1));
        const childStartX = x - ((childCount - 1) * childDistX) / 2;
        children.forEach((cNode, cIdx) => {
          if (!posMap.has(cNode.id)) {
            posMap.set(cNode.id, {
              x: childStartX + cIdx * childDistX,
              y: y + layerSpacingY,
            });
          }
        });
      }
    });

    // Handle any leftover unpositioned nodes
    let unpositionedIdx = 0;
    nodes.forEach((n) => {
      if (!posMap.has(n.id)) {
        posMap.set(n.id, {
          x: 200 + (unpositionedIdx % 4) * 200,
          y: startY + layerSpacingY * 2 + Math.floor(unpositionedIdx / 4) * 120,
        });
        unpositionedIdx++;
      }
    });

    return posMap;
  }, [knowledgeMap]);

  // Canvas Mouse Pan Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoomLevel(prev => Math.min(2.5, Math.max(0.4, prev * zoomFactor)));
  };

  // Actions for Selected Topic
  const handleAskAboutTopic = (node: KnowledgeMapNode) => {
    const promptText = `Explain what the video says about "${node.name}". Summary context: ${node.summary}`;
    if (onOpenIntelligenceHubWithTopic) {
      onOpenIntelligenceHubWithTopic(node.name, promptText);
    } else if (onSwitchTab) {
      onSwitchTab('ai');
    }
  };

  const handleCreateClipFromTopic = (node: KnowledgeMapNode) => {
    if (node.sources && node.sources.length > 0) {
      const srcTime = node.sources[0].timestamp;
      const startTime = Math.max(0, srcTime - 5);
      const endTime = Math.min(project.duration || 60, srcTime + 25);
      if (onCreateClipFromTopic) {
        onCreateClipFromTopic(node.name, startTime, endTime);
      } else if (onSwitchTab) {
        onSwitchTab('clips');
      }
    }
  };

  const handleRepurposeTopic = (node: KnowledgeMapNode) => {
    if (onRepurposeTopic) {
      onRepurposeTopic(node.name, node.summary);
    }
  };

  // Helper for Speaker name lookup
  const getSpeakerName = (speakerId?: string) => {
    if (!speakerId) return null;
    const found = project.speakers?.find(s => s.id === speakerId);
    return found ? found.name : speakerId;
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] font-sans text-[#111111] overflow-hidden select-none">
      
      {/* HEADER CONTROLS BAR */}
      <div className="p-3 sm:p-4 border-b border-[#E5E5E5] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics & concepts..."
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
          <div className="flex items-center gap-1 bg-white border border-[#E5E5E5] p-0.5 rounded-lg text-[10px] font-bold">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('main_topic')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'main_topic' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Main Topics
            </button>
            <button
              onClick={() => setTypeFilter('subtopic')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'subtopic' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Subtopics
            </button>
            <button
              onClick={() => setTypeFilter('concept')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'concept' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Concepts
            </button>
          </div>
        </div>

        {/* Right: View Mode Toggle, Zoom, Refresh Map */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white border border-[#E5E5E5] p-0.5 rounded-lg text-[10px] font-bold">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'graph' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Network className="w-3 h-3" />
              <span>Graph</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'tree' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Tree View</span>
            </button>
          </div>

          {/* Zoom controls for Graph View */}
          {viewMode === 'graph' && (
            <div className="flex items-center gap-1 bg-white border border-[#E5E5E5] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                title="Zoom In"
                className="p-1 hover:bg-neutral-100 rounded text-[#111111] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[9px] font-mono text-[#666666]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.15))}
                title="Zoom Out"
                className="p-1 hover:bg-neutral-100 rounded text-[#111111] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFitMap}
                title="Fit Map"
                className="p-1 hover:bg-neutral-100 rounded text-[#111111] cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Regenerate / Generate Button */}
          <button
            onClick={handleGenerateMap}
            disabled={isGenerating || transcript.length === 0}
            className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{knowledgeMap ? 'Refresh Map' : 'Generate Map'}</span>
          </button>
        </div>
      </div>

      {/* OUTDATED STATE WARNING BANNER */}
      {isOutdated && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Transcript updated. Knowledge Map may be outdated.</span>
          </div>
          <button
            onClick={handleGenerateMap}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
          >
            Refresh Knowledge Map
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT / MAIN WORKSPACE GRAPH / TREE CANVAS */}
        <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] border-r border-[#E5E5E5] relative overflow-hidden">
          
          {/* Empty State */}
          {!knowledgeMap && !isGenerating && !generationError && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 shadow-xs">
                <Network className="w-8 h-8 text-[#111111] stroke-[1.5]" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-sm font-bold text-[#111111]">Interactive Visual Knowledge Map</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Analyze your media transcript to extract grounded topics, subtopics, concepts, and evidence-based relationships mapped directly to real timestamps.
                </p>
              </div>
              {transcript.length === 0 ? (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                  Generate a transcript to build a Knowledge Map.
                </p>
              ) : (
                <button
                  onClick={handleGenerateMap}
                  className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
                  <span>Generate Knowledge Map</span>
                </button>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Sparkles className="w-8 h-8 text-amber-500 animate-spin fill-current" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#111111]">Analyzing Video Content</h4>
                <p className="text-xs text-[#666666] animate-pulse">{generationStep || 'Building knowledge graph...'}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {generationError && !isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="space-y-1 max-w-sm">
                <h4 className="text-xs font-bold text-red-700">Generation Error</h4>
                <p className="text-xs text-[#666666]">{generationError}</p>
              </div>
              <button
                onClick={handleGenerateMap}
                className="px-3 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* GRAPH VIEW MODE */}
          {knowledgeMap && !isGenerating && viewMode === 'graph' && (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className={`w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden select-none ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: '0 0',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="w-full h-full absolute top-0 left-0"
              >
                {/* SVG Connections Layer */}
                <svg className="w-[2000px] h-[2000px] absolute top-0 left-0 pointer-events-none">
                  {knowledgeMap.relationships.map((rel) => {
                    const srcPos = nodePositions.get(rel.sourceId);
                    const tgtPos = nodePositions.get(rel.targetId);
                    if (!srcPos || !tgtPos) return null;

                    const isHighlighted =
                      selectedNodeId === rel.sourceId || selectedNodeId === rel.targetId;

                    return (
                      <g key={rel.id}>
                        <line
                          x1={srcPos.x + 80}
                          y1={srcPos.y + 20}
                          x2={tgtPos.x + 80}
                          y2={tgtPos.y + 20}
                          stroke={isHighlighted ? '#111111' : '#E5E5E5'}
                          strokeWidth={isHighlighted ? 2 : 1.5}
                          strokeDasharray={rel.type === 'related' ? '4 4' : undefined}
                        />
                        {/* Label Badge */}
                        {rel.label && (
                          <rect
                            x={(srcPos.x + tgtPos.x) / 2 + 65}
                            y={(srcPos.y + tgtPos.y) / 2 + 12}
                            width={rel.label.length * 5.5 + 10}
                            height={16}
                            rx={4}
                            fill="#FFFFFF"
                            stroke="#E5E5E5"
                          />
                        )}
                        {rel.label && (
                          <text
                            x={(srcPos.x + tgtPos.x) / 2 + 70}
                            y={(srcPos.y + tgtPos.y) / 2 + 23}
                            fontSize={9}
                            fontWeight="bold"
                            fill="#666666"
                          >
                            {rel.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes Cards Layer */}
                {filteredNodes.map((node) => {
                  const pos = nodePositions.get(node.id) || { x: 100, y: 100 };
                  const isSelected = selectedNodeId === node.id;
                  const isMain = node.type === 'main_topic';

                  return (
                    <div
                      key={node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: isMain ? '180px' : '160px',
                      }}
                      className={`absolute rounded-xl border p-3 cursor-pointer transition-all shadow-xs ${
                        isSelected
                          ? 'bg-[#111111] text-white border-[#111111] ring-2 ring-neutral-400 z-20 scale-105'
                          : isMain
                          ? 'bg-white text-[#111111] border-[#111111] hover:border-black z-10'
                          : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-[#111111] z-0'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-neutral-800 text-neutral-200'
                              : isMain
                              ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                              : 'bg-neutral-50 text-neutral-600 border border-neutral-200'
                          }`}
                        >
                          {node.type.replace('_', ' ')}
                        </span>
                        {node.sources.length > 0 && (
                          <span
                            className={`text-[9px] font-mono-time ${
                              isSelected ? 'text-neutral-300' : 'text-[#666666]'
                            }`}
                          >
                            {formatDuration(node.sources[0].timestamp)}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug line-clamp-2 ${
                          isSelected ? 'text-white' : 'text-[#111111]'
                        }`}
                      >
                        {node.name}
                      </h4>

                      <p
                        className={`text-[9px] line-clamp-2 mt-1 leading-tight ${
                          isSelected ? 'text-neutral-300' : 'text-[#666666]'
                        }`}
                      >
                        {node.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACCESSIBLE TREE / LIST VIEW MODE */}
          {knowledgeMap && !isGenerating && viewMode === 'tree' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                  Topic Hierarchy Tree ({filteredNodes.length})
                </span>
              </div>

              {filteredNodes.length === 0 ? (
                <p className="text-xs text-[#999999] py-8 text-center">No topics match your search criteria.</p>
              ) : (
                <div className="space-y-2">
                  {filteredNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-white hover:bg-neutral-50 border-[#E5E5E5] text-[#111111]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {node.type.replace('_', ' ')}
                            </span>
                            <h4 className="text-xs font-bold">{node.name}</h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {node.sources.length > 0 && (
                              <span
                                className={`text-[10px] font-mono-time ${
                                  isSelected ? 'text-neutral-300' : 'text-[#666666]'
                                }`}
                              >
                                {formatDuration(node.sources[0].timestamp)}
                              </span>
                            )}
                            <ChevronRight
                              className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#999999]'}`}
                            />
                          </div>
                        </div>
                        <p
                          className={`text-xs mt-1.5 line-clamp-2 ${
                            isSelected ? 'text-neutral-300' : 'text-[#666666]'
                          }`}
                        >
                          {node.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: SELECTED TOPIC DETAILS & ACTIONS PANEL */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-y-auto shrink-0">
          {selectedNode ? (
            <div className="p-4 sm:p-5 space-y-5">
              
              {/* Node Header */}
              <div className="space-y-2 pb-3 border-b border-[#F0F0F0]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded border border-neutral-200">
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                  {selectedNode.importanceScore && (
                    <span className="text-[10px] font-bold text-[#666666]">
                      Importance: {selectedNode.importanceScore}/100
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#111111] leading-snug">{selectedNode.name}</h3>
              </div>

              {/* Grounded Summary */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                  Grounded Transcript Summary
                </h4>
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs leading-relaxed text-[#111111]">
                  {selectedNode.summary}
                </div>
              </div>

              {/* Source Timestamps & Evidence */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                  Source Evidence Timestamps ({selectedNode.sources.length})
                </h4>
                {selectedNode.sources.length === 0 ? (
                  <p className="text-xs text-[#999999]">No timestamps linked.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedNode.sources.map((src, idx) => {
                      const spkName = getSpeakerName(src.speaker);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-[#E5E5E5] rounded-lg transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5">
                              <SourceBadge
                                timestamp={src.timestamp}
                                segmentId={src.segmentId}
                                speakerName={spkName}
                                textSnippet={src.textSnippet || selectedNode.summary}
                                status={isOutdated ? 'STALE' : 'VALID'}
                                duration={project.duration}
                                onSeek={onSeek}
                              />
                            </div>
                            {src.textSnippet && (
                              <p className="text-[10px] text-[#666666] line-clamp-2 leading-tight italic font-serif">
                                "{src.textSnippet}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Related Concepts */}
              {selectedNode.relatedTopicIds.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                    Related Concepts
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.relatedTopicIds.map((relId) => {
                      const relNode = knowledgeMap.nodes.find(n => n.id === relId);
                      if (!relNode) return null;
                      return (
                        <button
                          key={relId}
                          onClick={() => setSelectedNodeId(relId)}
                          className="px-2 py-1 bg-white hover:bg-neutral-100 border border-[#E5E5E5] rounded-md text-[10px] font-bold text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{relNode.name}</span>
                          <ChevronRight className="w-2.5 h-2.5 text-[#999999]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* INTEGRATION ACTIONS */}
              <div className="space-y-2 pt-3 border-t border-[#F0F0F0]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                  Topic Quick Actions
                </h4>
                
                <button
                  onClick={() => handleAskAboutTopic(selectedNode)}
                  className="w-full py-2 bg-white hover:bg-neutral-50 border border-[#E5E5E5] text-[#111111] text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ask about this topic</span>
                </button>

                <button
                  onClick={() => handleCreateClipFromTopic(selectedNode)}
                  className="w-full py-2 bg-white hover:bg-neutral-50 border border-[#E5E5E5] text-[#111111] text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Create Clip from Topic</span>
                </button>

                <button
                  onClick={() => handleRepurposeTopic(selectedNode)}
                  className="w-full py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>Repurpose Topic Content</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#999999] space-y-2">
              <Network className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
              <p className="text-xs font-medium">Select a node in the graph or tree to view grounded evidence & topic details.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
