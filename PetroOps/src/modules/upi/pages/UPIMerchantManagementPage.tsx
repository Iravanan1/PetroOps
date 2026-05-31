import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UPIMerchant, QRProvider } from '../../../types/UPIMerchant';
import { 
  QrCode, Plus, Edit, ShieldCheck, ShieldAlert, 
  Search, Landmark, Filter, CheckCircle, RefreshCw,
  TrendingUp, Layers, ChevronRight, Check, X, AlertTriangle
} from 'lucide-react';

const DEFAULT_MERCHANTS: UPIMerchant[] = [
  {
    id: 'mer-paytm-01',
    provider: 'Paytm',
    name: 'Potaliya Petroleum Paytm Primary',
    upiId: '9530140836@paytm',
    linkedBank: 'Paytm Payments Bank',
    qrLabel: 'Main Office Counter Paytm QR',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mer-phonepe-02',
    provider: 'PhonePe',
    name: 'Potaliya Petroleum PhonePe Reserve',
    upiId: 'potaliya.petro@ybl',
    linkedBank: 'Yes Bank',
    qrLabel: 'Nozzle Counter PhonePe QR',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mer-sbi-03',
    provider: 'SBI QR',
    name: 'Potaliya Petroleum SBI Main',
    upiId: '9530140836@ptsbi',
    linkedBank: 'State Bank of India',
    qrLabel: 'SBI Main Counter QR',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mer-hdfc-04',
    provider: 'HDFC SmartHub',
    name: 'Potaliya Petroleum HDFC Backup',
    upiId: 'potaliya.hdfc@hdfcbank',
    linkedBank: 'HDFC Bank',
    qrLabel: 'HDFC SmartHub Secondary QR',
    active: false,
    createdAt: new Date().toISOString()
  }
];

const PROVIDERS: QRProvider[] = [
  'Paytm', 'PhonePe', 'BharatPe', 'Google Pay Business', 
  'SBI QR', 'ICICI QR', 'HDFC SmartHub', 'Custom UPI'
];

