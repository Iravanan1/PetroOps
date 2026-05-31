import { Routes, Route } from "react-router-dom";
import React, { useEffect, Suspense } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./utils/firebase";
import { useAuthStore } from "./store/useAuthStore";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import UploadScreen from "./pages/UploadScreen";
import AlertsPage from "./pages/AlertsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import OnboardingWizard from "./pages/OnboardingWizard";
import StationSetupPage from "./pages/StationSetupPage";
import StaffPage from "./pages/StaffPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Hardened AI Workstation Pages
import AIReviewSandbox from "./pages/AIReviewSandbox";
import AIIntegrityDashboard from "./pages/AIIntegrityDashboard";
import AIConsensusPage from "./pages/AIConsensusPage";
import AIAnomaliesCenter from "./pages/AIAnomaliesCenter";
import AIQueuePage from "./pages/AIQueuePage";
import AICostsTracker from "./pages/AICostsTracker";
import AIComparisonDashboard from "./pages/AIComparisonDashboard";
import AIObservabilityHUD from "./pages/AIObservabilityHUD";

// Lazy-load ERP Modules
const CreditCustomersPage = React.lazy(() => import("./modules/credit-ledger/pages/CreditCustomersPage"));
const CreditCustomerDetailsPage = React.lazy(() => import("./modules/credit-ledger/pages/CreditCustomerDetailsPage"));
const CreditPaymentPage = React.lazy(() => import("./modules/credit-ledger/pages/CreditPaymentPage"));
const BankingPage = React.lazy(() => import("./modules/banking/pages/BankingPage"));
const GeneralLedgerPage = React.lazy(() => import("./modules/accounting/pages/GeneralLedgerPage"));
const JournalEntriesPage = React.lazy(() => import("./modules/accounting/pages/JournalEntriesPage"));
const CashbookPage = React.lazy(() => import("./modules/accounting/pages/CashbookPage"));
const ExpenseLedgerPage = React.lazy(() => import("./modules/accounting/pages/ExpenseLedgerPage"));
const UpiPage = React.lazy(() => import("./modules/upi/pages/UpiPage"));
const UPIMerchantManagementPage = React.lazy(() => import("./modules/upi/pages/UPIMerchantManagementPage"));
const CashPage = React.lazy(() => import("./modules/cash/pages/CashPage"));
const WetStockPage = React.lazy(() => import("./modules/wetstock/pages/WetStockPage"));
const AuditsPage = React.lazy(() => import("./modules/audits/pages/AuditsPage"));
const DailyClosingSheetPage = React.lazy(() => import("./modules/shared/pages/DailyClosingSheetPage"));
const OperationsDashboardPage = React.lazy(() => import("./modules/operations/pages/OperationsDashboardPage"));
const ShiftOpenPage = React.lazy(() => import("./modules/operations/pages/ShiftOpenPage"));
const ShiftDetailsPage = React.lazy(() => import("./modules/operations/pages/ShiftDetailsPage"));
const ShiftReconcilePage = React.lazy(() => import("./modules/operations/pages/ShiftReconcilePage"));
const ShiftClosePage = React.lazy(() => import("./modules/operations/pages/ShiftClosePage"));
const ShiftReportPage = React.lazy(() => import("./modules/operations/pages/ShiftReportPage"));

// Phase 5: Wet Stock Intelligence (full engine)
const WetStockIntelligencePage = React.lazy(() => import("./pages/WetStockPage"));

// Phase 8: Financial Reports
const DailyClosingSheet = React.lazy(() => import("./pages/DailyClosingSheet"));

// New Advanced Enterprise Expansion Pages
const OperationalReliabilityDashboard = React.lazy(() => import("./pages/OperationalReliabilityDashboard"));

// Real Production Pilot & Executive Intelligence Pages
const BranchPilotConsole = React.lazy(() => import("./pages/BranchPilotConsole"));
const OperationsAlertsCenter = React.lazy(() => import("./pages/OperationsAlertsCenter"));

