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

  const reviews = [
    {
      name: 'Lory Martinez',
      initial: 'L',
      rating: 5,
      text: 'Great service for multilingual podcasts and fast subtitle generation.'
    },
    {
      name: 'Lisa Ryan',
      initial: 'L',
      rating: 5,
      text: 'I have been using Veyra to add subtitles to my videos and transcribe podcast interviews. Except for minor punctuation changes, it does a great job.'
    },
    {
      name: 'Helen Swierszcz',
      initial: 'H',
      rating: 5,
      text: 'Really simple and straightforward to use — highly recommended for academic research.'
    },
    {
      name: 'J. Wairimu',
      initial: 'J',
      rating: 5,
      text: 'The product is easy to use and to follow along with. Saves hours of manual work.'
    },
    {
      name: 'Markus Bühler',
      initial: 'M',
      rating: 5,
      text: 'It is a great tool. Very intelligent, perfect workflow. Makes happy to work with.'
    },
    {
      name: 'Katarzyna Dąbrowska',
      initial: 'K',
      rating: 5,
      text: 'Thanks to Veyra my videos are more and more interesting for my subscribers! Thank you!'
    },
    {
      name: 'Anita',
      initial: 'A',
      rating: 5,
      text: 'Great tool to add text to video. It worked like a dream for our legal depositions.'
    },
    {
      name: 'Client Review',
      initial: 'C',
      rating: 5,
      text: 'Veyra is a really powerful and easy-to-use tool that allows us to generate scripts from the videos that we produce in order to generate closed captions.'
    },
    {
      name: 'Zahir Suleman',
      initial: 'Z',
      rating: 5,
      text: 'Very efficient service and excellent value for money across team video libraries.'
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

  const relatedArticles = [
    {
      tag: 'GUIDE',
      date: 'February 18, 2026',
      title: 'How to Transcribe Video to Text: The Complete 2026 Guide',
      description: 'Learn the most accurate workflows to turn video files into transcripts, subtitles, and searchable documents efficiently.',
      readTime: '5 min read'
    },
    {
      tag: 'FORMATS',
      date: 'February 12, 2026',
      title: 'Top Video to Text Formats: Comparing SRT, VTT, and TXT',
      description: 'Understand when to use closed captions versus timestamped text documents for video accessibility and SEO ranking.',
      readTime: '4 min read'
    },
    {
      tag: 'PRODUCTIVITY',
      date: 'January 29, 2026',
      title: 'How Automated AI Transcription Saves 10+ Hours Per Week',
      description: 'Discover how content creators and research teams streamline interviews and meetings with automatic speech recognition.',
      readTime: '6 min read'
    }
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

            {/* Compact Trust Row */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
              <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                <div className="flex items-center text-[#F59E0B]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <span>Rated 4.8 out of 5 stars</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">·</span>
              <div className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Free to start</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🇬🇧 🇫🇷 🇪🇸 🇩🇪</span>
                <span>150+ languages</span>
              </div>
            </div>

          </div>

          {/* Trusted By Strip */}
          <div className="mt-14 pt-10 border-t border-[#E2E8F0] max-w-4xl mx-auto w-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] text-center mb-6 font-mono">
              TRUSTED BY 6M+ USERS AND 41,000+ TEAMS OF ALL SIZES
            </p>
            
            {/* Continuous Horizontal Marquee */}
            <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              {/* Left and Right Edge Fade Gradients */}
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

              <div className="animate-marquee-infinite flex items-center select-none py-1">
                {/* Set 1 */}
                <div className="flex items-center shrink-0 gap-10 sm:gap-14 pr-10 sm:pr-14 opacity-60 grayscale hover:opacity-85 transition-opacity">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">RANDSTAD</span>
                  <span className="font-semibold text-sm sm:text-base tracking-wider text-[#475569] whitespace-nowrap">KÉRASTASE</span>
                  <span className="font-bold text-sm sm:text-base tracking-normal text-[#475569] whitespace-nowrap">TAMEDIA</span>
                  <span className="font-black text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">itv</span>
                  <span className="font-bold text-sm sm:text-base tracking-widest text-[#475569] whitespace-nowrap">SKYDANCE</span>
                  <span className="font-medium text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">MEDIATECH</span>
                  <span className="font-semibold text-sm sm:text-base tracking-widest text-[#475569] whitespace-nowrap">TWOFOUR</span>
                </div>

                {/* Set 2 (Seamless Duplicate) */}
                <div className="flex items-center shrink-0 gap-10 sm:gap-14 pr-10 sm:pr-14 opacity-60 grayscale hover:opacity-85 transition-opacity" aria-hidden="true">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">RANDSTAD</span>
                  <span className="font-semibold text-sm sm:text-base tracking-wider text-[#475569] whitespace-nowrap">KÉRASTASE</span>
                  <span className="font-bold text-sm sm:text-base tracking-normal text-[#475569] whitespace-nowrap">TAMEDIA</span>
                  <span className="font-black text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">itv</span>
                  <span className="font-bold text-sm sm:text-base tracking-widest text-[#475569] whitespace-nowrap">SKYDANCE</span>
                  <span className="font-medium text-sm sm:text-base tracking-tight text-[#475569] whitespace-nowrap">MEDIATECH</span>
                  <span className="font-semibold text-sm sm:text-base tracking-widest text-[#475569] whitespace-nowrap">TWOFOUR</span>
                </div>
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

            {/* Right Column: Visual Preview Card */}
            <div className="lg:col-span-6">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs text-left space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-xs">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-[#111827]">Interview about the economic situation</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded text-[10px] font-mono text-[#64748B]">
                    00:12:45
                  </span>
                </div>

                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#2563EB]">Journalist:</span>
                    <span className="font-mono text-[#94A3B8]">00:00:05</span>
                  </div>
                  <p className="text-xs text-[#111827] leading-relaxed">
                    "What do you believe are the primary factors influencing the current economic climate?"
                  </p>
                </div>

                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#111827]">Expert:</span>
                    <span className="font-mono text-[#94A3B8]">00:00:14</span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    "The main drivers are inflation trends and monetary supply adjustments across global markets."
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[11px] font-mono font-medium rounded text-[#374151]">.txt</span>
                  <span className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[11px] font-mono font-medium rounded text-[#374151]">.docx</span>
                  <span className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[11px] font-mono font-medium rounded text-[#374151]">.srt</span>
                  <span className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[11px] font-mono font-medium rounded text-[#374151]">.vtt</span>
                  <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-[11px] font-mono font-semibold rounded">+4 all extensions</span>
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
            
            {/* Left Column: Visual Box */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-4 border-[#2563EB]/20 mx-auto flex items-center justify-center text-[#2563EB]">
                  <CheckCircle2 className="w-8 h-8 text-[#2563EB]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#111827]">interview.mp4</h4>
                  <p className="text-xs text-[#10B981] font-semibold mt-0.5 flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Done in 27 seconds</span>
                  </p>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-[#EFF6FF] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2563EB] h-full w-full rounded-full"></div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-left text-xs text-[#64748B] space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>Acoustic Confidence: 99.6%</span>
                    <span>Language: English (US)</span>
                  </div>
                  <p className="text-[11px] text-[#111827] truncate">
                    "Welcome back everyone. Today we're analyzing video ingestion pipelines..."
                  </p>
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

      {/* SECTION 3: Left Text, Right Visual (Mobile App) */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Text */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="inline-block px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded font-mono">
                IOS &amp; ANDROID APP
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#111827] leading-tight">
                Transcribe on the go with the mobile app
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Shoot a video or record audio straight from your phone. The Veyra mobile experience transcribes it with AI in 150+ languages, and everything syncs to your workspace — capture on the go, edit and export at your desk.
              </p>

              <div className="pt-2">
                <button
                  onClick={scrollToImport}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Get the app</span>
                </button>
              </div>
            </div>

            {/* Right Column: Clean Mobile Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[280px] bg-white border-4 border-[#111827] rounded-[28px] p-3 shadow-lg space-y-3">
                <div className="w-12 h-1 bg-[#111827] rounded-full mx-auto mb-1"></div>
                
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                    <Mic className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-mono text-[#2563EB] font-bold">00:42:18</p>
                  <p className="text-[10px] text-[#64748B]">Recording live audio...</p>
                </div>

                <div className="space-y-1.5 text-left text-[11px]">
                  <div className="p-2 bg-[#EFF6FF] rounded-lg border border-[#DBEAFE]">
                    <p className="font-semibold text-[#2563EB]">Speaker 1</p>
                    <p className="text-[#111827]">Transcribing speech directly on device.</p>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <p className="font-semibold text-[#64748B]">Speaker 2</p>
                    <p className="text-[#475569]">Syncs instantly with your desk workspace.</p>
                  </div>
                </div>
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
          8. CUSTOMER REVIEWS (3x3 grid)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12 space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Customer Reviews
            </h2>
            <p className="text-xs text-[#64748B] flex items-center justify-center gap-1.5">
              <span>Rated</span>
              <span className="text-[#F59E0B] font-bold flex items-center">
                ★★★★★ <span className="text-[#111827] ml-1">4.7</span>/5
              </span>
              <span>on Trustpilot</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-[#F59E0B] text-xs">
                    {'★'.repeat(r.rating)}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#2563EB]">
                    BY {r.name.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">
                  "{r.text}"
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          9. RELATED ARTICLES (Horizontal cards near bottom)
          ========================================================================= */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                Related articles
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Guides, tutorials, and transcription best practices.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/study')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
            >
              <span>View all guides</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((art, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate('/study')}
                className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-2xs hover:border-[#2563EB] transition-all cursor-pointer group flex flex-col"
              >
                {/* Visual Thumbnail */}
                <div className="h-40 bg-[#EFF6FF] border-b border-[#E2E8F0] p-4 flex flex-col justify-between relative overflow-hidden group-hover:bg-[#DBEAFE]/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-white text-[#2563EB] text-[10px] font-mono font-bold uppercase rounded border border-[#DBEAFE]">
                      {art.tag}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">{art.readTime}</span>
                  </div>

                  <div className="flex items-center justify-center text-[#2563EB] py-2">
                    <FileText className="w-10 h-10 opacity-70 group-hover:scale-105 transition-transform" />
                  </div>

                  <div className="text-[10px] font-mono text-[#64748B]">
                    {art.date}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-2 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[#111827] group-hover:text-[#2563EB] transition-colors leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                      {art.description}
                    </p>
                  </div>

                  <div className="pt-3 flex items-center text-xs font-semibold text-[#2563EB] group-hover:text-[#1D4ED8]">
                    <span>Read article</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          10. POPULAR VIDEO FORMATS (Compact pill links)
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
