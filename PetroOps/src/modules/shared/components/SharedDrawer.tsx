import React from 'react';
import { X } from 'lucide-react';

interface SharedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SharedDrawer({ isOpen, onClose, title, children }: SharedDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-[90vw] md:w-[70vw] h-full bg-[#0a0f1d] border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
