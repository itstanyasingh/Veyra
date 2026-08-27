import React, { useState, useEffect } from 'react';
import { BookOpen, Video, Check, ArrowRight, Play, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { getStoredProjects } from '../../services/projectStorage';
import { Project } from '../../types';

interface StudyPageProps {
  onNavigate: (path: string) => void;
}

interface DynamicQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const StudyPage: React.FC<StudyPageProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoadingAiQuiz, setIsLoadingAiQuiz] = useState<boolean>(false);
  const [aiCustomQuestions, setAiCustomQuestions] = useState<Record<string, DynamicQuizQuestion[]>>({});

  useEffect(() => {
    const projs = getStoredProjects();
    setProjects(projs);
    if (projs.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projs[0].id);
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // Generate dynamic flashcards & quiz questions derived from the actual selected video summary & transcript
  const studyData = React.useMemo(() => {
    if (!selectedProject) return null;

    const segments = selectedProject.transcript || [];
    const summary = selectedProject.summary;

    // Real key points from summary or transcript segments
    const keyPoints: string[] = summary?.keyPoints && summary.keyPoints.length > 0
      ? summary.keyPoints
      : segments.length > 0
      ? segments.slice(0, 5).map((s) => s.text)
      : [];

    // Check if custom AI questions were generated for this project
    if (aiCustomQuestions[selectedProject.id] && aiCustomQuestions[selectedProject.id].length > 0) {
      return {
        keyPoints,
        quizQuestions: aiCustomQuestions[selectedProject.id],
      };
    }

    // Dynamic quiz questions generated directly from this project's real content
    const quizQuestions: DynamicQuizQuestion[] = [];

    if (segments.length > 0) {
      const seg1 = segments[0];
      const seg2 = segments[Math.min(1, segments.length - 1)];

      quizQuestions.push({
        question: `According to the opening segment of "${selectedProject.name}", what topic is introduced?`,
        options: [
          seg1.text,
          'Unrelated external discussion',
          'Static background noise with no speech',
          'Video compression format settings',
        ],
        correct: 0,
        explanation: `At timecode 0:00, the transcript begins with: "${seg1.text}".`,
      });

      if (segments.length > 2) {
        const segMid = segments[Math.floor(segments.length / 2)];
        quizQuestions.push({
          question: `In the middle portion of "${selectedProject.name}", what key dialogue is recorded?`,
          options: [
            'No dialogue occurred during this segment',
            segMid.text,
            'Microphone calibration testing sequence',
            'Automated system announcement',
          ],
          correct: 1,
          explanation: `Around the midpoint of the recording, the speaker states: "${segMid.text}".`,
        });
      }

      if (summary?.chapters && summary.chapters.length > 0) {
        const ch1 = summary.chapters[0];
        quizQuestions.push({
          question: `What is the focus of the chapter "${ch1.title}" in this recording?`,
          options: [
            ch1.summary || 'Initial overview of the session',
            'Hardware requirements for video playback',
            'Exporting subtitle files to cloud storage',
            'Third party licensing terms',
          ],
          correct: 0,
          explanation: ch1.summary || `The chapter "${ch1.title}" covers the initial portion of the recording.`,
        });
      }
    }

    return {
      keyPoints,
      quizQuestions,
    };
  }, [selectedProject, aiCustomQuestions]);

  const handleGenerateAiQuiz = async () => {
    if (!selectedProject || !selectedProject.transcript || selectedProject.transcript.length === 0) return;
    setIsLoadingAiQuiz(true);

    const fullTranscript = selectedProject.transcript.map((s) => s.text).join(' ');

    try {
      const res = await fetch('/api/ai/study-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: fullTranscript,
          projectName: selectedProject.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quiz && Array.isArray(data.quiz)) {
          const formatted = data.quiz.map((q: any) => ({
            question: q.question,
            options: q.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || 'Verified from video transcript.',
          }));
          setAiCustomQuestions((prev) => ({
            ...prev,
            [selectedProject.id]: formatted,
          }));
          setActiveQuizIndex(0);
          setSelectedQuizOption(null);
          setShowExplanation(false);
        }
      }
    } catch (err) {
      console.error('Error generating AI study quiz:', err);
    } finally {
      setIsLoadingAiQuiz(false);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4 select-none">
        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
          <BookOpen className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-[#111827]">No Videos in Workspace Yet</h2>
        <p className="text-xs text-[#64748B]">
          Upload a video or audio file to transcribe dialogue and automatically generate study guides, flashcards, and retention quizzes.
        </p>
        <button
          onClick={() => onNavigate('/')}
          className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors cursor-pointer"
        >
          Upload video
        </button>
      </div>
    );
  }

  const hasContent = studyData && (studyData.keyPoints.length > 0 || studyData.quizQuestions.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 select-none space-y-8 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Study &amp; Retention
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Interactive study guides, flashcards, and quizzes synthesized directly from your video transcripts.
          </p>
        </div>

        {/* Video Switcher */}
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#64748B]">Video:</span>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setActiveQuizIndex(0);
                  setSelectedQuizOption(null);
                  setShowExplanation(false);
                }}
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#111827] focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProject && selectedProject.transcript && selectedProject.transcript.length > 0 && (
            <button
              onClick={handleGenerateAiQuiz}
              disabled={isLoadingAiQuiz}
              className="px-3 py-1.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#DBEAFE] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoadingAiQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoadingAiQuiz ? 'Generating...' : 'Refresh AI Quiz'}</span>
            </button>
          )}
        </div>
      </div>

      {!hasContent ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center space-y-4">
          <BookOpen className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <h3 className="text-sm font-bold text-[#111827]">
            No Transcript Available for "{selectedProject?.name}"
          </h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Open the workspace for this project to view or generate its transcription before creating study guides.
          </p>
          <button
            onClick={() => onNavigate(`/project/${selectedProject?.id}`)}
            className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors cursor-pointer"
          >
            Open Project Workspace
          </button>
        </div>
      ) : (
        selectedProject && studyData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Core Key Concepts Flashcards (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-1.5 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Key Concepts &amp; Takeaways</span>
                </h2>
                <button
                  onClick={() => onNavigate(`/project/${selectedProject.id}`)}
                  className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {studyData.keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs space-y-2 hover:border-[#2563EB] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono font-bold text-[#2563EB] uppercase">
                        POINT #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] font-mono text-[#64748B]">
                        {selectedProject.name}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#111827] font-medium leading-relaxed">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Interactive Knowledge Quiz (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Knowledge Check</span>
                </h2>
                {studyData.quizQuestions.length > 0 && (
                  <span className="text-xs font-mono text-[#64748B]">
                    Question {activeQuizIndex + 1} of {studyData.quizQuestions.length}
                  </span>
                )}
              </div>

              {/* Active Quiz Card */}
              {studyData.quizQuestions.length > 0 && studyData.quizQuestions[activeQuizIndex] && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
                  <h3 className="text-sm sm:text-base font-bold text-[#111827] leading-snug">
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
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] font-semibold'
                                : isSelected
                                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                              : isSelected
                              ? 'bg-[#2563EB] text-white border-[#2563EB]'
                              : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-[#111827]'
                          }`}
                        >
                          <span className="leading-relaxed">{opt}</span>
                          {showResult && isCorrect && (
                            <Check className="w-4 h-4 text-[#065F46] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Box */}
                  {showExplanation && (
                    <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-1">
                      <span className="font-bold text-[#111827]">Explanation:</span>
                      <p className="text-[#64748B] leading-relaxed">
                        {studyData.quizQuestions[activeQuizIndex].explanation}
                      </p>
                    </div>
                  )}

                  {/* Quiz Navigation */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => {
                        setSelectedQuizOption(null);
                        setShowExplanation(false);
                      }}
                      className="text-xs text-[#64748B] hover:text-[#111827] flex items-center gap-1 cursor-pointer"
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
                      className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};
