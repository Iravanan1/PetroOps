import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Plus, Trash2, ShieldCheck, ArrowLeft, Loader2, Sparkles 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface UpiMerchant {
  id: string;
  provider: 'paytm' | 'phonepe' | 'bharatpe' | 'gpay' | 'sbi' | 'icici' | 'hdfc' | 'custom';
  merchantName: string;
  upiId: string;
  linkedBank: string;
  qrLabel: string;
  status: 'active' | 'inactive';
  notes: string;
  lastSync: string | null;
  settlementMapping: string;
}

export default function UpiMerchantsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [merchants, setMerchants] = useState<UpiMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [provider, setProvider] = useState<UpiMerchant['provider']>('paytm');
  const [merchantName, setMerchantName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [linkedBank, setLinkedBank] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [settlementMapping, setSettlementMapping] = useState('Daily Auto-Settlement');

  useEffect(() => {
    if (user?.uid) {
      loadMerchants();
    }
  }, [user]);

  const loadMerchants = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      if (isMockUser) {
        const stored = localStorage.getItem('mock_upi_merchants');
        if (stored) {
          setMerchants(JSON.parse(stored));
        } else {
          // Initialize mock merchants
          const initial: UpiMerchant[] = [
            {
              id: 'upi-1',
              provider: 'phonepe',
              merchantName: 'Siddhivinayak Fuels - MS',
              upiId: 'siddhivinayakfuels@ybl',
              linkedBank: 'State Bank of India (A/C: *8921)',
              qrLabel: 'Dispenser 1 - Main QR',
              status: 'active',
              notes: 'Primary QR terminal for Motor Spirit fuel sales.',
              lastSync: new Date().toISOString(),
              settlementMapping: 'Daily Auto-Settlement'
            },
            {
              id: 'upi-2',
              provider: 'paytm',
              merchantName: 'Siddhivinayak Fuels - HSD',
              upiId: 'siddhivinayakhsd@paytm',
              linkedBank: 'HDFC Bank (A/C: *4032)',
              qrLabel: 'Dispenser 2 - Heavy Vehicles QR',
              status: 'active',
              notes: 'Used at heavy vehicle lane for high quantity diesel transactions.',
              lastSync: new Date().toISOString(),
              settlementMapping: 'Manual Settlement Trigger'
            }
          ];
          localStorage.setItem('mock_upi_merchants', JSON.stringify(initial));
          setMerchants(initial);
        }
      } else {
        const docRef = doc(db, 'users', user.uid, 'settings', 'upi_merchants');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.merchants) {
          setMerchants(snap.data().merchants);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setError('');
    setSuccess('');
    setSaveLoading(true);

    try {
      if (!upiId.includes('@')) {
        throw new Error('Please enter a valid UPI ID (e.g. merchant@upi).');
      }

      const newMerchant: UpiMerchant = {
        id: `upi-${Date.now()}`,
        provider,
        merchantName,
        upiId,
        linkedBank,
        qrLabel,
        status: 'active',
        notes,
        lastSync: new Date().toISOString(),
        settlementMapping
      };

      const updated = [...merchants, newMerchant];
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      
      if (isMockUser) {
        localStorage.setItem('mock_upi_merchants', JSON.stringify(updated));
      } else {
        const docRef = doc(db, 'users', user.uid, 'settings', 'upi_merchants');
        await setDoc(docRef, { merchants: updated }, { merge: true });
      }

      setMerchants(updated);
      setSuccess(`Added new UPI QR terminal terminal successfully.`);

      // Reset form
      setMerchantName('');
      setUpiId('');
      setLinkedBank('');
      setQrLabel('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to register UPI terminal.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteMerchant = async (id: string) => {
    if (!user?.uid) return;
    if (!window.confirm('Are you sure you want to delete this UPI QR terminal merchant?')) return;

    setError('');
    setSuccess('');
    try {
      const updated = merchants.filter(m => m.id !== id);
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      
      if (isMockUser) {
        localStorage.setItem('mock_upi_merchants', JSON.stringify(updated));
      } else {
        const docRef = doc(db, 'users', user.uid, 'settings', 'upi_merchants');
        await setDoc(docRef, { merchants: updated }, { merge: true });
      }

      setMerchants(updated);
      setSuccess('Deleted UPI QR terminal.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete UPI terminal.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO CONTROL ROOM
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">UPI Merchant Terminals</h1>
              <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Configure QR Terminals & Settlements</p>
            </div>
          </div>
        </div>

        {/* Status alerts */}
        {error && (
          <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl text-xs font-medium mb-6 animate-in fade-in duration-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/10 text-[#2E7D32] p-4 rounded-2xl text-xs font-medium mb-6 flex items-center gap-2 animate-in fade-in duration-300">
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form left/middle */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Form card */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-base font-semibold text-[#1A1A1A] mb-4">Register New QR Terminal</h2>
              
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Provider */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">UPI Gateway Provider</label>
                    <select
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all appearance-none cursor-pointer min-h-[50px]"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as any)}
                    >
                      <option value="paytm">Paytm Merchant</option>
                      <option value="phonepe">PhonePe Merchant</option>
                      <option value="bharatpe">BharatPe</option>
                      <option value="gpay">Google Pay Business</option>
                      <option value="sbi">SBI QR</option>
                      <option value="icici">ICICI QR</option>
                      <option value="hdfc">HDFC QR</option>
                      <option value="custom">Custom Merchant</option>
                    </select>
                  </div>

                  {/* Merchant Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">Registered Business Name</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] min-h-[50px]"
                      placeholder="e.g. Siddhivinayak Fuels"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      required
                    />
                  </div>

                  {/* UPI ID */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">UPI Address / ID</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] min-h-[50px]"
                      placeholder="e.g. transaction@ybl"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                  </div>

                  {/* Linked Bank */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">Linked Bank Account</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] min-h-[50px]"
                      placeholder="e.g. State Bank of India (*8921)"
                      value={linkedBank}
                      onChange={(e) => setLinkedBank(e.target.value)}
                      required
                    />
                  </div>

                  {/* QR Label */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">Nozzle / Lane Label</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] min-h-[50px]"
                      placeholder="e.g. Dispenser Lane 1 MS"
                      value={qrLabel}
                      onChange={(e) => setQrLabel(e.target.value)}
                      required
                    />
                  </div>

                  {/* Settlement Mapping */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">Settlement Rule</label>
                    <select
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all appearance-none cursor-pointer min-h-[50px]"
                      value={settlementMapping}
                      onChange={(e) => setSettlementMapping(e.target.value)}
                    >
                      <option value="Daily Auto-Settlement">Daily Automated T+1</option>
                      <option value="Manual Settlement Trigger">Manual operator confirmation required</option>
                      <option value="Instant UPI settlement">Instant settlement to bank</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#4A4A4A] font-extrabold block ml-0.5">Integration Notes</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-2xl py-3 px-4 text-sm font-bold text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] min-h-[50px]"
                      placeholder="Optional notes for reconciling operators"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                </div>

                <div className="flex justify-end pt-4 border-t border-[#EBEBEA] mt-4">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center justify-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white font-black tracking-wider text-xs rounded-2xl min-h-[48px] px-6 transition-colors shadow-sm cursor-pointer"
                  >
                    {saveLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <><Plus className="w-4.5 h-4.5" /> ADD QR TERMINAL</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Active Terminal Roster right column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-4">Active QR Terminals</h3>
              <div className="space-y-3">
                {merchants.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#F9F9F8] border border-[#EBEBEA] p-4 rounded-2xl space-y-3 relative group"
                  >
                    <button
                      onClick={() => handleDeleteMerchant(m.id)}
                      className="absolute right-4 top-4 text-[#999999] hover:text-[#C62828] transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[#1a1a1a]">{m.qrLabel}</span>
                        <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full uppercase bg-[#2E7D32]">
                          Active
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666666] mt-0.5 block font-mono">{m.upiId}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-[#666666] leading-relaxed">
                      <div><span className="font-bold text-[#1A1A1A]">Gateway:</span> {m.provider.toUpperCase()}</div>
                      <div><span className="font-bold text-[#1A1A1A]">A/C:</span> {m.linkedBank}</div>
                      {m.notes && <div><span className="font-bold text-[#1A1A1A]">Notes:</span> {m.notes}</div>}
                    </div>
                  </div>
                ))}
                {merchants.length === 0 && (
                  <div className="text-center text-xs text-[#999999] py-8">No QR merchant terminals registered.</div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