export default function UPIMerchantManagementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load merchants from localStorage
  const [merchants, setMerchants] = useState<UPIMerchant[]>([]);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [groupBy, setGroupBy] = useState<'none' | 'provider' | 'bank' | 'status'>('none');

  // Selected merchant for preview card
  const [selectedMerchant, setSelectedMerchant] = useState<UPIMerchant | null>(null);

  // Edit/Add Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formProvider, setFormProvider] = useState<QRProvider>('Paytm');
  const [formName, setFormName] = useState('');
  const [formUpiId, setFormUpiId] = useState('');
  const [formLinkedBank, setFormLinkedBank] = useState('');
  const [formQrLabel, setFormQrLabel] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Daily mock collections (to present settlement summaries and daily collection totals)
  const [mockCollections, setMockCollections] = useState<Record<string, number>>({
    'mer-paytm-01': 48600,
    'mer-phonepe-02': 18200,
    'mer-sbi-03': 34500,
    'mer-hdfc-04': 0
  });

  // Load initial merchants
  useEffect(() => {
    const localRaw = localStorage.getItem('pumpai_upi_merchants');
    let loaded: UPIMerchant[] = [];
    if (!localRaw) {
      localStorage.setItem('pumpai_upi_merchants', JSON.stringify(DEFAULT_MERCHANTS));
      loaded = DEFAULT_MERCHANTS;
    } else {
      try {
        loaded = JSON.parse(localRaw);
      } catch {
        loaded = DEFAULT_MERCHANTS;
      }
    }
    setMerchants(loaded);
    
    // Automatically select the first merchant for QR preview
    if (loaded.length > 0 && !selectedMerchant) {
      setSelectedMerchant(loaded[0]);
    }
  }, []);

  // Handle URL route ID parameter for deep-linking (/upi-management/:id)
  useEffect(() => {
    if (id && merchants.length > 0) {
      const match = merchants.find(m => m.id === id);
      if (match) {
        handleOpenEdit(match);
      }
    }
  }, [id, merchants]);

  const saveMerchantsToStorage = (updatedList: UPIMerchant[]) => {
    localStorage.setItem('pumpai_upi_merchants', JSON.stringify(updatedList));
    setMerchants(updatedList);
  };

  const handleOpenAdd = () => {
    setDrawerMode('add');
    setEditingId(null);
    setFormProvider('Paytm');
    setFormName('');
    setFormUpiId('');
    setFormLinkedBank('');
    setFormQrLabel('');
    setFormActive(true);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (merchant: UPIMerchant) => {
    setDrawerMode('edit');
    setEditingId(merchant.id);
    setFormProvider(merchant.provider);
    setFormName(merchant.name);
    setFormUpiId(merchant.upiId);
    setFormLinkedBank(merchant.linkedBank);
    setFormQrLabel(merchant.qrLabel);
    setFormActive(merchant.active);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleToggleActive = (merchant: UPIMerchant) => {
    const updated = merchants.map(m => {
      if (m.id === merchant.id) {
        return { ...m, active: !m.active };
      }
      return m;
    });
    saveMerchantsToStorage(updated);
    if (selectedMerchant?.id === merchant.id) {
      setSelectedMerchant(prev => prev ? { ...prev, active: !prev.active } : null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return setFormError('Merchant Name is required');
    if (!formUpiId.trim() || !formUpiId.includes('@')) return setFormError('Valid UPI ID is required (must contain @)');
    if (!formLinkedBank.trim()) return setFormError('Linked Bank Name is required');
    if (!formQrLabel.trim()) return setFormError('QR Location/Counter Label is required');

    if (drawerMode === 'add') {
      const newMerchant: UPIMerchant = {
        id: 'mer-' + Math.random().toString(36).substr(2, 9),
        provider: formProvider,
        name: formName.trim(),
        upiId: formUpiId.trim(),
        linkedBank: formLinkedBank.trim(),
        qrLabel: formQrLabel.trim(),
        active: formActive,
        createdAt: new Date().toISOString()
      };
      
      const updated = [...merchants, newMerchant];
      saveMerchantsToStorage(updated);
      setSelectedMerchant(newMerchant);
      
      // Seed mock collection for the new merchant
      setMockCollections(prev => ({
        ...prev,
        [newMerchant.id]: 0
      }));
    } else {
      const updated = merchants.map(m => {
        if (m.id === editingId) {
          return {
            ...m,
            provider: formProvider,
            name: formName.trim(),
            upiId: formUpiId.trim(),
            linkedBank: formLinkedBank.trim(),
            qrLabel: formQrLabel.trim(),
            active: formActive
          };
        }
        return m;
      });
      saveMerchantsToStorage(updated);
      
      const matched = updated.find(m => m.id === editingId);
      if (matched) setSelectedMerchant(matched);
    }

    setIsDrawerOpen(false);
    navigate('/upi-management'); // Clear the route :id if editing
  };

  // Calculations for summaries
  const totalCollections = (Object.values(mockCollections) as number[]).reduce((sum, val) => sum + val, 0);
  const activeCount = merchants.filter(m => m.active).length;
  const inactiveCount = merchants.filter(m => !m.active).length;

  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.upiId.toLowerCase().includes(search.toLowerCase()) ||
      m.linkedBank.toLowerCase().includes(search.toLowerCase()) ||
      m.qrLabel.toLowerCase().includes(search.toLowerCase());
      
    const matchesProvider = filterProvider === 'ALL' || m.provider === filterProvider;
    const matchesStatus = 
      filterStatus === 'ALL' || 
      (filterStatus === 'ACTIVE' && m.active) || 
      (filterStatus === 'INACTIVE' && !m.active);

    return matchesSearch && matchesProvider && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-8 font-sans transition-colors duration-200">
      
      {/* Route Navigation Breadcrumb */}
      <div className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold mb-3">
        System Setup &gt; UPI Merchant Workspace
      </div>

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-[#E4E4E7] pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#18181B] flex items-center gap-2">
            <QrCode className="w-8 h-8 text-indigo-600" /> Multiple UPI QR Workspace
          </h1>
          <p className="text-xs text-[#71717A] mt-1 font-medium">
            Manage operational UPI QR terminals, assign providers, inspect linked settlement banks, and review shift collection grouping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Simulate settlement sync
              setMockCollections(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(k => {
                  const m = merchants.find(mer => mer.id === k);
                  if (m && m.active) {
                    updated[k] = Math.round(updated[k] + (Math.random() * 5000));
                  }
                });
                return updated;
              });
            }}
            className="px-4 py-2 bg-white border border-[#E4E4E7] hover:border-[#A1A1AA] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" /> Force Settlements Sync
          </button>
          
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1 shadow-md hover:shadow-indigo-100 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Merchant QR
          </button>
        </div>
      </div>

      {/* Settlement Summaries & Totals widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-white p-5 rounded-2xl border border-[#E4E4E7] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#71717A]">Today's Summed collections</span>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">₹ {totalCollections.toLocaleString()}</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-3">
            <TrendingUp className="w-3 h-3" /> Real-time active QR streams
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E4E7] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#71717A]">Active Merchant Terminals</span>
            <h3 className="text-2xl font-black text-[#18181B] mt-1">{activeCount} Terminals</h3>
          </div>
          <div className="text-[10px] text-[#71717A] font-medium mt-3">
            Receiving live digital shifts splits
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E4E7] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#71717A]">Deactivated Backups</span>
            <h3 className="text-2xl font-black text-[#71717A] mt-1">{inactiveCount} Dormant</h3>
          </div>
          <div className="text-[10px] text-[#A1A1AA] font-medium mt-3">
            Available for rotation or emergency
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E4E7] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#71717A]">Linked Settlement Banks</span>
            <h3 className="text-2xl font-black text-indigo-700 mt-1">
              {new Set(merchants.map(m => m.linkedBank)).size} Accounts
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#71717A] font-bold mt-3">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" /> Auto-sweep settlements daily
          </div>
        </div>

      </div>

      {/* Main Workspace Grid: Left list controls & Right interactive QR preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Merchant management list & Search grouping filters */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-3xl border border-[#E4E4E7] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search merchants, bank..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Providers & Status dropdown filters */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
              
              <div className="flex items-center gap-1.5 bg-[#F9F9F8] px-2.5 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <select
                  value={filterProvider}
                  onChange={e => setFilterProvider(e.target.value)}
                  className="bg-transparent focus:outline-none border-none text-[11px] font-bold cursor-pointer"
                >
                  <option value="ALL">All QR Brands</option>
                  {PROVIDERS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F9F9F8] px-2.5 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="bg-transparent focus:outline-none border-none text-[11px] font-bold cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active QR</option>
                  <option value="INACTIVE">Deactivated</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F9F9F8] px-2.5 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-semibold">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none border-none text-[11px] font-bold cursor-pointer"
                >
                  <option value="none">Group By: None</option>
                  <option value="provider">Group: QR Brand</option>
                  <option value="bank">Group: Linked Bank</option>
                  <option value="status">Group: Status</option>
                </select>
              </div>

            </div>

          </div>

          {/* Merchants Grid */}
          <div className="space-y-4">
            {groupBy === 'none' ? (
              // Standard Grid
              filteredMerchants.length === 0 ? (
                <div className="bg-white py-16 text-center rounded-3xl border border-[#E4E4E7] text-[#71717A] text-xs font-medium">
                  No UPI Merchants matching criteria found. Click "Add Merchant" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMerchants.map(m => (
                    <MerchantListItem
                      key={m.id}
                      merchant={m}
                      collection={mockCollections[m.id] || 0}
                      isSelected={selectedMerchant?.id === m.id}
                      onSelect={() => setSelectedMerchant(m)}
                      onEdit={() => handleOpenEdit(m)}
                      onToggleActive={() => handleToggleActive(m)}
                    />
                  ))}
                </div>
              )
            ) : (
              // Grouped Render Layout (Reconciliation Grouping)
              (() => {
                const groups: Record<string, UPIMerchant[]> = {};
                filteredMerchants.forEach(m => {
                  let key = '';
                  if (groupBy === 'provider') key = m.provider;
                  else if (groupBy === 'bank') key = m.linkedBank;
                  else if (groupBy === 'status') key = m.active ? 'Active QR Terminals' : 'Deactivated QR Terminals';
                  
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(m);
                });

                return Object.keys(groups).map(gName => {
                  const grpSum = groups[gName].reduce((s, mer) => s + (mockCollections[mer.id] || 0), 0);
                  return (
                    <div key={gName} className="space-y-3">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-black uppercase text-[#52525B] tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" /> {gName} ({groups[gName].length})
                        </span>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          Group Collection: ₹{grpSum.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groups[gName].map(m => (
                          <MerchantListItem
                            key={m.id}
                            merchant={m}
                            collection={mockCollections[m.id] || 0}
                            isSelected={selectedMerchant?.id === m.id}
                            onSelect={() => setSelectedMerchant(m)}
                            onEdit={() => handleOpenEdit(m)}
                            onToggleActive={() => handleToggleActive(m)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>

        </div>

        {/* Right Side: Visual QR Code Preview Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#E4E4E7] shadow-sm text-center relative overflow-hidden flex flex-col items-center">
            
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600" />
            
            <span className="text-[9px] uppercase tracking-widest text-[#71717A] font-black mt-2">
              Terminal QR Preview Card
            </span>

            {selectedMerchant ? (
              <div className="w-full mt-4 space-y-6">
                
                {/* Visual Premium QR Mockup Box */}
                <div className="bg-[#FAF9F5] border-2 border-indigo-900 rounded-3xl p-5 shadow-inner max-w-xs mx-auto space-y-4">
                  
                  {/* Mock Provider Logo Badge */}
                  <div className="flex justify-between items-center border-b border-[#E4E4E7] pb-3">
                    <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">{selectedMerchant.provider}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider ${
                      selectedMerchant.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedMerchant.active ? 'ACTIVE QR' : 'INACTIVE'}
                    </span>
                  </div>

                  {/* Mock QR Art Grid */}
                  <div className="bg-white p-4 rounded-2xl border border-[#E4E4E7] shadow-sm flex items-center justify-center">
                    {/* Generates a neat vector-styled simulated QR code with canvas style */}
                    <div className="w-40 h-40 bg-[#1A1A1A] p-2 rounded-xl flex flex-wrap justify-between content-between gap-1 overflow-hidden opacity-90 relative">
                      
                      {/* Stylized QR Position Anchors */}
                      <div className="w-12 h-12 border-4 border-white bg-transparent rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded" />
                      </div>
                      <div className="w-12 h-12 border-4 border-white bg-transparent rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded" />
                      </div>
                      <div className="w-12 h-12 border-4 border-white bg-transparent rounded-lg flex items-center justify-center self-end">
                        <div className="w-6 h-6 bg-white rounded" />
                      </div>

                      {/* Micro QR bits representation */}
                      <div className="absolute inset-0 p-8 flex flex-wrap gap-1 items-center justify-center">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-sm ${
                              (i * 7 + 13) % 5 === 0 || (i * 3 + 19) % 4 === 0 ? 'bg-transparent' : 'bg-white'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Small center logo fallback */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center border-2 border-[#FAF9F5] shadow shadow-black/20">
                        <span className="text-[8px] font-black text-white">{selectedMerchant.provider[0]}</span>
                      </div>

                    </div>
                  </div>

                  {/* QR Scan Details */}
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">{selectedMerchant.qrLabel}</p>
                    <p className="text-xs font-black text-indigo-900 font-mono tracking-tight">{selectedMerchant.upiId}</p>
                  </div>

                </div>

                {/* Extended Details Panel */}
                <div className="text-left bg-[#F9F9F8] p-4 rounded-2xl border border-[#E4E4E7] space-y-3 text-xs font-medium">
                  
                  <div className="flex justify-between border-b border-[#E4E4E7] pb-2">
                    <span className="text-[#71717A]">Registered Name:</span>
                    <strong className="text-[#18181B] text-right">{selectedMerchant.name}</strong>
                  </div>

                  <div className="flex justify-between border-b border-[#E4E4E7] pb-2">
                    <span className="text-[#71717A]">Linked Settlement Bank:</span>
                    <strong className="text-[#18181B] text-right flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5 text-indigo-600" /> {selectedMerchant.linkedBank}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b border-[#E4E4E7] pb-2">
                    <span className="text-[#71717A]">Created At:</span>
                    <strong className="text-[#18181B]">{new Date(selectedMerchant.createdAt).toLocaleDateString()}</strong>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[#71717A]">Settlement Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-black text-[9px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Auto Sweep OK
                    </span>
                  </div>

                </div>

                {/* Edit & Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedMerchant)}
                    className="flex-1 py-2.5 border border-[#E4E4E7] hover:border-[#A1A1AA] hover:bg-[#F9F9F8] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-600" /> Edit QR Details
                  </button>
                  <button
                    onClick={() => handleToggleActive(selectedMerchant)}
                    className={`px-4 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer transition-all ${
                      selectedMerchant.active 
                        ? 'border border-[#E4E4E7] text-rose-600 hover:bg-rose-50 hover:border-rose-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {selectedMerchant.active ? 'Deactivate QR' : 'Activate QR'}
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-20 text-[#71717A] text-xs font-medium">
                Select a merchant QR card from the list to display preview and sweep bank settings.
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Slide-out Drawer Panel (styled with clean off-white operational theme) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end">
          
          {/* Backdrop click close */}
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 transform transition-transform duration-350 border-l border-[#E4E4E7]">
            
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-[#E4E4E7] pb-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[#18181B]">
                    {drawerMode === 'add' ? 'Register New UPI Merchant' : 'Modify UPI Merchant Settings'}
                  </h3>
                  <p className="text-[11px] text-[#71717A] font-medium mt-0.5">
                    Assign providers and link sweep banks securely.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 hover:bg-[#F9F9F8] rounded-lg border border-[#E4E4E7] text-[#71717A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">QR Provider / Network</label>
                  <select
                    value={formProvider}
                    onChange={e => setFormProvider(e.target.value as QRProvider)}
                    className="w-full px-3 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">Merchant Account Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Potaliya Petroleum SBI Main"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">UPI Handle ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 9530140836@ptsbi"
                    value={formUpiId}
                    onChange={e => setFormUpiId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">Linked Sweep Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={formLinkedBank}
                    onChange={e => setFormLinkedBank(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">QR Label / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Office Counter QR"
                    value={formQrLabel}
                    onChange={e => setFormQrLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E4E4E7] rounded-xl text-xs bg-[#F9F9F8] focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="formActive"
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-[#E4E4E7] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="formActive" className="text-xs font-bold text-[#18181B] cursor-pointer">
                    Mark as Active / Receiving Collections
                  </label>
                </div>

              </form>

            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-[#E4E4E7] pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 py-2.5 border border-[#E4E4E7] hover:border-[#A1A1AA] text-xs font-bold rounded-xl cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md text-center"
              >
                {drawerMode === 'add' ? 'Register QR' : 'Apply Modifications'}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

interface MerchantItemProps {
  key?: any;
  merchant: UPIMerchant;
  collection: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

function MerchantListItem({ merchant, collection, isSelected, onSelect, onEdit, onToggleActive }: MerchantItemProps) {
  return (
    <div 
      onClick={onSelect}
      className={`p-4 bg-white rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm relative group ${
        isSelected 
          ? 'border-indigo-600 ring-2 ring-indigo-100' 
          : 'border-[#E4E4E7] hover:border-[#A1A1AA]'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider bg-indigo-50 px-2 py-0.5 rounded-lg">
              {merchant.provider}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${merchant.active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
          </div>
          <h4 className="text-xs font-black text-[#18181B] tracking-tight">{merchant.name}</h4>
          <p className="text-[11px] text-[#71717A] font-mono tracking-tight">{merchant.upiId}</p>
        </div>

        {/* Action Toggle Switch */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive();
          }}
          className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
            merchant.active 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
              : 'bg-[#F9F9F8] border border-[#E4E4E7] text-[#71717A] hover:bg-[#E4E4E7]'
          }`}
        >
          {merchant.active ? 'ACTIVE' : 'DORMANT'}
        </button>
      </div>

      <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#FAF9F5] text-xs font-semibold">
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-widest text-[#71717A] font-bold">Sum Ingested Today</span>
          <p className="text-sm font-black text-indigo-600">₹ {collection.toLocaleString()}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 hover:bg-[#F9F9F8] border border-[#E4E4E7] hover:border-[#A1A1AA] rounded-xl text-xs text-[#52525B] font-bold flex items-center gap-1"
          >
            Edit <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
