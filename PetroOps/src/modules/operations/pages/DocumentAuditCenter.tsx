import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, Search, Database, Download, 
  Trash2, Filter, AlertTriangle, CheckSquare
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface DigitalDocument {
  id: string;
  name: string;
  category: 'OCR_Scans' | 'Invoices' | 'GST_Returns' | 'Settlement_Sheets' | 'Backup_Snaps';
  uploadedAt: string;
  size: string;
  author: string;
}

export default function DocumentAuditCenter() {
  const [activeTab, setActiveTab] = useState<'AUDITS' | 'DOCUMENTS'>('AUDITS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State lists
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [docs, setDocs] = useState<DigitalDocument[]>([]);

  useEffect(() => {
    // Simulated audit trails
    setLogs([
      { id: 'log-001', timestamp: '2026-05-23 09:30:12', user: 'Anjali Sharma (Manager)', action: 'SHIFT_LOCK_SEAL', entity: 'Shift-2026-05-22', details: 'Locked operational shift period securely after double-entry balancing gate check.', severity: 'CRITICAL' },
      { id: 'log-002', timestamp: '2026-05-23 09:42:01', user: 'System Accountant', action: 'MANUAL_UPI_MATCH', entity: 'Paytm Sale Ref-3912', details: 'Approved manual reconciliation matching with bank voucher credit adjustment.', severity: 'WARNING' },
      { id: 'log-003', timestamp: '2026-05-23 10:05:45', user: 'Anjali Sharma (Manager)', action: 'EXPENSE_APPROVAL', entity: 'Petty Cash cb-004', details: 'Authorized diesel utility power generator grease maintenance invoice payout > ₹2,000.', severity: 'INFO' },
      { id: 'log-004', timestamp: '2026-05-23 10:09:12', user: 'System Accountant', action: 'GST_EXCEL_EXPORT', entity: 'GSTR-1 MH Summary', details: 'Exported structural B2C Outward Supplies CSV return sheet.', severity: 'INFO' }
    ]);

    setDocs([
      { id: 'doc-1', name: 'Shift_VLM_OCR_Meter_Nozzles_Scan.jpg', category: 'OCR_Scans', uploadedAt: '2026-05-22 18:45', size: '1.4 MB', author: 'Attendant Ramesh' },
      { id: 'doc-2', name: 'HPCL_Lubricants_Inward_Invoice_2710.pdf', category: 'Invoices', uploadedAt: '2026-05-20 11:20', size: '840 KB', author: 'Manager Anjali' },
      { id: 'doc-3', name: 'GSTR1_Filing_Summary_Report_MH.csv', category: 'GST_Returns', uploadedAt: '2026-05-23 10:10', size: '12 KB', author: 'Accountant System' },
      { id: 'doc-4', name: 'Database_Backup_Full_Snapshot_ReplaySafe.zip', category: 'Backup_Snaps', uploadedAt: '2026-05-23 00:05', size: '8.4 MB', author: 'WAL Recovery Daemon' }
    ]);
  }, []);

  const filteredLogs = logs.filter(l => 
    l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Header controls search and tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#EBEBEA] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('AUDITS'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'AUDITS'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#F9F9F8] text-[#666666] hover:bg-[#EBEBEA]'
            }`}
          >
            📜 Secure System Audits
          </button>
          <button
            onClick={() => { setActiveTab('DOCUMENTS'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'DOCUMENTS'
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#F9F9F8] text-[#666666] hover:bg-[#EBEBEA]'
            }`}
          >
            📂 Document Vault & Backups
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-3.5" />
          <input 
            type="text"
            placeholder={activeTab === 'AUDITS' ? 'Search audit trials logs...' : 'Search document registry...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
          />
        </div>
      </div>

      {/* Main content display tab */}
      {activeTab === 'AUDITS' ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-[#D35400] flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider block">Tamper Protection Cryptographic Signatures Enabled</span>
              <span className="text-[9px] leading-relaxed block mt-0.5">
                Every action recorded is timestamped and cryptographically linked to the predecessor log to prevent database tampering.
              </span>
            </div>
          </div>

          <div className="border border-[#EBEBEA] rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[8px]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Staff Action</th>
                  <th className="p-4">Authorized User</th>
                  <th className="p-4">Activity Log Details</th>
                  <th className="p-4">Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F9F9F8]/50">
                    <td className="p-4 font-mono text-[10px] text-[#666666] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-4 font-mono text-[9px] uppercase tracking-wider text-[#D35400]">{log.action}</td>
                    <td className="p-4">{log.user}</td>
                    <td className="p-4 text-xs font-medium text-[#1A1A1A]">{log.details}</td>
                    <td className="p-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                        log.severity === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : log.severity === 'WARNING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="border border-[#EBEBEA] rounded-2xl p-4 bg-white hover:border-[#B3B3B3] transition-all flex flex-col justify-between h-40">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                      doc.category === 'Backup_Snaps'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        : doc.category === 'GST_Returns'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {doc.category.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-[#999999] font-mono">{doc.size}</span>
                  </div>
                  <h5 className="text-xs font-black text-[#1A1A1A] line-clamp-2">{doc.name}</h5>
                  <p className="text-[9px] text-[#666666] font-bold">Uploaded: {doc.uploadedAt}</p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#EBEBEA] text-[9px] text-[#666666] font-bold">
                  <span>By: {doc.author}</span>
                  <button className="flex items-center gap-0.5 text-[#D35400] hover:text-[#A04000] cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
