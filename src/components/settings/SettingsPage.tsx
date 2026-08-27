import React, { useState } from 'react';
import { Settings, HardDrive, Trash2, Download, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { getStoredProjects, saveProjects } from '../../services/projectStorage';
import { triggerFileDownload } from '../../utils/exportUtils';
import { formatBytes } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const [projects] = useState(() => getStoredProjects());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const totalBytes = projects.reduce((acc, p) => acc + (p.fileSize || 0), 0);

  const handleExportBackup = () => {
    const backupJson = JSON.stringify(projects, null, 2);
    triggerFileDownload(backupJson, `veyra_backup_${Date.now()}.json`, 'application/json');
    setStatusMessage('Backup file downloaded successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleClearAllData = () => {
    localStorage.removeItem('veyra_projects_v1');
    window.dispatchEvent(new Event('veyra_projects_changed'));
    setStatusMessage('All stored projects have been cleared.');
    setIsResetConfirmOpen(false);
    setTimeout(() => {
      onNavigate('/');
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 select-none space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5] space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
          SETTINGS
        </h1>
        <p className="text-xs sm:text-sm text-[#666666]">
          Configure workspace storage, backup exports, and intelligence preferences.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-[#F0FFF4] border border-[#9AE6B4] text-[#22543D] text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Storage Section */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#111111]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Local Browser Storage</h2>
            <p className="text-xs text-[#666666]">
              Audio/video assets are stored in IndexedDB and transcripts in localStorage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
            <span className="text-[10px] font-mono-time uppercase text-[#888888]">Stored Videos</span>
            <p className="text-xl font-bold text-[#111111]">{projects.length}</p>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
            <span className="text-[10px] font-mono-time uppercase text-[#888888]">Indexed Media Size</span>
            <p className="text-xl font-bold text-[#111111]">{formatBytes(totalBytes)}</p>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
            <span className="text-[10px] font-mono-time uppercase text-[#888888]">Database Status</span>
            <p className="text-xl font-bold text-[#111111] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111111]" />
              <span className="text-sm">Online</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[#F0F0F0] flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            disabled={projects.length === 0}
            className="px-4 py-2 bg-[#111111] hover:bg-black disabled:opacity-40 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Projects Backup (.JSON)</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={projects.length === 0}
            className="px-4 py-2 bg-white hover:bg-[#FFF5F5] border border-[#E5E5E5] hover:border-[#FEB2B2] text-[#C53030] rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Stored Videos</span>
          </button>
        </div>
      </div>

      {/* Intelligence Engine Specs */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#111111]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Transcription &amp; Diarization</h2>
            <p className="text-xs text-[#666666]">
              Sub-second timestamp synchronization with multi-speaker acoustic classification.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-xs space-y-2 text-[#666666]">
          <div className="flex items-center justify-between">
            <span>Caption Format Default:</span>
            <span className="font-mono-time text-[#111111] font-semibold">SubRip (.SRT) / WebVTT (.VTT)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Timestamp Precision:</span>
            <span className="font-mono-time text-[#111111] font-semibold">0.01s (Word-Level Timecodes)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Offline Playback:</span>
            <span className="font-mono-time text-[#111111] font-semibold">Fully Supported via IndexedDB</span>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          title="Clear All Stored Videos"
          message="Are you sure you want to delete all stored videos, transcripts, and metadata from your browser? This cannot be undone."
          confirmLabel="Clear All Data"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={handleClearAllData}
          onClose={() => setIsResetConfirmOpen(false)}
        />
      )}
    </div>
  );
};
