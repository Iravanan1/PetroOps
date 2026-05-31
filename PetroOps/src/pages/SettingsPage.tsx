import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Fuel, Landmark, CreditCard, Keyboard, Activity, ShieldCheck, 
  ArrowRight, Sparkles, Cpu, Users 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { TemplateLockService } from '../services/TemplateLockService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const companyConfig = TemplateLockService.getTemplateConfig(user?.stationTemplate);

  const sections = [
    {
      title: 'Company & Template Locks',
      desc: 'Modify your petrol station company authority. Locks OCR grid scanner and layouts.',
      icon: Fuel,
      path: '/station-setup',
      badge: companyConfig ? companyConfig.id : 'HPCL',
      badgeColor: companyConfig ? companyConfig.primaryColor : '#D35400'
    },
    {
      title: 'Dealer Portal Credentials',
      desc: 'Securely link official HPCL CRIS, BPCL, IOCL dealer login credentials for direct ledger downloads.',
      icon: Landmark,
      path: '/settings/dealer-portals',
      badge: 'Secure Vault'
    },
    {
      title: 'UPI Merchant Accounts',
      desc: 'Link multiple UPI QR merchant terminals (Paytm, PhonePe, BharatPe) for automatic settlement reconciliation.',
      icon: Activity,
      path: '/settings/upi',
      badge: 'Active QR'
    },
    {
      title: 'Credit Customers Roster',
      desc: 'Create credit customers, configure vehicle registers, view outstanding ledgers, and download statement reports.',
      icon: CreditCard,
      path: '/credit-ledger',
      badge: 'Statements'
    },
    {
      title: 'Manual & Mixed Entry Rules',
      desc: 'Configure mixed entry limits, high-confidence auto-approvals, and manual shift audit review options.',
      icon: Keyboard,
      path: '/settings/manual-entry',
      badge: 'OCR Mixed'
    },
    {
      title: 'Self-Improving OCR Insights',
      desc: 'Monitor OCR accuracy metrics, run layout & digit calibration benchmarks, and audit continuity heatmaps.',
      icon: Cpu,
      path: '/ocr/insights',
      badge: 'Adaptive AI',
      badgeColor: '#D35400'
    },
    {
      title: 'Operator Handwriting Analytics',
      desc: 'Review learned attendant handwriting profiles, character confusion lists, and detailed manual mutation ledger logs.',
      icon: Users,
      path: '/ocr/correction-analytics',
      badge: 'Attendant Matrix',
      badgeColor: '#1565C0'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Control Room & Settings</h1>
            <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Configure PumpAI Integrations & ERP Bounds</p>
          </div>
        </div>

        {/* Overview banner */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-[#1A1A1A]">{user?.pumpName || 'Siddhivinayak Fuels'}</span>
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: companyConfig.primaryColor }}>
                {companyConfig.id} Authority
              </span>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed max-w-xl">
              This fuel station is initialized under legal GST identification <span className="font-semibold text-[#1A1A1A]">{user?.gstNumber || '27AAAAA1111A1Z1'}</span>. OCR layouts, review panels, and double-entry reconciliation runs are strictly locked to this template authority.
            </p>
          </div>
          <button
            onClick={() => navigate('/portal-sync-status')}
            className="flex items-center justify-center gap-2 text-xs font-bold text-[#D35400] hover:text-[#A04000] transition-colors min-h-[48px] px-5 py-3 bg-[#D35400]/5 border border-[#D35400]/10 rounded-xl glove-safe-target"
          >
            <Sparkles className="w-4 h-4" /> VIEW PORTAL SYNC STATUS
          </button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(sec.path)}
                className="bg-white border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-3xl p-6 text-left shadow-xs transition-all duration-200 flex flex-col justify-between group relative min-h-[12rem] py-6 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="p-3 rounded-2xl bg-[#F3F3F1] border border-[#EBEBEA] text-[#1A1A1A] group-hover:bg-[#D35400]/5 group-hover:text-[#D35400] group-hover:border-[#D35400]/10 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span 
                      className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                      style={{ 
                        borderColor: sec.badgeColor ? `${sec.badgeColor}20` : '#EBEBEA',
                        color: sec.badgeColor || '#666666',
                        backgroundColor: sec.badgeColor ? `${sec.badgeColor}05` : '#F9F9F8'
                      }}
                    >
                      {sec.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] text-sm group-hover:text-[#D35400] transition-colors">{sec.title}</h3>
                  <p className="text-xs text-[#666666] mt-1.5 leading-relaxed font-normal">{sec.desc}</p>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#D35400] tracking-wider mt-4">
                  CONFIGURE MODULE <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Safety Note */}
        <div className="mt-8 text-center text-[10px] text-[#999999] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
          <span>Double-entry ledger rules & locked periods remain strictly active. Manual revisions preserve historical CA-audit trails.</span>
        </div>

      </div>
    </div>
  );
}
