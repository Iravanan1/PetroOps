import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  accessor?: keyof T;
}

interface SharedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFilter: (item: T, query: string) => boolean;
  exportFileName?: string;
}

export function SharedTable<T>({ 
  columns, 
  data, 
  searchPlaceholder = "Search records...", 
  searchFilter,
  exportFileName = "pumpai_erp_export"
}: SharedTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Search filtering
  const filtered = data.filter(item => searchFilter(item, search));

  // Pagination boundaries
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // CSV Export utility
  const handleExport = () => {
    const csvContent = [
      columns.map(c => c.header).join(","),
      ...filtered.map(item => 
        columns.map(c => {
          const val = c.accessor ? String(item[c.accessor] || '') : '';
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exportFileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Export HUD */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#0b101d] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleExport}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 border border-slate-800 hover:text-white rounded-xl text-xs flex items-center justify-center gap-2 font-bold text-slate-300 transition-all"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0f1d]/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0d1527]/60 text-slate-400 font-bold uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3.5 px-4 font-semibold">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-500">No matching records found.</td>
              </tr>
            ) : (
              paginated.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-900/60 hover:bg-[#0d1527]/30 transition-all">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="py-3 px-4">{col.render(item)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination HUD */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-[10px] text-slate-500 font-medium">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="p-2 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="p-2 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
