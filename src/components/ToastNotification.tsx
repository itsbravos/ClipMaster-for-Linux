import React, { useEffect } from 'react';
import { ClipboardCheck, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 card-neo text-ink dark:text-paper text-xs animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-1 rounded-lg bg-brand-blue/25 dark:bg-brand-blue-night/25 text-brand-blue-dark dark:text-brand-blue-night">
        <ClipboardCheck className="w-4 h-4" />
      </div>
      <span className="font-bold">{message}</span>
      <button
        onClick={onClose}
        className="text-ink/50 dark:text-paper/50 hover:text-ink dark:hover:text-paper p-0.5 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
