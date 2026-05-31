import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, Plus, Search, Building, User, Truck, 
  AlertTriangle, ArrowUpRight, TrendingUp, ChevronRight, 
  Sparkles, Check, Trash2, Edit2, ShieldAlert
} from 'lucide-react';
import { CreditCustomer, CustomerCategory, CreditTransaction } from '../../../types/CreditCustomer';

// Pre-seeded mock customers for demo/bootstrap
const DEFAULT_CUSTOMERS: CreditCustomer[] = [
  {
    id: "cust_1",
    name: "Shiv Shakti Transport",
    phone: "9876543210",
    gstNumber: "27AAACS1234F1Z5",
    vehicles: ["MH46AR1122", "MH46BR5566", "MH46CR7788"],
    creditLimit: 150000,
    outstandingBalance: 65000,
    category: "FLEET",
    createdAt: "2026-05-01T10:00:00Z"
  },
  {
    id: "cust_2",
    name: "Vikas Patil (Builder)",
    phone: "9422019283",
    gstNumber: "",
    vehicles: ["MH46X7007", "MH46Y8008"],
    creditLimit: 50000,
    outstandingBalance: 12500,
    category: "MONTHLY",
    createdAt: "2026-05-05T12:00:00Z"
  },
  {
    id: "cust_3",
    name: "Mumbai travels",
    phone: "9167098765",
    gstNumber: "27AABCM8899A1Z1",
    vehicles: ["MH01AV1234", "MH01AV5678"],
    creditLimit: 100000,
    outstandingBalance: 105000,
    category: "BUSINESS",
    createdAt: "2026-05-10T14:30:00Z"
  },
  {
    id: "cust_4",
    name: "Rakesh Attendant (Advance)",
    phone: "8888777766",
    gstNumber: "",
    vehicles: ["MH46M500"],
    creditLimit: 10000,
    outstandingBalance: 2500,
    category: "STAFF",
    createdAt: "2026-05-12T08:15:00Z"
  }
];

// Pre-seeded mock transactions for demo/bootstrap
const DEFAULT_TRANSACTIONS: CreditTransaction[] = [
  {
    id: "tx_101",
    customerId: "cust_1",
    customerName: "Shiv Shakti Transport",
    type: "FUEL_SALE",
    amount: 45000,
    date: "2026-05-15T09:30:00Z",
    vehicleNumber: "MH46AR1122",
    fuelType: "HSD",
    litres: 487.5,
    referenceId: "shift_1001",
    remarks: "Diesel filled in dumper"
  },
  {
    id: "tx_102",
    customerId: "cust_1",
    customerName: "Shiv Shakti Transport",
    type: "FUEL_SALE",
    amount: 35000,
    date: "2026-05-18T14:45:00Z",
    vehicleNumber: "MH46BR5566",
    fuelType: "HSD",
    litres: 379.2,
    referenceId: "shift_1002",
    remarks: "Diesel filled in truck"
  },
  {
    id: "tx_103",
    customerId: "cust_1",
    customerName: "Shiv Shakti Transport",
    type: "PAYMENT_RECOVERY",
    amount: 15000,
    date: "2026-05-20T11:00:00Z",
    paymentMode: "UPI",
    referenceId: "slip_9921",
    remarks: "Partial payment received"
  },
  {
    id: "tx_104",
    customerId: "cust_2",
    customerName: "Vikas Patil (Builder)",
    type: "FUEL_SALE",
    amount: 12500,
    date: "2026-05-16T18:20:00Z",
    vehicleNumber: "MH46X7007",
    fuelType: "MS",
    litres: 119.6,
    referenceId: "shift_1001",
    remarks: "Petrol in private SUV"
  },
  {
    id: "tx_105",
    customerId: "cust_3",
    customerName: "Mumbai travels",
    type: "FUEL_SALE",
    amount: 105000,
    date: "2026-05-14T10:15:00Z",
    vehicleNumber: "MH01AV1234",
    fuelType: "HSD",
    litres: 1137.5,
    referenceId: "shift_1001",
    remarks: "Bulk monthly bus diesel filling"
  },
  {
    id: "tx_106",
    customerId: "cust_4",
    customerName: "Rakesh Attendant (Advance)",
    type: "FUEL_SALE",
    amount: 2500,
    date: "2026-05-21T07:45:00Z",
    vehicleNumber: "MH46M500",
    fuelType: "MS",
    litres: 23.9,
    referenceId: "shift_1003",
    remarks: "Salary advance fuel coupon"
  }
];

