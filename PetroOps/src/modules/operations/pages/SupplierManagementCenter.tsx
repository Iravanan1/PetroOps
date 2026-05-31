import React, { useState, useEffect } from 'react';
import { 
  Building2, Phone, FileSpreadsheet, Download, 
  CreditCard, Search, Calendar, ChevronRight, UploadCloud, AlertTriangle
} from 'lucide-react';
import { SupplierLedgerEngine, SupplierRecord, SupplierInvoice } from '../SupplierLedgerEngine';

export default function SupplierManagementCenter() {
  const [selectedMonth] = useState<string>('2026-05');
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // OCR Invoice simulation
  const [ocrLoading, setOcrLoading] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    supplierId: 'sup-001',
    invoiceNo: '',
    amount: ''
  });

  useEffect(() => {
    setSuppliers(SupplierLedgerEngine.getMockSuppliers(selectedMonth));
    setInvoices(SupplierLedgerEngine.getMockInvoices(selectedMonth));
  }, [selectedMonth]);

  const handleSimulateInvoiceOcr = () => {
    setOcrLoading(true);
    setTimeout(() => {
      setNewInvoice({
        supplierId: 'sup-001',
        invoiceNo: `INV/2026/05-${Date.now().toString().slice(-3)}`,
        amount: '18500'
      });
      setOcrLoading(false);
    }, 1000);
  };

  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.amount || !newInvoice.invoiceNo) return;

    const parsedAmt = Number(newInvoice.amount);
    const invoiceRecord: SupplierInvoice = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      supplierId: newInvoice.supplierId,
      invoiceNo: newInvoice.invoiceNo,
      date: new Date().toISOString().slice(0, 10),
      taxableAmount: parseFloat((parsedAmt / 1.18).toFixed(2)),
      gstRate: 18,
      totalAmount: parsedAmt,
      paymentStatus: 'UNPAID'
    };

    setInvoices(prev => [invoiceRecord, ...prev]);
    
    // Adjust supplier outstanding balance
    setSuppliers(prev => prev.map(s => {
      if (s.id === newInvoice.supplierId) {
        return {
          ...s,
          outstandingBalance: s.outstandingBalance + parsedAmt,
          aging: {
            ...s.aging,
            under15: s.aging.under15 + parsedAmt
          }
        };
      }
      return s;
    }));

    // Clear form
    setNewInvoice({ supplierId: 'sup-001', invoiceNo: '', amount: '' });
  };

  // Pay Supplier bill balance
  const handlePaySupplier = (supplierId: string, amount: number) => {
    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        const balance = Math.max(0, s.outstandingBalance - amount);
        return {
          ...s,
          outstandingBalance: balance,
          aging: {
            under15: Math.max(0, s.aging.under15 - amount),
            under30: Math.max(0, s.aging.under30 - Math.max(0, amount - s.aging.under15)),
            over30: Math.max(0, s.aging.over30 - Math.max(0, amount - s.aging.under15 - s.aging.under30))
          }
        };
      }
      return s;
    }));
  };

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Suppliers directory list */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Suppliers Contact Book</h4>
          
          <div className="space-y-3">
            {suppliers.map(sup => (
              <div 
                key={sup.id}
                onClick={() => setSelectedSupplierId(sup.id === selectedSupplierId ? null : sup.id)}
                className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                  selectedSupplierId === sup.id
                    ? 'border-[#D35400] bg-amber-50/20'
                    : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-black text-[#1A1A1A]">{sup.name}</h5>
                    <span className="text-[9px] font-mono text-[#666666] block mt-0.5">GSTIN: {sup.gstin}</span>
                  </div>
                  <Building2 className={`w-4 h-4 ${selectedSupplierId === sup.id ? 'text-[#D35400]' : 'text-[#666666]'}`} />
                </div>

                <div className="flex items-center gap-1.5 text-[9px] text-[#666666] font-bold mt-3">
                  <Phone className="w-3 h-3" /> {sup.contact}
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#EBEBEA] text-xs">
                  <span className="text-[#666666]">Outstanding Debt</span>
                  <span className="font-extrabold text-[#1A1A1A]">₹{sup.outstandingBalance.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Supplier AP Aging details & Invoice list */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSupplierId ? (
            (() => {
              const selectedSup = suppliers.find(s => s.id === selectedSupplierId);
              const supInvoices = invoices.filter(inv => inv.supplierId === selectedSupplierId);
              if (!selectedSup) return null;

              return (
                <div className="space-y-6">
                  {/* Aging breakdown cards */}
                  <div className="border border-[#EBEBEA] rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">
                      Accounts Payable Aging Analysis: {selectedSup.name}
                    </h4>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] font-black uppercase text-[#666666] block">&lt; 15 Days</span>
                        <span className="text-sm font-black text-[#1A1A1A] mt-1 block">₹{selectedSup.aging.under15.toLocaleString()}</span>
                      </div>
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] font-black uppercase text-[#666666] block">15 - 30 Days</span>
                        <span className="text-sm font-black text-[#1A1A1A] mt-1 block">₹{selectedSup.aging.under30.toLocaleString()}</span>
                      </div>
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] font-black uppercase text-rose-800 block">&gt; 30 Days</span>
                        <span className="text-sm font-black text-rose-700 mt-1 block">₹{selectedSup.aging.over30.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handlePaySupplier(selectedSup.id, 5000)}
                        className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer min-h-[38px]"
                      >
                        Register ₹5,000 Payment
                      </button>
                      <button
                        onClick={() => handlePaySupplier(selectedSup.id, selectedSup.outstandingBalance)}
                        className="px-4 py-2 bg-[#D35400] hover:bg-[#A04000] text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer min-h-[38px]"
                      >
                        Settle Full Debt
                      </button>
                    </div>
                  </div>

                  {/* Supplier Invoices records list */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#666666] block">Direct Invoices History</span>
                    <div className="border border-[#EBEBEA] rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[8px]">
                          <tr>
                            <th className="p-3">Invoice No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Taxable Amt</th>
                            <th className="p-3">Total (Tax Incl)</th>
                            <th className="p-3">Filing State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
                          {supInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-[#F9F9F8]/50">
                              <td className="p-3 font-mono">{inv.invoiceNo}</td>
                              <td className="p-3 font-mono text-[10px] text-[#666666]">{inv.date}</td>
                              <td className="p-3">₹{inv.taxableAmount.toLocaleString()}</td>
                              <td className="p-3 text-xs font-extrabold">₹{inv.totalAmount.toLocaleString()}</td>
                              <td className="p-3 text-[10px] text-emerald-700">18% GST (ITC ready)</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="border border-[#EBEBEA] rounded-3xl p-6 bg-white space-y-6">
              <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Fast Invoice OCR Loader</h4>
              
              <button
                onClick={handleSimulateInvoiceOcr}
                disabled={ocrLoading}
                className="w-full border-2 border-dashed border-[#D35400]/40 hover:border-[#D35400] bg-amber-50/50 hover:bg-amber-50 p-6 rounded-2xl text-xs font-bold text-[#D35400] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-5 h-5 animate-bounce-slow" />
                {ocrLoading ? 'Parsing Supplier Invoice metadata...' : 'Simulate OCR Scanner for New Bill'}
              </button>

              <form onSubmit={handleAddInvoice} className="space-y-4 text-xs font-bold text-[#1A1A1A]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] block">Supplier Roster</label>
                    <select
                      value={newInvoice.supplierId}
                      onChange={e => setNewInvoice({...newInvoice, supplierId: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    >
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] block">Invoice reference</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV/2026/089"
                      value={newInvoice.invoiceNo}
                      onChange={e => setNewInvoice({...newInvoice, invoiceNo: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#666666] uppercase text-[9px] block">Invoice total (INR)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 18500"
                    value={newInvoice.amount}
                    onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})}
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Log Bill Purchase
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
