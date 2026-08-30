import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#F5F5F5] rounded border border-[#E5E5E5] text-[#111111] shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5E5]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className={isDestructive ? "bg-[#DC2626] border-[#DC2626] hover:bg-[#B91C1C] hover:border-[#B91C1C] focus:ring-[#DC2626]" : ""}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
