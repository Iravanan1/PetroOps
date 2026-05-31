import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface ConsistentTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  maxHeight?: string;
}

export default function ConsistentTable<T>({
  columns,
  data,
  emptyMessage = 'No records matching ledger list.',
  maxHeight = '420px'
}: ConsistentTableProps<T>) {
  return (
    <div className="border border-[#EBEBEA] rounded-2xl overflow-hidden bg-white shadow-xs">
      {data.length > 0 ? (
        <div className="overflow-x-auto" style={{ maxHeight }}>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[8px] sticky top-0 z-10">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`p-4 ${col.className || ''}`}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
              {data.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[#F9F9F8]/50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`p-4 ${col.className || ''}`}>{col.accessor(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-xs font-bold text-[#999999] bg-[#F9F9F8] flex flex-col items-center justify-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-[#B3B3B3] animate-pulse-slow" />
          <span>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
}
