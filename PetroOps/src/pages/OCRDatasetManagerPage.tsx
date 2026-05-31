import React, { useState } from 'react';
import { OCRDatasetManager, OCRDatasetEntry } from '../modules/ocr/dataset/OCRDatasetManager';

export default function OCRDatasetManagerPage() {
  const [dataset] = useState<OCRDatasetEntry[]>(OCRDatasetManager.queryDataset({}));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Real Register Dataset Manager</h1>
          <p className="text-gray-400">Ingest, label, and track OCR extraction grounds truths.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">
          Ingest New Images
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-gray-300 text-sm">
            <tr>
              <th className="p-4">Image ID</th>
              <th className="p-4">Layout Type</th>
              <th className="p-4">Tags</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-200 divide-y divide-slate-800">
            {dataset.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No dataset entries available.
                </td>
              </tr>
            ) : (
              dataset.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-800/50">
                  <td className="p-4">{entry.id}</td>
                  <td className="p-4">{entry.templateType}</td>
                  <td className="p-4 flex flex-wrap gap-2">
                    {entry.environmentalTags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-700 rounded-md text-xs">{tag}</span>
                    ))}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      entry.status === 'LABELED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-blue-400 hover:text-blue-300">Label Truth</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
