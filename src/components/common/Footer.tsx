import React, { useState } from 'react';
import { Globe, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');

  const handleUploadNav = () => {
    const dropzone = document.getElementById('import-section');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('/');
    }
  };

  return (
    <footer className="bg-[#F8FAFC] border-t border-[#E2E8F0] mt-auto text-left">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* Top Branding & Language Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12 border-b border-[#E2E8F0]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                <span>V</span>
              </div>
              <span className="font-extrabold tracking-tight text-lg text-[#111827]">Veyra</span>
            </div>
            <p className="text-xs text-[#64748B] max-w-md leading-relaxed">
              Professional video to text converter, automated subtitle generator, and AI transcript workspace with browser-grade security.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-xs font-medium text-[#111827] shadow-xs">
            <Globe className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs text-[#111827]"
              aria-label="Select website language"
            >
              <option value="English (US)">English (US)</option>
              <option value="Français">Français</option>
              <option value="Español">Español</option>
              <option value="Deutsch">Deutsch</option>
              <option value="Italiano">Italiano</option>
              <option value="Português">Português</option>
              <option value="日本語">日本語</option>
            </select>
          </div>
        </div>

        {/* 5 Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12">
          {/* Column 1: PRODUCT */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3.5 font-mono">
              PRODUCT
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B]">
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Video Transcription
                </button>
              </li>
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Audio Transcription
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/study')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Video Summarizer
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/search')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  AI Notetaker
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: TOOLS */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3.5 font-mono">
              TOOLS
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B]">
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Video to Text
                </button>
              </li>
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Audio to Text
                </button>
              </li>
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Subtitle Generator
                </button>
              </li>
              <li>
                <button onClick={handleUploadNav} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Video Converter
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: RESOURCES */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3.5 font-mono">
              RESOURCES
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B]">
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Help Center
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/study')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Blog &amp; Guides
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/study')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Study Guides
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Documentation
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: COMPANY */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3.5 font-mono">
              COMPANY
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B]">
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  About Veyra
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Contact
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Careers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-[#2563EB] transition-colors cursor-pointer text-left">
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: SOCIAL */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3.5 font-mono">
              SOCIAL
            </h4>
            <ul className="space-y-2.5 text-xs text-[#64748B]">
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
                  <span>GitHub</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
                  <span>X (Twitter)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom divider, copyright, and policies */}
        <div className="pt-8 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <p>© 2026 Veyra. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('/settings')} className="hover:text-[#111827] transition-colors">
              Privacy
            </button>
            <button onClick={() => onNavigate('/settings')} className="hover:text-[#111827] transition-colors">
              Terms
            </button>
            <button onClick={() => onNavigate('/settings')} className="hover:text-[#111827] transition-colors">
              Cookies
            </button>
            <button onClick={() => onNavigate('/settings')} className="hover:text-[#111827] transition-colors">
              Security
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
