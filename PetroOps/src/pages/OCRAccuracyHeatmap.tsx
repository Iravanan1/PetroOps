import React from 'react';
import { OCRCorrectionAnalytics } from '../modules/ocr/analytics/OCRCorrectionAnalytics';

export default function OCRAccuracyHeatmap() {
  const heatmapData = OCRCorrectionAnalytics.generateHeatmap();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">OCR Accuracy Heatmap</h1>
      <p className="text-gray-400 mb-8">Visual matrix of commonly misread digits and fields.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {heatmapData.length === 0 ? (
          <div className="text-gray-500">No correction data available yet.</div>
        ) : (
          heatmapData.map((data) => (
            <div key={data.field} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="font-semibold text-lg text-white mb-2">{data.field}</h3>
              <div className="text-sm text-gray-400 mb-4">Total Errors: {data.errorCount}</div>
              
              <div className="space-y-2">
                {Object.entries(data.commonMisreads).map(([misread, count]) => (
                  <div key={misread} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                    <span className="text-red-400 line-through">{misread}</span>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-white">{count} times</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