// Hardened Operational Stabilization Pages
const OperatorConsole = React.lazy(() => import("./pages/OperatorConsole"));
const LiveShiftSimulator = React.lazy(() => import("./pages/LiveShiftSimulator"));
const ProductionObservabilityConsole = React.lazy(() => import("./pages/ProductionObservabilityConsole"));
const OCRCorrectionKPIs = React.lazy(() => import("./pages/OCRCorrectionKPIs"));

// Advanced Ingestion, Ground Truth and Benchmarking Engines
const OCRBenchmarkCenter = React.lazy(() => import("./pages/OCRBenchmarkCenter"));
const BulkOCRValidationLab = React.lazy(() => import("./pages/BulkOCRValidationLab"));
const OperationalPilotLab = React.lazy(() => import("./pages/OperationalPilotLab"));
const OperatorEfficiencyDashboard = React.lazy(() => import("./pages/OperatorEfficiencyDashboard"));
const ProductionDeploymentConsole = React.lazy(() => import("./pages/ProductionDeploymentConsole"));
const OCRModelTrainingCenter = React.lazy(() => import("./pages/OCRModelTrainingCenter"));
const SecurityAuditConsole = React.lazy(() => import("./pages/SecurityAuditConsole"));
const NotificationOperationsCenter = React.lazy(() => import("./pages/NotificationOperationsCenter"));
const SaaSAdministrationCenter = React.lazy(() => import("./pages/SaaSAdministrationCenter"));
const InfrastructureOperationsCenter = React.lazy(() => import("./pages/InfrastructureOperationsCenter"));
const MobileOperationsConsole = React.lazy(() => import("./pages/MobileOperationsConsole"));
const IdentityGovernanceCenter = React.lazy(() => import("./pages/IdentityGovernanceCenter"));
const EnterpriseComplianceCenter = React.lazy(() => import("./pages/EnterpriseComplianceCenter"));
const OCRInsightsDashboard = React.lazy(() => import("./pages/OCRInsightsDashboard"));
const OCRCorrectionAnalyticsPage = React.lazy(() => import("./pages/OCRCorrectionAnalyticsPage"));
const ExtractionAccuracyValidationCenter = React.lazy(() => import("./pages/ExtractionAccuracyValidationCenter"));
const SingleDayOperationCenter = React.lazy(() => import("./pages/SingleDayOperationCenter"));

const OperationsCommandCenter = React.lazy(() => import("./modules/operations/pages/OperationsCommandCenter"));
const ShiftWorkspacePage = React.lazy(() => import("./modules/operations/pages/ShiftWorkspacePage"));
const SmartReconciliationCenter = React.lazy(() => import("./modules/operations/pages/SmartReconciliationCenter"));
const WetstockOperationsCenter = React.lazy(() => import("./modules/operations/pages/WetstockOperationsCenter"));
const CreditOperationsCenter = React.lazy(() => import("./modules/operations/pages/CreditOperationsCenter"));
const DigitalCollectionsCenter = React.lazy(() => import("./modules/operations/pages/DigitalCollectionsCenter"));
const DailyOperationsReports = React.lazy(() => import("./modules/operations/pages/DailyOperationsReports"));
const OwnerOperationsCenter = React.lazy(() => import("./modules/operations/pages/OwnerOperationsCenter"));
const OperatorPerformanceAnalytics = React.lazy(() => import("./modules/operations/pages/OperatorPerformanceAnalytics"));
const CreditRecoveryIntelligence = React.lazy(() => import("./modules/operations/pages/CreditRecoveryIntelligence"));
const OperationalAlertsCenter = React.lazy(() => import("./modules/operations/pages/OperationalAlertsCenter"));
const BusinessCashflowDashboard = React.lazy(() => import("./modules/operations/pages/BusinessCashflowDashboard"));
const AccountantWorkspace = React.lazy(() => import("./modules/operations/pages/AccountantWorkspace"));
const NetworkOperationsCenter = React.lazy(() => import("./modules/operations/pages/NetworkOperationsCenter"));
const CentralShiftMonitor = React.lazy(() => import("./modules/operations/pages/CentralShiftMonitor"));
const CentralApprovalWorkspace = React.lazy(() => import("./modules/operations/pages/CentralApprovalWorkspace"));
const DisasterRecoveryCenter = React.lazy(() => import("./modules/operations/pages/DisasterRecoveryCenter"));
const CentralAuditVault = React.lazy(() => import("./modules/operations/pages/CentralAuditVault"));
const SecurityOperationsCenter = React.lazy(() => import("./modules/security/pages/SecurityOperationsCenter"));
const RolloutReadinessCenter = React.lazy(() => import("./modules/operations/pages/RolloutReadinessCenter"));
const OCRLearningDashboard = React.lazy(() => import("./modules/ocr/pages/OCRLearningDashboard"));
const PortalWorkspace = React.lazy(() => import("./modules/portal/pages/PortalWorkspace"));
const LaunchReadinessCenter = React.lazy(() => import("./pages/LaunchReadinessCenter"));
const DailyOperationalFeedbackPage = React.lazy(() => import("./pages/DailyOperationalFeedbackPage"));







