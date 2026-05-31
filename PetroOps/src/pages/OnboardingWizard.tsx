import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Fuel, Loader2, Sparkles, User, Phone, Building2, Landmark, MapPin, Shield, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingWizard() {
  const { user, setUser, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      console.warn("[Onboarding] No active user session, redirecting to login...");
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Profile
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');

  // Step 2: Station Metadata
  const [branchName, setBranchName] = useState(user?.branchName || user?.pumpName || '');
  const [gstNumber, setGstNumber] = useState(user?.gstNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [managerName, setManagerName] = useState(user?.managerName || '');

  // Step 3: OCR Template Authority Selection
  const [stationTemplate, setStationTemplate] = useState<'HPCL' | 'BPCL' | 'IOCL' | 'Nayara' | 'JioBP' | 'Shell' | 'Independent'>('HPCL');

  const petrolCompanies = [
    { id: 'HPCL', name: 'Hindustan Petroleum', desc: 'HPCL registers and daily layouts', color: '#094E96' },
    { id: 'BPCL', name: 'Bharat Petroleum', desc: 'BPCL standard daily statements', color: '#00703C' },
    { id: 'IOCL', name: 'Indian Oil Corporation', desc: 'IOCL manual/automated entries', color: '#FF6600' },
    { id: 'Nayara', name: 'Nayara Energy', desc: 'Nayara modern layout registry', color: '#FF0000' },
    { id: 'JioBP', name: 'Jio-BP Venture', desc: 'JioBP formats and structures', color: '#002F6C' },
    { id: 'Shell', name: 'Shell India', desc: 'Shell global retail template', color: '#FFD500' },
    { id: 'Independent', name: 'Independent Outlet', desc: 'Custom grid mappings and formats', color: '#555555' }
  ] as const;

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!name.trim()) return setError('Full name is required.');
      if (!phone.trim() || phone.length < 10) return setError('A valid 10-digit mobile number is required.');
      setStep(2);
    } else if (step === 2) {
      if (!branchName.trim()) return setError('Branch or station name is required.');
      if (!gstNumber.trim()) return setError('GST number is required.');
      if (!address.trim()) return setError('Full address is required.');
      if (!managerName.trim()) return setError('Manager name is required.');
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCompleteOnboarding = async () => {
    if (!user) {
      setError('No active authentication session found.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const updatedProfile = {
        displayName: name,
        name,
        phone,
        phoneNumber: phone,
        pumpName: branchName,
        branchName,
        gstNumber,
        address,
        managerName,
        stationTemplate,
        onboardingComplete: true,
        role: user.role || 'owner',
        updatedAt: new Date().toISOString()
      };

      // Skip Firestore write for staging bypass sessions to ensure 100% offline development speed
      const isMockUser = user.uid.startsWith('dev-') || user.uid.startsWith('demo-') || user.uid.startsWith('otp-') || user.uid.startsWith('apple-');
      
      if (!isMockUser) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updatedProfile, { merge: true });
      }

      // Merge Firestore details with active Zustand store user state
      const extendedUser = {
        ...user,
        ...updatedProfile,
        getIdToken: user.getIdToken
      };

      localStorage.setItem("petroops_onboarding_complete", "true");
      setUser(extendedUser, user.role || 'owner');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to finalize your station onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] flex flex-col justify-between p-6 sm:p-12 font-sans relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#D35400]/5 blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
            <Fuel className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">Petro<span className="text-[#D35400]">Ops</span></span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-[#666666] bg-[#F3F3F1] px-3 py-1.5 rounded-full border border-[#EBEBEA]">
            STEP {step} OF 3
          </span>
        </div>
      </div>

      {/* Wizard Card Container */}
      <div className="w-full max-w-2xl mx-auto my-auto py-8 z-10">
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-8 sm:p-10 shadow-sm transition-all duration-300">
          
          {/* Progress bar */}
          <div className="w-full bg-[#F3F3F1] h-1.5 rounded-full mb-8 overflow-hidden">
            <div 
              className="bg-[#D35400] h-full transition-all duration-500 ease-out" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {error && (
            <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl mb-6 text-xs font-medium animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* STEP 1: Profile Setup */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Personal Profile</h2>
                <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                  Establish your administrator credentials and preferred notification contact point.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Your Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                      placeholder="e.g. Shreyansh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Contact Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
                    <input
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                      placeholder="Enter 10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Station Metadata */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Station Specifications</h2>
                <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                  Provide enterprise operational parameters required for legal GST compliance and reports.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Branch/Station Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                      placeholder="e.g. Potaliya Petroleum"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">GST Identification Number</label>
                  <div className="relative">
                    <Landmark className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
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

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Full Station Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
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

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Assigned Manager Name</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-4 w-4 h-4 text-[#999999]" />
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
              </div>
            </div>
          )}

          {/* STEP 3: OCR Template Authority Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">OCR Template Authority</h2>
                <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                  Select your retail fuel company. To ensure 100% processing accuracy, PetroOps locks the OCR layout extraction zone mapping to this template authority. Auto-detection is disabled.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {petrolCompanies.map((company) => {
                  const isSelected = stationTemplate === company.id;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => setStationTemplate(company.id)}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#D35400]/5 border-[#D35400] ring-1 ring-[#D35400]' 
                          : 'bg-[#F9F9F8] border-[#EBEBEA] hover:border-[#B3B3B3]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm text-[#1A1A1A]">{company.id}</span>
                        <div 
                          className="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                          style={{ borderColor: isSelected ? '#D35400' : '#CCCCCC' }}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#D35400]" />}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[#666666] mt-1 block">{company.name}</span>
                      <span className="text-[10px] text-[#999999] mt-2 block font-normal leading-tight">{company.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#EBEBEA]">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4" /> PREVIOUS STEP
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white font-semibold tracking-wide text-xs rounded-xl py-3 px-5 transition-colors shadow-xs"
              >
                CONTINUE <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={loading}
                className="flex items-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white font-semibold tracking-wide text-xs rounded-xl py-3 px-6 transition-colors shadow-xs disabled:opacity-55"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> INITIALIZE SYSTEM</>}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#999999] gap-4 z-10 border-t border-[#EBEBEA]/60 pt-6">
        <p className="font-medium">© 2026 PetroOps Systems Inc. All rights reserved.</p>
        <div className="flex gap-6 font-medium">
          <a href="#" className="hover:text-[#666666] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#666666] transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-[#666666] transition-colors">Help & Audit Support</a>
        </div>
      </div>
    </div>
  );
}
