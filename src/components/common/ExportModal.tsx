import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  X, 
  Check, 
  FileSpreadsheet, 
  Code, 
  Subtitles, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Layers,
  Globe,
  HelpCircle,
  FileCode
} from 'lucide-react';
import { Project } from '../../types';
import { sanitizeFileName, triggerFileDownload, generateCustomMarkdownReport, generateCustomTXTReport, generateSRT, generateVTT, generateCSV, generateJSON } from '../../utils/exportUtils';
import { generateProjectPDF, ExportSectionsSelection } from '../../utils/pdfGenerator';

export type ExportFormat = 'pdf' | 'markdown' | 'txt' | 'srt' | 'vtt' | 'csv' | 'json';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activeTab?: string;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  activeTab,
  onToast,
}) => {
  if (!isOpen) return null;

  // Available Data Flags
  const hasTranscript = Boolean(project.transcript && project.transcript.length > 0);
  const hasSummary = Boolean(project.summary || project.aiAnalysisResults?.summary);
  const hasMeeting = Boolean(project.meetingIntelligence);
  const hasResearch = Boolean(project.researchItems && project.researchItems.length > 0);
  const hasKnowledgeMap = Boolean(project.knowledgeMap && project.knowledgeMap.nodes.length > 0);
  const hasUserNotes = Boolean((project.notes && project.notes.length > 0) || (project.highlights && project.highlights.length > 0));
  const hasTranslations = Boolean(project.translations && Object.keys(project.translations).length > 0);
  const availableLangs = hasTranslations ? Object.keys(project.translations!) : [];

  const isEmptyProject = !hasTranscript && !hasSummary && !hasMeeting && !hasResearch && !hasKnowledgeMap && !hasUserNotes;

  // Format state
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [targetLang, setTargetLang] = useState<string>('source');
  const [includeQuizAnswers, setIncludeQuizAnswers] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Default section selection based on active tab or availability
  const [sections, setSections] = useState<ExportSectionsSelection>(() => {
    if (activeTab === 'summary') {
      return { summary: true, transcript: false, meetingIntelligence: false, researchMode: false, studyMaterial: false, knowledgeMap: false, userNotes: false };
    }
    if (activeTab === 'meetingIntelligence') {
      return { summary: false, transcript: false, meetingIntelligence: true, researchMode: false, studyMaterial: false, knowledgeMap: false, userNotes: false };
    }
    if (activeTab === 'research') {
      return { summary: false, transcript: false, meetingIntelligence: false, researchMode: true, studyMaterial: false, knowledgeMap: false, userNotes: false };
    }
    if (activeTab === 'knowledgeMap') {
      return { summary: false, transcript: false, meetingIntelligence: false, researchMode: false, studyMaterial: false, knowledgeMap: true, userNotes: false };
    }
    return {
      summary: hasSummary,
      meetingIntelligence: hasMeeting,
      researchMode: hasResearch,
      knowledgeMap: hasKnowledgeMap,
      studyMaterial: hasTranscript,
      userNotes: hasUserNotes,
      transcript: hasTranscript,
    };
  });

  const toggleSection = (key: keyof ExportSectionsSelection) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectPreset = (preset: 'all' | 'summary' | 'current') => {
    if (preset === 'all') {
      setSections({
        summary: hasSummary,
        meetingIntelligence: hasMeeting,
        researchMode: hasResearch,
        knowledgeMap: hasKnowledgeMap,
        studyMaterial: hasTranscript,
        userNotes: hasUserNotes,
        transcript: hasTranscript,
      });
    } else if (preset === 'summary') {
      setSections({ summary: hasSummary, meetingIntelligence: false, researchMode: false, knowledgeMap: false, studyMaterial: false, userNotes: false, transcript: false });
    } else if (preset === 'current') {
      setSections({
        summary: activeTab === 'summary' || activeTab === 'ai',
        meetingIntelligence: activeTab === 'meetingIntelligence',
        researchMode: activeTab === 'research',
        knowledgeMap: activeTab === 'knowledgeMap',
        studyMaterial: activeTab === 'study',
        userNotes: false,
        transcript: activeTab === 'transcript' || activeTab === 'subtitles',
      });
    }
  };

  const handleExport = async () => {
    if (isEmptyProject) return;

    setIsExporting(true);
    const safeName = sanitizeFileName(project.name);

    try {
      if (selectedFormat === 'pdf') {
        const pdfBlob = await generateProjectPDF(project, {
          sections,
          includeQuizAnswers,
          targetLang,
        });
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}_report.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        onToast?.('PDF report generated successfully', 'success');
      } else if (selectedFormat === 'markdown') {
        const content = generateCustomMarkdownReport(project, sections, { includeQuizAnswers, targetLang });
        triggerFileDownload(content, `${safeName}_report.md`, 'text/markdown');
        onToast?.('Markdown report exported (.MD)', 'success');
      } else if (selectedFormat === 'txt') {
        const content = generateCustomTXTReport(project, sections, { includeQuizAnswers, targetLang });
        triggerFileDownload(content, `${safeName}_report.txt`, 'text/plain');
        onToast?.('Plain text report exported (.TXT)', 'success');
      } else if (selectedFormat === 'srt') {
        const cues = project.subtitles || (project.transcript || []).map((seg, idx) => ({
          id: seg.id || `sub_${idx}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        }));
        const srt = generateSRT(cues, project.speakers);
        triggerFileDownload(srt, `${safeName}.srt`, 'text/plain');
        onToast?.('Subtitles exported (.SRT)', 'success');
      } else if (selectedFormat === 'vtt') {
        const cues = project.subtitles || (project.transcript || []).map((seg, idx) => ({
          id: seg.id || `sub_${idx}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        }));
        const vtt = generateVTT(cues, project.speakers);
        triggerFileDownload(vtt, `${safeName}.vtt`, 'text/vtt');
        onToast?.('WebVTT captions exported (.VTT)', 'success');
      } else if (selectedFormat === 'csv') {
        const content = generateCSV(project, targetLang);
        triggerFileDownload(content, `${safeName}.csv`, 'text/csv');
        onToast?.('Transcript spreadsheet exported (.CSV)', 'success');
      } else if (selectedFormat === 'json') {
        const content = generateJSON(project, targetLang);
        triggerFileDownload(content, `${safeName}.json`, 'application/json');
        onToast?.('JSON dataset exported (.JSON)', 'success');
      }

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      onToast?.('Couldn\'t export this file. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111111]">Export Center</h3>
              <p className="text-[11px] text-[#666666]">Export real intelligence reports & structured project deliverables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#666666] hover:text-[#111111] rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {isEmptyProject ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold text-[#111111]">There's nothing to export yet.</p>
              <p className="text-xs text-[#666666]">Transcribe audio/video or generate AI insights to unlock professional exports.</p>
            </div>
          ) : (
            <>
              {/* Presets Toolbar */}
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Select Content Sections</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => selectPreset('all')}
                    className="px-2 py-1 text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-[#111111] rounded cursor-pointer"
                  >
                    Select All
                  </button>
                  {activeTab && (
                    <button
                      onClick={() => selectPreset('current')}
                      className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded cursor-pointer"
                    >
                      Current View Only
                    </button>
                  )}
                  <button
                    onClick={() => selectPreset('summary')}
                    className="px-2 py-1 text-[10px] font-bold bg-neutral-100 hover:bg-neutral-200 text-[#111111] rounded cursor-pointer"
                  >
                    Summary Only
                  </button>
                </div>
              </div>

              {/* Checkboxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hasSummary && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.summary}
                      onChange={() => toggleSection('summary')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Executive Summary & Takeaways</span>
                  </label>
                )}

                {hasMeeting && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.meetingIntelligence}
                      onChange={() => toggleSection('meetingIntelligence')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Meeting & Decision Intelligence</span>
                  </label>
                )}

                {hasResearch && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.researchMode}
                      onChange={() => toggleSection('researchMode')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Research Mode Findings</span>
                  </label>
                )}

                {hasKnowledgeMap && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.knowledgeMap}
                      onChange={() => toggleSection('knowledgeMap')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Knowledge Map Topics</span>
                  </label>
                )}

                {hasTranscript && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.studyMaterial}
                      onChange={() => toggleSection('studyMaterial')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Study Material & Quiz</span>
                  </label>
                )}

                {hasUserNotes && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections.userNotes}
                      onChange={() => toggleSection('userNotes')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">My Notes & Highlights</span>
                  </label>
                )}

                {hasTranscript && (
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 cursor-pointer select-none col-span-1 sm:col-span-2 bg-neutral-50/50">
                    <input
                      type="checkbox"
                      checked={sections.transcript}
                      onChange={() => toggleSection('transcript')}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-[#111111]">Full Video Transcript (with Timecodes)</span>
                  </label>
                )}
              </div>

              {/* Additional Options */}
              {sections.studyMaterial && (
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Include Quiz Answers & Explanations</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeQuizAnswers}
                    onChange={(e) => setIncludeQuizAnswers(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Language Selection if translated */}
              {hasTranslations && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111] flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Transcript Language:</span>
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white"
                  >
                    <option value="source">Source Language (Original)</option>
                    {availableLangs.map(lang => (
                      <option key={lang} value={lang}>{lang.toUpperCase()} Translation</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Format Selection */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="text-xs font-bold text-[#111111]">Select Export Format:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('pdf')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'pdf'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-red-400" />
                    <div>
                      <div className="text-xs font-bold">PDF Document</div>
                      <div className={`text-[10px] ${selectedFormat === 'pdf' ? 'text-neutral-300' : 'text-[#666666]'}`}>.pdf report</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('markdown')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'markdown'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <FileCode className="w-4 h-4 shrink-0 text-blue-400" />
                    <div>
                      <div className="text-xs font-bold">Markdown</div>
                      <div className={`text-[10px] ${selectedFormat === 'markdown' ? 'text-neutral-300' : 'text-[#666666]'}`}>.md formatted</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('txt')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'txt'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-neutral-400" />
                    <div>
                      <div className="text-xs font-bold">Plain Text</div>
                      <div className={`text-[10px] ${selectedFormat === 'txt' ? 'text-neutral-300' : 'text-[#666666]'}`}>.txt plain text</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('srt')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'srt'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <Subtitles className="w-4 h-4 shrink-0 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold">Subtitles</div>
                      <div className={`text-[10px] ${selectedFormat === 'srt' ? 'text-neutral-300' : 'text-[#666666]'}`}>.srt file</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'csv'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold">CSV Spreadsheet</div>
                      <div className={`text-[10px] ${selectedFormat === 'csv' ? 'text-neutral-300' : 'text-[#666666]'}`}>.csv data</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFormat('json')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedFormat === 'json'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#E5E5E5] hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    <Code className="w-4 h-4 shrink-0 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold">JSON Data</div>
                      <div className={`text-[10px] ${selectedFormat === 'json' ? 'text-neutral-300' : 'text-[#666666]'}`}>.json structured</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E5E5] bg-neutral-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#666666] hover:text-[#111111] cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isEmptyProject || isExporting}
            className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating File...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