// Desktop Hardening & Offline Control
const DesktopControlCenter = React.lazy(() => import("./pages/DesktopControlCenter"));
const BackupRecoveryPage = React.lazy(() => import("./pages/BackupRecoveryPage"));
const SyncStatusDashboard = React.lazy(() => import("./pages/SyncStatusDashboard"));

// Settings, Dealer Portals, UPI, and Manual Entry setup pages
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const DealerPortalSettingsPage = React.lazy(() => import("./pages/DealerPortalSettingsPage"));
const PortalSyncStatusPage = React.lazy(() => import("./pages/PortalSyncStatusPage"));
const UpiMerchantsPage = React.lazy(() => import("./pages/UpiMerchantsPage"));
const ManualEntrySettingsPage = React.lazy(() => import("./pages/ManualEntrySettingsPage"));

// Owner Dashboard & Financial Reports
const OwnerDashboard = React.lazy(() => import("./pages/OwnerDashboard"));
const FinancialReportCenter = React.lazy(() => import("./pages/FinancialReportCenter"));
const HardwareObservabilityDashboard = React.lazy(() => import("./pages/HardwareObservabilityDashboard"));

// Transactions Subroutes
import { TransactionsIndexPage, ExpensesPage, CreditSalesPage, RecoveriesPage, UpiCollectionsPage, NozzleTestingPage } from "./modules/operations/pages/TransactionsModulePages";

// Reconciliations Subroutes
import { ReconciliationIndexPage, CashReconciliationPage, WetstockReconciliationPage, SettlementsReconciliationPage, DiscrepanciesReconciliationPage } from "./modules/operations/pages/ReconciliationModulePages";

// Reports Subroutes
import { ReportsDailyPage, ReportsTransactionsPage, ReportsWetstockPage, ReportsAuditsPage } from "./modules/operations/pages/ReportsModulePages";

