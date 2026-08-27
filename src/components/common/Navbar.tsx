import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Upload, 
  Search, 
  BookOpen, 
  Settings,
  FolderKanban,
  FileVideo,
  Layers,
  Sparkles,
  ChevronDown,
  FileAudio,
  Subtitles,
  Scissors,
  Repeat,
  Languages,
  Mic,
  Users,
  SearchCode,
  HelpCircle,
  BookMarked,
  FileCode2,
  Globe2,
  ArrowRight
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUploadClick = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    if (currentPath === '/') {
      const dropzone = document.getElementById('import-section');
      if (dropzone) {
        dropzone.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      onNavigate('/');
    }
  };

  const handleLinkClick = (path: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] select-none h-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="flex items-center gap-6 lg:gap-8" ref={dropdownRef}>
          {/* Brand Logo */}
          <button
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-2 text-[#111827] hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            aria-label="Veyra Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <span>V</span>
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#111827]">
              Veyra
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            
            {/* 1. Products & Services Mega Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'products' ? null : 'products')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeDropdown === 'products'
                    ? 'text-[#2563EB] bg-[#EFF6FF]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>Products</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'products' ? 'rotate-180 text-[#2563EB]' : ''}`} />
              </button>

              {activeDropdown === 'products' && (
                <div className="absolute top-full left-0 mt-1.5 w-[560px] bg-white rounded-xl border border-[#E2E8F0] shadow-[0_12px_32px_rgba(0,0,0,0.08)] p-5 grid grid-cols-3 gap-6 animate-in fade-in-50 zoom-in-95 z-50">
                  {/* Column 1: Core Products */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] font-mono">
                      PRODUCTS
                    </div>
                    <ul className="space-y-1.5">
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB] flex items-center gap-1.5">
                            <FileVideo className="w-3.5 h-3.5 text-[#2563EB]" />
                            Video Transcription
                          </div>
                          <p className="text-[11px] text-[#64748B] line-clamp-1">Convert video to text</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB] flex items-center gap-1.5">
                            <FileAudio className="w-3.5 h-3.5 text-[#2563EB]" />
                            Audio Transcription
                          </div>
                          <p className="text-[11px] text-[#64748B] line-clamp-1">Turn voice into notes</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleLinkClick('/study')}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                            AI Summaries
                          </div>
                          <p className="text-[11px] text-[#64748B] line-clamp-1">Study guides &amp; flashcards</p>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: Tools */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] font-mono">
                      TOOLS
                    </div>
                    <ul className="space-y-1.5">
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            Video to Text
                          </div>
                          <p className="text-[11px] text-[#64748B]">Instant online transcriber</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            Subtitle Generator
                          </div>
                          <p className="text-[11px] text-[#64748B]">SRT &amp; VTT captions</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            Audio to Text
                          </div>
                          <p className="text-[11px] text-[#64748B]">MP3, WAV &amp; M4A</p>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 3: Features */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] font-mono">
                      FEATURES
                    </div>
                    <ul className="space-y-1.5">
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            AI Transcription
                          </div>
                          <p className="text-[11px] text-[#64748B]">Fast acoustic models</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleUploadClick}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            Speaker Detection
                          </div>
                          <p className="text-[11px] text-[#64748B]">Diarization &amp; labels</p>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleLinkClick('/search')}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-[#F8FAFC] group transition-colors"
                        >
                          <div className="text-xs font-semibold text-[#111827] group-hover:text-[#2563EB]">
                            Searchable Transcripts
                          </div>
                          <p className="text-[11px] text-[#64748B]">Deep semantic search</p>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeDropdown === 'tools'
                    ? 'text-[#2563EB] bg-[#EFF6FF]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'tools' ? 'rotate-180 text-[#2563EB]' : ''}`} />
              </button>

              {activeDropdown === 'tools' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_12px_32px_rgba(0,0,0,0.08)] p-3 space-y-1 z-50">
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center justify-between group"
                  >
                    <span>Video to Text</span>
                    <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#2563EB]" />
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center justify-between group"
                  >
                    <span>Audio to Text</span>
                    <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#2563EB]" />
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center justify-between group"
                  >
                    <span>Subtitle Generator (.SRT)</span>
                    <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#2563EB]" />
                  </button>
                  <button
                    onClick={() => handleLinkClick('/search')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center justify-between group"
                  >
                    <span>Transcript Search</span>
                    <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#2563EB]" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Resources Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeDropdown === 'resources'
                    ? 'text-[#2563EB] bg-[#EFF6FF]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>Resources</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'resources' ? 'rotate-180 text-[#2563EB]' : ''}`} />
              </button>

              {activeDropdown === 'resources' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_12px_32px_rgba(0,0,0,0.08)] p-3 space-y-1 z-50">
                  <button
                    onClick={() => handleLinkClick('/study')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center gap-2"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Study Guides &amp; Summaries</span>
                  </button>
                  <button
                    onClick={() => handleLinkClick('/settings')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-xs font-medium text-[#111827] flex items-center gap-2"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Help &amp; Documentation</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Direct Navigation Links */}
            <button
              onClick={() => handleLinkClick('/projects')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentPath === '/projects'
                  ? 'text-[#2563EB] bg-[#EFF6FF] font-semibold'
                  : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
              }`}
            >
              Videos
            </button>

            <button
              onClick={() => handleLinkClick('/search')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentPath === '/search'
                  ? 'text-[#2563EB] bg-[#EFF6FF] font-semibold'
                  : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
              }`}
            >
              Search
            </button>

            <button
              onClick={() => handleLinkClick('/study')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentPath === '/study'
                  ? 'text-[#2563EB] bg-[#EFF6FF] font-semibold'
                  : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]'
              }`}
            >
              Study
            </button>
          </nav>
        </div>

        {/* Right Side: Settings, My Workspace & Upload Video */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Settings Icon */}
          <button
            onClick={() => handleLinkClick('/settings')}
            className={`p-2 rounded-lg transition-colors cursor-pointer text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC] ${
              currentPath === '/settings' ? 'text-[#2563EB] bg-[#EFF6FF]' : ''
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* My Workspace Link */}
          <button
            onClick={() => handleLinkClick('/projects')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentPath === '/projects'
                ? 'text-[#2563EB] bg-[#EFF6FF]'
                : 'text-[#374151] hover:text-[#111827] hover:bg-[#F8FAFC]'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#64748B]" />
            <span>My Workspace</span>
          </button>

          {/* Upload Video Primary CTA */}
          <button
            onClick={handleUploadClick}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#475569] hover:text-[#111827] rounded-lg hover:bg-[#F8FAFC] cursor-pointer ml-1"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E8F0] bg-white px-4 py-3 space-y-1 shadow-lg">
          <button
            onClick={() => handleLinkClick('/')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md text-[#111827] hover:bg-[#F8FAFC] text-left"
          >
            <span>Home</span>
          </button>
          <button
            onClick={() => handleLinkClick('/projects')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md text-[#111827] hover:bg-[#F8FAFC] text-left"
          >
            <span>Videos &amp; Workspace</span>
          </button>
          <button
            onClick={() => handleLinkClick('/search')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md text-[#111827] hover:bg-[#F8FAFC] text-left"
          >
            <span>Search Transcripts</span>
          </button>
          <button
            onClick={() => handleLinkClick('/study')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md text-[#111827] hover:bg-[#F8FAFC] text-left"
          >
            <span>Study &amp; AI Summaries</span>
          </button>
          <div className="pt-2 border-t border-[#F1F5F9] space-y-1">
            <button
              onClick={() => handleLinkClick('/settings')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] rounded-md text-left"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
