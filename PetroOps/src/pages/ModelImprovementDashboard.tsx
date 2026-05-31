import React, { useEffect, useState } from 'react';
import { AIImprovementAnalytics } from '../modules/ocr/improvement/AIImprovementAnalytics';
import { FailurePatternPredictor } from '../modules/ocr/improvement/FailurePatternPredictor';
import { CorrectionFeedbackEngine } from '../modules/ocr/improvement/CorrectionFeedbackEngine';
import { CorrectionReplayTrainer } from '../modules/ocr/improvement/CorrectionReplayTrainer';

export default function ModelImprovementDashboard() {
  const [globalFreq, setGlobalFreq] = useState(0);
  const [branchRel, setBranchRel] = useState<Record<string, number>>({});
  const [opTrends, setOpTrends] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [trainerStatus, setTrainerStatus] = useState<string>('');

  useEffect(() => {
    // Basic polling or init
    setGlobalFreq(AIImprovementAnalytics.getGlobalCorrectionFrequency());
    setBranchRel(AIImprovementAnalytics.getBranchReliability());
    setOpTrends(AIImprovementAnalytics.getOperatorCorrectionTrends());
    setWarnings(FailurePatternPredictor.analyzeSystemicFailures());
    setTrainerStatus(CorrectionReplayTrainer.generateFinetuningDataset());
  }, []);

  const handleRefresh = () => {
    // For demo purposes, we can manually inject a mock log if empty to see UI
    if (CorrectionFeedbackEngine.getLogs().length === 0) {
      CorrectionFeedbackEngine.recordCorrection('STATION_A', 'OP_1', 'total_amount', '500O', '5000', 89);
      CorrectionFeedbackEngine.recordCorrection('STATION_A', 'OP_2', 'upi_amount', 'l00', '100', 95);
      CorrectionFeedbackEngine.recordCorrection('STATION_B', 'OP_1', 'total_amount', '900', '9000', 82);
    }
    
    setGlobalFreq(AIImprovementAnalytics.getGlobalCorrectionFrequency());
    setBranchRel(AIImprovementAnalytics.getBranchReliability());
    setOpTrends(AIImprovementAnalytics.getOperatorCorrectionTrends());
    setWarnings(FailurePatternPredictor.analyzeSystemicFailures());
    setTrainerStatus(CorrectionReplayTrainer.generateFinetuningDataset());
  };

  return (
    <div className="p-6 text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Self-Improvement Intelligence</h1>
          <p className="text-slate-400 mt-1">Real-time feedback loop analytics and anomaly tracking.</p>
        </div>
        <button onClick={handleRefresh} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded">
          Refresh Data Pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-sm text-slate-400">Total Corrections Tracked</p>
          <p className="text-3xl font-bold text-white">{globalFreq}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl md:col-span-3">
          <p className="text-sm text-slate-400">Replay Trainer Status</p>
          <p className="text-lg text-emerald-400 mt-1 font-mono">{trainerStatus}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Branch Reliability (OCR Success %)</h3>
          {Object.keys(branchRel).length === 0 ? (
            <p className="text-slate-500 italic">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {(Object.entries(branchRel) as [string, number][]).map(([branch, rel]) => (
                <li key={branch} className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span>{branch}</span>
                  <span className={rel > 90 ? 'text-emerald-400' : 'text-amber-400'}>{rel.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Operator Correction Trends</h3>
          {Object.keys(opTrends).length === 0 ? (
            <p className="text-slate-500 italic">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {(Object.entries(opTrends) as [string, number][]).map(([op, count]) => (
                <li key={op} className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span>{op}</span>
                  <span className="text-indigo-400">{count} corrections logged</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-6 bg-red-900/20 border border-red-500/30 p-5 rounded-xl">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Systemic Failure Warnings</h3>
          <ul className="list-disc pl-5 space-y-1 text-red-300">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
