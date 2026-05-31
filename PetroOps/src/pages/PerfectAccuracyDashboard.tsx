import React, { useState } from 'react';

export default function PerfectAccuracyDashboard() {
  const [extractions] = useState([
    { id: 'ext_1', field: 'Opening Cash', value: '15000', confidence: 99.2, status: 'AUTO_EXTRACTED', math: 'PASSED' },
    { id: 'ext_2', field: 'Total Sales', value: null, confidence: 65.4, status: 'REVIEW_REQUIRED', math: 'FAILED' },
    { id: 'ext_3', field: 'Expenses', value: '1200', confidence: 88.0, status: 'MANAGER_VERIFIED', math: 'PASSED' },
  ]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Zero-Hallucination Monitoring Engine</h1>
      <p className="text-gray-400 mb-8">Strict determinism interface. Extractions below confidence or failing math are immediately nullified for manual review.</p>

      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-gray-300 text-sm">
            <tr>
              <th className="p-4">Extraction ID</th>
              <th className="p-4">Field</th>
              <th className="p-4">Value</th>
              <th className="p-4">Confidence</th>
              <th className="p-4">Math Truth</th>
              <th className="p-4">Workflow State</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-200 divide-y divide-slate-800">
            {extractions.map(ext => (
              <tr key={ext.id} className="hover:bg-slate-800/50">
                <td className="p-4">{ext.id}</td>
                <td className="p-4">{ext.field}</td>
                <td className="p-4 font-mono">{ext.value === null ? '<REJECTED>' : ext.value}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${ext.confidence > 95 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {ext.confidence}%
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${ext.math === 'PASSED' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                    {ext.math}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    ext.status === 'AUTO_EXTRACTED' ? 'bg-green-500/20 text-green-400' : 
                    ext.status === 'REVIEW_REQUIRED' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {ext.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
