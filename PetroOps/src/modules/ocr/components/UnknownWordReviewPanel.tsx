import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, Languages, HelpCircle, 
  ChevronRight, BookOpen, AlertCircle, X
} from 'lucide-react';
import { OperatorCorrectionTrainer } from '../adaptive/OperatorCorrectionTrainer';
import { GlossaryEntry } from '../adaptive/HandwritingGlossary';

interface UnknownWordReviewPanelProps {
  rawOCR: string;
  fieldKey: string;
  stationTemplate: GlossaryEntry['stationTemplate'];
  operatorId: string;
  stationId: string;
  confidence: number;
  onTrainingComplete: (trainedValue: string) => void;
  onDismiss: () => void;
}

export default function UnknownWordReviewPanel({
  rawOCR,
  fieldKey,
  stationTemplate,
  operatorId,
  stationId,
  confidence,
  onTrainingComplete,
  onDismiss
}: UnknownWordReviewPanelProps) {
  const [correctedValue, setCorrectedValue] = useState('');
  const [normalizedMeaning, setNormalizedMeaning] = useState('');
  const [category, setCategory] = useState<GlossaryEntry['category']>('CUSTOMER_NAME');
  const [language, setLanguage] = useState<GlossaryEntry['language']>('HINDI');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Reset inputs when target rawOCR shifts
    setCorrectedValue('');
    setNormalizedMeaning('');
    setCategory(fieldKey.includes('nozzle') ? 'NOZZLE_LABEL' : 'CUSTOMER_NAME');
    setLanguage('HINDI');
    setIsSuccess(false);
  }, [rawOCR, fieldKey]);

  const handleTrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedValue.trim()) return;

    // Trigger Trainer loop
    OperatorCorrectionTrainer.trainCorrection({
      operatorId,
      stationId,
      fieldKey,
      rawOCR,
      correctedValue: correctedValue.trim(),
      normalizedMeaning: normalizedMeaning.trim() || correctedValue.trim(),
      category,
      language,
      stationTemplate,
      confidence
    });

    setIsSuccess(true);
    setTimeout(() => {
      onTrainingComplete(correctedValue.trim());
    }, 1000);
  };

  return (
    <div className="border border-[#EBEBEA] rounded-2xl bg-white shadow-xs p-5 space-y-4 max-w-md w-full relative">
      <button 
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F9F9F8] text-[#666666] hover:text-[#1A1A1A] transition-colors cursor-pointer"
        title="Dismiss prompt"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header Prompt */}
      <div className="flex items-start gap-3 pb-3 border-b border-[#EBEBEA]">
        <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs uppercase font-black tracking-wider text-[#1A1A1A]">
            Handwritten Correction Prompt
          </h4>
          <p className="text-[10px] text-[#666666] font-medium mt-0.5 leading-relaxed uppercase">
            OCR Confidence is low ({confidence}%). Train the model.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="py-6 text-center space-y-3 animate-fade-in">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
          <div>
            <h5 className="text-xs font-black uppercase text-emerald-800">Phrase Trained Successfully</h5>
            <p className="text-[10px] text-[#666666] font-medium mt-1">Saved correction memory block locally.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleTrain} className="space-y-4 text-xs font-bold text-[#1A1A1A]">
          {/* Target Value Preview */}
          <div className="p-3 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl">
            <span className="text-[8px] text-[#666666] font-black uppercase tracking-wider block mb-1">
              Raw Extracted Text (OCR Guess)
            </span>
            <span className="font-mono text-xs font-black text-rose-800 bg-white px-2 py-0.5 rounded border border-[#EBEBEA]">
              {rawOCR || '[Empty or Messy Handwriting]'}
            </span>
          </div>

          {/* Corrected entry input */}
          <div className="space-y-1">
            <label className="text-[9px] text-[#666666] uppercase tracking-wider block">
              What is this handwritten word? *
            </label>
            <input
              type="text"
              required
              value={correctedValue}
              onChange={e => setCorrectedValue(e.target.value)}
              placeholder="e.g. Abhinav Travels, Sharma Ji"
              className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-xl px-3.5 py-2.5 font-sans font-bold text-xs focus:outline-none placeholder-[#999999]"
            />
          </div>

          {/* Normalized Meaning input */}
          <div className="space-y-1">
            <label className="text-[9px] text-[#666666] uppercase tracking-wider block">
              Normalized Meaning (English translation/interpretation)
            </label>
            <input
              type="text"
              value={normalizedMeaning}
              onChange={e => setNormalizedMeaning(e.target.value)}
              placeholder="e.g. Account name, Cash refund"
              className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-xl px-3.5 py-2.5 font-sans font-bold text-xs focus:outline-none placeholder-[#999999]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[9px] text-[#666666] uppercase tracking-wider block">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as GlossaryEntry['category'])}
                className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-2 py-2.5 text-xs font-bold focus:outline-none"
              >
                <option value="CUSTOMER_NAME">Customer Name</option>
                <option value="LEDGER_TERM">Ledger Term</option>
                <option value="NOZZLE_LABEL">Nozzle Label</option>
                <option value="OPERATIONAL_TERM">Operational Term</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="space-y-1">
              <label className="text-[9px] text-[#666666] uppercase tracking-wider block">
                Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as GlossaryEntry['language'])}
                className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-2 py-2.5 text-xs font-bold focus:outline-none"
              >
                <option value="HINDI">Hindi (हिंदी)</option>
                <option value="ENGLISH">English</option>
                <option value="MIXED">Mixed (Hindi/Eng)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3.5">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#EBEBEA] hover:bg-[#F9F9F8] text-[#666666] font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer h-[40px] text-center"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 h-[40px]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Train Phrase
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