import ReviewUI from "./pages/ReviewUI";
import OCRDatasetManagerPage from "./pages/OCRDatasetManagerPage";
import OCRBenchmarkDashboard from "./pages/OCRBenchmarkDashboard";
import OCRAccuracyHeatmap from "./pages/OCRAccuracyHeatmap";
import PerfectAccuracyDashboard from "./pages/PerfectAccuracyDashboard";
import ModelImprovementDashboard from './pages/ModelImprovementDashboard';

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Persistent operational test session preservation
    const defaultAdmin = {
      uid: "demo-admin-999",
      email: "admin@petroops.demo",
      displayName: "Potaliya Admin (Owner)",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150",
      role: "owner",
      pumpName: "Potaliya Petroleum",
      branchName: "Potaliya Petroleum by HPCL",
      gstNumber: "27AAAAA1111A1Z1",
      address: "Highway Hub, HPCL Petrol Pump, Potaliya, Rajasthan",
      managerName: "Rajesh Patil",
      stationTemplate: "HPCL",
      onboardingComplete: true,
    };
    
    try {
      localStorage.setItem("petroops_bypass_user", JSON.stringify(defaultAdmin));
      localStorage.setItem("petroops_onboarding_complete", "true");
    } catch (e) {}
    
    setUser(defaultAdmin, "owner");
    setLoading(false);
    
    // Completely bypass Firebase listener side-effects
    return () => {};
  }, [setUser, setLoading]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b13] flex items-center justify-center text-slate-500 text-xs">Loading operational bounds...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/day-operations/:date" element={<SingleDayOperationCenter />} />
            <Route path="/station-setup" element={<StationSetupPage />} />
            <Route path="/capture" element={<UploadScreen />} />
            <Route path="/credit-ledger" element={<CreditCustomersPage />} />
            <Route path="/credit-ledger/customer/:id" element={<CreditCustomerDetailsPage />} />
            <Route path="/credit-ledger/payment" element={<CreditPaymentPage />} />

            {/* Custom onboarding, settings hubs and credit customers */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/dealer-portals" element={<DealerPortalSettingsPage />} />
            <Route path="/portal-sync-status" element={<PortalSyncStatusPage />} />
            <Route path="/settings/upi" element={<UpiMerchantsPage />} />
            <Route path="/settings/manual-entry" element={<ManualEntrySettingsPage />} />
            <Route path="/settings/customers" element={<CreditCustomersPage />} />
            <Route path="/credit/customers" element={<CreditCustomersPage />} />
            <Route path="/credit/customers/:id" element={<CreditCustomerDetailsPage />} />
            <Route path="/credit/customers/:id/statement" element={<CreditCustomerDetailsPage />} />
            <Route path="/accounting/ledger" element={<GeneralLedgerPage />} />
            <Route path="/accounting/journals" element={<JournalEntriesPage />} />
            <Route path="/accounting/cashbook" element={<CashbookPage />} />
            <Route path="/accounting/expenses" element={<ExpenseLedgerPage />} />
            <Route path="/banking" element={<BankingPage />} />
            <Route path="/upi" element={<UpiPage />} />
            <Route path="/upi-management" element={<UPIMerchantManagementPage />} />
            <Route path="/upi-management/:id" element={<UPIMerchantManagementPage />} />
            <Route path="/cash" element={<CashPage />} />
            <Route path="/wetstock" element={<WetStockPage />} />
            <Route path="/audits" element={<AuditsPage />} />
            <Route path="/closing-sheet" element={<DailyClosingSheetPage />} />
            <Route path="/operations" element={<OperationsCommandCenter />} />
            <Route path="/operations/shift-workspace" element={<ShiftWorkspacePage />} />
            <Route path="/operations/reconciliation" element={<SmartReconciliationCenter />} />
            <Route path="/operations/wetstock" element={<WetstockOperationsCenter />} />
            <Route path="/operations/credit" element={<CreditOperationsCenter />} />
            <Route path="/operations/digital" element={<DigitalCollectionsCenter />} />
            <Route path="/operations/reports" element={<DailyOperationsReports />} />
            <Route path="/operations/owner" element={<OwnerOperationsCenter />} />
            <Route path="/operations/operator-analytics" element={<OperatorPerformanceAnalytics />} />
            <Route path="/operations/credit-intelligence" element={<CreditRecoveryIntelligence />} />
            <Route path="/operations/alerts" element={<OperationalAlertsCenter />} />
            <Route path="/operations/cashflow" element={<BusinessCashflowDashboard />} />
            <Route path="/operations/accountant" element={<AccountantWorkspace />} />
            <Route path="/operations/network" element={<NetworkOperationsCenter />} />
            <Route path="/operations/shift-monitor" element={<CentralShiftMonitor />} />
            <Route path="/operations/approvals" element={<CentralApprovalWorkspace />} />
            <Route path="/operations/disaster-recovery" element={<DisasterRecoveryCenter />} />
            <Route path="/operations/audit-vault" element={<CentralAuditVault />} />
            <Route path="/security/soc" element={<SecurityOperationsCenter />} />
            <Route path="/operations/rollout" element={<RolloutReadinessCenter />} />
            <Route path="/ocr/learning-dashboard" element={<OCRLearningDashboard />} />
            <Route path="/operations/dealer-workspace" element={<PortalWorkspace />} />
            <Route path="/testing/pilot-lab" element={<OperationalPilotLab />} />
            <Route path="/pilot-lab" element={<OperationalPilotLab />} />
            <Route path="/operations/launch-readiness" element={<LaunchReadinessCenter />} />
            <Route path="/launch-readiness" element={<LaunchReadinessCenter />} />
            <Route path="/operations/feedback" element={<DailyOperationalFeedbackPage />} />
            <Route path="/feedback" element={<DailyOperationalFeedbackPage />} />




            <Route path="/operations/shifts/open" element={<ShiftOpenPage />} />
            <Route path="/operations/shifts/:id" element={<ShiftDetailsPage />} />
            <Route path="/operations/shifts/:id/reconcile" element={<ShiftReconcilePage />} />
            <Route path="/operations/shifts/:id/close" element={<ShiftClosePage />} />
            <Route path="/operations/shifts/:id/report" element={<ShiftReportPage />} />

            {/* Transactions Module Routes */}
            <Route path="/transactions" element={<TransactionsIndexPage />} />
            <Route path="/transactions/expenses" element={<ExpensesPage />} />
            <Route path="/transactions/credit-sales" element={<CreditSalesPage />} />
            <Route path="/transactions/recoveries" element={<RecoveriesPage />} />
            <Route path="/transactions/upi" element={<UpiCollectionsPage />} />
            <Route path="/transactions/testing" element={<NozzleTestingPage />} />

            {/* Reconciliations Module Routes */}
            <Route path="/reconciliation" element={<ReconciliationIndexPage />} />
            <Route path="/reconciliation/cash" element={<CashReconciliationPage />} />
            <Route path="/reconciliation/wetstock" element={<WetstockReconciliationPage />} />
            <Route path="/reconciliation/settlements" element={<SettlementsReconciliationPage />} />
            <Route path="/reconciliation/discrepancies" element={<DiscrepanciesReconciliationPage />} />

            {/* Reports Module Routes */}
            <Route path="/reports/daily" element={<ReportsDailyPage />} />
            <Route path="/reports/transactions" element={<ReportsTransactionsPage />} />
            <Route path="/reports/wetstock" element={<ReportsWetstockPage />} />
            <Route path="/reports/audits" element={<ReportsAuditsPage />} />

            {/* Phase 8: Financial Closing Sheet */}
            <Route path="/closing" element={<DailyClosingSheet />} />

            {/* Phase 5: Wet Stock Intelligence Engine */}
            <Route path="/wetstock-intel" element={<WetStockIntelligencePage />} />
            <Route path="/wetstock-intel/variances" element={<WetStockIntelligencePage />} />
            <Route path="/wetstock-intel/nozzles" element={<WetStockIntelligencePage />} />
            <Route path="/wetstock-intel/history" element={<WetStockIntelligencePage />} />

            {/* Hardened AI Operation Control Center Routes */}
            <Route path="/ai-integrity" element={<AIIntegrityDashboard />} />
            <Route path="/ai-review" element={<AIReviewSandbox />} />
            <Route path="/ai-review/:id" element={<AIReviewSandbox />} />
            <Route path="/ai-bulk-validation" element={<BulkOCRValidationLab />} />
            <Route path="/ai-consensus" element={<AIConsensusPage />} />
            <Route path="/ai-anomalies" element={<AIAnomaliesCenter />} />
            <Route path="/ai-costs" element={<AICostsTracker />} />
            <Route path="/ai-queue" element={<AIQueuePage />} />
            <Route path="/ai-comparison" element={<AIComparisonDashboard />} />
            <Route path="/ai-observability" element={<AIObservabilityHUD />} />

            {/* New Advanced Enterprise Expansion Routes */}
            <Route path="/operational-reliability" element={<OperationalReliabilityDashboard />} />

            {/* Real Production Pilot & Executive Intelligence Routes */}
            <Route path="/branch-console" element={<BranchPilotConsole />} />
            <Route path="/alerts-center" element={<OperationsAlertsCenter />} />

            {/* Hardened Operational Stabilization Routes */}
            <Route path="/operator-console" element={<OperatorConsole />} />
            <Route path="/shift-simulator" element={<LiveShiftSimulator />} />
            <Route path="/observability-console" element={<ProductionObservabilityConsole />} />

            {/* Advanced Ingestion, Ground Truth and Benchmarking Engines */}
            <Route path="/ocr/dataset" element={<OCRDatasetManagerPage />} />
            <Route path="/ocr/benchmark-dashboard" element={<OCRBenchmarkDashboard />} />
            <Route path="/ocr/heatmap" element={<OCRAccuracyHeatmap />} />
            <Route path="/ocr/perfect-accuracy" element={<PerfectAccuracyDashboard />} />
            <Route path="/ai-review-ui" element={<ReviewUI />} />
            <Route path="/ocr/benchmarks" element={<OCRBenchmarkCenter />} />
            <Route path="/ocr/lab" element={<BulkOCRValidationLab />} />
            <Route path="/ocr/kpis" element={<OCRCorrectionKPIs />} />
            <Route path="/ocr/improvement" element={<ModelImprovementDashboard />} />
            <Route path="/ocr/insights" element={<OCRInsightsDashboard />} />
            <Route path="/ocr/correction-analytics" element={<OCRCorrectionAnalyticsPage />} />
            <Route path="/accuracy-validation" element={<ExtractionAccuracyValidationCenter />} />
            <Route path="/operator/efficiency" element={<OperatorEfficiencyDashboard />} />
            <Route path="/deployment/console" element={<ProductionDeploymentConsole />} />
            <Route path="/ocr/training-center" element={<OCRModelTrainingCenter />} />
            <Route path="/security/audit-console" element={<SecurityAuditConsole />} />
            <Route path="/notifications/operations-center" element={<NotificationOperationsCenter />} />
            <Route path="/saas/administration" element={<SaaSAdministrationCenter />} />
            <Route path="/devops/infrastructure" element={<InfrastructureOperationsCenter />} />
            <Route path="/mobile/console" element={<MobileOperationsConsole />} />
            <Route path="/auth/identity-governance" element={<IdentityGovernanceCenter />} />
            <Route path="/compliance/legal-center" element={<EnterpriseComplianceCenter />} />

            {/* Desktop Hardening & Offline Management */}
            <Route path="/desktop" element={<DesktopControlCenter />} />
            <Route path="/desktop/backup" element={<BackupRecoveryPage />} />
            <Route path="/desktop/sync" element={<SyncStatusDashboard />} />

            {/* Owner Dashboard, Financial Reports & Hardware */}
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/financial-reports" element={<FinancialReportCenter />} />
            <Route path="/hardware" element={<HardwareObservabilityDashboard />} />


            <Route element={<ProtectedRoute allowedRoles={['manager', 'owner', 'super_admin']} />}>
              <Route path="/alerts" element={<AlertsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'owner', 'manager']} />}>
              <Route path="/staff" element={<StaffPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

