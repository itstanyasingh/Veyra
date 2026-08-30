import React, { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { HomeImportArea } from '../home/HomeImportArea';
import { 
  FileText, 
  Subtitles, 
  Sparkles, 
  ArrowRight, 
  Users, 
  ShieldCheck, 
  Search, 
  Star, 
  CheckCircle2, 
  Mic, 
  Zap, 
  Globe, 
  SlidersHorizontal, 
  Download, 
  Smartphone, 
  Play, 
  Volume2, 
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Video,
  FileAudio,
  Calendar,
  MessageSquare,
  Clock,
  Radio,
  BookOpen,
  GraduationCap,
  Youtube,
  Tv,
  FileCheck,
  ArrowUpRight
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  // Accordion state (only one item open at a time, 0 open by default)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [useCaseIndex, setUseCaseIndex] = useState(0);

  const scrollToImport = () => {
    const dropzone = document.getElementById('import-section');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'Free usage?',
      a: 'You can start with free minutes to test transcription. No commitment required — upgrade only when you need more volume, team collaboration, or priority processing.'
    },
    {
      q: 'How do I transcribe a video to text?',
      a: '1. Upload your video or audio file (MP4, MOV, AVI, MKV, MP3, WAV) or paste a direct media link. 2. Choose automatic AI transcription or human review. 3. Review, edit, and export your transcript in TXT, DOCX, PDF, or subtitles (SRT, VTT).'
    },
    {
      q: 'What are the main ways to convert video to text?',
      a: 'You can use automatic AI speech recognition for near-instant turnaround with 99%+ accuracy, or professional human-verified review for complex audio with heavy accents or overlapping speakers.'
    },
    {
      q: 'Can I convert YouTube videos to text?',
      a: 'Yes, you can import public media links or upload downloaded video files to automatically extract timestamps, speaker labels, and generate closed captions.'
    },
    {
      q: 'Can I edit my video transcription?',
      a: 'Yes! Our built-in synchronized web editor lets you click any word to seek the video player, fix text, adjust timestamps, and label speaker names with real-time preview.'
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. Veyra stores media privately in your local browser sandbox (IndexedDB) with end-to-end TLS encryption in transit. We never sell your data or train public AI models on your private files.'
    }
  ];

  const popularFormats = [
    'Transcribe YouTube video',
    'Convert AVI to text',
    'Convert MP4 to text',
    'Transcribe French audio',
    'Transcribe English audio',
    'Transcribe Spanish audio',
    'Convert MOV to text',
    'Convert WEBM to text',
    'Convert MPEG to text'
  ];

  const relatedTools = [
    'AI Transcription',
    'Translate audio',
    'Translate video',
    'Transcribe audio to text',
    'Audio summarizer',
    'Video summarizer',
    'AI meeting notetaker',
    'Subtitle generator',
    'Voice to text',
    'Caption generator',
    'SRT generator',
    'VTT generator'
  ];

  const useCases = [
    {
      icon: <Radio className="w-5 h-5 text-[#2563EB]" />,
      title: 'Interviews',
      description: 'Turn recorded video interviews into clean, searchable transcripts for journalism, research, or content production.'
    },
    {
      icon: <Users className="w-5 h-5 text-[#2563EB]" />,
      title: 'Meetings',
      description: 'Convert Zoom, Teams, and Meet recordings into structured notes and action items.'
    },
    {
      icon: <GraduationCap className="w-5 h-5 text-[#2563EB]" />,
      title: 'Lectures',
      description: 'Transcribe lectures, lessons, and webinars into text for study, review, and searchable archives.'
    },
    {
      icon: <Youtube className="w-5 h-5 text-[#2563EB]" />,
      title: 'YouTube & Creator Content',
      description: 'Extract text from YouTube videos to create captions, subtitles, scripts, and repurposed blogs.'
    },
    {
      icon: <FileAudio className="w-5 h-5 text-[#2563EB]" />,
      title: 'Podcasts',
      description: 'Generate transcriptions for podcast episodes to boost SEO rankings and expand listener reach.'
    }
  ];

  return (
    <main className="flex-1 bg-white flex flex-col justify-start select-none">
      
      {/* =========================================================================
          1. HERO SECTION
          ========================================================================= */}
      <section className="pt-12 sm:pt-14 pb-14 sm:pb-18 border-b border-[#E2E8F0] relative bg-white overflow-hidden">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center space-y-4 text-center">
            
            {/* Breadcrumb */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-xs font-medium text-[#64748B]">
              <span className="text-[#111827] font-semibold">Home</span>
              <span className="text-[#CBD5E1]">›</span>
              <span>Video to text</span>
            </div>

            {/* Headline with Lottie Animations on both left and right */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-3 sm:gap-6 max-w-[1080px] mx-auto w-full">
              {/* Left Lottie Animation (150 × 150 px) */}
              <div className="w-[120px] sm:w-[135px] lg:w-[150px] h-[120px] sm:h-[135px] lg:h-[150px] aspect-square flex items-center justify-center shrink-0 pointer-events-none select-none order-2 lg:order-1">
                <DotLottieReact
                  src="https://lottie.host/00b4d81c-42d4-436a-b846-7eb14984098d/9Q9cKOML8V.lottie"
                  loop
                  autoplay
                />
              </div>

              {/* Main Dominant Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-extrabold tracking-tight text-[#111827] leading-[1.1] text-center max-w-xl order-1 lg:order-2">
                Transcribe Video to Text Online
              </h1>

              {/* Right Lottie Animation (120 × 120 px) */}
              <div className="w-[100px] sm:w-[110px] lg:w-[120px] h-[100px] sm:h-[110px] lg:h-[120px] aspect-square flex items-center justify-center shrink-0 pointer-events-none select-none order-3">
                <DotLottieReact
                  src="https://lottie.host/23ca08e8-a4d2-480b-8503-aa0c22ce1c66/kVWuuZZkLS.lottie"
                  loop
                  autoplay
                />
              </div>
            </div>

            {/* Supporting Paragraph */}
            <p className="text-base sm:text-lg text-[#64748B] max-w-[650px] mx-auto font-normal leading-relaxed text-center">
              Use our online video to text converter to generate accurate video transcripts in minutes.
            </p>

            {/* Contextual Link */}
            <div className="text-center">
              <button
                onClick={() => onNavigate('/projects')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer text-center"
              >
                <span>Are you looking to transcribe video in a shared workspace?</span>
                <span className="font-semibold text-[#2563EB] flex items-center gap-0.5 whitespace-nowrap">
                  Try Veyra for Work ›
                </span>
              </button>
            </div>

            {/* Upload / Transcription Widget */}
            <div className="w-full pt-2">
              <HomeImportArea onNavigate={onNavigate} />
            </div>

            {/* Verified Capabilities Row */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
              <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Multi-Speaker Diarization</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Word-Level Timestamps</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Private Local Storage</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>150+ Languages &amp; SRT / VTT Export</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          2. HOW IT WORKS (3 Columns, clean & compact)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              How to convert video to text with Veyra?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 text-center sm:text-left">
            {/* Step 1 */}
            <div className="space-y-2.5">
              <div className="text-sm font-bold text-[#2563EB] font-mono">
                Step 1
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                Upload your video file
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Import from your computer, YouTube, Zoom, Google Drive or Dropbox. We support MP4, MOV, AVI, MKV, and more.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2.5">
              <div className="text-sm font-bold text-[#2563EB] font-mono">
                Step 2
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                Transcribe with AI or human review
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Use our AI video transcriber for fast results, or select human-verified transcripts for extra accuracy.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2.5">
              <div className="text-sm font-bold text-[#2563EB] font-mono">
                Step 3
              </div>
              <h3 className="text-base font-bold text-[#111827]">
                Edit and export transcript
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Review the transcript in our editor, fix anything in seconds, then export to TXT, DOCX, PDF, or subtitles (SRT, VTT).
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3. WHY USE THE PRODUCT (3-column x 2-row feature grid + CTAs)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Why use Veyra to transcribe video to text?
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              Veyra is an AI-powered video transcript generator and video transcriber that lets you convert video to text, create subtitles, and get ready-to-use transcripts in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-center sm:text-left">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                High Accuracy
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Produces clear, reliable transcripts from any video — even with fast speakers, background noise, or strong accents.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                Fast AI Transcription
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Converts video into text in minutes using state of the art speech-to-text technology.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                Human Review
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Offers human-verified transcripts for interviews, research, legal recordings, and other accuracy-critical content.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                150+ Languages
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Supports video transcription for more than 150 languages and accents, suitable for global and multilingual videos.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                Built-in Editor
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Provides an online editor to refine video transcripts, correct text, adjust timestamps, and label speakers.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827]">
                Multiple Export Formats
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Exports your video transcripts in TXT, DOCX, PDF, or subtitle formats such as SRT and VTT.
              </p>
            </div>
          </div>

          {/* Centered Action Buttons */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={scrollToImport}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <span>Get Started Free</span>
            </button>
            <button
              onClick={() => onNavigate('/projects')}
              className="px-6 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#111827] font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              <span>Talk to Sales</span>
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          4. ALTERNATING PRODUCT FEATURE SECTIONS (50/50 split, ~1200px max width)
          ========================================================================= */}

      {/* SECTION 1: Left Text, Right Visual */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Text */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="inline-block px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded font-mono">
                IMPORT IN ANY FORMAT
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#111827] leading-tight">
                Video to text converter for all your platforms &amp; formats
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Whether you need a <span className="text-[#2563EB] font-semibold">Zoom meeting transcript</span>, a <span className="text-[#2563EB] font-semibold">YouTube transcript</span>, or a lecture recording in text, Veyra turns any video into an editable transcript.
              </p>

              <div className="space-y-1.5 pt-1 text-xs text-[#64748B]">
                <p>
                  <strong className="text-[#111827]">Platforms:</strong> YouTube, Zoom, Google Meet, Microsoft Teams, Loom, Google Drive, Dropbox, local files
                </p>
                <p>
                  <strong className="text-[#111827]">Formats:</strong> MP4, MOV, AVI, M4V, WebM and more.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={scrollToImport}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Get Started Free</span>
                </button>
              </div>
            </div>

            {/* Right Column: Realistic Veyra Product Visualization Card */}
            <div className="lg:col-span-6">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs text-left space-y-3.5 select-none">
                
                {/* Product Header Bar */}
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80"></span>
                    </div>
                    <div className="h-3.5 w-px bg-[#CBD5E1]"></div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Video className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                      <span className="text-xs font-bold text-[#111827] truncate font-mono">interview_economic_outlook.mp4</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[10px] font-mono text-[#0F172A]">
                      <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span>
                      <span>SYNCED</span>
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded">
                      AI Diarization
                    </span>
                  </div>
                </div>

                {/* Modern Video Player Viewport */}
                <div className="relative aspect-[16/9] bg-[#0F172A] rounded-xl overflow-hidden shadow-inner border border-[#334155]/60 flex flex-col justify-between p-3.5">
                  
                  {/* Clean SVG Studio Environment & Speaker Illustration */}
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 480 270">
                    <defs>
                      <linearGradient id="studioBg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E293B" />
                        <stop offset="100%" stopColor="#0F172A" />
                      </linearGradient>
                      <linearGradient id="warmLight" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#1E293B" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="acousticPattern" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#1E293B" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    
                    {/* Studio Backdrop */}
                    <rect width="480" height="270" fill="url(#studioBg)" />
                    <rect width="480" height="270" fill="url(#warmLight)" />
                    
                    {/* Acoustic Sound Treatment Panels (Background) */}
                    <g opacity="0.4">
                      <rect x="24" y="24" width="70" height="120" rx="4" fill="url(#acousticPattern)" stroke="#475569" strokeWidth="1" />
                      <line x1="24" y1="54" x2="94" y2="54" stroke="#475569" strokeWidth="1" />
                      <line x1="24" y1="84" x2="94" y2="84" stroke="#475569" strokeWidth="1" />
                      <line x1="24" y1="114" x2="94" y2="114" stroke="#475569" strokeWidth="1" />

                      <rect x="386" y="24" width="70" height="120" rx="4" fill="url(#acousticPattern)" stroke="#475569" strokeWidth="1" />
                      <line x1="386" y1="54" x2="456" y2="54" stroke="#475569" strokeWidth="1" />
                      <line x1="386" y1="84" x2="456" y2="84" stroke="#475569" strokeWidth="1" />
                      <line x1="386" y1="114" x2="456" y2="114" stroke="#475569" strokeWidth="1" />
                    </g>
                    
                    {/* Studio Key Light Glow */}
                    <circle cx="240" cy="115" r="95" fill="#2563EB" opacity="0.12" filter="blur(20px)" />
                    
                    {/* Professional Speaker (Vector Silhouette / Studio Presentation) */}
                    <g transform="translate(170, 48)">
                      {/* Studio Light Beam Halo */}
                      <ellipse cx="70" cy="70" rx="65" ry="68" fill="#1E293B" opacity="0.6" />
                      {/* Head & Hair */}
                      <ellipse cx="70" cy="55" rx="26" ry="32" fill="#E2E8F0" />
                      <path d="M48 50 C48 30, 92 30, 92 50 C92 40, 85 32, 70 32 C55 32, 48 40, 48 50 Z" fill="#334155" />
                      {/* Neck */}
                      <rect x="63" y="82" width="14" height="18" fill="#CBD5E1" rx="2" />
                      {/* Professional Suit / Blazer Collar */}
                      <path d="M15 155 L40 96 L62 100 L70 120 L78 100 L100 96 L125 155 Z" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
                      {/* Inner Shirt */}
                      <polygon points="62,100 70,128 78,100" fill="#FFFFFF" />
                      {/* Studio Lapel Mic */}
                      <circle cx="67" cy="112" r="2.5" fill="#0F172A" stroke="#94A3B8" strokeWidth="0.8" />
                      <line x1="67" y1="114.5" x2="65" y2="128" stroke="#64748B" strokeWidth="0.8" />
                    </g>

                    {/* Broadcast Studio Microphone on Stand (Right of Speaker) */}
                    <g transform="translate(295, 110)">
                      <rect x="8" y="0" width="14" height="26" rx="7" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
                      <line x1="8" y1="13" x2="22" y2="13" stroke="#94A3B8" strokeWidth="1" />
                      <path d="M3 13 C3 23, 27 23, 27 13" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
                      <line x1="15" y1="23" x2="15" y2="46" stroke="#94A3B8" strokeWidth="2" />
                      <line x1="5" y1="46" x2="25" y2="46" stroke="#94A3B8" strokeWidth="2.5" />
                      {/* Subtle sound wave arcs */}
                      <path d="M-4 3 C-9 9, -9 17, -4 23" fill="none" stroke="#38BDF8" strokeWidth="1.2" opacity="0.75" />
                      <path d="M-8 -2 C-15 6, -15 20, -8 28" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.4" />
                    </g>
                  </svg>

                  {/* Top Overlay: Media Tally & Stream Badges */}
                  <div className="relative z-10 flex items-center justify-between text-white/90">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      <span className="font-semibold text-red-400">REC</span>
                      <span className="text-white/40">|</span>
                      <span>1080p 60fps</span>
                    </div>
                    <div className="px-2 py-0.5 bg-[#2563EB]/80 backdrop-blur-md text-white font-mono text-[10px] rounded border border-blue-400/30">
                      Speaker 2 · 00:00:14
                    </div>
                  </div>

                  {/* Center Playback Trigger */}
                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-black/40 border border-white/20 hover:scale-105 transition-transform cursor-pointer">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Active Subtitle Overlay */}
                  <div className="relative z-10 bg-black/85 text-white px-3 py-1.5 rounded-lg text-center text-[11px] font-medium max-w-sm mx-auto shadow-md border border-white/15 backdrop-blur-sm leading-snug">
                    <span className="text-[#38BDF8] font-bold mr-1.5">Speaker 2:</span>
                    "The main drivers are inflation trends and monetary supply adjustments..."
                  </div>

                  {/* Embedded Player Scrubber Control */}
                  <div className="relative z-10 mt-2 bg-black/50 backdrop-blur-md rounded-md p-1.5 border border-white/10 flex items-center justify-between text-[10px] text-white/80 font-mono">
                    <div className="flex items-center gap-2 w-full pr-2">
                      <span className="text-[#38BDF8] shrink-0 font-bold">00:00:14</span>
                      <div className="relative w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-[28%] bg-[#2563EB] rounded-full"></div>
                      </div>
                      <span className="text-white/50 shrink-0">00:12:45</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                      <Volume2 className="w-3 h-3 text-white/80" />
                      <span className="text-[9px] px-1 bg-white/15 rounded">1.0x</span>
                    </div>
                  </div>

                </div>

                {/* Speech-to-Text Pipeline Connector */}
                <div className="flex items-center justify-between px-2 py-1 bg-white border border-[#E2E8F0] rounded-lg text-[10px] text-[#64748B]">
                  <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Spoken Audio → Text Engine</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[#059669] font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                    <span>Real-Time Word Sync</span>
                  </div>
                </div>

                {/* Synchronized Transcript Text Panel */}
                <div className="space-y-2">
                  
                  {/* Segment 1: Completed / Prior */}
                  <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] transition-colors">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                        <span>Speaker 1 (Journalist)</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                        00:00:05
                      </span>
                    </div>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      "What do you believe are the primary factors influencing the current economic climate?"
                    </p>
                  </div>

                  {/* Segment 2: Active Playhead Synchronized */}
                  <div className="bg-[#EFF6FF]/60 p-3 rounded-xl border border-[#93C5FD] shadow-xs relative">
                    <div className="absolute top-2.5 right-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping"></span>
                      <span className="text-[9px] font-mono font-bold text-[#2563EB] uppercase">Playing</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#0F172A]"></span>
                      <span className="font-bold text-[#0F172A]">Speaker 2 (Chief Economist)</span>
                      <span className="font-mono text-[10px] text-[#2563EB] bg-white px-1.5 py-0.5 rounded border border-[#BFDBFE] font-semibold">
                        00:00:14
                      </span>
                    </div>
                    <p className="text-xs text-[#0F172A] font-medium leading-relaxed">
                      "The main drivers are <mark className="bg-[#DBEAFE] text-[#1E40AF] px-1 rounded font-semibold">inflation trends</mark> and monetary supply adjustments across global markets."
                    </p>
                  </div>

                </div>

                {/* Export Formats Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider font-mono">Export:</span>
                    <span className="px-2 py-0.5 bg-white border border-[#CBD5E1] text-[10px] font-mono font-semibold rounded text-[#1E293B] shadow-2xs">.TXT</span>
                    <span className="px-2 py-0.5 bg-white border border-[#CBD5E1] text-[10px] font-mono font-semibold rounded text-[#1E293B] shadow-2xs">.DOCX</span>
                    <span className="px-2 py-0.5 bg-white border border-[#CBD5E1] text-[10px] font-mono font-semibold rounded text-[#1E293B] shadow-2xs">.SRT</span>
                    <span className="px-2 py-0.5 bg-white border border-[#CBD5E1] text-[10px] font-mono font-semibold rounded text-[#1E293B] shadow-2xs">.VTT</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-[#2563EB]">
                    <Check className="w-3 h-3 text-[#2563EB]" />
                    <span>Timecoded Transcript</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: Left Visual, Right Text */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Visual Box - Real Veyra Video Transcription Workspace Mockup */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs text-left space-y-3 select-none">
                
                {/* 1. Top Header & Real Veyra Toolbar */}
                <div className="space-y-2 border-b border-[#E2E8F0] pb-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                        <Video className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-[#111827] truncate font-mono">product_keynote_2026.mp4</span>
                    </div>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full text-[10px] font-medium text-[#15803D] shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                      <span>Transcript ready</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 scrollbar-none">
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[10px] text-[#64748B] shrink-0">
                      <Search className="w-2.5 h-2.5" />
                      <span>Search...</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-[10px] font-semibold text-[#2563EB] shrink-0">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>AI Summary</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[10px] text-[#475569] shrink-0">
                      <Globe className="w-2.5 h-2.5" />
                      <span>Translate</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[10px] text-[#475569] shrink-0">
                      <Subtitles className="w-2.5 h-2.5" />
                      <span>Subtitles</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[10px] text-[#475569] shrink-0">
                      <Download className="w-2.5 h-2.5" />
                      <span>Export</span>
                    </div>
                  </div>
                </div>

                {/* 2. Modern Video Player Viewport (Interview/Presentation Setting) */}
                <div className="relative aspect-[16/8] bg-[#0F172A] rounded-xl overflow-hidden shadow-inner border border-[#334155]/60 flex flex-col justify-between p-2.5 sm:p-3">
                  
                  {/* SVG Studio Environment Illustration */}
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 440 220">
                    <defs>
                      <linearGradient id="lecBg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E293B" />
                        <stop offset="100%" stopColor="#0F172A" />
                      </linearGradient>
                      <linearGradient id="lecSpot" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    <rect width="440" height="220" fill="url(#lecBg)" />
                    <rect width="440" height="220" fill="url(#lecSpot)" />
                    
                    {/* Stage Presentation Screen (Background) */}
                    <g opacity="0.35">
                      <rect x="22" y="18" width="130" height="85" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
                      <line x1="32" y1="36" x2="100" y2="36" stroke="#38BDF8" strokeWidth="2" />
                      <line x1="32" y1="48" x2="130" y2="48" stroke="#94A3B8" strokeWidth="1.5" />
                      <line x1="32" y1="60" x2="120" y2="60" stroke="#94A3B8" strokeWidth="1.5" />
                      <line x1="32" y1="72" x2="85" y2="72" stroke="#94A3B8" strokeWidth="1.5" />
                      
                      <rect x="288" y="18" width="130" height="85" rx="4" fill="#334155" stroke="#475569" strokeWidth="1" />
                      <rect x="302" y="32" width="45" height="55" rx="2" fill="#2563EB" opacity="0.5" />
                      <rect x="355" y="44" width="45" height="43" rx="2" fill="#38BDF8" opacity="0.5" />
                    </g>
                    
                    {/* Speaker Key Spotlight */}
                    <circle cx="220" cy="95" r="75" fill="#3B82F6" opacity="0.15" filter="blur(15px)" />
                    
                    {/* Speaker on Podium / Keynote Stage */}
                    <g transform="translate(160, 32)">
                      {/* Head */}
                      <ellipse cx="60" cy="45" rx="22" ry="26" fill="#F1F5F9" />
                      <path d="M42 40 C42 22, 78 22, 78 40 C78 30, 72 24, 60 24 C48 24, 42 30, 42 40 Z" fill="#334155" />
                      {/* Neck */}
                      <rect x="54" y="68" width="12" height="15" fill="#CBD5E1" />
                      {/* Dark Blazer & Presentation Attire */}
                      <path d="M12 135 L34 82 L52 86 L60 102 L68 86 L86 82 L108 135 Z" fill="#1E293B" stroke="#475569" strokeWidth="1.2" />
                      <polygon points="52,86 60,110 68,86" fill="#FFFFFF" />
                      {/* Stage Headset Mic */}
                      <path d="M78 44 C82 52, 80 62, 68 66" fill="none" stroke="#94A3B8" strokeWidth="1" />
                      <circle cx="67" cy="66" r="2" fill="#38BDF8" />
                    </g>

                    {/* Conference Lectern / Stage Stand */}
                    <g transform="translate(185, 140)">
                      <path d="M10 0 L60 0 L52 45 L18 45 Z" fill="#334155" stroke="#475569" strokeWidth="1" />
                      <rect x="25" y="8" width="20" height="12" rx="1" fill="#1E293B" />
                    </g>
                  </svg>

                  {/* Top Bar inside video player */}
                  <div className="relative z-10 flex items-center justify-between text-white/90">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                      <span>1080p HD</span>
                    </div>
                    <div className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] rounded border border-white/10">
                      02:14 / 18:42
                    </div>
                  </div>

                  {/* Play Trigger in Center */}
                  <div className="relative z-10 flex items-center justify-center my-auto">
                    <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg border border-white/20 hover:scale-105 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Video Subtitle Caption */}
                  <div className="relative z-10 bg-black/85 text-white px-2.5 py-1 rounded text-center text-[10.5px] font-medium max-w-xs mx-auto shadow-md border border-white/15 backdrop-blur-xs leading-tight">
                    "Let's look at how automated transcription accelerates team workflows..."
                  </div>

                  {/* Player Scrubber */}
                  <div className="relative z-10 mt-1.5 bg-black/50 backdrop-blur-md rounded px-2 py-1 border border-white/10 flex items-center justify-between text-[9px] text-white/80 font-mono">
                    <div className="flex items-center gap-2 w-full pr-2">
                      <span className="text-[#38BDF8] shrink-0 font-bold">02:14</span>
                      <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-[12%] bg-[#2563EB] rounded-full"></div>
                      </div>
                      <span className="text-white/50 shrink-0">18:42</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Volume2 className="w-2.5 h-2.5 text-white/80" />
                    </div>
                  </div>

                </div>

                {/* 3. Transcript Panel with Highlighted Active Segment */}
                <div className="space-y-1.5">
                  
                  {/* Segment 1 */}
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-bold text-[#64748B]">Speaker 1 (Host)</span>
                      <span className="font-mono text-[#94A3B8]">00:01:48</span>
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed">
                      "Welcome back. In this session, we're examining modern speech-to-text accuracy in distributed teams."
                    </p>
                  </div>

                  {/* Segment 2 - ACTIVE / CURRENTLY SPOKEN HIGHLIGHT */}
                  <div className="p-2.5 bg-[#EFF6FF] rounded-lg border border-[#93C5FD] relative shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping"></span>
                        <span className="font-bold text-[#2563EB]">Speaker 2 (Presenter)</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#2563EB] bg-white px-1.5 py-0.2 rounded border border-[#BFDBFE] font-semibold">
                        00:02:14
                      </span>
                    </div>
                    <p className="text-[11px] text-[#0F172A] font-medium leading-relaxed">
                      "Let's look at how automated transcription <mark className="bg-[#DBEAFE] text-[#1E40AF] px-1 rounded font-semibold">accelerates team workflows</mark> and eliminates manual note-taking."
                    </p>
                  </div>

                  {/* Segment 3 */}
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-bold text-[#64748B]">Speaker 1 (Host)</span>
                      <span className="font-mono text-[#94A3B8]">00:02:40</span>
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed truncate">
                      "And that synchronizes directly with generated chapters and action items..."
                    </p>
                  </div>

                </div>

                {/* 4. Export Formats Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#64748B] uppercase font-mono text-[9px]">Export:</span>
                    <span className="px-1.5 py-0.5 bg-[#F8FAFC] border border-[#CBD5E1] font-mono font-semibold rounded text-[#1E293B]">TXT</span>
                    <span className="px-1.5 py-0.5 bg-[#F8FAFC] border border-[#CBD5E1] font-mono font-semibold rounded text-[#1E293B]">DOCX</span>
                    <span className="px-1.5 py-0.5 bg-[#F8FAFC] border border-[#CBD5E1] font-mono font-semibold rounded text-[#1E293B]">SRT</span>
                    <span className="px-1.5 py-0.5 bg-[#F8FAFC] border border-[#CBD5E1] font-mono font-semibold rounded text-[#1E293B]">VTT</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#2563EB] flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Synchronized</span>
                  </span>
                </div>

              </div>
            </div>

            {/* Right Column: Text */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-4 text-left">
              <span className="inline-block px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded font-mono">
                TRANSCRIPTS AT THE SPEED OF AI
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#111827] leading-tight">
                Instant video-to-text results
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Convert any video into text in seconds. Upload a file or paste a link, and the transcript appears almost instantly — accurate, ready to edit, and generated directly in your browser.
              </p>

              <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#374151]">
                <li className="flex items-center gap-2">
                  <span className="text-[#2563EB] font-bold">→</span>
                  <span>No waiting, no setup</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#2563EB] font-bold">→</span>
                  <span>Works with long recordings</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#2563EB] font-bold">→</span>
                  <span>Lightning-fast turnaround powered by AI</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={scrollToImport}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Get Started Free</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* =========================================================================
          5. USE CASES (Horizontal compact cards with controls)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Use Cases
            </h2>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setUseCaseIndex(Math.max(0, useCaseIndex - 1))}
                className="p-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#111827] transition-colors cursor-pointer"
                aria-label="Previous use cases"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setUseCaseIndex(Math.min(1, useCaseIndex + 1))}
                className="p-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#111827] transition-colors cursor-pointer"
                aria-label="Next use cases"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {useCases.map((uc, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                  {uc.icon}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#111827]">
                  {uc.title}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {uc.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          6. EDUCATIONAL CONTENT (Why transcribe & What is a video-to-text converter)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="space-y-3.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Why transcribe a video to text ?
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              Transcribing a video to text makes the content accessible, searchable, and easier to reuse. A text version helps extract quotes, create summaries, write captions, and turn long recordings into usable documents. It also saves time, improves accessibility, and allows teams to work with video content more efficiently.
            </p>
          </div>

          <div className="space-y-3.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              What is a video-to-text converter?
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              A video-to-text converter turns the spoken audio in a video into written text. It analyzes speech, identifies words, and produces an editable transcript that can include timestamps and speaker labels. This makes video content easier to read, search, repurpose, and share across different formats.
            </p>
          </div>

          <div>
            <button
              onClick={scrollToImport}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <span>Convert video to text</span>
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. FREQUENTLY ASKED QUESTIONS (Accordion, only 1 open at a time)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] text-center mb-10">
            Frequently asked questions
          </h2>

          <div className="space-y-3 text-left">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#111827]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#64748B] transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#F1F5F9]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* =========================================================================
          8. POPULAR VIDEO FORMATS (Compact pill links)
          ========================================================================= */}
      <section className="py-14 sm:py-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#111827] mb-6">
            Popular video formats
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto">
            {popularFormats.map((fmt, idx) => (
              <button
                key={idx}
                onClick={scrollToImport}
                className="px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] rounded-full text-xs font-medium text-[#374151] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>{fmt}</span>
                <span className="text-[#94A3B8]">›</span>
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          11. DISCOVER RELATED TOOLS (Compact pill links)
          ========================================================================= */}
      <section className="py-14 sm:py-16 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#111827] mb-6">
            Discover Related tools
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto">
            {relatedTools.map((tool, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (tool.includes('summarizer') || tool.includes('notetaker')) {
                    onNavigate('/study');
                  } else {
                    scrollToImport();
                  }
                }}
                className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] rounded-full text-xs font-medium text-[#374151] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>{tool}</span>
                <span className="text-[#94A3B8]">›</span>
              </button>
            ))}
          </div>

        </div>
      </section>

    </main>
  );
};
