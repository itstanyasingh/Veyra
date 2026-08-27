import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Project } from '../../types';

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (id: string, newName: string) => void;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setError(null);
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name cannot be empty.');
      return;
    }

    if (project) {
      onSave(project.id, trimmed);
      onClose();
    }
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Project" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="rename-input" className="block text-xs font-bold uppercase tracking-wider text-[#000000]">
            PROJECT NAME
          </label>
          <input
            id="rename-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
            className="w-full bg-[#FAFAFA] border border-[#D4D4D4] focus:border-[#111111] focus:bg-white rounded-md px-3 py-2 text-sm text-[#000000] focus:outline-none transition-colors"
          />
          {error && <p className="text-xs text-[#111111] font-medium">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5E5]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
