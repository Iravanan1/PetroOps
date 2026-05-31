import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Download, Trash2, Filter, 
  HelpCircle, ChevronRight, RefreshCw, Building2
} from 'lucide-react';

interface AuditDoc {
  id: string;
  name: string;
  station: string;
  category: 'OCR_Scans' | 'Invoices' | 'GST_Returns' | 'Settlement_Sheets';
  uploadedAt: string;
  size: string;
  status: string;
}

export default function CentralAuditVault() {
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<AuditDoc[]>([]);

  useEffect(() => {
    setDocs([
      { id: 'doc-1', name: 'Shift_Pune_Nozzles_Scan.jpg', station: 'Pune Highway Potaliya', category: 'OCR_Scans', uploadedAt: '2026-05-22 18:45', size: '1.4 MB', status: 'VERIFIED' },
      { id: 'doc-2', name: 'Mumbai_Refinery_Fuel_Invoice.pdf', station: 'Mumbai Terminal Branch', category: 'Invoices', uploadedAt: '2026-05-20 11:20', size: '840 KB', status: 'VERIFIED' },
      { id: 'doc-3', name: 'Delhi_GSTR1_Filing_Summary.csv', station: 'Delhi Central Pump', category: 'GST_Returns', uploadedAt: '2026-05-23 10:10', size: '12 KB', status: 'VERIFIED' },
      { id: 'doc-4', name: 'Pune_Paytm_Settlement_Sheet.pdf', station: 'Pune Highway Potaliya', category: 'Settlement_Sheets', uploadedAt: '2026-05-22 09:30', size: '240 KB', status: 'VERIFIED' }
    ]);
  }, []);

  const filteredDocs = docs.filter(doc => {
    const matchesStation = selectedStation === 'ALL' || doc.station.includes(selectedStation);
    const matchesCat = selectedCat === 'ALL' || doc.category === selectedCat;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStation && matchesCat && matchesSearch;
  });

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Filtering row controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBEBEA] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#666666]">
            <Building2 className="w-4 h-4 text-[#666666]" /> Station:
          </div>
          <select
            value={selectedStation}
            onChange={e => setSelectedStation(e.target.value)}
            className="bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
          >
            <option value="ALL">All Stations</option>
            <option value="Pune">Pune Branch</option>
            <option value="Mumbai">Mumbai Branch</option>
            <option value="Delhi">Delhi Branch</option>
          </select>

          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="OCR_Scans">OCR Scans</option>
            <option value="Invoices">Invoices</option>
            <option value="GST_Returns">GST Returns</option>
            <option value="Settlement_Sheets">Settlement Sheets</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-3.5" />
          <input 
            type="text"
            placeholder="Search document names..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
          />
        </div>
      </div>

      {/* Grid listing files */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="border border-[#EBEBEA] rounded-2xl p-4 bg-white hover:border-[#B3B3B3] transition-all flex flex-col justify-between h-40">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[8px] px-2 py-0.5 rounded font-black uppercase bg-[#F3F3F1] border border-[#EBEBEA] text-[#666666]">
                  {doc.category.replace('_', ' ')}
                </span>
                <span className="text-[9px] text-[#999999] font-mono">{doc.size}</span>
              </div>
              <h5 className="text-xs font-black text-[#1A1A1A] line-clamp-2">{doc.name}</h5>
              <p className="text-[9px] text-[#666666] font-bold mt-1 uppercase tracking-wider">{doc.station}</p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#EBEBEA] text-[9px] text-[#666666] font-bold">
              <span>Uploaded: {doc.uploadedAt}</span>
              <button className="flex items-center gap-0.5 text-[#D35400] hover:text-[#A04000] cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
