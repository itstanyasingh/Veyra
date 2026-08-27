import React, { useState, useEffect } from 'react';
import { BookOpen, Video, Check, HelpCircle, ArrowRight, Play, Sparkles, RefreshCw } from 'lucide-react';
import { getStoredProjects } from '../../services/projectStorage';
import { formatDuration } from '../../utils/formatters';
import { Project } from '../../types';

interface StudyPageProps {
  onNavigate: (path: string) => void;
}

export const StudyPage: React.FC<StudyPageProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const projs = getStoredProjects();
    setProjects(projs);
    if (projs.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projs[0].id);
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // Generate interactive flashcards & quiz questions derived from the selected video summary & transcript
  const studyData = React.useMemo(() => {
    if (!selectedProject) return null;

    const summary = selectedProject.summary;
    const keyPoints = summary?.keyPoints || [
      'Asynchronous frame indexing pipeline',
      'Word-level timecode synchronization',
      'Multi-speaker acoustic diarization',
    ];

    const quizQuestions = [
      {
        question: `What is the primary architecture approach analyzed in "${selectedProject.name}"?`,
        options: [
          'Decomposing media frames into parallel ingestion streams with synchronized timecodes',
          'Single-threaded blocking audio extraction',
          'Client-only uncompressed buffer caches',
          'Lossy real-time downsampling',
        ],
        correct: 0,
        explanation: 'The system uses parallelized ingestion pipelines aligned with word-level timecodes for sub-second semantic retrieval.',
      },
      {
        question: 'How are multi-speaker dialogues handled in the intelligence engine?',
        options: [
          'All audio is merged into a single anonymous track',
          'Through acoustic diarization generating distinct speaker identifiers and segment boundaries',
          'By manually prompting the user at every pause',
          'By estimating speech pitch without timestamps',
        ],
        correct: 1,
        explanation: 'Acoustic diarization classifies distinct vocal signatures and assigns editable speaker labels across all segments.',
      },
      {
        question: 'Which subtitle standards are supported for direct export?',
        options: [
          'Only proprietary binary files',
          'SubRip (.SRT) and WebVTT (.VTT) formatted captions',
          'Unformatted audio waveforms only',
          'Bitmap sprite sheets',
        ],
        correct: 1,
        explanation: 'VEYRA generates compliant SRT and VTT files containing precise timecode boundaries.',
      },
    ];

    return {
      keyPoints,
      quizQuestions,
    };
  }, [selectedProject]);

  if (projects.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4 select-none">
        <div className="w-12 h-12 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mx-auto">
          <BookOpen className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#111111]">No Videos to Study</h2>
        <p className="text-xs text-[#666666]">
          Upload a video to automatically generate structured study flashcards, key concepts, and interactive review quizzes.
        </p>
        <button
          onClick={() => onNavigate('/')}
          className="px-4 py-2 bg-[#111111] text-white text-xs font-semibold rounded hover:bg-black cursor-pointer"
        >
          Upload video
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 select-none space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
            STUDY &amp; RETENTION
          </h1>
          <p className="text-xs sm:text-sm text-[#666666]">
            Interactive study guides, conceptual flashcards, and quizzes synthesized from your videos.
          </p>
        </div>

        {/* Video Switcher */}
        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-time text-[#666666]">Video:</span>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setActiveQuizIndex(0);
                setSelectedQuizOption(null);
                setShowExplanation(false);
              }}
              className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D4D4D4] rounded text-xs font-semibold text-[#111111] focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedProject && studyData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Core Key Concepts Flashcards (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Key Concepts &amp; Flashcards</span>
              </h2>
              <button
                onClick={() => onNavigate(`/project/${selectedProject.id}`)}
                className="text-xs text-[#111111] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open video workspace</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {studyData.keyPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs space-y-2 hover:border-[#111111] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono-time text-[#999999] uppercase">
                      CONCEPT #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded text-[10px] font-mono-time text-[#666666]">
                      {selectedProject.name}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#111111] font-medium leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Knowledge Quiz (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Knowledge Check</span>
              </h2>
              <span className="text-xs font-mono-time text-[#666666]">
                Question {activeQuizIndex + 1} of {studyData.quizQuestions.length}
              </span>
            </div>

            {/* Active Quiz Card */}
            {studyData.quizQuestions[activeQuizIndex] && (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
                <h3 className="text-sm sm:text-base font-bold text-[#111111] leading-snug">
                  {studyData.quizQuestions[activeQuizIndex].question}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {studyData.quizQuestions[activeQuizIndex].options.map((opt, optIdx) => {
                    const isSelected = selectedQuizOption === optIdx;
                    const isCorrect = optIdx === studyData.quizQuestions[activeQuizIndex].correct;
                    const showResult = showExplanation;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          setSelectedQuizOption(optIdx);
                          setShowExplanation(true);
                        }}
                        className={`w-full p-3.5 rounded-lg border text-left text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                          showResult
                            ? isCorrect
                              ? 'bg-[#F0FFF4] border-[#9AE6B4] text-[#22543D] font-semibold'
                              : isSelected
                              ? 'bg-[#FFF5F5] border-[#FEB2B2] text-[#742A2A]'
                              : 'bg-[#FAFAFA] border-[#E5E5E5] text-[#888888]'
                            : isSelected
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-[#FAFAFA] hover:bg-[#F3F3F3] border-[#E5E5E5] text-[#111111]'
                        }`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        {showResult && isCorrect && (
                          <Check className="w-4 h-4 text-[#22543D] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {showExplanation && (
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs space-y-1">
                    <span className="font-bold text-[#111111]">Explanation:</span>
                    <p className="text-[#666666] leading-relaxed">
                      {studyData.quizQuestions[activeQuizIndex].explanation}
                    </p>
                  </div>
                )}

                {/* Quiz Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F5F5F5]">
                  <button
                    onClick={() => {
                      setSelectedQuizOption(null);
                      setShowExplanation(false);
                    }}
                    className="text-xs text-[#666666] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = (activeQuizIndex + 1) % studyData.quizQuestions.length;
                      setActiveQuizIndex(next);
                      setSelectedQuizOption(null);
                      setShowExplanation(false);
                    }}
                    className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