export default function CreditCustomersPage() {
  const navigate = useNavigate();

  // Primary operational data states
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  
  // Tab control: 'list' (dashboard/customers) vs 'shifts' (shift credit log analysis)
  const [activeTab, setActiveTab] = useState<'list' | 'shifts'>('list');
  
  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categoriesList = ['ALL', 'FLEET', 'BUSINESS', 'MONTHLY', 'STAFF'];
  const handleCategorySwipe = (direction: 'left' | 'right') => {
    const currentIndex = categoriesList.indexOf(categoryFilter);
    if (direction === 'left') {
      const nextIndex = (currentIndex + 1) % categoriesList.length;
      setCategoryFilter(categoriesList[nextIndex]);
    } else {
      const prevIndex = (currentIndex - 1 + categoriesList.length) % categoriesList.length;
      setCategoryFilter(categoriesList[prevIndex]);
    }
  };

  const categoryTouchStartX = React.useRef<number | null>(null);
  const categoryTouchEndX = React.useRef<number | null>(null);

  const handleCategoryTouchStart = (e: React.TouchEvent) => {
    categoryTouchStartX.current = e.targetTouches[0].clientX;
  };

  const handleCategoryTouchMove = (e: React.TouchEvent) => {
    categoryTouchEndX.current = e.targetTouches[0].clientX;
  };

  const handleCategoryTouchEnd = () => {
    if (categoryTouchStartX.current === null || categoryTouchEndX.current === null) return;
    const diff = categoryTouchStartX.current - categoryTouchEndX.current;
    const minSwipeDistance = 50;
    if (diff > minSwipeDistance) {
      handleCategorySwipe('left');
    } else if (diff < -minSwipeDistance) {
      handleCategorySwipe('right');
    }
    categoryTouchStartX.current = null;
    categoryTouchEndX.current = null;
  };

  // Customer registration form drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('FLEET');
  const [formLimit, setFormLimit] = useState('100000');
  const [formVehicles, setFormVehicles] = useState('');

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // 1. Initial Load & Seed localStorage if empty
  useEffect(() => {
    const savedCustomers = localStorage.getItem('pumpai_credit_customers');
    const savedTransactions = localStorage.getItem('pumpai_credit_transactions');

    let loadedCustomers: CreditCustomer[] = [];
    let loadedTransactions: CreditTransaction[] = [];

    if (savedCustomers) {
      try {
        loadedCustomers = JSON.parse(savedCustomers);
      } catch {
        loadedCustomers = DEFAULT_CUSTOMERS;
      }
    } else {
      loadedCustomers = DEFAULT_CUSTOMERS;
      localStorage.setItem('pumpai_credit_customers', JSON.stringify(DEFAULT_CUSTOMERS));
    }

    if (savedTransactions) {
      try {
        loadedTransactions = JSON.parse(savedTransactions);
      } catch {
        loadedTransactions = DEFAULT_TRANSACTIONS;
      }
    } else {
      loadedTransactions = DEFAULT_TRANSACTIONS;
      localStorage.setItem('pumpai_credit_transactions', JSON.stringify(DEFAULT_TRANSACTIONS));
    }

    setTransactions(loadedTransactions);
    
    // Deterministic running balance computation for each customer!
    const reconciledCustomers = loadedCustomers.map(cust => {
      const customerTxs = loadedTransactions.filter(t => t.customerId === cust.id);
      const balance = customerTxs.reduce((sum, tx) => {
        if (tx.type === 'FUEL_SALE') return sum + tx.amount;
        if (tx.type === 'PAYMENT_RECOVERY') return sum - tx.amount;
        if (tx.type === 'ADJUSTMENT') return sum + tx.amount;
        return sum;
      }, 0);
      return { ...cust, outstandingBalance: balance };
    });

    setCustomers(reconciledCustomers);
  }, []);

  // Save changes helper
  const saveToStorage = (updatedCustomers: CreditCustomer[], updatedTxs?: CreditTransaction[]) => {
    localStorage.setItem('pumpai_credit_customers', JSON.stringify(updatedCustomers));
    if (updatedTxs) {
      localStorage.setItem('pumpai_credit_transactions', JSON.stringify(updatedTxs));
    }
  };

  // Replay calculator for single customer dues (replay safety engine)
  const computeCustomerBalance = (customerId: string, txList: CreditTransaction[]) => {
    return txList
      .filter(t => t.customerId === customerId)
      .reduce((sum, tx) => {
        if (tx.type === 'FUEL_SALE') return sum + tx.amount;
        if (tx.type === 'PAYMENT_RECOVERY') return sum - tx.amount;
        if (tx.type === 'ADJUSTMENT') return sum + tx.amount;
        return sum;
      }, 0);
  };

  // 2. Statistics and Calculations
  const stats = useMemo(() => {
    let totalDues = 0;
    let overdueCount = 0;
    let categoryBreakdown: Record<string, number> = { FLEET: 0, BUSINESS: 0, MONTHLY: 0, STAFF: 0 };

    customers.forEach(c => {
      totalDues += c.outstandingBalance;
      if (c.outstandingBalance > c.creditLimit) {
        overdueCount++;
      }
      categoryBreakdown[c.category] += c.outstandingBalance;
    });

    return {
      totalDues,
      overdueCount,
      activeAccounts: customers.length,
      categoryBreakdown
    };
  }, [customers]);

  // 3. Search and filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.phone.includes(searchQuery) ||
                            (c.gstNumber && c.gstNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            c.vehicles.some(v => v.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [customers, searchQuery, categoryFilter]);

  // 4. Handle Save/Register Customer
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!formName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!formPhone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    const limitVal = parseFloat(formLimit);
    if (isNaN(limitVal) || limitVal < 0) {
      setFormError('Enter a valid non-negative credit limit.');
      return;
    }

    // Split vehicle strings
    const vehiclesArray = formVehicles
      .split(',')
      .map(v => v.trim().toUpperCase())
      .filter(v => v.length > 0);

    // Duplicate check
    const duplicate = customers.find(c => c.name.toLowerCase() === formName.trim().toLowerCase() && c.id !== editingCustomer?.id);
    if (duplicate) {
      setFormError('A customer with this name is already registered.');
      return;
    }

    let updatedCustomers = [...customers];
    if (editingCustomer) {
      // Edit mode
      updatedCustomers = customers.map(c => c.id === editingCustomer.id ? {
        ...c,
        name: formName.trim(),
        phone: formPhone.trim(),
        gstNumber: formGst.trim(),
        category: formCategory,
        creditLimit: limitVal,
        vehicles: vehiclesArray
      } : c);
      setFormSuccess(true);
      setTimeout(() => {
        setShowDrawer(false);
        setEditingCustomer(null);
        setFormSuccess(false);
      }, 1000);
    } else {
      // Create mode
      const newCustomer: CreditCustomer = {
        id: `cust_${Date.now()}`,
        name: formName.trim(),
        phone: formPhone.trim(),
        gstNumber: formGst.trim(),
        category: formCategory,
        creditLimit: limitVal,
        vehicles: vehiclesArray,
        outstandingBalance: 0,
        createdAt: new Date().toISOString()
      };
      updatedCustomers.push(newCustomer);
      setFormSuccess(true);
      setTimeout(() => {
        setShowDrawer(false);
        setFormSuccess(false);
      }, 1000);
    }

    setCustomers(updatedCustomers);
    saveToStorage(updatedCustomers);

    // Reset inputs
    setFormName('');
    setFormPhone('');
    setFormGst('');
    setFormLimit('100000');
    setFormVehicles('');
  };

  // Open Edit Mode
  const openEditCustomer = (cust: CreditCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone);
    setFormGst(cust.gstNumber || '');
    setFormCategory(cust.category);
    setFormLimit(String(cust.creditLimit));
    setFormVehicles(cust.vehicles.join(', '));
    setShowDrawer(true);
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this credit customer? All their balance calculations will be cleared.")) {
      const updatedCustomers = customers.filter(c => c.id !== id);
      const updatedTxs = transactions.filter(t => t.customerId !== id);
      setCustomers(updatedCustomers);
      setTransactions(updatedTxs);
      saveToStorage(updatedCustomers, updatedTxs);
    }
  };

  // Shift logs selector and summary math for legacy shift logs tab
  const shiftAggregates = useMemo(() => {
    const shiftMap: Record<string, { shiftId: string, creditSales: number, creditRecovery: number, date: string }> = {};
    
    transactions.forEach(t => {
      const shiftId = t.referenceId || "attendant_pad";
      if (!shiftMap[shiftId]) {
        shiftMap[shiftId] = {
          shiftId,
          creditSales: 0,
          creditRecovery: 0,
          date: t.date.split('T')[0]
        };
      }
      if (t.type === 'FUEL_SALE') shiftMap[shiftId].creditSales += t.amount;
      if (t.type === 'PAYMENT_RECOVERY') shiftMap[shiftId].creditRecovery += t.amount;
    });

    return Object.values(shiftMap);
  }, [transactions]);

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F9F9F8] min-h-screen text-[#1A1A1A]">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1A1A1A] flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#D35400]" /> Credit Accounts Ledger (Udhari)
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-medium uppercase tracking-wider">
            Manage local fleet accounts, monthly clients, staff credits, and double-entry recoveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/credit-ledger/payment')}
            className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center gap-2 min-h-[48px] glove-safe-target"
          >
            Record Dues Recovery
          </button>
          
          <button
            onClick={() => {
              setEditingCustomer(null);
              setFormName('');
              setFormPhone('');
              setFormGst('');
              setFormCategory('FLEET');
              setFormLimit('100000');
              setFormVehicles('');
              setShowDrawer(true);
            }}
            className="px-4 py-3 bg-[#D35400] hover:bg-[#B34700] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center gap-1.5 min-h-[48px] glove-safe-target"
          >
            <Plus className="w-4.5 h-4.5" /> Register Client
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Total Dues Outstanding</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1A1A1A]">₹{stats.totalDues.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#D35400]" /> Net Accounts Receivable balance
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Active Credit Accounts</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1A1A1A]">{stats.activeAccounts}</span>
            <span className="text-xs text-[#666666] font-semibold">Clients</span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1">
            Fleet, Business, Monthly & Staff
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Overdue Limit Accounts</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${stats.overdueCount > 0 ? 'text-[#C62828]' : 'text-emerald-700'}`}>
              {stats.overdueCount}
            </span>
            <span className="text-xs text-[#666666] font-semibold">Accounts</span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1 flex items-center gap-1">
            {stats.overdueCount > 0 ? (
              <span className="text-[#C62828] font-bold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Exceeded active limits
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">✓ All credit is within limits</span>
            )}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Fleet Outstanding Total</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1A1A1A]">₹{stats.categoryBreakdown.FLEET.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1">
            Largest active category exposure
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-[#EBEBEA] pb-0 mt-4">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all px-2 ${
            activeTab === 'list' 
              ? 'border-b-2 border-[#D35400] text-[#1A1A1A]' 
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          Registered Clients
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all px-2 ${
            activeTab === 'shifts' 
              ? 'border-b-2 border-[#D35400] text-[#1A1A1A]' 
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          Shift-Level Logs (Auditing)
        </button>
      </div>

      {/* Clients List Tab */}
      {activeTab === 'list' && (
        <div className="flex flex-col gap-4 mt-2">
          
          {/* Filters Panel */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-4 bg-white border border-[#EBEBEA] rounded-2xl shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, vehicle or GST..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-[#F9F9F8] font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto select-none">
              <span className="text-[10px] uppercase font-bold text-[#666666] shrink-0">Category:</span>
              <div 
                onTouchStart={handleCategoryTouchStart}
                onTouchMove={handleCategoryTouchMove}
                onTouchEnd={handleCategoryTouchEnd}
                className="flex flex-wrap gap-1 bg-[#F3F3F1] p-1 rounded-xl border border-[#D9D9D6] w-full md:w-auto cursor-pointer"
                title="Swipe horizontal to cycle categories"
              >
                {['ALL', 'FLEET', 'BUSINESS', 'MONTHLY', 'STAFF'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                      categoryFilter === cat 
                        ? 'bg-white text-[#1A1A1A] shadow-sm font-black' 
                        : 'text-[#666666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-[8px] text-[#D35400] font-bold uppercase tracking-wider block md:hidden select-none animate-pulse">Swipe Row</span>
            </div>
          </div>

          {/* Customers Table (Desktop) */}
          <div className="hidden md:block bg-white border border-[#EBEBEA] rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#F3F3F1] border-b border-[#EBEBEA] text-[#666666] uppercase text-[9px] tracking-wider font-extrabold">
                    <th className="px-6 py-4">Client Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Phone / GST</th>
                    <th className="px-6 py-4">Vehicles</th>
                    <th className="px-6 py-4 text-right">Credit Limit</th>
                    <th className="px-6 py-4 text-right">Outstanding Dues</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEA] font-medium">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-[#666666] font-semibold">
                        No credit accounts found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const limitExceeded = cust.outstandingBalance > cust.creditLimit;
                      
                      return (
                        <tr 
                          key={cust.id} 
                          onClick={() => navigate(`/credit-ledger/customer/${cust.id}`)}
                          className="hover:bg-[#F9F9F8] transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-[#1A1A1A] text-sm block">{cust.name}</span>
                            <span className="text-[9px] text-[#666666] uppercase tracking-wider block mt-0.5">
                              Created: {new Date(cust.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F3F3F1] border border-[#D9D9D6] text-[#1A1A1A]">
                              {cust.category === 'FLEET' && <Truck className="w-3 h-3 text-[#D35400]" />}
                              {cust.category === 'BUSINESS' && <Building className="w-3 h-3 text-blue-600" />}
                              {cust.category === 'MONTHLY' && <User className="w-3 h-3 text-indigo-600" />}
                              {cust.category === 'STAFF' && <User className="w-3 h-3 text-purple-600" />}
                              {cust.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="block text-[#1A1A1A] font-bold">{cust.phone}</span>
                            {cust.gstNumber ? (
                              <span className="text-[10px] text-[#666666] font-mono block mt-0.5">GST: {cust.gstNumber}</span>
                            ) : (
                              <span className="text-[10px] text-[#B3B3B3] block italic mt-0.5">No GST Linked</span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-[200px]">
                            {cust.vehicles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {cust.vehicles.slice(0, 3).map((v) => (
                                  <span key={v} className="px-1.5 py-0.5 text-[9px] font-bold border border-[#D9D9D6] rounded bg-[#F9F9F8] font-mono text-[#1A1A1A]">
                                    {v}
                                  </span>
                                ))}
                                {cust.vehicles.length > 3 && (
                                  <span className="text-[9px] text-[#666666] font-black">+{cust.vehicles.length - 3} more</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#B3B3B3] italic">No Vehicles</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-[#1A1A1A]">
                            ₹{cust.creditLimit.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-sm">
                            <span className={limitExceeded ? 'text-[#C62828]' : 'text-[#1A1A1A]'}>
                              ₹{cust.outstandingBalance.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {limitExceeded ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828]">
                                <ShieldAlert className="w-3 h-3 shrink-0" /> Overlimit
                              </span>
                            ) : cust.outstandingBalance > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/10 border border-amber-500/25 text-amber-700">
                                Active Dues
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-700">
                                Clear
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={(e) => openEditCustomer(cust, e)}
                                className="p-2 border border-[#D9D9D6] hover:bg-[#F3F3F1] rounded-xl text-[#666666] hover:text-[#1A1A1A] transition-all"
                                title="Edit Client details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteCustomer(cust.id, e)}
                                className="p-2 border border-rose-200 hover:bg-rose-50 rounded-xl text-rose-600 hover:text-rose-700 transition-all"
                                title="Delete Client"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => navigate(`/credit-ledger/customer/${cust.id}`)}
                                className="p-2 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D9D9D6] rounded-xl text-[#1A1A1A] font-bold text-[10px] uppercase flex items-center gap-0.5 transition-all"
                              >
                                Statement <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customers Mobile/Tablet Cards Listing */}
          <div className="block md:hidden space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white border border-[#EBEBEA] rounded-3xl p-8 text-center text-[#666666] font-semibold shadow-sm">
                No credit accounts found matching the criteria.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const limitExceeded = cust.outstandingBalance > cust.creditLimit;
                return (
                  <div
                    key={cust.id}
                    onClick={() => navigate(`/credit-ledger/customer/${cust.id}`)}
                    className="p-5 rounded-3xl bg-white border border-[#EBEBEA] hover:border-[#B3B3B3] shadow-sm flex flex-col gap-4 transition-all duration-200 cursor-pointer"
                  >
                    {/* Header: Name & Category */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-extrabold text-[#1A1A1A] text-base block">{cust.name}</span>
                        <span className="text-[10px] text-[#666666] font-semibold uppercase mt-0.5 block">
                          Phone: {cust.phone}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F3F3F1] border border-[#D9D9D6] text-[#1A1A1A]">
                        {cust.category === 'FLEET' && <Truck className="w-3 h-3 text-[#D35400]" />}
                        {cust.category === 'BUSINESS' && <Building className="w-3 h-3 text-blue-600" />}
                        {cust.category === 'MONTHLY' && <User className="w-3 h-3 text-indigo-600" />}
                        {cust.category === 'STAFF' && <User className="w-3 h-3 text-purple-600" />}
                        {cust.category}
                      </span>
                    </div>

                    {/* GST & Whitelisted Vehicles Count */}
                    <div className="flex justify-between items-center text-xs font-semibold text-[#666666] border-t border-[#F3F3F1] pt-3">
                      <div>
                        {cust.gstNumber ? (
                          <span className="font-mono text-[10px] text-[#666666]">GST: {cust.gstNumber}</span>
                        ) : (
                          <span className="text-[10px] text-[#B3B3B3] italic">No GST Linked</span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-[#1A1A1A] bg-[#F3F3F1] border border-[#D9D9D6] px-2 py-1 rounded-lg">
                          {cust.vehicles.length} Vehicles Whitelisted
                        </span>
                      </div>
                    </div>

                    {/* Dues Details */}
                    <div className="grid grid-cols-2 gap-3 bg-[#F9F9F8] p-3 rounded-2xl border border-[#EBEBEA]">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">Credit Limit</span>
                        <span className="font-extrabold text-[#1A1A1A] text-sm block mt-0.5">₹{cust.creditLimit.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">Outstanding Dues</span>
                        <span className={`font-black text-sm block mt-0.5 ${limitExceeded ? 'text-[#C62828]' : 'text-[#1A1A1A]'}`}>
                          ₹{cust.outstandingBalance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-[#F3F3F1] pt-3">
                      <div className="flex justify-start">
                        {limitExceeded ? (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-[#C62828]/10 border border-[#C62828]/25 text-[#C62828]">
                            <ShieldAlert className="w-3 h-3 shrink-0" /> Overlimit
                          </span>
                        ) : cust.outstandingBalance > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/10 border border-amber-500/25 text-amber-700">
                            Active Dues
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-700">
                            Clear
                          </span>
                        )}
                      </div>

                      {/* Glove-safe Touch Actions */}
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => openEditCustomer(cust, e)}
                          className="px-3 py-2 border border-[#D9D9D6] hover:bg-[#F3F3F1] rounded-xl text-[#666666] hover:text-[#1A1A1A] transition-all text-xs font-bold uppercase min-h-[48px] glove-safe-target flex items-center justify-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteCustomer(cust.id, e)}
                          className="px-3 py-2 border border-rose-200 hover:bg-rose-50 rounded-xl text-rose-600 hover:text-rose-700 transition-all text-xs font-bold uppercase min-h-[48px] glove-safe-target flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <button
                          onClick={() => navigate(`/credit-ledger/customer/${cust.id}`)}
                          className="px-3 py-2 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D9D9D6] rounded-xl text-[#1A1A1A] font-extrabold text-xs uppercase flex items-center justify-center gap-0.5 transition-all min-h-[48px] glove-safe-target"
                        >
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Shift-Level Logs Tab */}
      {activeTab === 'shifts' && (
        <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-sm overflow-hidden p-6">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase text-[#1A1A1A]">Auditor Shift Credit Summaries</h3>
            <p className="text-xs text-[#666666] mt-0.5">Verify total extended udrari and recovered payments per shift reconciliation cycle.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#F3F3F1] border-b border-[#EBEBEA] text-[#666666] uppercase text-[9px] tracking-wider font-extrabold">
                  <th className="px-6 py-4">Reconciled Shift ID</th>
                  <th className="px-6 py-4">Posting Date</th>
                  <th className="px-6 py-4 text-right">Extended Credit Sales</th>
                  <th className="px-6 py-4 text-right">Collected Payment Recoveries</th>
                  <th className="px-6 py-4 text-right">Net Shift Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEA] font-mono font-bold">
                {shiftAggregates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#666666] font-sans font-semibold">
                      No shift records containing credit postings exist yet.
                    </td>
                  </tr>
                ) : (
                  shiftAggregates.map((s) => (
                    <tr key={s.shiftId} className="hover:bg-[#F9F9F8]">
                      <td className="px-6 py-4 font-sans text-xs font-black text-[#1A1A1A]">{s.shiftId}</td>
                      <td className="px-6 py-4 font-sans text-xs text-[#666666]">{s.date}</td>
                      <td className="px-6 py-4 text-right text-amber-600">₹{s.creditSales.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right text-emerald-600">₹{s.creditRecovery.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right text-slate-800">
                        ₹{(s.creditSales - s.creditRecovery).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Client Slideout Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-xs flex justify-end z-50 print:hidden animate-fade-in">
          <div className="bg-[#F9F9F8] w-full max-w-lg border-l border-[#EBEBEA] h-full shadow-2xl p-8 overflow-y-auto flex flex-col gap-6 select-none animate-slide-left">
            
            <div className="flex justify-between items-center border-b border-[#EBEBEA] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#1A1A1A]">
                  {editingCustomer ? 'Modify Account Details' : 'Register New Client'}
                </h3>
                <p className="text-[10px] text-[#666666] font-bold uppercase tracking-wider mt-0.5">
                  Set credit boundaries and vehicle associations
                </p>
              </div>
              <button 
                onClick={() => setShowDrawer(false)}
                className="text-xs uppercase tracking-widest font-black text-[#666666] hover:text-[#1A1A1A] p-2 border border-[#D9D9D6] rounded-xl hover:bg-[#F3F3F1] transition-all"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[#C62828] text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-black uppercase flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" /> Account committed successfully!
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="flex flex-col gap-5">
              
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Royal Travels, Mumbai Municipal Corp"
                  className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white text-[#1A1A1A] min-h-[48px]"
                />
              </div>

              {/* Phone & GST */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white text-[#1A1A1A] min-h-[48px]"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    placeholder="15-digit GSTIN"
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px] uppercase"
                  />
                </div>
              </div>

              {/* Category & Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                    Account Classification *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CustomerCategory)}
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                  >
                    <option value="FLEET">Fleet / Contractor</option>
                    <option value="BUSINESS">Local Corporate Business</option>
                    <option value="MONTHLY">Monthly Fuel Account</option>
                    <option value="STAFF">Staff Account (Advance Limit)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                    Credit Limit Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formLimit}
                    onChange={(e) => setFormLimit(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white text-[#1A1A1A] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Vehicles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider flex justify-between">
                  <span>Registered Vehicle License Plates</span>
                  <span className="text-[9px] text-[#D35400]">Comma separated list</span>
                </label>
                <textarea
                  value={formVehicles}
                  onChange={(e) => setFormVehicles(e.target.value)}
                  placeholder="e.g. MH46AR1122, MH46BR5566, MH46CR7788"
                  className="w-full px-4 py-3 text-xs font-mono font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white text-[#1A1A1A] min-h-[80px]"
                />
              </div>

              {/* Action Submit */}
              <button
                type="submit"
                className="w-full py-4 mt-4 bg-[#D35400] hover:bg-[#B34700] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[50px] cursor-pointer"
              >
                <Check className="w-5 h-5" /> Commit Client Profile
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
