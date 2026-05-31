import React, { useState, useEffect } from 'react';
import { 
  Building2, Server, Key, ShieldCheck, Play, 
  HelpCircle, CheckCircle2, RefreshCw, Landmark, Sparkles, FileText, Activity
} from 'lucide-react';
import EmbeddedPortalBrowser from '../components/EmbeddedPortalBrowser';
import AIExtractionOverlay from '../components/AIExtractionOverlay';
import PortalReconciliationPanel from '../components/PortalReconciliationPanel';
import { PortalSessionManager, ConnectionStatus } from '../services/PortalSessionManager';
import { LocalCredentialVault } from '../services/LocalCredentialVault';
import { PortalWorkspaceVerification, VerificationSuiteResult } from '../services/PortalWorkspaceVerification';
import { ClaudeTheme } from '../../../design-system/ClaudeInspiredTheme';

export default function PortalWorkspace() {
  const [selectedPortal, setSelectedPortal] = useState<string>('HPCL');
  const [portalUrl, setPortalUrl] = useState('');
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [showHUD, setShowHUD] = useState(false);
  const [showRecon, setShowRecon] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Programmatic Security & Validation Audit states
  const [auditResult, setAuditResult] = useState<VerificationSuiteResult | null>(null);
  const [selectedReportTab, setSelectedReportTab] = useState<'extraction' | 'security' | 'reconciliation'>('extraction');
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    setPortalUrl(selectedPortal === 'HPCL' ? 'https://cris.hpcl.co.in' : `https://partner.${selectedPortal.toLowerCase()}.co.in`);
    setConnectionStatus(PortalSessionManager.getPortalStatus(selectedPortal));
    setExtractedData(null);
    setShowHUD(false);
    setShowRecon(false);
  }, [selectedPortal]);

  const handleLoginConfirmed = (username: string) => {
    setActiveUsername(username);
    setConnectionStatus(PortalSessionManager.getPortalStatus(selectedPortal));
    setSuccessToast(`Manually authenticated as ${username}. Session isolated locally!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDataParsed = (data: any) => {
    setExtractedData(data);
    setShowHUD(true);
    setTimeout(() => {
      setShowHUD(false);
      setShowRecon(true);
    }, 1500); // Visual HUD displays for 1.5 seconds to simulate layout neural anchor
  };

  const handleReconcileApproved = (approvedValues: any) => {
    setSuccessToast(`✔ Ledgers finalized. Approved values matching locked genesis seals!`);
    setTimeout(() => {
      setSuccessToast(null);
      setShowRecon(false);
      setExtractedData(null);
    }, 2500);
  };

  const handleRevoke = () => {
    PortalSessionManager.revokeSession(selectedPortal);
    setConnectionStatus(PortalSessionManager.getPortalStatus(selectedPortal));
    setActiveUsername(null);
    setExtractedData(null);
    setShowRecon(false);
    setSuccessToast(`Local credentials disconnected. Cache wiped.`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleRunPortalAudit = () => {
    setIsAuditing(true);
    setAuditResult(null);
    setTimeout(() => {
      const res = PortalWorkspaceVerification.runPortalValidationSuite();
      setAuditResult(res);
      setIsAuditing(false);
      setSuccessToast(`Security audit verification suite run successfully!`);
      setTimeout(() => setSuccessToast(null), 3000);
    }, 850);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans selection:bg-[#D35400]/20 selection:text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Dynamic Success Toasts */}
        {successToast && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className="bg-white border border-[#2E7D32]/40 rounded-xl p-4 shadow-xl flex items-center gap-3 max-w-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
              <div>
                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Action Approved</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">{successToast}</p>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400] border border-[#D35400]/20">
              <Server className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Universal AI Portal Workspace
              </h1>
              <p className="text-xs text-[#666666] mt-0.5 uppercase tracking-wider font-bold">
                Embedded browser portal visual parsing tools and offline secure reconciliations.
              </p>
            </div>
          </div>

          {/* Portal Selector tabs */}
          <div className="flex flex-wrap gap-1 bg-[#F3F3F1] p-1 rounded-xl border border-[#EBEBEA]">
            {['HPCL', 'BPCL', 'IOCL', 'Nayara', 'Jio-bp'].map(portal => (
              <button
                key={portal}
                onClick={() => setSelectedPortal(portal)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedPortal === portal
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'text-[#666666] hover:bg-[#FAF9F5] hover:text-[#1A1A1A]'
                }`}
              >
                {portal}
              </button>
            ))}
          </div>
        </div>

        {/* Global Connection Stats Header */}
        {connectionStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-32">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Linked Status</span>
              <div>
                <span className={`text-2xl font-black ${
                  connectionStatus.connected ? 'text-emerald-800' : 'text-slate-800'
                }`}>{connectionStatus.connected ? 'ACTIVE SESSION' : 'OFFLINE MODE'}</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                  {connectionStatus.connected ? `Logged in as: ${connectionStatus.username}` : 'Manual operator login required'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-32">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Vault Encryption</span>
              <div>
                <span className="text-2xl font-black text-emerald-800">SECURE LOCAL</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                  Credentials stored on local vault. Remote sync blocked.
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-32 relative">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Session Lifetime</span>
              <div>
                <span className="text-2xl font-black text-[#1A1A1A]">
                  {connectionStatus.connected ? `${connectionStatus.sessionAgeMinutes || 0}m Elapsed` : 'No Active Session'}
                </span>
                <span className="text-[9px] block text-[#666666] mt-1 font-bold">
                  {connectionStatus.connected ? (
                    <button 
                      onClick={handleRevoke}
                      className="text-rose-700 hover:text-rose-900 uppercase font-black tracking-wider transition-colors inline-block cursor-pointer"
                    >
                      Revoke Credentials & Wipes Cache
                    </button>
                  ) : (
                    'Authenticate to establish local session'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Secure Validation Audit Deck */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#EBEBEA] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-black text-[#1A1A1A] tracking-wider">Secure Workspace Compliance Audit Deck</h3>
                <p className="text-[10px] text-[#666666] uppercase tracking-wider font-bold mt-0.5">Programmatic verification of data privacy, local-only storage, session lifetimes, and comparative reconciliations.</p>
              </div>
            </div>
            
            <button
              onClick={handleRunPortalAudit}
              disabled={isAuditing}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition-all ${
                isAuditing 
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                  : 'bg-[#D35400] text-white hover:bg-[#E55B00]'
              }`}
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Performing Security Calculations...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Run Portal Validation Audit
                </>
              )}
            </button>
          </div>

          {/* Audit Results Dashboard */}
          {auditResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Checks list (2 cols on lg) */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#666666] mb-1">Audit Assertion Checklist</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditResult.checks.map(check => (
                    <div 
                      key={check.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        check.passed 
                          ? 'bg-emerald-50/20 border-emerald-100/60 text-[#1A1A1A]' 
                          : 'bg-rose-50/20 border-rose-100/60 text-[#1A1A1A]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${check.passed ? 'text-emerald-700' : 'text-rose-700'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#1A1A1A]">{check.name}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded uppercase bg-[#FAF9F5] text-slate-500 border border-[#EBEBEA]">{check.category}</span>
                          </div>
                          <p className="text-[9px] text-[#666666] uppercase mt-1 leading-normal font-bold">{check.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reports Panel (1 col on lg) */}
              <div className="bg-[#FAF9F5] border border-[#EBEBEA] rounded-2xl p-5 flex flex-col h-[340px]">
                <div className="flex gap-1 border-b border-[#EBEBEA] pb-3 mb-4 shrink-0">
                  {(['extraction', 'security', 'reconciliation'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSelectedReportTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        selectedReportTab === tab
                          ? 'bg-[#1A1A1A] text-white'
                          : 'text-[#666666] hover:bg-white hover:text-[#1A1A1A]'
                      }`}
                    >
                      {tab} Report
                    </button>
                  ))}
                </div>

                {/* Report Content */}
                <div className="flex-1 overflow-y-auto pr-1 text-[10px] text-[#1A1A1A] font-medium leading-relaxed font-sans uppercase">
                  {selectedReportTab === 'extraction' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black border-b border-dashed border-[#EBEBEA] pb-2 text-[#0A3D62] flex items-center gap-1.5"><FileText className="w-4 h-4" /> Extraction Accuracy</h4>
                      <div className="whitespace-pre-line font-mono font-bold leading-normal text-[9px] text-[#2E7D32]">
                        {auditResult.reports.extraction}
                      </div>
                    </div>
                  )}

                  {selectedReportTab === 'security' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black border-b border-dashed border-[#EBEBEA] pb-2 text-[#0A3D62] flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Credential Security</h4>
                      <div className="whitespace-pre-line font-mono font-bold leading-normal text-[9px] text-[#2E7D32]">
                        {auditResult.reports.security}
                      </div>
                    </div>
                  )}

                  {selectedReportTab === 'reconciliation' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black border-b border-dashed border-[#EBEBEA] pb-2 text-[#0A3D62] flex items-center gap-1.5"><Activity className="w-4 h-4" /> Mismatch Reconciles</h4>
                      <div className="whitespace-pre-line font-mono font-bold leading-normal text-[9px] text-[#2E7D32]">
                        {auditResult.reports.reconciliation}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Workstation */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          
          {/* LEFT: Simulated Embedded browser frame */}
          <div className="relative">
            <EmbeddedPortalBrowser
              portalId={selectedPortal}
              portalUrl={portalUrl}
              onLoginConfirmed={handleLoginConfirmed}
              onDataParsed={handleDataParsed}
            />

            {/* AI neural segmenter overlay */}
            <AIExtractionOverlay
              visible={showHUD}
              onClose={() => setShowHUD(false)}
            />
          </div>

          {/* RIGHT: Multi-source reconciliation panels */}
          <div className="space-y-6">
            {showRecon && extractedData ? (
              <PortalReconciliationPanel
                portalData={extractedData}
                onApprove={handleReconcileApproved}
              />
            ) : (
              <div className="border border-[#EBEBEA] rounded-2xl bg-white p-12 text-center text-xs font-bold text-[#999999] flex flex-col items-center justify-center gap-3.5 h-[520px]">
                <Sparkles className="w-10 h-10 text-[#B3B3B3] animate-pulse-slow" />
                <div>
                  <h4 className="text-sm font-black text-[#1A1A1A] uppercase">Awaiting Visual DOM Extraction</h4>
                  <p className="text-[10px] text-[#666666] leading-relaxed mt-1 uppercase max-w-xs mx-auto">
                    Manually sign in to the dealer portal frame on the left, then click "AI Visual Extract" to run comparisons with your scanned OCR worksheets.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
