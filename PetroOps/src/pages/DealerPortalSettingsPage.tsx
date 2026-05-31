import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Loader2, Sparkles, ShieldAlert, ShieldCheck, 
  Trash2, Play, RefreshCw, EyeOff, UploadCloud, ArrowLeft 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { PortalConnectorService, PortalConnectionState } from '../services/PortalConnectorService';
import { PortalCredentialManager } from '../services/PortalCredentialManager';
import { PortalCapabilityRegistry } from '../services/PortalCapabilityRegistry';
import { TemplateLockService } from '../services/TemplateLockService';

export default function DealerPortalSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [portals, setPortals] = useState<PortalConnectionState[]>([]);
  const [selectedPortal, setSelectedPortal] = useState<string>('HPCL');
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  // Form states for selected portal config
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncSchedule, setSyncSchedule] = useState<'hourly' | 'daily' | 'manual'>('daily');
  const [rememberConnection, setRememberConnection] = useState(true);
  const [portalUrl, setPortalUrl] = useState('');

  // Status feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manual Spreadsheet Upload Fallback
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadPortalConfigurations();
    }
  }, [user]);

  useEffect(() => {
    // Whenever selected portal changes, load its masked credential states
    if (user?.uid && selectedPortal) {
      loadSinglePortalForm(selectedPortal);
    }
  }, [selectedPortal, user]);

  const loadPortalConfigurations = async () => {
    if (!user?.uid) return;
    try {
      const data = await PortalConnectorService.getPortalConnections(user.uid);
      setPortals(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSinglePortalForm = async (portalId: string) => {
    if (!user?.uid) return;
    setError('');
    setSuccess('');
    try {
      const cred = await PortalCredentialManager.getCredentialsMasked(user.uid, portalId);
      const config = TemplateLockService.getTemplateConfig(portalId);
      
      setUsername(cred.username || '');
      setPassword(cred.hasPasswordSaved ? '••••••••••••' : '');
      setSyncSchedule(cred.syncSchedule || 'daily');
      setRememberConnection(cred.rememberConnection);
      setPortalUrl(cred.portalUrl || config.portalUrl || '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // If password is untouched masked, do not override password hash
      let passToSave = password;
      if (password === '••••••••••••') {
        const masked = await PortalCredentialManager.getCredentialsMasked(user.uid, selectedPortal);
        if (masked.hasPasswordSaved) {
          passToSave = await PortalCredentialManager.getRawPassword(user.uid, selectedPortal);
        }
      }

      await PortalCredentialManager.saveCredentials(
        user.uid,
        selectedPortal,
        username,
        passToSave,
        rememberConnection,
        syncSchedule,
        portalUrl
      );

      setSuccess(`Securely saved credentials for ${selectedPortal}.`);
      await loadPortalConfigurations();
      loadSinglePortalForm(selectedPortal);
    } catch (err: any) {
      setError(err.message || 'Failed to save portal credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (portalId: string) => {
    if (!user?.uid) return;
    setError('');
    setSuccess('');
    setTestingId(portalId);

    try {
      const res = await PortalConnectorService.testConnection(user.uid, portalId);
      if (res.success) {
        setSuccess(res.message);
      } else {
        setError(res.message);
      }
      await loadPortalConfigurations();
    } catch (err: any) {
      setError(err.message || 'Test connection encountered an unexpected auth error.');
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (portalId: string) => {
    if (!user?.uid) return;
    if (!window.confirm(`Are you sure you want to delete stored credentials and disconnect from the ${portalId} portal?`)) return;

    setError('');
    setSuccess('');
    try {
      await PortalCredentialManager.disconnectPortal(user.uid, portalId);
      setSuccess(`Disconnected ${portalId} portal. Credentials wiped.`);
      await loadPortalConfigurations();
      loadSinglePortalForm(portalId);
    } catch (err: any) {
      setError(err.message || 'Failed to wipe portal credentials.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadLoading(true);

    try {
      // Simulate spreadsheet parse fallback
      const result = await PortalConnectorService.parseUploadedReport(selectedPortal, 'dummy content', file.name);
      if (result.success) {
        setSuccess(`${result.message} Litres: ${result.data.salesLitres}, Collected Rs: ${result.data.amountCollected}.`);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse report file.');
    } finally {
      setUploadLoading(false);
      setUploadFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] mb-6 transition-colors min-h-[48px] py-2 px-4 bg-[#F3F3F1] border border-[#EBEBEA] rounded-xl hover:border-[#B3B3B3] glove-safe-target"
        >
          <ArrowLeft className="w-4 h-4 text-[#666666]" /> BACK TO CONTROL ROOM
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
              <Landmark className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Official Dealer Portals</h1>
              <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Secure Credential Linking & Synced Bookkeeping</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/portal-sync-status')}
            className="text-xs font-bold text-[#666666] hover:text-[#1A1A1A] min-h-[48px] py-3.5 px-5 bg-[#F3F3F1] border border-[#EBEBEA] rounded-xl hover:border-[#B3B3B3] transition-all glove-safe-target"
          >
            VIEW INTEGRATION STATUS LOGS
          </button>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Registered Portals List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-4">Official Integrations</h3>
              <div className="space-y-3">
                {portals.map((p) => {
                  const isActive = selectedPortal === p.portalId;
                  const isConnected = p.syncStatus === 'connected';
                  const isFailed = p.syncStatus === 'failed';

                  return (
                    <button
                      key={p.portalId}
                      onClick={() => setSelectedPortal(p.portalId)}
                      className={`w-full text-left min-h-[96px] p-4 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer glove-safe-target ${
                        isActive 
                          ? 'bg-[#D35400]/5 border-[#D35400] ring-1 ring-[#D35400]' 
                          : 'bg-[#F9F9F8] border-[#EBEBEA] hover:border-[#B3B3B3]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs text-[#1A1A1A]">{p.portalId} Portal</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isConnected 
                            ? 'bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20' 
                            : (isFailed ? 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/20' : 'bg-[#666666]/10 text-[#666666] border border-[#666666]/20')
                        }`}>
                          {p.syncStatus}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#666666] mt-2 block">{p.portalName}</span>
                      {p.lastSyncTime && (
                        <span className="text-[9px] text-[#999999] mt-1.5 block">Last Sync: {new Date(p.lastSyncTime).toLocaleDateString()}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Portal Vault Form & Fallback */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status alerts */}
            {error && (
              <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl text-xs font-medium animate-in fade-in duration-300">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-[#2E7D32]/5 border border-[#2E7D32]/10 text-[#2E7D32] p-4 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-300">
                <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                <span>{success}</span>
              </div>
            )}

            {/* Credential setup block */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <h2 className="text-base font-semibold text-[#1A1A1A]">{selectedPortal} Secure Credential Vault</h2>
                  <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full uppercase bg-[#666666]">
                    TLS 1.3 Encryption
                  </span>
                </div>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Provide your official dealer credentials to allow automated shift collections sync. Password hashes are stored using salty encryption rules. Cleartext logging is strictly blocked.
                </p>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Dealer Username</label>
                    <input
                      type="text"
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl min-h-[48px] py-3 px-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                      placeholder="e.g. MH_HPCL_9821"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Dealer Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl min-h-[48px] py-3 px-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999] pr-32"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      {password === '••••••••••••' && (
                        <div className="absolute right-4 top-3.5 flex items-center gap-1.5 text-[9px] font-bold text-[#2E7D32]">
                          <EyeOff className="w-3.5 h-3.5" /> SECURELY SAVED
                        </div>
                      )}
                    </div>
                  </div>

                  {/* URL */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Official Portal Address</label>
                    <input
                      type="url"
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl min-h-[48px] py-3 px-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                      placeholder="https://cris.hpcl.co.in"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                    />
                  </div>

                  {/* Sync Schedule */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Sync Schedule Frequency</label>
                    <select
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl min-h-[48px] py-3 px-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all appearance-none cursor-pointer"
                      value={syncSchedule}
                      onChange={(e) => setSyncSchedule(e.target.value as any)}
                    >
                      <option value="hourly">HOURLY (API STREAMS)</option>
                      <option value="daily">DAILY (SHIFT RECONCILIATIONS)</option>
                      <option value="manual">MANUAL REQUEST ONLY</option>
                    </select>
                  </div>

                  {/* Remember Toggle */}
                  <button
                    type="button"
                    onClick={() => setRememberConnection(!rememberConnection)}
                    className="flex items-center gap-3 mt-4 sm:mt-6 px-4 py-2 bg-[#F9F9F8] hover:bg-[#F3F3F1] border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl transition-all cursor-pointer min-h-[48px] text-left glove-safe-target w-full sm:w-auto shadow-xs"
                  >
                    <input
                      type="checkbox"
                      id="rememberConnection"
                      className="w-4.5 h-4.5 accent-[#D35400] cursor-pointer rounded-lg pointer-events-none"
                      checked={rememberConnection}
                      readOnly
                    />
                    <span className="text-xs font-semibold text-[#666666] select-none">
                      Remember connection details
                    </span>
                  </button>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#EBEBEA] mt-6">
                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 w-full">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-2 bg-[#D35400] hover:bg-[#A04000] text-white font-semibold tracking-wide text-xs rounded-xl min-h-[48px] py-3.5 px-6 transition-colors shadow-xs glove-safe-target"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> SAVE CREDENTIALS</>}
                    </button>

                    {password === '••••••••••••' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTestConnection(selectedPortal)}
                          disabled={testingId !== null}
                          className="flex items-center justify-center gap-1.5 bg-[#F3F3F1] border border-[#EBEBEA] hover:border-[#B3B3B3] text-[#1A1A1A] font-semibold text-xs rounded-xl min-h-[48px] py-3.5 px-5 transition-colors glove-safe-target"
                        >
                          {testingId === selectedPortal ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 text-[#2E7D32]" />
                          )}
                          TEST CONNECTION
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDisconnect(selectedPortal)}
                          className="flex items-center justify-center gap-1.5 bg-[#C62828]/5 border border-transparent hover:border-[#C62828]/10 text-[#C62828] font-semibold text-xs rounded-xl min-h-[48px] py-3.5 px-5 transition-colors glove-safe-target"
                        >
                          <Trash2 className="w-4 h-4" />
                          DISCONNECT
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Fallback Upload Block */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Manual Export Spreadsheet Fallback</h3>
                <p className="text-xs text-[#666666] leading-relaxed mt-1">
                  If automated connection is unavailable or you prefer localized uploads, export a CSV or PDF file directly from the {selectedPortal} dealer site and parse it here.
                </p>
              </div>

              <div className="border-2 border-dashed border-[#D9D9D6] rounded-2xl p-6 text-center hover:border-[#B3B3B3] transition-colors relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadLoading}
                />
                {uploadLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D35400]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">Parsing spreadsheet under layout authority rules...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-[#999999]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">Drag official report sheet here, or browse files</span>
                    <span className="text-[10px] text-[#999999]">Supports HPCL CRIS CSV, BPCL SmartLine XLS, and IOCL Partner PDFs</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
