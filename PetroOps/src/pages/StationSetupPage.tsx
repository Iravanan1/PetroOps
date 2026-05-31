import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Fuel, Loader2, Sparkles, Building2, Landmark, MapPin, User, ShieldCheck } from 'lucide-react';

export default function StationSetupPage() {
  const { user, setUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form states initialized from user session
  const [branchName, setBranchName] = useState(user?.branchName || user?.pumpName || '');
  const [gstNumber, setGstNumber] = useState(user?.gstNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [managerName, setManagerName] = useState(user?.managerName || '');
  const [stationTemplate, setStationTemplate] = useState(user?.stationTemplate || 'HPCL');

  const petrolCompanies = [
    { id: 'HPCL', name: 'Hindustan Petroleum (HPCL)' },
    { id: 'BPCL', name: 'Bharat Petroleum (BPCL)' },
    { id: 'IOCL', name: 'Indian Oil Corporation (IOCL)' },
    { id: 'Nayara', name: 'Nayara Energy (Nayara)' },
    { id: 'JioBP', name: 'Jio-BP Venture (JioBP)' },
    { id: 'Shell', name: 'Shell India (Shell)' },
    { id: 'Independent', name: 'Independent Outlet (CUSTOM)' }
  ] as const;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('No active authentication session found.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedFields = {
        pumpName: branchName,
        branchName,
        gstNumber,
        address,
        managerName,
        stationTemplate,
        updatedAt: new Date().toISOString()
      };

      // Skip Firestore write for staging bypass sessions to ensure 100% offline development speed
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      
      if (!isMockUser) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updatedFields, { merge: true });
      }

      // Merge updated fields back into Zustand store session state
      const extendedUser = {
        ...user,
        ...updatedFields,
        getIdToken: user.getIdToken
      };

      setUser(extendedUser, user.role || 'owner');
      setSuccess('Station metadata updated successfully in real-time.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update station metadata settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header section */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
            <Fuel className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Station Setup</h1>
            <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Configure OCR Authority & Metadata</p>
          </div>
        </div>

        {/* Form container */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300">
          
          <div className="mb-6">
            <h2 className="text-base font-semibold text-[#1A1A1A]">Enterprise Settings</h2>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              Verify compliance configurations, physical addresses, and the locked petrol company OCR template authority.
            </p>
          </div>

          {/* Banner messages */}
          {error && (
            <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl mb-6 text-xs font-medium animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/10 text-[#2E7D32] p-4 rounded-2xl mb-6 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-300">
              <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Input grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Branch/Station Name */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Branch/Station Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                  <input
                    type="text"
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                    placeholder="e.g. Siddhivinayak Fuels"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* GST Identification Number */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">GST Identification Number</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                  <input
                    type="text"
                    maxLength={15}
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] uppercase"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Full Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Full Station Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                  <input
                    type="text"
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                    placeholder="e.g. Plot 42, Highway Link Road, Mumbai, MH"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Manager Name */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Assigned Manager Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                  <input
                    type="text"
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                    placeholder="e.g. Rajesh Patil"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Locked Petrol Company Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Petrol Company OCR Template</label>
                <div className="relative">
                  <Fuel className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                  <select
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-8 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all appearance-none cursor-pointer"
                    value={stationTemplate}
                    onChange={(e) => setStationTemplate(e.target.value as any)}
                    required
                  >
                    {petrolCompanies.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-[#1A1A1A] font-medium">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-4.5 pointer-events-none text-[#999999]">
                    ▼
                  </div>
                </div>
              </div>

            </div>

            {/* Warning reminder */}
            <div className="bg-[#D35400]/5 border border-[#D35400]/10 rounded-2xl p-4 text-xs text-[#666666] leading-relaxed">
              <span className="font-semibold text-[#D35400] block mb-1">⚠️ OCR Template Authority Lock</span>
              Modifying the petrol company template locks the entire OCR scanner, layout engine, and region visualizers to the new company's form fields. Manual layout auto-detection is fully bypassed.
            </div>

            {/* Action button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white font-semibold tracking-wide text-xs rounded-xl py-3 px-6 transition-colors shadow-xs disabled:opacity-55"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> SAVE CHANGES</>}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
