import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Globe,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  X,
  Play,
  Download,
  Copy,
  Columns,
  Rows,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle2,
  Subtitles,
  Languages,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Project, TranscriptSegment, Speaker, TranslationMetadata } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { triggerFileDownload, sanitizeFileName } from '../../utils/exportUtils';

export interface TranslationWorkspaceProps {
  project: Project;
  segments: TranscriptSegment[];
  speakers: Speaker[];
  speakerMap: Map<string, string>;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateProject: (updates: Partial<Project>) => void;
  activeCaptionLanguage?: string;
  setActiveCaptionLanguage?: (lang: string) => void;
  currentTranscriptHash: string;
  pushHistory: (description: string) => void;
}

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ar', name: 'Arabic', native: 'العربية', isRTL: true },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو', isRTL: true },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', native: 'עברית', isRTL: true },
  { code: 'th', name: 'Thai', native: 'ไทย' },
];

export const isRtlLanguage = (langName: string): boolean => {
  const item = SUPPORTED_TRANSLATION_LANGUAGES.find(
    (l) => l.name.toLowerCase() === langName.toLowerCase() || l.code.toLowerCase() === langName.toLowerCase()
  );
  return Boolean(item?.isRTL);
};

export const TranslationWorkspace: React.FC<TranslationWorkspaceProps> = ({
  project,
  segments,
  speakers,
  speakerMap,
  currentTime,
  onSeek,
  onUpdateProject,
  activeCaptionLanguage = 'source',
  setActiveCaptionLanguage,
  currentTranscriptHash,
  pushHistory,
}) => {
  // Source and Target Language Selection
  const [sourceLang, setSourceLang] = useState<string>('Auto Detect');
  const [targetLang, setTargetLang] = useState<string>('Hindi');
  const [detectedLangInfo, setDetectedLangInfo] = useState<{ language: string; confidence?: number } | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);

  // View Layout Modes: 'sideBySide' | 'stacked' | 'translationOnly'
  const [viewMode, setViewMode] = useState<'sideBySide' | 'stacked' | 'translationOnly'>('sideBySide');

  // Filter & Search inside Translation
  const [filterQuery, setFilterQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<'all' | string>('all');

  // In-place Segment Edit State
  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [editingSegText, setEditingSegText] = useState<string>('');

  // Translation Progress & Error State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Active translation segments and metadata
  const currentTranslationSegments = useMemo(() => {
    return project.translations?.[targetLang] || null;
  }, [project.translations, targetLang]);

  const currentMetadata = useMemo(() => {
    return project.translationMetadata?.[targetLang] || null;
  }, [project.translationMetadata, targetLang]);

  // Outdated Translation Detection:
  // If translation exists and metadata.transcriptHash is present but does not match currentTranscriptHash
  const isTranslationOutdated = useMemo(() => {
    if (!currentTranslationSegments || currentTranslationSegments.length === 0) return false;
    if (!currentMetadata?.transcriptHash) return false;
    return currentMetadata.transcriptHash !== currentTranscriptHash;
  }, [currentTranslationSegments, currentMetadata, currentTranscriptHash]);

  // List of all translated languages in the project for 1-click tab switching
  const availableTranslatedLanguages = useMemo(() => {
    if (!project.translations) return [];
    return Object.keys(project.translations).filter(
      (lang) => Array.isArray(project.translations?.[lang]) && project.translations![lang].length > 0
    );
  }, [project.translations]);

  // Target RTL check
  const isTargetRTL = useMemo(() => isRtlLanguage(targetLang), [targetLang]);

  // Active segment index based on currentTime
  const activeSegmentIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    );
  }, [segments, currentTime]);

  const activeRowRef = useRef<HTMLDivElement>(null);

  // Auto-detect Language Handler
  const handleDetectLanguage = async () => {
    if (segments.length === 0) return;
    setIsDetectingLanguage(true);
    try {
      const response = await fetch('/api/ai/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: segments.slice(0, 15),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.language) {
          setDetectedLangInfo({ language: data.language, confidence: data.confidence });
          setSourceLang(data.language);
        }
      }
    } catch (err) {
      console.error('Failed to detect language:', err);
    } finally {
      setIsDetectingLanguage(false);
    }
  };

  // Perform AI Translation using server-side Gemini
  const handleExecuteTranslation = async (forceTargetLang?: string) => {
    const langToTranslate = forceTargetLang || targetLang;
    if (segments.length === 0) {
      setTranslationError('No transcript available. Transcribe the video first.');
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);
    setTranslationProgress(`Preparing translation to ${langToTranslate}...`);

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          sourceLanguage: sourceLang,
          targetLanguage: langToTranslate,
          projectName: project.name,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Translation failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      const translatedList: TranscriptSegment[] = data.translatedSegments || [];

      if (translatedList.length === 0) {
        throw new Error('No translated segments returned.');
      }

      // Record new translation and metadata
      const newMetadata: TranslationMetadata = {
        targetLanguage: langToTranslate,
        sourceLanguage: data.detectedSourceLanguage || sourceLang,
        transcriptHash: currentTranscriptHash,
        createdAt: currentMetadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segmentCount: translatedList.length,
        isEdited: false,
      };

      const updatedTranslations = {
        ...(project.translations || {}),
        [langToTranslate]: translatedList,
      };

      const updatedMetadataMap = {
        ...(project.translationMetadata || {}),
        [langToTranslate]: newMetadata,
      };

      onUpdateProject({
        translations: updatedTranslations,
        translationMetadata: updatedMetadataMap,
      });

      if (data.detectedSourceLanguage && !detectedLangInfo) {
        setDetectedLangInfo({ language: data.detectedSourceLanguage });
      }

      // Record snapshot for history
      pushHistory(`Translate transcript to ${langToTranslate}`);
      setTargetLang(langToTranslate);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(err?.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
      setTranslationProgress(null);
    }
  };

  // In-place edit handlers for translated segments
  const handleStartEdit = (seg: TranscriptSegment) => {
    setEditingSegId(seg.id);
    setEditingSegText(seg.text);
  };

  const handleCancelEdit = () => {
    setEditingSegId(null);
    setEditingSegText('');
  };

  const handleSaveEdit = (segId: string) => {
    if (!currentTranslationSegments) return;

    const updated = currentTranslationSegments.map((s) => {
      if (s.id === segId) {
        return { ...s, text: editingSegText.trim() };
      }
      return s;
    });

    const updatedTranslations = {
      ...(project.translations || {}),
      [targetLang]: updated,
    };

    const updatedMetadataMap = {
      ...(project.translationMetadata || {}),
      [targetLang]: {
        ...(currentMetadata || {
          targetLanguage: targetLang,
          sourceLanguage: sourceLang,
          transcriptHash: currentTranscriptHash,
          createdAt: new Date().toISOString(),
          segmentCount: updated.length,
        }),
        isEdited: true,
        updatedAt: new Date().toISOString(),
      },
    };

    onUpdateProject({
      translations: updatedTranslations,
      translationMetadata: updatedMetadataMap,
    });

    pushHistory(`Edit ${targetLang} translation segment`);
    setEditingSegId(null);
    setEditingSegText('');
  };

  // Copy Full Translation to Clipboard
  const handleCopyTranslation = () => {
    if (!currentTranslationSegments || currentTranslationSegments.length === 0) return;

    const formatted = currentTranslationSegments
      .map((seg) => {
        const spk = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
        const start = formatDuration(seg.startTime);
        const end = formatDuration(seg.endTime);
        return `[${start} - ${end}] ${spk}: ${seg.text}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(formatted);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Export SRT
  const handleExportSRT = () => {
    if (!currentTranslationSegments) return;

    const formatSRTTime = (sec: number) => {
      const hours = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    const srtContent = currentTranslationSegments
      .map((seg, idx) => {
        return `${idx + 1}\n${formatSRTTime(seg.startTime)} --> ${formatSRTTime(seg.endTime)}\n${seg.text}\n`;
      })
      .join('\n');

    triggerFileDownload(
      srtContent,
      `${sanitizeFileName(project.name)}_${targetLang.toLowerCase()}.srt`,
      'text/plain;charset=utf-8'
    );
  };

  // Export VTT
  const handleExportVTT = () => {
    if (!currentTranslationSegments) return;

    const formatVTTTime = (sec: number) => {
      const hours = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT\n\n';
    currentTranslationSegments.forEach((seg, idx) => {
      vtt += `${idx + 1}\n${formatVTTTime(seg.startTime)} --> ${formatVTTTime(seg.endTime)}\n${seg.text}\n\n`;
    });

    triggerFileDownload(
      vtt,
      `${sanitizeFileName(project.name)}_${targetLang.toLowerCase()}.vtt`,
      'text/vtt;charset=utf-8'
    );
  };

  // Export TXT
  const handleExportTXT = () => {
    if (!currentTranslationSegments) return;

    const text = currentTranslationSegments
      .map((seg) => {
        const spk = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
        return `[${formatDuration(seg.startTime)}] ${spk}: ${seg.text}`;
      })
      .join('\n');

    triggerFileDownload(
      text,
      `${sanitizeFileName(project.name)}_${targetLang.toLowerCase()}.txt`,
      'text/plain;charset=utf-8'
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!currentTranslationSegments) return;

    const headers = ['Index', 'Start Time', 'End Time', 'Duration (s)', 'Speaker', 'Original Text', 'Translated Text'];
    const rows = currentTranslationSegments.map((tSeg, idx) => {
      const origSeg = segments[idx] || tSeg;
      const spk = speakerMap.get(tSeg.speakerId) || tSeg.speakerId || 'Speaker';
      const dur = (tSeg.endTime - tSeg.startTime).toFixed(2);
      const escapeCSV = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      return [
        idx + 1,
        formatDuration(tSeg.startTime),
        formatDuration(tSeg.endTime),
        dur,
        escapeCSV(spk),
        escapeCSV(origSeg.text),
        escapeCSV(tSeg.text),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    triggerFileDownload(
      csvContent,
      `${sanitizeFileName(project.name)}_${targetLang.toLowerCase()}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!currentTranslationSegments) return;

    const payload = {
      projectName: project.name,
      targetLanguage: targetLang,
      sourceLanguage: currentMetadata?.sourceLanguage || sourceLang,
      transcriptHash: currentMetadata?.transcriptHash || currentTranscriptHash,
      createdAt: currentMetadata?.createdAt || new Date().toISOString(),
      updatedAt: currentMetadata?.updatedAt || new Date().toISOString(),
      isEdited: Boolean(currentMetadata?.isEdited),
      segments: currentTranslationSegments.map((tSeg, idx) => {
        const origSeg = segments[idx];
        return {
          index: idx + 1,
          id: tSeg.id,
          speaker: speakerMap.get(tSeg.speakerId) || tSeg.speakerId || 'Speaker',
          startTime: tSeg.startTime,
          endTime: tSeg.endTime,
          originalText: origSeg ? origSeg.text : '',
          translatedText: tSeg.text,
        };
      }),
    };

    triggerFileDownload(
      JSON.stringify(payload, null, 2),
      `${sanitizeFileName(project.name)}_${targetLang.toLowerCase()}.json`,
      'application/json;charset=utf-8'
    );
  };

  // Filtered rows based on search query & speaker filter
  const displayedRows = useMemo(() => {
    if (!currentTranslationSegments) return [];

    return currentTranslationSegments
      .map((tSeg, idx) => {
        const origSeg = segments[idx] || tSeg;
        return {
          index: idx,
          translated: tSeg,
          original: origSeg,
        };
      })
      .filter(({ translated, original }) => {
        if (speakerFilter !== 'all' && (translated.speakerId || 'spk_1') !== speakerFilter) {
          return false;
        }
        if (!filterQuery.trim()) return true;

        const q = filterQuery.toLowerCase();
        return (
          translated.text.toLowerCase().includes(q) ||
          original.text.toLowerCase().includes(q)
        );
      });
  }, [currentTranslationSegments, segments, speakerFilter, filterQuery]);

  const isCaptionsActive = activeCaptionLanguage === targetLang;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0F0F0]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#111111]" />
            <span>Multilingual Translation Workspace</span>
          </h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Real AI translation powered by Gemini. Segments, timestamps, and speaker identities are preserved.
          </p>
        </div>

        {/* Existing Translated Languages Quick Switcher */}
        {availableTranslatedLanguages.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#888888]">Available:</span>
            {availableTranslatedLanguages.map((lang) => {
              const isSelected = targetLang.toLowerCase() === lang.toLowerCase();
              const isOutdated = project.translationMetadata?.[lang]?.transcriptHash !== currentTranscriptHash;
              return (
                <button
                  key={lang}
                  onClick={() => {
                    setTargetLang(lang);
                    setTranslationError(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                      : 'bg-white text-[#444444] border-[#E5E5E5] hover:border-[#111111]'
                  }`}
                >
                  <span>{lang}</span>
                  {isOutdated ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E53E3E]" title="Outdated — transcript changed" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38A169]" title="Up to date" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Language Configuration Card */}
      <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          {/* Source Language */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                Source Language
              </label>
              <button
                onClick={handleDetectLanguage}
                disabled={isDetectingLanguage || segments.length === 0}
                className="text-[11px] text-[#111111] hover:underline flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#111111]" />
                <span>{isDetectingLanguage ? 'Detecting...' : 'Detect'}</span>
              </button>
            </div>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
            >
              <option value="Auto Detect">
                Auto Detect {detectedLangInfo ? `(${detectedLangInfo.language})` : ''}
              </option>
              {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          {/* Target Language */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
              Target Language
            </label>
            <select
              value={targetLang}
              onChange={(e) => {
                setTargetLang(e.target.value);
                setTranslationError(null);
              }}
              className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer font-medium"
            >
              {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          {/* Action / Translate Button */}
          <div className="space-y-1.5">
            <button
              onClick={() => handleExecuteTranslation()}
              disabled={isTranslating || segments.length === 0}
              className="w-full px-4 py-2 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{translationProgress || 'Translating...'}</span>
                </>
              ) : currentTranslationSegments ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-translate to {targetLang}</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5" />
                  <span>Translate to {targetLang}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Translation metadata badge strip if translated */}
        {currentTranslationSegments && currentMetadata && (
          <div className="pt-2 border-t border-[#EAEAEA] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#666666]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-[#111111]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#38A169]" />
                <span>{targetLang} Translation Ready</span>
              </span>
              <span>•</span>
              <span>{currentTranslationSegments.length} Segments</span>
              <span>•</span>
              <span>Updated: {new Date(currentMetadata.updatedAt).toLocaleTimeString()}</span>
              {currentMetadata.isEdited && (
                <span className="px-1.5 py-0.5 bg-[#FFF3C4] text-[#744210] rounded text-[10px] font-semibold">
                  Custom Edited
                </span>
              )}
            </div>

            {/* Set as Active Captions toggle */}
            {setActiveCaptionLanguage && (
              <button
                onClick={() => {
                  if (isCaptionsActive) {
                    setActiveCaptionLanguage('source');
                  } else {
                    setActiveCaptionLanguage(targetLang);
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isCaptionsActive
                    ? 'bg-[#EBF8FF] text-[#2B6CB0] border-[#BEE3F8]'
                    : 'bg-white text-[#555555] border-[#E2E8F0] hover:border-[#111111]'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>{isCaptionsActive ? 'Displayed on Video (Active)' : 'Show as Video Subtitles'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Outdated Translation Banner */}
      {isTranslationOutdated && (
        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#92400E]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Original transcript has been modified</p>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                The current {targetLang} translation was generated from an earlier version of the transcript. Update the translation to align with the latest transcript changes.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleExecuteTranslation()}
            disabled={isTranslating}
            className="px-3.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
            <span>Update Translation</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {translationError && (
        <div className="p-3.5 bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] rounded-xl text-xs flex items-center justify-between gap-2">
          <div>
            <span className="font-bold">Translation Error:</span> {translationError}
          </div>
          <button
            onClick={() => setTranslationError(null)}
            className="text-[#C53030] hover:text-black p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Display */}
      {currentTranslationSegments && currentTranslationSegments.length > 0 ? (
        <div className="space-y-4">
          {/* Workspace Toolbar: Search, Speaker filter, View Mode, Exports */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white border border-[#E5E5E5] rounded-xl">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={`Search ${targetLang} or original...`}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111]"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#111111]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Speaker Filter */}
              <select
                value={speakerFilter}
                onChange={(e) => setSpeakerFilter(e.target.value)}
                className="w-full sm:w-36 px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                <option value="all">All Speakers</option>
                {speakers.map((spk) => (
                  <option key={spk.id} value={spk.id}>
                    {spk.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle & Exports */}
            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              {/* View Mode Switcher */}
              <div className="flex items-center border border-[#E5E5E5] rounded-lg p-0.5 bg-[#FAFAFA]">
                <button
                  onClick={() => setViewMode('sideBySide')}
                  title="Side-by-Side View"
                  className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                    viewMode === 'sideBySide'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  <Columns className="w-3 h-3" />
                  <span className="hidden sm:inline">Side-by-Side</span>
                </button>
                <button
                  onClick={() => setViewMode('stacked')}
                  title="Stacked View"
                  className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                    viewMode === 'stacked'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  <Rows className="w-3 h-3" />
                  <span className="hidden sm:inline">Stacked</span>
                </button>
                <button
                  onClick={() => setViewMode('translationOnly')}
                  title="Translation Only View"
                  className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                    viewMode === 'translationOnly'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span className="hidden sm:inline">{targetLang} Only</span>
                </button>
              </div>

              {/* Action Buttons: Copy, SRT, VTT, CSV, JSON */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyTranslation}
                  className="px-2.5 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Copy Full Translation"
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-[#38A169]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                </button>

                <div className="relative group">
                  <button className="px-2.5 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111111] flex items-center gap-1 cursor-pointer transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E5E5E5] rounded-lg shadow-lg py-1 z-30 w-36 text-xs text-[#111111]">
                    <button
                      onClick={handleExportSRT}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer font-medium"
                    >
                      Subtitles (.srt)
                    </button>
                    <button
                      onClick={handleExportVTT}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer font-medium"
                    >
                      WebVTT (.vtt)
                    </button>
                    <button
                      onClick={handleExportTXT}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer font-medium"
                    >
                      Plain Text (.txt)
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer font-medium"
                    >
                      Table Sheet (.csv)
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer font-medium"
                    >
                      Structured (.json)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Segment Rows Container */}
          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden divide-y divide-[#F0F0F0] max-h-[580px] overflow-y-auto bg-white">
            {displayedRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888888]">
                No matching segments found for filter "{filterQuery}".
              </div>
            ) : (
              displayedRows.map(({ translated, original, index }) => {
                const isActive = activeSegmentIndex === index;
                const spkName = speakerMap.get(translated.speakerId) || translated.speakerId || 'Speaker';
                const isEditing = editingSegId === translated.id;

                return (
                  <div
                    key={translated.id}
                    ref={isActive ? activeRowRef : null}
                    className={`p-3.5 transition-colors ${
                      isActive
                        ? 'bg-[#F0FDF4] border-l-4 border-l-[#22C55E]'
                        : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    {/* Row Header: Timestamp + Speaker + Seek button */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSeek(translated.startTime)}
                          className="px-2 py-0.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E5E5E5] rounded text-[11px] font-mono-time font-bold text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Seek and Play"
                        >
                          <Play className="w-2.5 h-2.5 fill-current text-[#111111]" />
                          <span>{formatDuration(translated.startTime)}</span>
                          <span className="text-[#888888] font-normal">→ {formatDuration(translated.endTime)}</span>
                        </button>
                        <span className="font-bold text-[#111111] text-[11px] px-1.5 py-0.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded">
                          {spkName}
                        </span>
                      </div>

                      {/* Edit Segment Action */}
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(translated)}
                          className="p-1 text-[#888888] hover:text-[#111111] rounded hover:bg-[#EAEAEA] transition-colors cursor-pointer"
                          title={`Edit ${targetLang} text`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* View Modes */}
                    {viewMode === 'sideBySide' ? (
                      /* SIDE BY SIDE VIEW */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Original Segment */}
                        <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                            Original
                          </div>
                          <p className="text-xs text-[#374151] leading-relaxed select-text">
                            {original.text}
                          </p>
                        </div>

                        {/* Translated Segment */}
                        <div className="p-2.5 bg-white border border-[#E5E5E5] rounded-lg">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#111111] mb-1 flex items-center justify-between">
                            <span>{targetLang}</span>
                            {isTargetRTL && <span className="text-[9px] text-[#888888]">RTL</span>}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingSegText}
                                onChange={(e) => setEditingSegText(e.target.value)}
                                dir={isTargetRTL ? 'rtl' : 'ltr'}
                                className={`w-full p-2 bg-[#FAFAFA] border border-[#111111] rounded text-xs text-[#111111] focus:outline-none resize-y min-h-[60px] ${
                                  isTargetRTL ? 'text-right' : 'text-left'
                                }`}
                              />
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2.5 py-1 bg-white hover:bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#666666] font-medium cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(translated.id)}
                                  className="px-2.5 py-1 bg-[#111111] hover:bg-black text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              dir={isTargetRTL ? 'rtl' : 'ltr'}
                              className={`text-xs text-[#111111] font-medium leading-relaxed select-text ${
                                isTargetRTL ? 'text-right' : 'text-left'
                              }`}
                            >
                              {translated.text}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : viewMode === 'stacked' ? (
                      /* STACKED VIEW */
                      <div className="space-y-2 pt-1">
                        {/* Original Text */}
                        <div className="text-xs text-[#666666] italic leading-relaxed border-l-2 border-[#D4D4D8] pl-2.5">
                          {original.text}
                        </div>

                        {/* Translated Text */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingSegText}
                              onChange={(e) => setEditingSegText(e.target.value)}
                              dir={isTargetRTL ? 'rtl' : 'ltr'}
                              className={`w-full p-2 bg-[#FAFAFA] border border-[#111111] rounded text-xs text-[#111111] focus:outline-none resize-y min-h-[60px] ${
                                isTargetRTL ? 'text-right' : 'text-left'
                              }`}
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1 bg-white hover:bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#666666] font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(translated.id)}
                                className="px-2.5 py-1 bg-[#111111] hover:bg-black text-white rounded text-xs font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            dir={isTargetRTL ? 'rtl' : 'ltr'}
                            className={`text-xs text-[#111111] font-medium leading-relaxed ${
                              isTargetRTL ? 'text-right' : 'text-left'
                            }`}
                          >
                            {translated.text}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* TRANSLATION ONLY VIEW */
                      <div className="pt-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingSegText}
                              onChange={(e) => setEditingSegText(e.target.value)}
                              dir={isTargetRTL ? 'rtl' : 'ltr'}
                              className={`w-full p-2 bg-[#FAFAFA] border border-[#111111] rounded text-xs text-[#111111] focus:outline-none resize-y min-h-[60px] ${
                                isTargetRTL ? 'text-right' : 'text-left'
                              }`}
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1 bg-white hover:bg-[#FAFAFA] border border-[#E5E5E5] rounded text-xs text-[#666666] font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(translated.id)}
                                className="px-2.5 py-1 bg-[#111111] hover:bg-black text-white rounded text-xs font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            dir={isTargetRTL ? 'rtl' : 'ltr'}
                            className={`text-xs text-[#111111] leading-relaxed ${
                              isTargetRTL ? 'text-right font-medium' : 'text-left font-medium'
                            }`}
                          >
                            {translated.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Empty / Not Yet Translated State */
        <div className="p-8 text-center border border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA] space-y-3">
          <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center mx-auto text-[#111111]">
            <Globe className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              No {targetLang} Translation Generated Yet
            </h4>
            <p className="text-xs text-[#666666]">
              Click the button below to translate the entire {segments.length} segment transcript to {targetLang} with accurate timing alignment and speaker retention.
            </p>
          </div>
          <button
            onClick={() => handleExecuteTranslation()}
            disabled={isTranslating || segments.length === 0}
            className="px-5 py-2 bg-[#111111] hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isTranslating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{translationProgress || 'Translating...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate {targetLang} Translation</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
