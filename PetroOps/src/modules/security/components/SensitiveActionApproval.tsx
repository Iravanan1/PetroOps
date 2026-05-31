import React, { useState } from 'react';
import { 
  Key, ShieldAlert, X, ShieldCheck
} from 'lucide-react';
import { StepUpAuthService } from '../StepUpAuthService';

interface SensitiveActionApprovalProps {
  action: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SensitiveActionApproval({
  action,
  isOpen,
  onClose,
  onSuccess
}: SensitiveActionApprovalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const res = StepUpAuthService.verifyStepUpPasscode(passcode, action);
    if (res.success) {
      setError(null);
      setPasscode('');
      onSuccess();
    } else {
      setError(res.error || 'Verification failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6 animate-scale-up">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-2 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-2 text-rose-800">
            <Key className="w-5 h-5 text-rose-700" />
            <span className="text-xs font-black uppercase tracking-wider">Step-Up Challenge</span>
          </div>
          <button onClick={onClose} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning text */}
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-950 text-[10px] font-bold flex items-start gap-2 leading-relaxed">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="uppercase font-black block text-[11px] tracking-wide">High Risk Operation</span>
            <span className="block mt-0.5">
              Action: <strong className="font-mono text-[#C62828] uppercase">{action.replace(/_/g, ' ')}</strong>
            </span>
            <span className="block mt-0.5 text-[#666666]">
              This operation requires step-up supervisor passcode PIN authorization keys to unlock ledgers.
            </span>
          </div>
        </div>

        {/* Form passcode */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5 text-xs font-bold text-[#1A1A1A]">
            <label className="text-[#666666] uppercase text-[9px] block">Enter 4-Digit Supervisor PIN</label>
            <input 
              type="password"
              maxLength={4}
              placeholder="••••"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-[#1A1A1A] focus:outline-none focus:border-[#B3B3B3]"
              required
            />
            {error && (
              <span className="text-rose-700 text-[10px] block mt-1 font-bold">⚠️ {error}</span>
            )}
          </div>

          <div className="flex gap-2 pt-2 text-xs font-bold">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#F9F9F8] hover:bg-[#EBEBEA] text-[#1A1A1A] uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
            >
              Authorize
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
