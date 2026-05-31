import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, UserCheck, TrendingUp, AlertTriangle, Printer, 
  Download, Share2, Send, Plus, Trash2, Check, ShieldAlert,
  Smartphone, FileText, Truck, Calendar
} from 'lucide-react';
import { CreditCustomer, CreditTransaction } from '../../../types/CreditCustomer';

export default function CreditCustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CreditCustomer | null>(null);
  const [customersList, setCustomersList] = useState<CreditCustomer[]>([]);
  const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>([]);

  // Vehicle manager input state
  const [newVehicle, setNewVehicle] = useState('');
  const [vehicleSuccess, setVehicleSuccess] = useState(false);

  // Shares/Notifications statuses
  const [smsSent, setSmsSent] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // 1. Load Data
  useEffect(() => {
    const savedCustomers = localStorage.getItem('pumpai_credit_customers');
    const savedTransactions = localStorage.getItem('pumpai_credit_transactions');

    let loadedCustomers: CreditCustomer[] = [];
    let loadedTransactions: CreditTransaction[] = [];

    if (savedCustomers) {
      try { loadedCustomers = JSON.parse(savedCustomers); } catch {}
    }
    if (savedTransactions) {
      try { loadedTransactions = JSON.parse(savedTransactions); } catch {}
    }

    setCustomersList(loadedCustomers);
    setAllTransactions(loadedTransactions);

    const foundCust = loadedCustomers.find(c => c.id === id);
    if (foundCust) {
      setCustomer(foundCust);
    }
  }, [id]);

  // 2. Filter transactions and compute chronological running balances (Replay Safety)
  const statement = useMemo(() => {
    if (!customer) return [];

    // Filter customer transactions in ascending chronological order
    const customerTxs = allTransactions
      .filter(t => t.customerId === customer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return customerTxs.map(tx => {
      if (tx.type === 'FUEL_SALE') runningBalance += tx.amount;
      if (tx.type === 'PAYMENT_RECOVERY') runningBalance -= tx.amount;
      if (tx.type === 'ADJUSTMENT') runningBalance += tx.amount;

      return {
        ...tx,
        runningBalance
      };
    });
  }, [customer, allTransactions]);

  // Current balance computed directly from ledger log
  const computedOutstanding = useMemo(() => {
    if (statement.length === 0) return 0;
    return statement[statement.length - 1].runningBalance;
  }, [statement]);

  // FIFO 30-day dues aging calculation to check for policy violations
  const hasOverdueDues = useMemo(() => {
    const debits: { amount: number; date: Date }[] = [];
    let totalCredit = 0;
    
    for (const tx of statement) {
      if (tx.type === 'FUEL_SALE') {
        debits.push({ amount: tx.amount, date: new Date(tx.date) });
      } else if (tx.type === 'PAYMENT_RECOVERY') {
        totalCredit += tx.amount;
      } else if (tx.type === 'ADJUSTMENT') {
        if (tx.amount > 0) {
          debits.push({ amount: tx.amount, date: new Date(tx.date) });
        } else {
          totalCredit += Math.abs(tx.amount);
        }
      }
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const deb of debits) {
      if (totalCredit >= deb.amount) {
        totalCredit -= deb.amount;
      } else {
        // This debit is not fully cleared
        if (deb.date.getTime() < thirtyDaysAgo.getTime()) {
          return true;
        }
        break;
      }
    }
    return false;
  }, [statement]);

  // 3. Save vehicle updates
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !newVehicle.trim()) return;

    const cleanedPlate = newVehicle.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanedPlate.length < 4) {
      alert("Please enter a valid license plate.");
      return;
    }

    if (customer.vehicles.includes(cleanedPlate)) {
      alert("This vehicle license plate is already registered.");
      return;
    }

    const updatedCustomer = {
      ...customer,
      vehicles: [...customer.vehicles, cleanedPlate]
    };

    const updatedList = customersList.map(c => c.id === customer.id ? updatedCustomer : c);
    
    setCustomer(updatedCustomer);
    setCustomersList(updatedList);
    localStorage.setItem('pumpai_credit_customers', JSON.stringify(updatedList));

    setNewVehicle('');
    setVehicleSuccess(true);
    setTimeout(() => setVehicleSuccess(false), 1500);
  };

  const handleDeleteVehicle = (plate: string) => {
    if (!customer) return;
    if (window.confirm(`Are you sure you want to de-link vehicle ${plate}?`)) {
      const updatedCustomer = {
        ...customer,
        vehicles: customer.vehicles.filter(v => v !== plate)
      };

      const updatedList = customersList.map(c => c.id === customer.id ? updatedCustomer : c);
      
      setCustomer(updatedCustomer);
      setCustomersList(updatedList);
      localStorage.setItem('pumpai_credit_customers', JSON.stringify(updatedList));
    }
  };

  // 4. Notification reminder triggers
  const triggerSmsReminder = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 2500);
  };

  const triggerWhatsappReminder = () => {
    if (!customer) return;
    setWhatsappSent(true);

    const formattedPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;

    const messageText = `Hello *${customer.name}*,\n\nThis is an outstanding balance statement reminder from *PumpAI Enterprise*.\n\n*Account Summary:*\n• Outstanding Balance: ₹${computedOutstanding.toLocaleString('en-IN')}\n• Approved Credit Limit: ₹${customer.creditLimit.toLocaleString('en-IN')}\n• Statement Date: ${new Date().toLocaleDateString('en-IN')}\n\nPlease clear the dues at your earliest convenience. You can pay via Cash, UPI/QR, or Card at the station till.\n\nThank you for your continued business!`;
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => setWhatsappSent(false), 2500);
  };

  const generateMockPdf = () => {
    if (!customer) return;
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      
      // Construct CSV Statement
      const headers = [
        `"PumpAI Fuel Station - Customer Account Statement"`,
        `"Customer Name","${customer.name}"`,
        `"Category","${customer.category}"`,
        `"Phone","${customer.phone}"`,
        `"GSTIN","${customer.gstNumber || 'N/A'}"`,
        `"Statement Date","${new Date().toLocaleDateString('en-IN')}"`,
        `"Outstanding Balance","INR ${computedOutstanding}"`,
        `"Credit Limit","INR ${customer.creditLimit}"`,
        `""`,
        `"Date","Reference ID","Remarks","Vehicle Number","Debit (Extended)","Credit (Recovered)","Running Balance"`
      ];
      
      const rows = statement.map(tx => {
        const debit = tx.type === 'FUEL_SALE' || (tx.type === 'ADJUSTMENT' && tx.amount > 0) ? tx.amount : 0;
        const credit = tx.type === 'PAYMENT_RECOVERY' || (tx.type === 'ADJUSTMENT' && tx.amount < 0) ? Math.abs(tx.amount) : 0;
        return `"${new Date(tx.date).toLocaleDateString()}","${tx.referenceId || ''}","${tx.remarks || ''}","${tx.vehicleNumber || ''}",${debit},${credit},${tx.runningBalance}`;
      });
      
      const csvContent = [...headers, ...rows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customer.name.replace(/\s+/g, '_')}_statement.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  if (!customer) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen text-slate-500 text-xs">
        Searching ledger records for client ID: {id}...
        <button onClick={() => navigate('/credit-ledger')} className="mt-4 px-4 py-2 border border-slate-300 rounded-xl">
          Back to Accounts Dashboard
        </button>
      </div>
    );
  }

  const limitExceeded = computedOutstanding > customer.creditLimit;
  const availableCredit = Math.max(0, customer.creditLimit - computedOutstanding);
  const redAlertActive = limitExceeded || hasOverdueDues;
  const orangeAlertActive = !redAlertActive && computedOutstanding >= customer.creditLimit * 0.8;

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F9F9F8] min-h-screen text-[#1A1A1A] print:p-0 print:bg-white select-none">
      
      {/* Printable CSS Helper */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
          }
          nav, .print-hidden, button, form, hr {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #D9D9D6 !important;
            padding: 8px !important;
            color: black !important;
          }
          th {
            background-color: #F3F3F1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Header back & navigation (Hidden in Print) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:justify-between items-center gap-3 print-hidden">
        <button
          onClick={() => navigate('/credit-ledger')}
          className="col-span-2 md:col-span-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-3 rounded-2xl border border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1] min-h-[48px] glove-safe-target w-full lg:w-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>

        <div className="col-span-2 md:col-span-2 grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={triggerBrowserPrint}
            className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-3 rounded-2xl border border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1] min-h-[48px] glove-safe-target w-full sm:w-auto"
          >
            <Printer className="w-4 h-4" /> Print Ledger
          </button>
          
          <button
            onClick={generateMockPdf}
            disabled={pdfGenerating}
            className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-3 rounded-2xl border border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1] min-h-[48px] glove-safe-target w-full sm:w-auto disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> 
            {pdfGenerating ? 'Generating File...' : 'Export Statement'}
          </button>

          <button
            onClick={triggerWhatsappReminder}
            disabled={computedOutstanding <= 0}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 min-h-[48px] glove-safe-target w-full sm:w-auto disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-emerald-600" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print-full">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F3F3F1] border border-[#D9D9D6] text-[#1A1A1A]">
            {customer.category} Account
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] mt-2 block">{customer.name}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-[#666666]">
            <span>Phone: <strong>{customer.phone}</strong></span>
            {customer.gstNumber && (
              <span>GSTIN: <strong className="font-mono">{customer.gstNumber}</strong></span>
            )}
            <span>Created: <strong>{new Date(customer.createdAt).toLocaleDateString()}</strong></span>
          </div>
        </div>

        {/* Limit Warnings */}
        {redAlertActive && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 max-w-sm print-hidden">
            <ShieldAlert className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-black uppercase text-[#C62828]">Account Exposure Restricted</h4>
              <p className="text-[10px] text-[#666666] font-semibold mt-0.5">
                {limitExceeded && hasOverdueDues && `Outstanding dues have exceeded the credit limit of ₹${customer.creditLimit.toLocaleString('en-IN')} and have unpaid balances older than 30 days (FIFO aging violation).`}
                {limitExceeded && !hasOverdueDues && `Outstanding dues have exceeded the agreed credit limit of ₹${customer.creditLimit.toLocaleString('en-IN')}. Extended credit is restricted.`}
                {!limitExceeded && hasOverdueDues && `Account has unpaid dues older than 30 days (FIFO aging policy violation). Extended credit is restricted.`}
              </p>
            </div>
          </div>
        )}

        {orangeAlertActive && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 max-w-sm print-hidden">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="text-xs font-black uppercase text-amber-700">High Credit Utilization Warning</h4>
              <p className="text-[10px] text-[#666666] font-semibold mt-0.5">
                Outstanding dues have consumed over 80% of the agreed credit limit of ₹{customer.creditLimit.toLocaleString('en-IN')}. Please monitor closely.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-full">
        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Outstanding Ledger Dues</span>
          <div className="mt-2">
            <span className={`text-3xl sm:text-4xl font-black ${redAlertActive ? 'text-[#C62828]' : (orangeAlertActive ? 'text-amber-600' : 'text-[#1A1A1A]')}`}>
              ₹{computedOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1">
            Calculated deterministically from event log
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Client Credit Limit</span>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black text-[#1A1A1A]">
              ₹{customer.creditLimit.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1">
            Maximum credit limit threshold
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#EBEBEA] shadow-sm flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Remaining Credit Available</span>
          <div className="mt-2">
            <span className={`text-3xl sm:text-4xl font-black ${redAlertActive ? 'text-[#C62828]' : 'text-emerald-700'}`}>
              ₹{availableCredit.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[9px] text-[#666666] font-semibold mt-1">
            Limit capacity remaining for credit purchases
          </span>
        </div>
      </div>

      {/* Main Grid: Statement Ledger vs Vehicle Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print-full">
        
        {/* Ledger Statement Table */}
        <div className="lg:col-span-2 bg-white border border-[#EBEBEA] rounded-3xl shadow-sm overflow-hidden p-6 print-full">
          <div className="flex justify-between items-center mb-4 print-hidden">
            <div>
              <h3 className="text-sm font-black uppercase text-[#1A1A1A] tracking-wider">Statement Ledger Sheet</h3>
              <p className="text-[10px] text-[#666666] font-bold uppercase mt-0.5">Chronological records of sales & recoveries</p>
            </div>
            
            <button
              onClick={() => navigate('/credit-ledger/payment', { state: { selectCustomerId: customer.id } })}
              className="px-4 py-2.5 border border-[#D9D9D6] hover:bg-[#F3F3F1] rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[48px] glove-safe-target flex items-center justify-center cursor-pointer"
            >
              Collect payment
            </button>
          </div>

          <div className="overflow-x-auto print-full">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#F3F3F1] border-b border-[#EBEBEA] text-[#666666] uppercase text-[9px] tracking-wider font-extrabold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference ID</th>
                  <th className="px-4 py-3">Transaction Details</th>
                  <th className="px-4 py-3 text-right">Debit (extended)</th>
                  <th className="px-4 py-3 text-right">Credit (recovered)</th>
                  <th className="px-4 py-3 text-right">Running balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEA] font-medium">
                {statement.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#666666] font-bold">
                      No transaction history exists on this customer's account yet.
                    </td>
                  </tr>
                ) : (
                  statement.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F9F9F8]">
                      <td className="px-4 py-3 font-mono font-bold text-[#666666]">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-[#666666]">
                        {tx.referenceId || 'Manual entry'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-[#1A1A1A]">{tx.remarks || tx.type.replace("_", " ")}</span>
                        {tx.vehicleNumber && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold border border-[#D9D9D6] px-1.5 py-0.5 rounded font-mono uppercase bg-[#F3F3F1]">
                            <Truck className="w-2.5 h-2.5 text-[#D35400]" /> {tx.vehicleNumber}
                          </span>
                        )}
                        {tx.fuelType && tx.litres && (
                          <span className="text-[9px] text-[#666666] font-bold ml-1.5">
                            ({tx.litres} Ltrs {tx.fuelType})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#C62828]">
                        {tx.type === 'FUEL_SALE' || (tx.type === 'ADJUSTMENT' && tx.amount > 0) ? `₹${tx.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                        {tx.type === 'PAYMENT_RECOVERY' || (tx.type === 'ADJUSTMENT' && tx.amount < 0) ? `₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono">
                        ₹{tx.runningBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Vehicle Manager and Action reminders */}
        <div className="flex flex-col gap-6 print-hidden">
          
          {/* Active Notifications Reminders */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-[#1A1A1A] tracking-wider">SMS & WhatsApp Reminders</h3>
              <p className="text-[10px] text-[#666666] font-bold uppercase mt-0.5">Collect outstanding dues securely</p>
            </div>

            {smsSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-black uppercase flex items-center gap-1.5">
                <Check className="w-4.5 h-4.5 text-emerald-600" /> SMS reminder queued successfully!
              </div>
            )}

            {whatsappSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-black uppercase flex items-center gap-1.5">
                <Check className="w-4.5 h-4.5 text-emerald-600" /> WhatsApp statement alert dispatched!
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={triggerSmsReminder}
                disabled={computedOutstanding <= 0}
                className="w-full py-3 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D9D9D6] rounded-2xl font-black text-[10px] uppercase tracking-wider text-[#1A1A1A] transition-all flex items-center justify-center gap-2 min-h-[48px] glove-safe-target cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4 text-[#D35400]" /> Send SMS Balance Alert
              </button>

              <button
                onClick={triggerWhatsappReminder}
                disabled={computedOutstanding <= 0}
                className="w-full py-3 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D9D9D6] rounded-2xl font-black text-[10px] uppercase tracking-wider text-[#1A1A1A] transition-all flex items-center justify-center gap-2 min-h-[48px] glove-safe-target cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-4 h-4 text-emerald-600" /> Share via WhatsApp
              </button>
            </div>
          </div>

          {/* Vehicle License Plate Manager */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-[#1A1A1A] tracking-wider">Registered Vehicles</h3>
              <p className="text-[10px] text-[#666666] font-bold uppercase mt-0.5">Whitelist vehicles authorized for credit</p>
            </div>

            {vehicleSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4 text-emerald-600" /> Vehicle whitelisted!
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="flex gap-2">
              <input
                type="text"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                placeholder="MH46AR1122"
                className="flex-1 px-4 py-3 text-sm font-mono font-bold uppercase border border-[#D9D9D6] rounded-2xl focus:outline-none focus:border-[#D35400] bg-[#F9F9F8] min-h-[48px] glove-safe-target"
              />
              <button
                type="submit"
                className="px-5 bg-[#1A1A1A] text-white hover:bg-[#333] rounded-2xl text-xs font-black uppercase tracking-wider min-h-[48px] glove-safe-target flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Whitelist
              </button>
            </form>

            <div className="border-t border-[#EBEBEA] pt-3 flex flex-col gap-2">
              {customer.vehicles.length === 0 ? (
                <span className="text-[10px] text-[#666666] font-bold italic block py-4 text-center">
                  No registered vehicles yet. Extended credit sales will prompt a warning banner.
                </span>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {customer.vehicles.map((v) => (
                    <div 
                      key={v} 
                      className="flex justify-between items-center p-2 border border-[#D9D9D6] rounded-xl bg-[#F9F9F8] font-mono text-[11px] font-bold text-[#1A1A1A]"
                    >
                      <span className="flex items-center gap-1.5 uppercase font-extrabold">
                        <Truck className="w-4 h-4 text-[#666666]" /> {v}
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(v)}
                        className="text-[#B3B3B3] hover:text-[#C62828] p-1 rounded hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                        title="Remove vehicle whitelisting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
