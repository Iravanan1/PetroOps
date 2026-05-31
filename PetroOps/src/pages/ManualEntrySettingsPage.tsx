import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Keyboard, Loader2, Sparkles, ShieldCheck, 
  ArrowLeft, CheckSquare, Square, Info 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function ManualEntrySettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Setting parameters
  const [ocrMode, setOcrMode] = useState<'auto_fill' | 'manual_only' | 'mixed'>('mixed');
  const [autoApproveConfidence, setAutoApproveConfidence] = useState(0.95);
  const [requireReviewOnMismatch, setRequireReviewOnMismatch] = useState(true);
  const [requireAuditJustification, setRequireAuditJustification] = useState(true);
  const [allowLockedOverrideByAdmin, setAllowLockedOverrideByAdmin] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      if (isMockUser) {
        setOcrMode('mixed');
        setAutoApproveConfidence(0.95);
        setRequireReviewOnMismatch(true);
        setRequireAuditJustification(true);
        setAllowLockedOverrideByAdmin(false);
      } else {
        const docRef = doc(db, 'users', user.uid, 'settings', 'manual_entry');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          setOcrMode(d.ocrMode || 'mixed');
          setAutoApproveConfidence(d.autoApproveConfidence ?? 0.95);
          setRequireReviewOnMismatch(d.requireReviewOnMismatch ?? true);
          setRequireAuditJustification(d.requireAuditJustification ?? true);
          setAllowLockedOverrideByAdmin(d.allowLockedOverrideByAdmin ?? false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = {
        ocrMode,
        autoApproveConfidence,
        requireReviewOnMismatch,
        requireAuditJustification,
        allowLockedOverrideByAdmin,
        updatedAt: new Date().toISOString()
      };

      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      if (!isMockUser) {
        const docRef = doc(db, 'users', user.uid, 'settings', 'manual_entry');
        await setDoc(docRef, updated, { merge: true });
      }

      setSuccess('Ingestion and bookkeeping setup updated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update entry rules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] mb-6 transition-colors min-h-[48px] py-2 px-4 bg-[#F3F3F1] border border-[#EBEBEA] rounded-xl hover:border-[#B3B3B3] glove-safe-target"
        >
          <ArrowLeft className="w-4 h-4 text-[#666666]" /> BACK TO CONTROL ROOM
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
            <Keyboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Entry Rules & Auto-Ingestion</h1>
            <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Configure OCR Auto-Fill, Confidence Limits, & Overrides</p>
          </div>
        </div>

        {/* Status alerts */}
        {error && (
          <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl mb-6 text-xs font-medium animate-in fade-in duration-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/10 text-[#2E7D32] p-4 rounded-2xl mb-6 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-300">
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
            <span>{success}</span>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300">
          
          <div className="mb-6">
            <h2 className="text-base font-semibold text-[#1A1A1A]">OCR Ingestion Modes</h2>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              Define the balance between automated OCR scanning and manual confirmation checks.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Ocr Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <button
                type="button"
                onClick={() => setOcrMode('auto_fill')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all ${
                  ocrMode === 'auto_fill' 
                    ? 'bg-[#D35400]/5 border-[#D35400] ring-1 ring-[#D35400]' 
                    : 'bg-[#F9F9F8] border-[#EBEBEA] hover:border-[#B3B3B3]'
                }`}
              >
                <div>
                  <span className="font-semibold text-xs text-[#1A1A1A] block">Auto-Fill Mode</span>
                  <span className="text-[10px] text-[#666666] mt-2 block font-normal leading-relaxed">
                    Always use OCR scan values. Highly automated shift reconciliation.
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#D35400] tracking-widest uppercase">AUTO FILL SCAN</span>
              </button>

              <button
                type="button"
                onClick={() => setOcrMode('mixed')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all ${
                  ocrMode === 'mixed' 
                    ? 'bg-[#D35400]/5 border-[#D35400] ring-1 ring-[#D35400]' 
                    : 'bg-[#F9F9F8] border-[#EBEBEA] hover:border-[#B3B3B3]'
                }`}
              >
                <div>
                  <span className="font-semibold text-xs text-[#1A1A1A] block">Mixed Mode (Recommended)</span>
                  <span className="text-[10px] text-[#666666] mt-2 block font-normal leading-relaxed">
                    Loads OCR readings but requires manual reviewer sign-off prior to saving.
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#D35400] tracking-widest uppercase">VERIFIED ASSIST</span>
              </button>

              <button
                type="button"
                onClick={() => setOcrMode('manual_only')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all ${
                  ocrMode === 'manual_only' 
                    ? 'bg-[#D35400]/5 border-[#D35400] ring-1 ring-[#D35400]' 
                    : 'bg-[#F9F9F8] border-[#EBEBEA] hover:border-[#B3B3B3]'
                }`}
              >
                <div>
                  <span className="font-semibold text-xs text-[#1A1A1A] block">Manual Override Always</span>
                  <span className="text-[10px] text-[#666666] mt-2 block font-normal leading-relaxed">
                    Bypasses OCR parsing completely. All totals must be hand-typed.
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#D35400] tracking-widest uppercase">100% MANUAL TYPE</span>
              </button>

            </div>

            <div className="border-t border-[#EBEBEA] pt-6 space-y-6">
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Validation & Double-Entry Safeties</h3>
                <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
                  Safeguards to verify that portal reconciliations comply with double-entry limits.
                </p>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block">Auto-Approve OCR Confidence Threshold</label>
                  <span className="text-xs font-semibold text-[#D35400]">{Math.round(autoApproveConfidence * 100)}% Confidence</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="0.99"
                  step="0.01"
                  className="w-full h-1.5 bg-[#F3F3F1] rounded-lg appearance-none cursor-pointer accent-[#D35400]"
                  value={autoApproveConfidence}
                  onChange={(e) => setAutoApproveConfidence(parseFloat(e.target.value))}
                />
                <span className="text-[10px] text-[#999999] block">Any scanned sheets scoring lower than this confidence score trigger the manual correction review queue.</span>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                
                {/* Require Review on Mismatch */}
                <button
                  type="button"
                  onClick={() => setRequireReviewOnMismatch(!requireReviewOnMismatch)}
                  className="flex items-start gap-3 w-full text-left min-h-[54px] py-3.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl transition-all cursor-pointer glove-safe-target shadow-xs"
                >
                  {requireReviewOnMismatch ? (
                    <CheckSquare className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#CCCCCC] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-[#1a1a1a] block">Require explicit confirmation on portal/OCR mismatch</span>
                    <span className="text-[10px] text-[#666666] mt-0.5 block leading-relaxed font-medium">
                      If scanned registers differ from downloaded portal sheets by even 1 rupee/litre, highlight mismatches visually and lock editing until operators resolve discrepancies.
                    </span>
                  </div>
                </button>

                {/* Require Audit Justification */}
                <button
                  type="button"
                  onClick={() => setRequireAuditJustification(!requireAuditJustification)}
                  className="flex items-start gap-3 w-full text-left min-h-[54px] py-3.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl transition-all cursor-pointer glove-safe-target shadow-xs"
                >
                  {requireAuditJustification ? (
                    <CheckSquare className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#CCCCCC] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-[#1a1a1a] block">Enforce justification reason on manual adjustments</span>
                    <span className="text-[10px] text-[#666666] mt-0.5 block leading-relaxed font-medium">
                      All manual corrections must have a short text comment logged in the permanent CA-audit logs. Prevents silent overrides.
                    </span>
                  </div>
                </button>

                {/* Allow locked override by admin */}
                <button
                  type="button"
                  onClick={() => setAllowLockedOverrideByAdmin(!allowLockedOverrideByAdmin)}
                  className="flex items-start gap-3 w-full text-left min-h-[54px] py-3.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl transition-all cursor-pointer glove-safe-target shadow-xs"
                >
                  {allowLockedOverrideByAdmin ? (
                    <CheckSquare className="w-5 h-5 text-[#D35400] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-[#CCCCCC] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-[#1a1a1a] block">Allow admin override of locked accounting periods (Not recommended)</span>
                    <span className="text-[10px] text-[#666666] mt-0.5 block leading-relaxed font-medium">
                      Allows executive account administrators to override closed ledgers. Forces full double-entry replay recalculations.
                    </span>
                  </div>
                </button>

              </div>

            </div>

            {/* Warning block */}
            <div className="bg-[#D35400]/5 border border-[#D35400]/10 rounded-2xl p-4 text-xs text-[#666666] leading-relaxed flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-[#D35400] mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold text-[#D35400] block mb-1">Replay-Safe Double Entry Integrity</span>
                All adjustments to collections, credits, and wet stocks automatically compute balance ledger postings. Retroactive revisions recalculate general ledger carry-forwards dynamically.
              </span>
            </div>

            {/* Action button */}
            <div className="flex justify-end pt-4 border-t border-[#EBEBEA]">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white font-semibold tracking-wide text-xs rounded-xl min-h-[48px] py-3.5 px-8 transition-colors shadow-xs glove-safe-target"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> SAVE RULES</>}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
