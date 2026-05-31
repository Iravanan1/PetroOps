import React, { useState, useEffect } from 'react';
import { 
  Globe, Lock, ArrowRight, ShieldCheck, 
  RotateCw, AlertCircle, Sparkles, Server
} from 'lucide-react';
import { LocalCredentialVault } from '../services/LocalCredentialVault';
import { PortalSessionManager } from '../services/PortalSessionManager';

interface EmbeddedPortalBrowserProps {
  portalId: string;
  portalUrl: string;
  onLoginConfirmed: (username: string) => void;
  onDataParsed: (data: any) => void;
}

export default function EmbeddedPortalBrowser({
  portalId,
  portalUrl,
  onLoginConfirmed,
  onDataParsed
}: EmbeddedPortalBrowserProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSyncLog, setShowSyncLog] = useState(false);

  useEffect(() => {
    setUrlInput(portalUrl || `https://cris.hpcl.co.in/dealer-${portalId.toLowerCase()}`);
    // Check if vault contains cached login configs to autofill locally
    const masked = LocalCredentialVault.getPortalCredentialsMasked(portalId);
    if (masked.username) {
      setUsernameInput(masked.username);
      // Autofill masked password to simulate keychain
      if (masked.hasPasswordSaved) {
        setPasswordInput('••••••••••••');
      }
    } else {
      setUsernameInput('');
      setPasswordInput('');
    }
    setIsLoggedIn(false);
    setShowSyncLog(false);
  }, [portalId, portalUrl]);

  const handleSimulateNavigation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;

    // Secure local password store
    if (passwordInput !== '••••••••••••') {
      LocalCredentialVault.savePortalCredentials(portalId, usernameInput, passwordInput, urlInput);
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsLoggedIn(true);
      onLoginConfirmed(usernameInput);
      PortalSessionManager.establishSession(portalId, usernameInput);
    }, 800);
  };

  const handleTriggerSimulatedParse = () => {
    // Generate high-fidelity portal report simulation data (matching shift_demo_987 metrics)
    const simulatedPortalData = {
      measuredDensity: 745.2,
      upiSales: 18500,
      cardSales: 9000,
      openingCash: 12500,
      actualCash: 25022,
      creditSales: 14300,
      creditRecovery: 3200,
      expenses: 1500,
      nozzleReadings: [
        { nozzleId: 'nozzle-1', openingMeter: 12450.50, closingMeter: 12790.80, testingQty: 5.0, netSales: 335.30 },
        { nozzleId: 'nozzle-2', openingMeter: 8520.10, closingMeter: 8710.60, testingQty: 0.0, netSales: 190.50 }
      ]
    };
    setShowSyncLog(true);
    setTimeout(() => {
      onDataParsed(simulatedPortalData);
    }, 450);
  };

  return (
    <div className="border border-[#EBEBEA] rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col h-[520px] font-sans">
      
      {/* Browser address bar */}
      <div className="bg-[#FAF9F5] border-b border-[#EBEBEA] p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
        </div>

        <form onSubmit={handleSimulateNavigation} className="flex-1 flex gap-2 w-full">
          <div className="flex-1 flex items-center bg-white border border-[#D9D9D6] rounded-xl px-3 py-1.5 h-[36px]">
            <Lock className="w-3.5 h-3.5 text-emerald-600 mr-2" />
            <input 
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="text-[11px] font-mono font-semibold text-[#1A1A1A] w-full focus:outline-none"
            />
          </div>
          <button 
            type="submit"
            className="p-2 border border-[#EBEBEA] bg-white hover:bg-[#FAF9F5] rounded-xl cursor-pointer shadow-xs transition-colors h-[36px] flex items-center justify-center w-[36px]"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#666666] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Browser content area */}
      <div className="flex-1 bg-[#FAF9F5] p-6 relative overflow-y-auto flex items-center justify-center">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#EBEBEA] border-t-[#D35400] rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#666666]">Contacting Secure Portals...</span>
          </div>
        ) : !isLoggedIn ? (
          // Simulation Login Page
          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-6 shadow-sm max-w-sm w-full space-y-4 animate-fade-in">
            <div className="text-center pb-2 border-b border-[#EBEBEA]">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#666666]">{portalId} Dealer Gateway</span>
              <h4 className="text-xs font-black uppercase text-[#1A1A1A] mt-0.5">Please sign in manually</h4>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-3.5 text-xs font-bold text-[#1A1A1A]">
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider text-[#666666]">Dealer Username</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. MH_CRIS_HP"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-[#999999]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider text-[#666666]">Dealer Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-[#999999]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer h-[40px]"
              >
                Sign In Securely <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="text-[8px] text-center text-[#666666] font-bold leading-normal uppercase">
              🔐 Plaintext details are encrypted locally. Cloud logs bypassed.
            </div>
          </div>
        ) : (
          // Simulation Dashboard Table Extract Page
          <div className="w-full max-w-lg bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in self-start">
            <div className="flex justify-between items-center border-b border-[#EBEBEA] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <div>
                  <h5 className="text-[11px] font-black uppercase text-[#1A1A1A]">{portalId} Dealer Console</h5>
                  <span className="text-[8px] text-slate-500 font-mono font-bold block uppercase mt-0.5">Logged in as {usernameInput} // session active</span>
                </div>
              </div>
              
              <button
                onClick={handleTriggerSimulatedParse}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer h-[36px] flex items-center justify-center gap-1 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI Visual Extract
              </button>
            </div>

            {/* Simulated shift table page */}
            <div className="space-y-3 font-sans text-xs">
              <div className="bg-[#FAF9F5] border border-[#EBEBEA] p-3 rounded-xl flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 uppercase">SHIFT REGISTER SHEET: 2026-05-18</span>
                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-black">HPCL SEALED</span>
              </div>

              {/* Nozzles list */}
              <div className="border border-[#EBEBEA] rounded-xl overflow-hidden">
                <table className="w-full text-left text-[10px] font-bold text-slate-700">
                  <thead className="bg-[#FAF9F5] border-b border-[#EBEBEA] text-[8px] uppercase tracking-wider text-[#666666]">
                    <tr>
                      <th className="p-2">Nozzle</th>
                      <th className="p-2 text-right">Opening</th>
                      <th className="p-2 text-right">Closing</th>
                      <th className="p-2 text-right">Testing</th>
                      <th className="p-2 text-right">Net Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#EBEBEA]">
                      <td className="p-2 text-[#1A1A1A]">nozzle-1 (MS)</td>
                      <td className="p-2 text-right font-mono">12450.5</td>
                      <td className="p-2 text-right font-mono">12790.8</td>
                      <td className="p-2 text-right font-mono">5.0</td>
                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">335.3 L</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-[#1A1A1A]">nozzle-2 (HSD)</td>
                      <td className="p-2 text-right font-mono">8520.1</td>
                      <td className="p-2 text-right font-mono">8710.6</td>
                      <td className="p-2 text-right font-mono">0.0</td>
                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">190.5 L</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Settlement table */}
              <div className="grid grid-cols-2 gap-2 text-[9px] font-bold font-mono text-slate-600 bg-[#FAF9F5] border border-[#EBEBEA] p-3 rounded-xl">
                <div>Cash float: ₹12,500</div>
                <div>UPI Sales: ₹18,500</div>
                <div>Card Sales: ₹9,000</div>
                <div>Ledger Udhar: ₹14,300</div>
              </div>

              {showSyncLog && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-[10px] leading-relaxed flex gap-2 font-bold animate-pulse shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>Visual DOM extraction compiled successfully. Synced layout parameters with reconciliation matrix.</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
