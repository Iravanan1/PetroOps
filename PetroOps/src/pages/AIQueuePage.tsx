import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AIQueuePage() {
  const navigate = useNavigate();

  const [jobs] = useState([
    {
      id: 'job_1716104200_a8a1',
      branch: 'GUJARAT_WEST_01',
      priority: 'high',
      status: 'review_required',
      certainty: '75%',
      anomaliesCount: 2,
      timestamp: '2026-05-19 12:15:30'
    },
    {
      id: 'job_1716104190_b8b2',
      branch: 'RAJASTHAN_EAST_03',
      priority: 'normal',
      status: 'reconciled',
      certainty: '98%',
      anomaliesCount: 0,
      timestamp: '2026-05-19 11:42:15'
    },
    {
      id: 'job_1716104180_c8c3',
      branch: 'GUJARAT_WEST_01',
      priority: 'low',
      status: 'preprocessing',
      certainty: 'pending',
      anomaliesCount: 0,
      timestamp: '2026-05-19 12:20:00'
    }
  ]);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1f212d] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            PUMP_AI // BATCH_PROCESSING_QUEUE
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Status queue for asynchronous OCR ingestion jobs. Uploaded registers process continuously in the background.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-[#1c1d27] border border-[#2b2d3c] px-3 py-1.5 rounded font-mono">
            TOTAL ACTIVE: 3
          </span>
        </div>
      </div>

      <div className="bg-[#14151f] border border-[#232637] rounded overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[#1a1c29] border-b border-[#232637] text-gray-400 text-left">
              <th className="p-3">JOB ID</th>
              <th className="p-3">BRANCH</th>
              <th className="p-3">PRIORITY</th>
              <th className="p-3">TIMESTAMP</th>
              <th className="p-3">STATUS</th>
              <th className="p-3">OCR CERTAINTY</th>
              <th className="p-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e202d]">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-[#1a1c29]/50 transition">
                <td className="p-3 font-bold text-white">{job.id}</td>
                <td className="p-3 text-gray-400">{job.branch}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    job.priority === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    job.priority === 'normal' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}>
                    {job.priority}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{job.timestamp}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    job.status === 'review_required' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    job.status === 'reconciled' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 font-bold text-white">{job.certainty}</td>
                <td className="p-3 text-right">
                  {job.status === 'review_required' ? (
                    <button 
                      onClick={() => navigate(`/ai-review/${job.id}`)}
                      className="bg-sky-500 hover:bg-sky-600 text-[#0d0e12] font-bold px-3 py-1 rounded transition text-[10px] uppercase"
                    >
                      REVIEW NOW
                    </button>
                  ) : (
                    <span className="text-gray-500">LOCK_RESOLVED</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
