import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  Activity, Camera, AlertTriangle, LayoutDashboard, FileText, LogOut, Users, 
  UserCheck, Landmark, Receipt, Fuel, ShieldAlert, ShieldCheck, ClipboardList, Smartphone, Play, Eye,
  Layers, Settings, Database, Timer, Cpu, Bell, Server, TrendingUp, Monitor, IndianRupee, HardDrive, Menu, Building2,
  Award, BookOpen, MessageSquare, Target
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "../utils/firebase";
import { useAuthStore } from "../store/useAuthStore";
import ConversationalAI from "../components/ConversationalAI";
import { PetroOpsLogo } from "../design-system/PetroOpsBrandingConfig";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const isSunlight = localStorage.getItem('pumpai_sunlight_mode') === 'true';
    if (isSunlight) {
      document.documentElement.classList.add('sunlight-mode');
    } else {
      document.documentElement.classList.remove('sunlight-mode');
    }
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Sign out failed on firebase, clearing local state", e);
    }
    localStorage.removeItem("petroops_bypass_user");
    useAuthStore.getState().setUser(null, null);
    navigate("/login");
  };

  const [activeMode, setActiveMode] = React.useState<'operator' | 'manager' | 'developer'>(() => {
    return (localStorage.getItem("petroops_active_mode") as any) || "operator";
  });

  const handleModeChange = (mode: 'operator' | 'manager' | 'developer') => {
    setActiveMode(mode);
    localStorage.setItem("petroops_active_mode", mode);
  };

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Today's Shift", href: "/operations", icon: ClipboardList, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "History", href: "/closing-sheet", icon: FileText, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Fuel Stock", href: "/wetstock", icon: Fuel, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Cash & Expenses", href: "/cash", icon: Receipt, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Khata Book (Credit)", href: "/credit-ledger", icon: UserCheck, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "UPI QR Terminals", href: "/upi", icon: Activity, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "UPI Merchant Manager", href: "/upi-management", icon: Settings, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Bank Accounts", href: "/banking", icon: Landmark, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Compliance Hub", href: "/audits", icon: ShieldAlert, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Scan Shift", href: "/capture", icon: Camera, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Review Queue", href: "/ai-review", icon: FileText, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Suspicious Activity", href: "/alerts", icon: AlertTriangle, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    
    // AI Operations Group
    { name: "Pending Scans", href: "/ai-queue", icon: ClipboardList, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "AI Workstation", href: "/ai-review", icon: FileText, roles: ['manager', 'owner', 'super_admin'] },
    { name: "AI Integrity HUD", href: "/ai-integrity", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "AI Consensus", href: "/ai-consensus", icon: UserCheck, roles: ['manager', 'owner', 'super_admin'] },
    { name: "VLM Costs Tracker", href: "/ai-costs", icon: Landmark, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Pilot Sandbox", href: "/pilot-lab", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Reliability HUD", href: "/operational-reliability", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "GST & Compliance", href: "/compliance/legal-center", icon: Landmark, roles: ['manager', 'owner', 'super_admin'] },
 
    // Real Production Pilot & Executive Intelligence Group
    { name: "Pilot Console", href: "/branch-console", icon: Fuel, roles: ['manager', 'owner', 'super_admin'] },
    { name: "AI Portal Workspace", href: "/operations/dealer-workspace", icon: Landmark, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Executive Intel", href: "/owner", icon: LayoutDashboard, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Alerts Dispatch", href: "/alerts-center", icon: AlertTriangle, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Database Stress Lab", href: "/ai-bulk-validation", icon: Database, roles: ['manager', 'owner', 'super_admin'] },
 
    // Operational Stabilization Group
    { name: "Operator Console", href: "/operator-console", icon: Smartphone, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Mobile Cockpit", href: "/mobile/console", icon: Smartphone, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Shift Simulator", href: "/shift-simulator", icon: Play, roles: ['manager', 'owner', 'super_admin'] },
    { name: "System Observability", href: "/observability-console", icon: Eye, roles: ['manager', 'owner', 'super_admin'] },
    { name: "OCR Correction KPIs", href: "/ocr/kpis", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "OCR Learning Deck", href: "/ocr/learning-dashboard", icon: BookOpen, roles: ['operator', 'manager', 'owner', 'super_admin'] },
 
    // Advanced Ingestion, Labeling & Benchmarking Engine Group
    { name: "Dataset Ingestion", href: "/ocr/dataset", icon: Camera, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Ground Truth Studio", href: "/ocr/dataset", icon: Layers, roles: ['manager', 'owner', 'super_admin'] },
    { name: "OCR Benchmarks", href: "/ocr/benchmarks", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "OCR Validation Lab", href: "/ocr/lab", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "⚡ Accuracy Validation", href: "/accuracy-validation", icon: Target, roles: ['manager', 'owner', 'super_admin'] },
    { name: "AI Standings", href: "/ocr/improvement", icon: UserCheck, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Operational Pilot Lab", href: "/testing/pilot-lab", icon: Play, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Operator Efficiency", href: "/operator/efficiency", icon: Timer, roles: ['manager', 'owner', 'super_admin'] },
    { name: "OCR Training Cockpit", href: "/ocr/training-center", icon: Cpu, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Security Audit Console", href: "/security/audit-console", icon: ShieldAlert, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Security Cockpit", href: "/security/soc", icon: ShieldAlert, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Launch Hardening", href: "/operations/launch-readiness", icon: ShieldCheck, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Operational Feedback", href: "/operations/feedback", icon: MessageSquare, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Rollout Center", href: "/operations/rollout", icon: Award, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Identity Control", href: "/auth/identity-governance", icon: ShieldCheck, roles: ['manager', 'owner', 'super_admin'] },
 
    { name: "Legal Compliance", href: "/compliance/legal-center", icon: ShieldAlert, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Event Store Diagnostics", href: "/observability-console", icon: Database, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Hardware Integration", href: "/hardware", icon: Cpu, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Live Settlements", href: "/reconciliation/settlements", icon: Landmark, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Forensic Workbench", href: "/observability-console", icon: Eye, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Alerts Operations", href: "/notifications/operations-center", icon: Bell, roles: ['manager', 'owner', 'super_admin'] },
    { name: "SaaS Admin Center", href: "/saas/administration", icon: Layers, roles: ['manager', 'owner', 'super_admin'] },
    { name: "DevOps Center", href: "/devops/infrastructure", icon: Server, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Control Room", href: "/observability-console", icon: Activity, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Business Intel", href: "/financial-reports", icon: TrendingUp, roles: ['manager', 'owner', 'super_admin'] },
    { name: "System Deployment", href: "/deployment/console", icon: Settings, roles: ['manager', 'owner', 'super_admin'] },

    // Desktop Management
    { name: "Desktop Control", href: "/desktop", icon: Monitor, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Backup & Recovery", href: "/desktop/backup", icon: HardDrive, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Sync Dashboard", href: "/desktop/sync", icon: Activity, roles: ['operator', 'manager', 'owner', 'super_admin'] },

    // Owner & Finance
    { name: "Network Control Room", href: "/operations/owner", icon: Building2, roles: ['owner', 'super_admin'] },
    { name: "Accountant Desk", href: "/operations/accountant", icon: Landmark, roles: ['manager', 'owner', 'super_admin'] },

    { name: "Reports", href: "/financial-reports", icon: IndianRupee, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "General Ledger", href: "/accounting/ledger", icon: Landmark, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Journal Entries", href: "/accounting/journals", icon: ClipboardList, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Cashbook Ledger", href: "/accounting/cashbook", icon: Receipt, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Expense Ledger", href: "/accounting/expenses", icon: Landmark, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Hardware Observability", href: "/hardware", icon: Cpu, roles: ['manager', 'owner', 'super_admin'] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ['operator', 'manager', 'owner', 'super_admin'] },
    { name: "Station Setup", href: "/station-setup", icon: Fuel, roles: ['operator', 'manager', 'owner', 'super_admin'] },

    { name: "Staff", href: "/staff", icon: Users, roles: ['operator', 'manager', 'owner', 'super_admin'] },
  ];

  const filteredLinks = links.filter((link) => {
    // Role filter
    if (!link.roles.includes(role || 'operator')) {
      return false;
    }
    
    // Mode filter
    if (activeMode === 'operator') {
      const allowedOperatorNames = [
        "Dashboard",
        "Today's Shift",
        "History",
        "Fuel Stock",
        "Cash & Expenses",
        "Staff",
        "Suspicious Activity",
        "Reports",
        "Settings"
      ];
      if (!allowedOperatorNames.includes(link.name)) return false;
      
      // Strict layout check for operators to avoid protected pages
      if (role === 'operator') {
        return ["Dashboard", "Today's Shift", "History", "Fuel Stock", "Cash & Expenses", "Settings"].includes(link.name);
      }
      return true;
    }
    
    if (activeMode === 'manager') {
      const hiddenInManagerMode = [
        "AI Integrity HUD",
        "VLM Costs Tracker",
        "OCR Benchmarks",
        "Database Stress Lab",
        "Event Store Diagnostics",
        "AI Consensus",
        "Security Cockpit",
        "OCR Training Cockpit",
        "DevOps Center",
        "Reliability HUD",
        "AI Workstation",
        "Control Room",
        "System Observability",
        "System Deployment",
        "Hardware Observability",
        "Hardware Integration",
        "Forensic Workbench",
        "⚡ Accuracy Validation",
        "OCR Correction KPIs"
      ];
      return !hiddenInManagerMode.includes(link.name);
    }
    
    return true;
  });

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased animated-gradient">
      {/* Sidebar Navigation - Hidden on mobile/tablet screens */}
      <nav className="hidden md:flex w-20 md:w-64 border-r border-[var(--color-border-light)] p-4 flex-col gap-6 justify-between glass-panel shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 mb-6">
            <PetroOpsLogo size={32} />
            <span className="hidden md:block font-black text-lg tracking-wider text-[var(--color-text-primary)] font-sans">PetroOps</span>
          </div>

          {/* Workstation Mode Selector */}
          <div className="px-2 mb-6">
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold tracking-widest uppercase mb-2">Workstation Mode</div>
            <select
              value={activeMode}
              onChange={(e) => handleModeChange(e.target.value as any)}
              className={cn(
                "w-full p-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 cursor-pointer focus:outline-none",
                activeMode === 'operator' 
                  ? "bg-[var(--color-bg-tertiary)] border-[var(--color-border-light)] text-[var(--color-text-primary)]" 
                  : activeMode === 'manager' 
                    ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-200" 
                    : "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
              )}
            >
              <option value="operator" className="bg-[#0b0f19] text-slate-300">💼 Operator Mode</option>
              <option value="manager" className="bg-[#0b0f19] text-indigo-300">📈 Manager Mode</option>
              <option value="developer" className="bg-[#0b0f19] text-emerald-300">⚡ Developer Mode</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                    isActive
                      ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/70 hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-105", isActive ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]")} />
                  <span className="hidden md:block font-medium text-xs tracking-wider uppercase">{link.name}</span>
                  {isActive && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[var(--color-accent-brand)] rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="px-2 pb-2 border-t border-[var(--color-border-light)] pt-4">
          <div className="hidden md:block text-[10px] text-[var(--color-text-secondary)] font-medium mb-3 tracking-widest uppercase">Operator Session</div>
          <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]">
            <img 
              src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150"} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-[var(--color-border-default)]" 
            />
            <div className="hidden md:block truncate">
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{user?.displayName || "Demo User"}</div>
              <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{user?.email || "operator@petroops.com"}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-200 text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-danger)]/5 hover:text-[var(--color-accent-danger)] border border-transparent hover:border-[var(--color-accent-danger)]/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:block font-medium text-xs tracking-wider uppercase">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth" style={{ overscrollBehaviorY: 'contain' }}>
        {/* Route-Aware Breadcrumbs Navigation */}
        <div className="px-8 pt-6 pb-2 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-bold flex items-center gap-1.5 print:hidden">
          <span>Home</span>
          {location.pathname.split('/').filter(Boolean).map((p, idx) => (
            <React.Fragment key={idx}>
              <span className="text-[var(--color-text-tertiary)]">&gt;</span>
              <span className={idx === location.pathname.split('/').filter(Boolean).length - 1 ? "text-[var(--color-text-primary)] font-extrabold" : ""}>{p}</span>
            </React.Fragment>
          ))}
        </div>
        <Outlet />
      </main>

      {/* Bottom Touch Navigation for Mobile & Tablet (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-bg-primary)]/95 backdrop-blur border-t border-[var(--color-border-light)] flex items-center justify-around px-4 z-40 print:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <Link 
          to="/" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-90",
            location.pathname === "/" ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Home</span>
        </Link>

        <Link 
          to="/operations" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-90",
            location.pathname === "/operations" ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]"
          )}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Shift</span>
        </Link>

        <Link 
          to="/capture" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-90",
            location.pathname === "/capture" ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]"
          )}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Scan</span>
        </Link>

        <Link 
          to="/credit-ledger" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-90",
            location.pathname === "/credit-ledger" ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]"
          )}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Ledger</span>
        </Link>

        <button 
          onClick={() => setIsMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all active:scale-90",
            isMenuOpen ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">More</span>
        </button>
      </div>

      {/* Bottom Drawer / Collapsible Menu for Mobile */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-50 transition-opacity duration-300" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-[var(--color-bg-primary)] rounded-t-3xl border-t border-[var(--color-border-light)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 overflow-y-auto flex flex-col gap-6 z-50 transition-transform duration-300 transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-3">
              <div>
                <span className="font-bold text-sm tracking-widest uppercase text-[var(--color-text-primary)]">Operational Menu</span>
                <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider uppercase mt-1">Select action or view details</p>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-light)] font-semibold text-sm flex items-center justify-center active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Operator Session Info in Drawer */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)]">
              <img 
                src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150"} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border border-[var(--color-border-default)]" 
              />
              <div className="truncate">
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">{user?.displayName || "Demo User"}</div>
                <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{user?.email || "operator@petroops.com"}</div>
                <div className="text-[9px] font-bold text-[var(--color-accent-brand)] tracking-widest uppercase mt-0.5">{role || 'operator'}</div>
              </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
              {filteredLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border transition-all active:scale-95 duration-150",
                        isActive
                          ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border-[var(--color-border-default)] font-semibold"
                          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border-light)] hover:bg-[var(--color-bg-tertiary)]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[var(--color-accent-brand)]" : "text-[var(--color-text-secondary)]")} />
                      <span className="text-[10px] font-semibold tracking-wider uppercase truncate">{link.name}</span>
                    </Link>
                  );
                })}
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-[var(--color-border-light)]">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-[var(--color-accent-danger)]/5 text-[var(--color-accent-danger)] border border-[var(--color-accent-danger)]/20 font-semibold text-xs tracking-widest uppercase hover:bg-[var(--color-accent-danger)]/10"
              >
                <LogOut className="w-5 h-5" />
                Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Floating GenAI Conversational Copilot */}
      <ConversationalAI />
    </div>
  );
}
