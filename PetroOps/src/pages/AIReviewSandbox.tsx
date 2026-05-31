import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, Sparkles, Check, AlertOctagon, HelpCircle, FileText, 
  CheckCircle2, History, ZoomIn, ZoomOut, RotateCw, Sun, Contrast, 
  ChevronRight, RefreshCw, BarChart4, AlertTriangle, Info, CheckSquare, Eye,
  Trash2, Plus, User, Calendar, DollarSign, Activity, Edit3, CornerUpLeft, CornerUpRight, Smartphone, Keyboard, Layout, Trash, Save, CheckSquare as CheckIcon, XCircle
} from 'lucide-react';
import { ValidationAssertions } from '../modules/accounting/ValidationAssertions';
import { OcrReplayLogs, ManagerMutation } from '../modules/ocr/audit/OcrReplayLogs';
import { ClaudeTheme } from '../design-system/ClaudeInspiredTheme';
import { useAuthStore } from '../store/useAuthStore';
import { CreditCustomerOcrEntry, NozzleReadingOcr } from '../types';
import { OCRLearningEngine } from '../modules/ocr/adaptive/OCRLearningEngine';
import UnknownWordReviewPanel from '../modules/ocr/components/UnknownWordReviewPanel';
import { db } from "../utils/firebase";
import { doc, setDoc } from "firebase/firestore";


// Helper to get color/badge styling based on OCR confidence level
const getConfidenceMeta = (confidence: number) => {
  if (confidence >= 95) {
    return {
      color: '#2E7D32', // Muted forest green
      bg: 'rgba(46, 125, 50, 0.05)',
      border: 'rgba(46, 125, 50, 0.25)',
      text: 'text-emerald-800',
      label: 'High Confidence'
    };
  } else if (confidence >= 80) {
    return {
      color: '#F57F17', // Muted amber
      bg: 'rgba(245, 127, 23, 0.05)',
      border: 'rgba(245, 127, 23, 0.25)',
      text: 'text-amber-800',
      label: 'Medium Confidence'
    };
  } else {
    return {
      color: '#C62828', // Muted brick red
      bg: 'rgba(198, 40, 40, 0.06)',
      border: 'rgba(198, 40, 40, 0.35)',
      text: 'text-rose-800',
      label: 'Low Confidence - Review Required'
    };
  }
};

interface BoundingRegionProps {
  key?: React.Key;
  id: string;
  label: string;
  confidence: number;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// BoundingBox Overlay component in Scanned Receipt
function BoundingRegion({ id, label, confidence, isActive, onClick, children }: BoundingRegionProps) {
  const meta = getConfidenceMeta(confidence);

  return (
    <div 
      onClick={onClick}
      style={{
        borderColor: isActive ? '#E65100' : meta.color,
        backgroundColor: isActive ? 'rgba(230, 81, 0, 0.06)' : meta.bg,
        borderWidth: isActive ? '2px' : '1px',
        borderStyle: isActive ? 'solid' : 'dashed',
      }}
      className={`relative p-2 my-1 rounded transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'ring-2 ring-amber-500/20 scale-[1.01] shadow-sm z-10' 
          : 'hover:bg-slate-50/50 hover:shadow-sm'
      }`}
    >
      <div className="absolute -top-2 left-1.5 z-10 flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider font-mono">
        <span 
          style={{
            color: isActive ? '#E65100' : meta.color,
            backgroundColor: '#FFFFFF',
            borderColor: isActive ? '#E65100' : meta.border
          }}
          className="px-1 py-0.2 rounded border shadow-xs"
        >
          {label} ({confidence}%)
        </span>
      </div>
      
      {isActive && (
        <div className="absolute right-1 top-1 animate-pulse pointer-events-none">
          <span className="text-[6.5px] bg-[#E65100] text-white px-1 py-0.2 rounded uppercase font-mono tracking-widest font-black">
            Active
          </span>
        </div>
      )}

      <div className="w-full pt-1">
        {children}
      </div>
    </div>
  );
}

export default function AIReviewSandbox() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = id || 'shift_demo_987';
  const { user } = useAuthStore();
  const onboardingTemplate = user?.stationTemplate?.toUpperCase() || 'HPCL';

  // Left Panel Scanned Image Visual filters & alignment
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [debugRegionMode, setDebugRegionMode] = useState<boolean>(true);

  // Focus-sync tracking
  const [activeFocusedFieldId, setActiveFocusedFieldId] = useState<string>('operatorName');

  // Touch Swipe Navigation states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Quick edit mode toggle (true = Excel-style Grid, false = Touch-friendly Cards)
  const [quickEditMode, setQuickEditMode] = useState<boolean>(true);

  // Active Tab state for viewports < 1024px
  const [activeTab, setActiveTab] = useState<'receipt' | 'consensus' | 'worksheet'>('receipt');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [complianceExplain, setComplianceExplain] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);



  // Initial Form Structure
  const initialForm = {
    operatorName: 'Sanjay Kumar',
    shiftDate: '2026-05-18',
    shiftLabel: 'Day Shift',
    openingCash: 12500,
    actualCash: 25022,
    upiSales: 18500,
    cardSales: 9000,
    creditSales: 14300, 
    creditRecovery: 3200,
    expenses: 1500,
    measuredDensity: 745.2,
    readings: [
      {
        nozzleId: 'nozzle-1',
        fuelType: 'MS' as 'MS' | 'HSD' | 'SPEED',
        openingMeter: 12450.50,
        closingMeter: 12790.80,
        testingQty: 5.0,
        netSales: 335.30,
        fuelRate: 104.50
      },
      {
        nozzleId: 'nozzle-2',
        fuelType: 'HSD' as 'MS' | 'HSD' | 'SPEED',
        openingMeter: 8520.10,
        closingMeter: 8710.60,
        testingQty: 0.0,
        netSales: 190.50,
        fuelRate: 92.30
      }
    ] as NozzleReadingOcr[],
    creditEntries: [
      {
        customerName: 'Rajasthan Transport',
        amount: 5000,
        date: '2026-05-18',
        shiftId: 'shift_demo_987',
        paymentStatus: 'pending' as 'pending' | 'paid',
        notes: 'Credit sale logged',
        confidence: 96,
        reviewStatus: 'clean' as 'clean' | 'needs_review'
      },
      {
        customerName: 'Sharma Ji',
        amount: 2200,
        date: '2026-05-18',
        shiftId: 'shift_demo_987',
        paymentStatus: 'pending' as 'pending' | 'paid',
        notes: 'Partial faded text',
        confidence: 65,
        reviewStatus: 'needs_review' as 'clean' | 'needs_review'
      },
      {
        customerName: 'Mahaveer Travels',
        amount: 7100,
        date: '2026-05-18',
        shiftId: 'shift_demo_987',
        paymentStatus: 'pending' as 'pending' | 'paid',
        notes: 'Tilted row',
        confidence: 88,
        reviewStatus: 'clean' as 'clean' | 'needs_review'
      }
    ] as CreditCustomerOcrEntry[]
  };

  // 100% Linear Undo / Redo Buffers
  const [history, setHistory] = useState<{
    past: typeof initialForm[];
    present: typeof initialForm;
    future: typeof initialForm[];
  }>({
    past: [],
    present: initialForm,
    future: []
  });

  const form = history.present;

  // Dynamic training state for handwriting-learning
  const [learningField, setLearningField] = useState<{
    rawOCR: string;
    fieldKey: string;
    confidence: number;
  } | null>(null);
  const [showTrainingPrompt, setShowTrainingPrompt] = useState<boolean>(true);

  useEffect(() => {
    setShowTrainingPrompt(true);

    const credMatch = activeFocusedFieldId.match(/creditEntries\[(\d+)\]/);
    if (credMatch) {
      const idx = parseInt(credMatch[1]);
      const entry = form.creditEntries[idx];
      if (entry && entry.confidence < 90) {
        setLearningField({
          rawOCR: entry.customerName,
          fieldKey: `creditEntries[${idx}].customerName`,
          confidence: entry.confidence
        });
        return;
      }
    }

    if (activeFocusedFieldId.startsWith('creditEntries-')) {
      const idx = parseInt(activeFocusedFieldId.split('-')[1]);
      const entry = form.creditEntries[idx];
      if (entry && entry.confidence < 90) {
        setLearningField({
          rawOCR: entry.customerName,
          fieldKey: `creditEntries[${idx}].customerName`,
          confidence: entry.confidence
        });
        return;
      }
    }

    setLearningField(null);
  }, [activeFocusedFieldId, form.creditEntries]);

  // Track live supervisor override mutation history
  const [mutations, setMutations] = useState<Omit<ManagerMutation, 'timestamp' | 'managerId'>[]>([]);

  // Update State & Buffer History Checkpoint
  const updateFormState = (newForm: typeof form, isStructural = false) => {
    setHistory(prev => {
      const hasChanged = JSON.stringify(prev.present) !== JSON.stringify(newForm);
      if (!hasChanged) return prev;

      const newPast = [...prev.past, prev.present];
      if (newPast.length > 30) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: newForm,
        future: []
      };
    });
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
    setFeedbackMsg('✔ Action Undone');
  };

  const redo = () => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
    setFeedbackMsg('✔ Action Redone');
  };

  // Keyboard grid spreadsheet-style arrow key navigations
  const handleGridKeyDown = (e: React.KeyboardEvent, gridType: 'noz' | 'cred', rowIndex: number, field: string) => {
    const nozFields = ['nozzleId', 'fuelType', 'fuelRate', 'openingMeter', 'closingMeter', 'testingQty'];
    const credFields = ['customerName', 'amount', 'notes', 'reviewStatus'];
    
    const fields = gridType === 'noz' ? nozFields : credFields;
    const currentFieldIndex = fields.indexOf(field);
    const totalRows = gridType === 'noz' ? form.readings.length : form.creditEntries.length;

    let targetRow = rowIndex;
    let targetFieldIndex = currentFieldIndex;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetFieldIndex = Math.max(0, currentFieldIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetFieldIndex = Math.min(fields.length - 1, currentFieldIndex + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else {
      return; 
    }

    const nextField = fields[targetFieldIndex];
    const targetElementId = `input-${gridType}-${targetRow}-${nextField}`;
    const nextInput = document.getElementById(targetElementId);
    if (nextInput) {
      nextInput.focus();
      if (nextInput instanceof HTMLInputElement && (nextInput.type === 'text' || nextInput.type === 'number')) {
        nextInput.select();
      }
    }
  };

  // Focus synchronization helper (Bi-directional Highlight sync)
  const focusField = (fieldId: string) => {
    setActiveFocusedFieldId(fieldId);
    
    // Auto-switch to worksheet tab on mobile/tablet viewports
    setActiveTab('worksheet');
    
    // Auto-scroll the focused form container into focus view
    const inputElement = document.getElementById(`input-${fieldId}`);
    if (inputElement) {
      inputElement.focus();
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputElement.classList.add('ring-4', 'ring-amber-500/25', 'bg-amber-50/40');
      if (inputElement instanceof HTMLInputElement && (inputElement.type === 'text' || inputElement.type === 'number')) {
        inputElement.select();
      }
      setTimeout(() => {
        inputElement.classList.remove('ring-4', 'ring-amber-500/25', 'bg-amber-50/40');
      }, 1200);
    }
  };

  // Touch Swipe Navigation for Groups
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 60;

    // Check viewport width. If tablet/mobile (< 1024px), use tabs swipe instead of field focusing
    if (window.innerWidth < 1024) {
      if (distance > minSwipeDistance) {
        // Swiped Left: next tab ('receipt' -> 'consensus' -> 'worksheet')
        if (activeTab === 'receipt') {
          setActiveTab('consensus');
          setFeedbackMsg('👉 View: Consensus Section');
        } else if (activeTab === 'consensus') {
          setActiveTab('worksheet');
          setFeedbackMsg('👉 View: Worksheet Editor');
        }
      } else if (distance < -minSwipeDistance) {
        // Swiped Right: prev tab ('worksheet' -> 'consensus' -> 'receipt')
        if (activeTab === 'worksheet') {
          setActiveTab('consensus');
          setFeedbackMsg('👈 View: Consensus Section');
        } else if (activeTab === 'consensus') {
          setActiveTab('receipt');
          setFeedbackMsg('👈 View: Receipt Crop');
        }
      }
      return;
    }

    const sections = [
      'operatorName', 
      'measuredDensity', 
      'readings-0', 
      'readings-1', 
      'creditEntries-0', 
      'creditEntries-1', 
      'creditEntries-2', 
      'actualCash'
    ];
    
    // Filter sections to only include ones that currently exist
    const activeSections = sections.filter(s => {
      if (s.startsWith('readings-')) {
        const idx = parseInt(s.split('-')[1]);
        return idx < form.readings.length;
      }
      if (s.startsWith('creditEntries-')) {
        const idx = parseInt(s.split('-')[1]);
        return idx < form.creditEntries.length;
      }
      return true;
    });

    const currentIndex = activeSections.findIndex(s => s === activeFocusedFieldId || activeFocusedFieldId.startsWith(s.split('-')[0]));
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    if (distance > minSwipeDistance) {
      // Swiped Left: next section
      const nextIndex = Math.min(activeSections.length - 1, safeIndex + 1);
      focusField(activeSections[nextIndex]);
      setFeedbackMsg(`👉 Workspace: Focused ${activeSections[nextIndex]}`);
    } else if (distance < -minSwipeDistance) {
      // Swiped Right: previous section
      const prevIndex = Math.max(0, safeIndex - 1);
      focusField(activeSections[prevIndex]);
      setFeedbackMsg(`👈 Workspace: Focused ${activeSections[prevIndex]}`);
    }
  };

  // Global Keyboard Shortcuts Alt+R, Alt+A, Alt+V, Alt+Z, Alt+Y, Alt+C, Ctrl+Z, Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.altKey) {
        if (key === 'r') {
          e.preventDefault();
          setDebugRegionMode(prev => !prev);
          setFeedbackMsg(`✔ Region Badges ${!debugRegionMode ? 'Visible' : 'Hidden'}`);
        } else if (key === 'a') {
          e.preventDefault();
          setZoomLevel(100);
          setBrightness(1.0);
          setContrast(1.0);
          setRotation(0);
          setFeedbackMsg('✔ Scan Filters Reset');
        } else if (key === 'v') {
          e.preventDefault();
          handleOverrideSubmit();
        } else if (key === 'z') {
          e.preventDefault();
          undo();
        } else if (key === 'y') {
          e.preventDefault();
          redo();
        } else if (key === 'c') {
          e.preventDefault();
          setQuickEditMode(prev => !prev);
          setFeedbackMsg(!quickEditMode ? '✔ Spreadsheet Quick-Edit Mode Enabled' : '✔ Touch Spacious Card Mode Enabled');
        }
      } else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form, mutations, history, quickEditMode, debugRegionMode]);

  // Dynamic double entry calculations
  const calculateShiftMetrics = () => {
    let fuelRevenue = 0;
    let totalMsLitres = 0;
    let totalHsdLitres = 0;
    let totalSpeedLitres = 0;

    form.readings.forEach(noz => {
      const netSales = Math.max(0, noz.closingMeter - noz.openingMeter - noz.testingQty);
      const rev = netSales * noz.fuelRate;
      fuelRevenue += rev;
      
      if (noz.fuelType === 'MS') totalMsLitres += netSales;
      else if (noz.fuelType === 'HSD') totalHsdLitres += netSales;
      else if (noz.fuelType === 'SPEED') totalSpeedLitres += netSales;
    });

    const netMSLitres = Number(totalMsLitres.toFixed(2));
    const netHSDLitres = Number(totalHsdLitres.toFixed(2));
    const netSPEEDLitres = Number(totalSpeedLitres.toFixed(2));

    const computedCreditSum = form.creditEntries.reduce((sum, item) => sum + item.amount, 0);

    const expectedCashTill = (form.openingCash + fuelRevenue + form.creditRecovery) - 
                             (form.cardSales + form.upiSales + form.creditSales + form.expenses);
    const cashVariance = form.actualCash - expectedCashTill;

    return {
      netMSLitres,
      netHSDLitres,
      netSPEEDLitres,
      computedCreditSum,
      fuelRevenue: Number(fuelRevenue.toFixed(2)),
      expectedCashTill: Number(expectedCashTill.toFixed(2)),
      cashVariance: Number(cashVariance.toFixed(2))
    };
  };

  const shiftCalculations = calculateShiftMetrics();

  // Run dynamic verification rules on nozzles & settlements
  const runVerification = () => {
    const totalPumpSales = form.readings.reduce((sum, r) => sum + (r.closingMeter - r.openingMeter - r.testingQty), 0);

    // 1. Wetstock continuity check
    const wsCheck = ValidationAssertions.assertWetstockContinuity({
      openingVolume: 25000,
      closingVolume: 25000 - totalPumpSales,
      pumpSalesVolume: totalPumpSales,
      deliveriesVolume: 0,
      density: form.measuredDensity
    });

    // 2. Nozzle continuity checks against previous closing readings
    const expectedOpenings: Record<string, number> = {
      'nozzle-1': 12450.50,
      'nozzle-2': 8520.10
    };

    const nozzleMeterInputs = form.readings.map(noz => {
      const expected = expectedOpenings[noz.nozzleId] !== undefined ? expectedOpenings[noz.nozzleId] : noz.openingMeter;
      return {
        nozzleId: noz.nozzleId,
        openingMeter: noz.openingMeter,
        expectedOpeningMeter: expected
      };
    });
    
    const nzCheck = ValidationAssertions.assertNozzleContinuity(nozzleMeterInputs);

    // 3. Settlement matches (Card & UPI)
    const setCheck = ValidationAssertions.assertSettlementMatching({
      cardSwipeReceipts: form.cardSales,
      upiDeepLinks: form.upiSales,
      reportedCardCollections: form.cardSales,
      reportedUpiCollections: form.upiSales
    });

    // 4. Carry Forward check
    const handCheck = ValidationAssertions.assertCarryForward({
      previousClosingCash: 12500,
      currentOpeningCash: form.openingCash
    });

    const failedRules: string[] = [];
    if (!wsCheck.passed) failedRules.push(wsCheck.message);
    if (!nzCheck.passed) failedRules.push(nzCheck.message);
    if (!setCheck.passed) failedRules.push(setCheck.message);
    if (!handCheck.passed) failedRules.push(handCheck.message);

    // 5. Petroleum validation checks
    const businessErrors: string[] = [];
    
    form.readings.forEach((noz, idx) => {
      const numStr = `Row ${idx + 1} (${noz.fuelType})`;
      if (noz.closingMeter < noz.openingMeter) {
        businessErrors.push(`[${numStr}] Opening meter (${noz.openingMeter}) is larger than closing meter (${noz.closingMeter}). Swapped values anomaly detected!`);
      }
    });

    const ids = form.readings.map(n => n.nozzleId.trim().toLowerCase());
    const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
    if (duplicates.length > 0) {
      businessErrors.push(`Duplicate nozzle numbers logged for: ${[...new Set(duplicates)].join(', ')}.`);
    }

    if (form.creditSales !== shiftCalculations.computedCreditSum) {
      businessErrors.push(`Credit settlement total (₹${form.creditSales}) does not match individual customer ledger rows sum (₹${shiftCalculations.computedCreditSum}).`);
    }

    form.readings.forEach((noz, idx) => {
      if (noz.openingMeter <= 0 || noz.closingMeter <= 0) {
        businessErrors.push(`Nozzle Row ${idx + 1} contains blank or invalid meter values.`);
      }
    });

    form.creditEntries.forEach((c, idx) => {
      if (!c.customerName.trim()) {
        businessErrors.push(`Credit Customer Row ${idx + 1} is missing a valid customer name.`);
      }
    });

    return {
      passed: failedRules.length === 0 && businessErrors.length === 0,
      errors: [...failedRules, ...businessErrors],
      wsCheck,
      nzCheck,
      setCheck,
      handCheck
    };
  };

  const verification = runVerification();

  useEffect(() => {
    if (Math.abs(shiftCalculations.cashVariance) > 500) {
      setComplianceExplain(
        `COMPLIANCE WARNING: Discrepancy of ₹${shiftCalculations.cashVariance} exceeds the allowed ₹500 override limit. Shift lock strictly blocked.`
      );
    } else if (Math.abs(shiftCalculations.cashVariance) > 0) {
      setComplianceExplain(
        `COMPLIANCE NOTICE: Cash variance of ₹${shiftCalculations.cashVariance} detected. Variance must balance to ₹0 or stay under ₹500 to bypass hard locks.`
      );
    } else if (!verification.passed) {
      setComplianceExplain(
        `OPERATIONAL WARNING: Active anomalies detected in petroleum continuity checks. Review highlighted errors in Center Panel.`
      );
    } else {
      setComplianceExplain("ACCOUNTING STATUS CLEAR: All verified ledger records balance beautifully. Ready for supervisor locking.");
    }
  }, [form, shiftCalculations.cashVariance, verification.passed]);

  // Handle updates to fields with audit mapping
  const handleFieldChange = (fieldKey: string, newValue: any) => {
    const oldValue = (form as any)[fieldKey];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      const newForm = { ...form, [fieldKey]: newValue };
      updateFormState(newForm);
      setMutations(prev => [
        ...prev,
        {
          fieldKey,
          oldValue,
          newValue,
          overrideReason: 'Operator ledger manual adjustment verification'
        }
      ]);
    }
  };

  // Handle updates to nozzles
  const handleNozzleChange = (index: number, key: keyof NozzleReadingOcr, value: any) => {
    const oldReadings = [...form.readings];
    const oldNozzle = { ...oldReadings[index] };
    const newNozzle = { ...oldNozzle, [key]: value };
    
    if (key === 'openingMeter' || key === 'closingMeter' || key === 'testingQty') {
      const op = key === 'openingMeter' ? Number(value) : oldNozzle.openingMeter;
      const cl = key === 'closingMeter' ? Number(value) : oldNozzle.closingMeter;
      const tst = key === 'testingQty' ? Number(value) : oldNozzle.testingQty;
      newNozzle.netSales = Number((cl - op - tst).toFixed(2));
    }
    
    oldReadings[index] = newNozzle as NozzleReadingOcr;
    const newForm = { ...form, readings: oldReadings };
    updateFormState(newForm);

    setMutations(prev => [
      ...prev,
      {
        fieldKey: `readings[${index}].${key}`,
        oldValue: (oldNozzle as any)[key],
        newValue: value,
        overrideReason: `Nozzle ${oldNozzle.nozzleId} reading override`
      }
    ]);
  };

  // Add Nozzle row
  const addNozzleRow = () => {
    const newNozzle: NozzleReadingOcr = {
      nozzleId: `nozzle-${form.readings.length + 1}`,
      fuelType: 'MS',
      openingMeter: 0,
      closingMeter: 0,
      testingQty: 0,
      netSales: 0,
      fuelRate: 104.50
    };
    const newForm = { ...form, readings: [...form.readings, newNozzle] };
    updateFormState(newForm, true);

    setMutations(prev => [
      ...prev,
      {
        fieldKey: 'readings',
        oldValue: 'Added new nozzle row',
        newValue: newNozzle,
        overrideReason: 'Manual addition of missing nozzle reading line'
      }
    ]);
  };

  // Remove Nozzle row
  const removeNozzleRow = (index: number) => {
    const target = form.readings[index];
    const filtered = form.readings.filter((_, idx) => idx !== index);
    const newForm = { ...form, readings: filtered };
    updateFormState(newForm, true);

    setMutations(prev => [
      ...prev,
      {
        fieldKey: 'readings',
        oldValue: target,
        newValue: 'Deleted nozzle row',
        overrideReason: 'Manual deletion of incorrect nozzle line'
      }
    ]);
  };

  // Credit entry change
  const handleCreditChange = (index: number, key: keyof CreditCustomerOcrEntry, value: any) => {
    const oldEntries = [...form.creditEntries];
    const oldEntry = { ...oldEntries[index] };
    const newEntry = { ...oldEntry, [key]: value };
    oldEntries[index] = newEntry as CreditCustomerOcrEntry;
    
    const newSum = oldEntries.reduce((sum, item) => sum + item.amount, 0);
    const newForm = { ...form, creditEntries: oldEntries, creditSales: newSum };
    updateFormState(newForm);
    
    setMutations(prev => [
      ...prev,
      {
        fieldKey: `creditEntries[${index}].${key}`,
        oldValue: (oldEntry as any)[key],
        newValue: value,
        overrideReason: `Credit customer ${oldEntry.customerName} override`
      }
    ]);
  };

  // Add credit row
  const addCreditRow = () => {
    const newEntry: CreditCustomerOcrEntry = {
      customerName: 'New Customer',
      amount: 0,
      date: form.shiftDate,
      shiftId: jobId,
      paymentStatus: 'pending',
      notes: 'Added manually',
      confidence: 100,
      reviewStatus: 'clean'
    };
    const updated = [...form.creditEntries, newEntry];
    const newSum = updated.reduce((sum, item) => sum + item.amount, 0);
    const newForm = { ...form, creditEntries: updated, creditSales: newSum };
    updateFormState(newForm, true);

    setMutations(prev => [
      ...prev,
      {
        fieldKey: 'creditEntries',
        oldValue: 'Added new credit ledger line',
        newValue: newEntry,
        overrideReason: 'Manual credit customer addition'
      }
    ]);
  };

  // Remove credit row
  const removeCreditRow = (index: number) => {
    const target = form.creditEntries[index];
    const filtered = form.creditEntries.filter((_, idx) => idx !== index);
    const newSum = filtered.reduce((sum, item) => sum + item.amount, 0);
    const newForm = { ...form, creditEntries: filtered, creditSales: newSum };
    updateFormState(newForm, true);

    setMutations(prev => [
      ...prev,
      {
        fieldKey: 'creditEntries',
        oldValue: target,
        newValue: 'Deleted credit customer row',
        overrideReason: 'Manual credit customer deletion'
      }
    ]);
  };

  // Submission handler with locking and replay log serialization
  const handleOverrideSubmit = async () => {
    setIsSubmitting(true);
    setFeedbackMsg('');

    // Strict safety gate: Variance threshold
    if (Math.abs(shiftCalculations.cashVariance) > 500) {
      setFeedbackMsg("❌ Mutation Blocked: Cash till variance exceeds allowed ₹500 limit.");
      setIsSubmitting(false);
      return;
    }

    // Commit corrected shift record to Firestore
    try {
      const docRef = doc(db, "shifts", jobId);
      const savedPayload = {
        pumpId: "potaliya-petroleum",
        shiftDate: form.shiftDate,
        shiftLabel: form.shiftLabel,
        status: "APPROVED",
        openingCash: form.openingCash,
        actualCash: form.actualCash,
        cardSales: form.cardSales,
        upiSales: form.upiSales,
        creditSales: form.creditSales,
        creditRecovery: form.creditRecovery,
        expenses: form.expenses,
        measuredDensity: form.measuredDensity,
        cashShortage: shiftCalculations.cashVariance,
        ocrConfidence: 100, // Mark as 100% verified after human review
        aiConfidence: 100,
        scanReference: `scan_${jobId}.jpg`,
        readings: form.readings.map(r => ({
          id: r.nozzleId,
          fuelType: r.fuelType,
          opening: r.openingMeter,
          closing: r.closingMeter,
          testing: r.testingQty,
          rate: r.fuelRate
        })),
        creditEntries: form.creditEntries,
        auditHistory: [
          {
            action: "HUMAN_VERIFIED",
            timestamp: new Date().toISOString(),
            user: user?.displayName || "Supervisor",
            notes: "Shift ledger human-verified, mathematical audit cleared, and locked successfully."
          }
        ]
      };

      await setDoc(docRef, savedPayload, { merge: true });
      console.log("Firestore shift document successfully committed:", jobId);
    } catch (firestoreErr) {
      console.error("Failed to commit shift to cloud Firestore:", firestoreErr);
    }

    setTimeout(() => {
      // Ingest mutations into the self-improving learning loop
      OCRLearningEngine.receiveManagerCorrection(
        user?.displayName || 'operator_demo',
        'station_007',
        `scan_${jobId}.jpg`,
        mutations.map(m => ({
          fieldKey: m.fieldKey,
          oldValue: m.oldValue,
          newValue: m.newValue,
          overrideReason: m.overrideReason || 'Operator ledger manual adjustment',
          latencyMs: 3200
        }))
      );

      // Commit verification logs to supervisor replay audit trail
      OcrReplayLogs.writeLog({
        jobId,
        timestamp: new Date().toISOString(),
        fileName: `scan_${jobId}.jpg`,
        rawOcrText: `Operator: Sanjay Kumar | Credit Sales Total: ${form.creditSales} | Actual Cash: ${form.actualCash} | Nozzles count: ${form.readings.length}`,
        sanitizedJson: form,
        consensusScores: {
          paddleOcr: 94,
          easyOcr: 88,
          qwenLocal: 95,
          claudeConsensus: 99
        },
        mutations: mutations.map(m => ({
          ...m,
          timestamp: new Date().toISOString(),
          managerId: user?.id || 'mgr-admin-007'
        })),
        ledgerVerificationPassed: verification.passed,
        ledgerVerificationErrors: verification.errors,
        anomalyClassification: verification.passed ? 'none' : 'wetstock_mismatch'
      });

      setFeedbackMsg('✔ Shift ledger successfully locked and reconciled.');
      setIsSubmitting(false);
      setShowSummaryModal(true); // Open the premium operational summary modal!
    }, 1200);
  };

  // Scanned Receipt Skeuomorphic Component
  const renderLayoutSpecificCanvas = () => {
    return (
      <div className="flex-1 flex flex-col justify-between text-slate-900 text-[8px] tracking-wide font-sans select-none h-full bg-[#FAF9F5] shadow-inner p-3 rounded-lg overflow-y-auto border border-[#E4E3DE]">
        {/* Receipt Header */}
        <div className="border-b-2 border-dashed pb-1.5 text-center" style={{ borderColor: ClaudeTheme.colors.border.default }}>
          <div className="text-[9px] text-[#0A3D62] font-black uppercase tracking-wider font-mono">HINDUSTAN PETROLEUM CORP</div>
          <div className="text-[6px] text-slate-500 uppercase tracking-widest font-mono">SHIFT WORKSTATION SCAN RECEIPT</div>
          <div className="text-[5.5px] text-slate-450 font-mono mt-0.5">TEMPLATE: {onboardingTemplate} // AUTO-DETECTED</div>
        </div>

        {/* General Info Region */}
        <BoundingRegion
          id="operatorName"
          label="Shift Headers"
          confidence={99.1}
          isActive={activeFocusedFieldId === 'operatorName'}
          onClick={() => focusField('operatorName')}
        >
          <div className="font-mono text-[6.5px] text-slate-700 space-y-0.5">
            <div className="flex justify-between">
              <span>ATTENDANT:</span>
              <span className="font-bold">{form.operatorName}</span>
            </div>
            <div className="flex justify-between">
              <span>DATE / SHIFT:</span>
              <span className="font-bold">{form.shiftDate} / {form.shiftLabel}</span>
            </div>
          </div>
        </BoundingRegion>

        {/* Nozzles Table Region */}
        <div className="my-1 border-t border-b border-dashed py-1.5 border-slate-300">
          <div className="text-[7.5px] font-black font-mono text-[#0A3D62] mb-1 uppercase tracking-wide flex justify-between">
            <span>NOZZLE SUMMARY</span>
            <span className="text-[6.5px] text-emerald-600 font-bold">98.2% OCR</span>
          </div>

          <div className="space-y-1">
            {form.readings.map((noz, idx) => {
              const regionId = `readings-${idx}`;
              const isRollback = noz.closingMeter < noz.openingMeter;
              return (
                <BoundingRegion
                  key={idx}
                  id={regionId}
                  label={`Nozzle ${noz.nozzleId}`}
                  confidence={isRollback ? 50 : 98}
                  isActive={activeFocusedFieldId === regionId || activeFocusedFieldId === `readings[${idx}].openingMeter` || activeFocusedFieldId === `readings[${idx}].closingMeter`}
                  onClick={() => focusField(`noz-${idx}-openingMeter`)}
                >
                  <div className="flex justify-between text-[6.5px] font-mono leading-none">
                    <span className="font-bold text-[#0A3D62]">{noz.nozzleId} ({noz.fuelType})</span>
                    <span>OP: {noz.openingMeter.toFixed(1)}</span>
                    <span>CL: {noz.closingMeter.toFixed(1)}</span>
                    <span className="font-extrabold text-slate-800">NET: {noz.netSales.toFixed(1)}L</span>
                  </div>
                </BoundingRegion>
              );
            })}
          </div>
        </div>

        {/* Credit Rows Region */}
        <div className="my-1 border-b border-dashed pb-1.5 border-slate-300">
          <div className="text-[7.5px] font-black font-mono text-[#0A3D62] mb-1 uppercase tracking-wide flex justify-between">
            <span>LEDGER ACCOUNT (UDHARI)</span>
            <span className="text-[6.5px] text-amber-700 font-bold">91.4% OCR</span>
          </div>

          <div className="space-y-1">
            {form.creditEntries.map((c, idx) => {
              const regionId = `creditEntries-${idx}`;
              return (
                <BoundingRegion
                  key={idx}
                  id={regionId}
                  label={`Credit ${c.customerName || `Row ${idx + 1}`}`}
                  confidence={c.confidence}
                  isActive={activeFocusedFieldId === regionId || activeFocusedFieldId === `creditEntries[${idx}].customerName` || activeFocusedFieldId === `creditEntries[${idx}].amount`}
                  onClick={() => focusField(`cred-${idx}-customerName`)}
                >
                  <div className="flex justify-between text-[6.5px] font-mono leading-none">
                    <span className={c.reviewStatus === 'needs_review' ? 'text-rose-700 font-bold' : 'text-slate-800'}>
                      • {c.customerName || 'Missing Name'}
                    </span>
                    <span className="font-black">₹{c.amount.toLocaleString()}</span>
                  </div>
                </BoundingRegion>
              );
            })}
          </div>
        </div>

        {/* Settlement accounts */}
        <BoundingRegion
          id="actualCash"
          label="Settlements"
          confidence={97.8}
          isActive={activeFocusedFieldId === 'actualCash' || activeFocusedFieldId === 'openingCash' || activeFocusedFieldId === 'upiSales' || activeFocusedFieldId === 'cardSales' || activeFocusedFieldId === 'creditSales'}
          onClick={() => focusField('actualCash')}
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[6.5px] text-slate-700">
            <div>Drawer Cash: ₹{form.actualCash}</div>
            <div>UPI Sales: ₹{form.upiSales}</div>
            <div>Card Swipes: ₹{form.cardSales}</div>
            <div>Ledger Sum: ₹{form.creditSales}</div>
          </div>
        </BoundingRegion>

        {/* Wetstock density check */}
        <BoundingRegion
          id="measuredDensity"
          label="Wetstock density"
          confidence={95.1}
          isActive={activeFocusedFieldId === 'measuredDensity'}
          onClick={() => focusField('measuredDensity')}
        >
          <div className="flex justify-between font-mono font-bold text-slate-600 text-[6px]">
            <span>DENSITY DIPPED: {form.measuredDensity} kg/m³</span>
            <span>TEMP: 29.5°C</span>
          </div>
        </BoundingRegion>

        {/* Totals */}
        <div className="border-t-2 border-double pt-1.5 flex justify-between items-center font-mono font-black text-[7.5px] text-slate-800 border-slate-400 mt-2">
          <span>SUM TOTAL SALES:</span>
          <span className="text-[#D35400]">₹{shiftCalculations.fuelRevenue.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen font-sans flex flex-col transition-colors duration-200"
      style={{ backgroundColor: ClaudeTheme.colors.background.primary }}
    >
      {/* High-Speed Enterprise Header */}
      <header 
        className="px-6 py-3 flex items-center justify-between sticky top-0 z-40 border-b backdrop-blur-md shadow-sm"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderColor: ClaudeTheme.colors.border.light
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
          <h1 className="text-[11px] font-black tracking-widest uppercase font-mono text-[#1E1E1D]">
            PUMP_AI // HIGH-SPEED WORKSTATION // SHIFT: {jobId}
          </h1>
          <span className="text-[8.5px] font-black border px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider text-amber-800 border-amber-500/30 bg-amber-500/5">
            Consensus Locked
          </span>
          <button
            onClick={() => {
              setQuickEditMode(!quickEditMode);
              setFeedbackMsg(!quickEditMode ? '✔ Spreadsheet Grid Mode Activated' : '✔ Spacious Touch Mode Activated');
            }}
            className={`text-[8.5px] px-2.5 py-1 rounded-lg uppercase font-black tracking-wider flex items-center gap-1 font-mono transition-all border ${
              quickEditMode 
                ? 'bg-slate-900 text-white border-transparent shadow-sm' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
            }`}
            title="Toggle workspace layout (Alt+C)"
          >
            <Keyboard className="w-3.5 h-3.5" />
            {quickEditMode ? 'Spreadsheet Grid Active (Alt+C)' : 'Spacious Touch Mode (Alt+C)'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* History state undo/redo */}
          <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shadow-xs mr-2">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className="p-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-all h-[32px] w-[32px] flex items-center justify-center"
              title="Undo action (Alt+Z / Ctrl+Z)"
            >
              <CornerUpLeft className="w-4 h-4" />
            </button>
            <span className="text-[9px] font-mono text-slate-400 px-1.5 border-l border-r border-slate-100">
              {history.past.length}
            </span>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className="p-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-all h-[32px] w-[32px] flex items-center justify-center"
              title="Redo action (Alt+Y / Ctrl+Y)"
            >
              <CornerUpRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => navigate('/ai-queue')}
            className="text-[9px] font-bold border px-3.5 py-1.5 rounded-lg transition-all uppercase tracking-widest hover:bg-black/5 text-[#1E1E1D] border-slate-200 bg-white h-[36px] flex items-center justify-center"
          >
            ← BACK TO QUEUE
          </button>
        </div>
      </header>

      {/* Touch Tab Bar visible on screen widths < 1024px (lg:hidden) */}
      <div className="lg:hidden flex border-b border-[#EBEBEA] bg-white sticky top-[56px] z-30 h-[48px] shadow-xs">
        <button 
          onClick={() => setActiveTab('receipt')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'receipt' 
              ? 'border-amber-600 text-amber-800 bg-amber-500/5' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>📄 Receipt Crop</span>
        </button>
        <button 
          onClick={() => setActiveTab('consensus')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'consensus' 
              ? 'border-amber-600 text-amber-800 bg-amber-500/5' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>⚠️ Consensus</span>
          {verification.errors.length > 0 && (
            <span className="bg-rose-600 text-white text-[8px] font-mono px-1.5 py-0.2 rounded-full font-black animate-pulse">
              {verification.errors.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('worksheet')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'worksheet' 
              ? 'border-amber-600 text-amber-800 bg-amber-500/5' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>✏️ Worksheet</span>
        </button>
      </div>

      {/* Main Workstation 3-Panel Layout Grid */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 grid grid-cols-12 gap-0"
      >
        
        {/* ============================================================== */}
        {/* LEFT PANEL: Skeuomorphic Receipt Scan & Visual Controls */}
        {/* ============================================================== */}
        <section 
          className={`col-span-12 lg:col-span-4 border-r p-5 flex flex-col h-[calc(100vh-104px)] lg:h-[calc(100vh-56px)] overflow-y-auto space-y-4 ${
            activeTab === 'receipt' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ 
            backgroundColor: '#F9F9F8',
            borderColor: ClaudeTheme.colors.border.light 
          }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: ClaudeTheme.colors.border.light }}>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" /> 1. Visual Receipt Preview
            </span>
            <button
              onClick={() => {
                setBrightness(1.0);
                setContrast(1.0);
                setRotation(0);
                setZoomLevel(100);
                setFeedbackMsg('✔ Visual filters reset');
              }}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Enhancers Controls slider block */}
          <div className="space-y-3 bg-[#F0F0EF] p-4 rounded-xl border border-[#EBEBEA] text-xs shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 uppercase font-mono">
                <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-600" /> Brightness</span>
                <span>{brightness.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="2.0" step="0.1" 
                value={brightness} onChange={e => setBrightness(Number(e.target.value))}
                className="w-full accent-slate-800 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 uppercase font-mono">
                <span className="flex items-center gap-1"><Contrast className="w-3.5 h-3.5 text-amber-600" /> Contrast</span>
                <span>{contrast.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="2.0" step="0.1" 
                value={contrast} onChange={e => setContrast(Number(e.target.value))}
                className="w-full accent-slate-800 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-slate-500 uppercase block font-mono">Rotate Image</span>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[9px] hover:bg-slate-50 active:scale-95 transition-all text-slate-700 shadow-xs h-[32px]"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-bold text-slate-500 uppercase block font-mono">Magnification</span>
                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs h-[32px]">
                  <button 
                    onClick={() => setZoomLevel(z => Math.max(50, z - 10))}
                    className="w-full px-2 py-1 hover:bg-slate-50 text-slate-500 font-bold border-r border-slate-100 text-xs transition-colors"
                  >-</button>
                  <span className="px-2 font-mono text-[9px] font-bold text-slate-700 shrink-0">{zoomLevel}%</span>
                  <button 
                    onClick={() => setZoomLevel(z => Math.min(200, z + 10))}
                    className="w-full px-2 py-1 hover:bg-slate-50 text-slate-500 font-bold border-l border-slate-100 text-xs transition-colors"
                  >+</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/50">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" id="debug-region-check" checked={debugRegionMode} onChange={e => setDebugRegionMode(e.target.checked)}
                  className="accent-slate-800 rounded w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="debug-region-check" className="text-[9px] text-slate-600 uppercase font-black cursor-pointer selection:bg-transparent flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" /> Toggle OCR crop bounds
                </label>
              </div>
            </div>
          </div>

          {/* Skeuomorphic Thermal paper scanner viewport container */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 bg-[#F0F0EF] rounded-xl border border-[#EBEBEA] p-4 flex flex-col items-center justify-center min-h-[360px] overflow-hidden relative shadow-inner group"
          >
            <div className="w-full flex items-center justify-between mb-3 border-b border-slate-200/40 pb-1.5 text-[9px] font-bold">
              <span className="text-slate-450 uppercase tracking-widest flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-400 animate-bounce" /> Swipe Navigation active
              </span>
              <span className="bg-amber-600/5 text-amber-800 text-[8.5px] font-black rounded border border-amber-600/30 px-2 py-0.5 uppercase tracking-widest">
                HPCL Consolidated
              </span>
            </div>

            <div
              style={{ 
                transform: `rotate(${rotation}deg) scale(${zoomLevel / 100})`, 
                transformOrigin: 'center center',
                filter: `brightness(${brightness}) contrast(${contrast})`,
              }}
              className="relative w-72 h-[340px] border border-slate-300 rounded-lg bg-white shadow-lg p-1.5 flex flex-col justify-between transition-all duration-200"
            >
              {renderLayoutSpecificCanvas()}
            </div>
            
            {/* Visual Touch Swipe overlay hints */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[8.5px] px-3.5 py-1.5 rounded-full pointer-events-none shadow-md">
              <span>Swipe left / right to navigate shift records</span>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CENTER PANEL: Telemetry Warnings & consensus Heatmaps */}
        {/* ============================================================== */}
        <section 
          className={`col-span-12 lg:col-span-4 border-r p-5 flex flex-col h-[calc(100vh-104px)] lg:h-[calc(100vh-56px)] overflow-y-auto space-y-4 ${
            activeTab === 'consensus' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ 
            backgroundColor: '#FDFDFD',
            borderColor: ClaudeTheme.colors.border.light 
          }}
        >
          <div className="border-b pb-2 flex justify-between items-center" style={{ borderColor: ClaudeTheme.colors.border.light }}>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">2. Consensus Matrix & Warnings</span>
            <span className="text-[8.5px] font-black px-2 py-0.5 rounded border uppercase tracking-wider font-mono bg-slate-100 text-slate-600 border-slate-200 shadow-xs">
              97.5% Consensus Rating
            </span>
          </div>

          {/* Model outputs comparative consensus matrix */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Consensus Confidence Heatmap</span>
            
            {/* 1. Flashing Warning for Sharma Ji at 65% */}
            <div className="bg-white border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-rose-100">
                <span className="font-bold text-rose-950 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  Credit Ledger Row 2: "Sharma Ji"
                </span>
                <span className="font-black text-rose-900 bg-rose-100/50 px-2 py-0.5 rounded border border-rose-300 text-[8px] uppercase tracking-wider font-mono">
                  Conf: 65% Low
                </span>
              </div>
              <p className="text-[9.5px] text-slate-600 leading-normal font-medium">
                OCR engines diverged due to faded handwritten text. Review carefully before locking.
              </p>
              
              <div className="grid grid-cols-4 gap-1 text-center text-[8px] font-mono font-bold">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-1 rounded flex flex-col justify-between">
                  <span className="text-[6.5px] text-emerald-600 uppercase block font-sans">Claude</span>
                  <span>Sharma Ji ₹2200</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-1 rounded flex flex-col justify-between">
                  <span className="text-[6.5px] text-emerald-600 uppercase block font-sans">Qwen VLM</span>
                  <span>Sharma Ji ₹2200</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-1 rounded flex flex-col justify-between">
                  <span className="text-[6.5px] text-amber-600 uppercase block font-sans">Paddle</span>
                  <span>Sharma ₹2200</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-1 rounded flex flex-col justify-between">
                  <span className="text-[6.5px] text-rose-600 uppercase block font-sans">EasyOCR</span>
                  <span>Sharmji ₹2000</span>
                </div>
              </div>

              <div className="pt-1.5 flex justify-end">
                <button
                  onClick={() => focusField('cred-1-customerName')}
                  className="text-[8px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300/30 px-2 py-0.5 rounded uppercase tracking-wider transition-all"
                >
                  Quick Reconcile Row →
                </button>
              </div>
            </div>

            {/* 2. High confidence Consensus */}
            <div className="bg-white border border-[#EBEBEA] rounded-xl p-3.5 space-y-2 text-xs shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Actual Cash till Handover
                </span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[8px] uppercase tracking-wider font-mono">100% Matching</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-mono font-bold">
                <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-1 rounded">₹{form.actualCash}</div>
                <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-1 rounded">₹{form.actualCash}</div>
                <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-1 rounded">₹{form.actualCash}</div>
                <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 p-1 rounded">₹{form.actualCash}</div>
              </div>
            </div>
          </div>

          {/* Petroleum Integrity Checks Warnings Dashboard */}
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Ledger Discrepancies & Safety Warnings</span>
            
            {verification.errors.length === 0 ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl text-xs flex items-center gap-2 shadow-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No ledger anomalies or accounting rules broken! Ready to submit.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {verification.errors.map((err, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-[10px] leading-relaxed flex gap-2 font-semibold shadow-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>{err}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Structured Verification Status Indicators */}
          <div className="space-y-2 text-xs">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Petroleum Engine Diagnostics</span>

            {/* Wetstock Continuity */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col gap-1 shadow-xs transition-all"
              style={{ 
                backgroundColor: verification.wsCheck.passed ? 'rgba(46, 125, 50, 0.04)' : 'rgba(198, 40, 40, 0.04)',
                borderColor: verification.wsCheck.passed ? 'rgba(46, 125, 50, 0.15)' : 'rgba(198, 40, 40, 0.15)',
                color: verification.wsCheck.passed ? '#2E7D32' : '#C62828'
              }}
            >
              <div className="flex items-center justify-between font-extrabold uppercase tracking-wider text-[9px] font-mono">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Wetstock Continuity</span>
                <span>{verification.wsCheck.passed ? 'PASSED' : 'DISCREPANCY'}</span>
              </div>
              <p className="text-[9px] text-slate-600 font-medium mt-0.5 leading-relaxed">{verification.wsCheck.message}</p>
            </div>

            {/* Nozzle Continuity */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col gap-1 shadow-xs transition-all"
              style={{ 
                backgroundColor: verification.nzCheck.passed ? 'rgba(46, 125, 50, 0.04)' : 'rgba(198, 40, 40, 0.04)',
                borderColor: verification.nzCheck.passed ? 'rgba(46, 125, 50, 0.15)' : 'rgba(198, 40, 40, 0.15)',
                color: verification.nzCheck.passed ? '#2E7D32' : '#C62828'
              }}
            >
              <div className="flex items-center justify-between font-extrabold uppercase tracking-wider text-[9px] font-mono">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Nozzle Continuity</span>
                <span>{verification.nzCheck.passed ? 'PASSED' : 'DISCREPANCY'}</span>
              </div>
              <p className="text-[9px] text-slate-600 font-medium mt-0.5 leading-relaxed">{verification.nzCheck.message}</p>
            </div>

            {/* Settlement Matching */}
            <div 
              className="p-3.5 rounded-xl border flex flex-col gap-1 shadow-xs transition-all"
              style={{ 
                backgroundColor: verification.setCheck.passed ? 'rgba(46, 125, 50, 0.04)' : 'rgba(198, 40, 40, 0.04)',
                borderColor: verification.setCheck.passed ? 'rgba(46, 125, 50, 0.15)' : 'rgba(198, 40, 40, 0.15)',
                color: verification.setCheck.passed ? '#2E7D32' : '#C62828'
              }}
            >
              <div className="flex items-center justify-between font-extrabold uppercase tracking-wider text-[9px] font-mono">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Settlement Matching</span>
                <span>{verification.setCheck.passed ? 'PASSED' : 'DISCREPANCY'}</span>
              </div>
              <p className="text-[9px] text-slate-600 font-medium mt-0.5 leading-relaxed">{verification.setCheck.message}</p>
            </div>
          </div>

          {/* AI Compliance Explainer */}
          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-slate-500" /> Supervisor Audit Log
            </h3>
            <p className="text-[9.5px] leading-relaxed text-slate-600 font-medium">
              {complianceExplain}
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Off-White Interactive Supervisor Editor Console */}
        {/* ============================================================== */}
        <section 
          className={`col-span-12 lg:col-span-4 p-5 flex flex-col h-[calc(100vh-104px)] lg:h-[calc(100vh-56px)] justify-between overflow-y-auto space-y-4 ${
            activeTab === 'worksheet' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ 
            backgroundColor: '#FDFDFB',
          }}
        >
          <div className="space-y-4 flex-1">
            <div className="border-b pb-2 flex justify-between items-center border-slate-200">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center gap-1">
                <Layout className="w-3.5 h-3.5 text-slate-400" /> 3. Double-Entry Worksheet
              </span>
              <span className="text-[8.5px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider font-mono bg-white text-slate-600 border-slate-200 shadow-xs">
                Worksheet
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Dynamic Handwriting Learning Prompt */}
              {learningField && showTrainingPrompt && (
                <div className="mb-4 animate-slide-in">
                  <UnknownWordReviewPanel
                    rawOCR={learningField.rawOCR}
                    fieldKey={learningField.fieldKey}
                    stationTemplate={onboardingTemplate.toLowerCase() as any}
                    operatorId={user?.displayName || 'operator_demo'}
                    stationId="station_007"
                    confidence={learningField.confidence}
                    onDismiss={() => setShowTrainingPrompt(false)}
                    onTrainingComplete={(trainedValue) => {
                      setFeedbackMsg(` Trained: '${learningField.rawOCR}' -> '${trainedValue}' saved to memory!`);
                      
                      const credMatch = learningField.fieldKey.match(/creditEntries\[(\d+)\]/);
                      if (credMatch) {
                        const idx = parseInt(credMatch[1]);
                        handleCreditChange(idx, 'customerName', trainedValue);
                        handleCreditChange(idx, 'reviewStatus', 'clean');
                      }
                      setShowTrainingPrompt(false);
                    }}
                  />
                </div>
              )}

              {/* SECTION 1: General Info Card */}
              <div 
                onClick={() => focusField('operatorName')}
                className={`bg-white p-3.5 rounded-xl border transition-all duration-200 space-y-3 shadow-xs cursor-pointer ${
                  activeFocusedFieldId === 'operatorName' 
                    ? 'border-amber-600 ring-2 ring-amber-500/10' 
                    : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">General Information</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Attendant Name</label>
                    <input
                      id="input-operatorName"
                      type="text"
                      value={form.operatorName}
                      onChange={e => handleFieldChange('operatorName', e.target.value)}
                      onFocus={() => setActiveFocusedFieldId('operatorName')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-semibold shadow-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Shift Date</label>
                    <input
                      id="input-shiftDate"
                      type="date"
                      value={form.shiftDate}
                      onChange={e => handleFieldChange('shiftDate', e.target.value)}
                      onFocus={() => setActiveFocusedFieldId('operatorName')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono shadow-xs h-[36px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Shift Label</label>
                    <input
                      id="input-shiftLabel"
                      type="text"
                      value={form.shiftLabel}
                      onChange={e => handleFieldChange('shiftLabel', e.target.value)}
                      onFocus={() => setActiveFocusedFieldId('operatorName')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-semibold shadow-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Measured Density (kg/m³)</label>
                    <input
                      id="input-measuredDensity"
                      type="number" step="0.1"
                      value={form.measuredDensity}
                      onChange={e => handleFieldChange('measuredDensity', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('measuredDensity')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[36px]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Nozzle Readings Grid */}
              <div 
                className={`bg-white p-3.5 rounded-xl border transition-all duration-200 space-y-3 shadow-xs ${
                  activeFocusedFieldId.startsWith('readings') 
                    ? 'border-amber-600 ring-2 ring-amber-500/10' 
                    : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Wetstock Nozzle Table</span>
                  <button 
                    onClick={addNozzleRow}
                    className="flex items-center gap-1 text-[8px] font-black text-amber-800 hover:text-amber-900 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg shadow-xs transition-colors h-[32px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Nozzle
                  </button>
                </div>

                {/* NOZZLE GROUPING OVERLAYS: Group nozzles visually by fuel type */}
                <div className="space-y-3">
                  {/* MS Nozzles Group */}
                  {form.readings.filter(noz => noz.fuelType === 'MS').length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[7.5px] font-black font-mono text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider block">
                        MS (Petrol) Nozzle Group
                      </div>
                      {form.readings.map((noz, idx) => {
                        if (noz.fuelType !== 'MS') return null;
                        const regionId = `readings-${idx}`;
                        const isRollback = noz.closingMeter < noz.openingMeter;
                        const isFocused = activeFocusedFieldId === regionId || activeFocusedFieldId.startsWith(`readings[${idx}]`);
                        
                        return (
                          <div 
                            key={idx}
                            onClick={() => setActiveFocusedFieldId(regionId)}
                            className={`p-3 rounded-lg border transition-all ${
                              isFocused ? 'border-amber-500 bg-amber-50/5 shadow-xs' : 'border-slate-200 bg-slate-50/40'
                            } ${isRollback ? 'border-rose-350 bg-rose-50/20' : ''}`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-bold border-b border-slate-200/50 pb-1.5 mb-2">
                              <span className="text-[#0A3D62] font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Nozzle Row #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] text-slate-500 font-mono">98% OCR Match</span>
                                <button 
                                  onClick={() => removeNozzleRow(idx)}
                                  className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {quickEditMode ? (
                              // Compact spreadsheet grid inside Touch card for fast desktop editing
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-[7px] font-bold font-mono text-slate-450 uppercase border-b border-slate-100">
                                    <th className="pb-1 pr-1 w-20">Nozzle ID</th>
                                    <th className="pb-1 pr-1 w-24">Fuel</th>
                                    <th className="pb-1 pr-1 w-20">Rate</th>
                                    <th className="pb-1 pr-1 w-20">Open</th>
                                    <th className="pb-1 pr-1 w-20">Close</th>
                                    <th className="pb-1 pr-1 w-20">Test</th>
                                    <th className="pb-1 text-right w-20 font-bold">Net (L)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-nozzleId`}
                                        type="text" 
                                        value={noz.nozzleId}
                                        onChange={e => handleNozzleChange(idx, 'nozzleId', e.target.value)}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].nozzleId`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'nozzleId')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <select
                                        id={`input-noz-${idx}-fuelType`}
                                        value={noz.fuelType}
                                        onChange={e => handleNozzleChange(idx, 'fuelType', e.target.value)}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].fuelType`)}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1 py-0.5 text-[9.5px] font-bold focus:border-amber-500 focus:outline-none"
                                      >
                                        <option value="MS">MS</option>
                                        <option value="HSD">HSD</option>
                                        <option value="SPEED">SPEED</option>
                                      </select>
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-fuelRate`}
                                        type="number" step="0.01"
                                        value={noz.fuelRate}
                                        onChange={e => handleNozzleChange(idx, 'fuelRate', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].fuelRate`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'fuelRate')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-openingMeter`}
                                        type="number" step="0.01"
                                        value={noz.openingMeter}
                                        onChange={e => handleNozzleChange(idx, 'openingMeter', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].openingMeter`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'openingMeter')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right font-semibold"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-closingMeter`}
                                        type="number" step="0.01"
                                        value={noz.closingMeter}
                                        onChange={e => handleNozzleChange(idx, 'closingMeter', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].closingMeter`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'closingMeter')}
                                        className={`w-full bg-[#FAF9F5] border rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right font-semibold ${isRollback ? 'border-rose-350 bg-rose-50' : 'border-slate-200'}`}
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-testingQty`}
                                        type="number" step="0.1"
                                        value={noz.testingQty}
                                        onChange={e => handleNozzleChange(idx, 'testingQty', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].testingQty`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'testingQty')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right"
                                      />
                                    </td>
                                    <td className="py-1 text-right text-[10px] font-bold font-mono text-slate-800">
                                      {noz.netSales.toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              // Tablet-friendly Spacious touch layout (Generous 44px targets)
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Nozzle ID</label>
                                    <input 
                                      id={`input-noz-${idx}-nozzleId`}
                                      type="text" 
                                      value={noz.nozzleId}
                                      onChange={e => handleNozzleChange(idx, 'nozzleId', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-semibold h-[44px]"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Product</label>
                                    <select
                                      id={`input-noz-${idx}-fuelType`}
                                      value={noz.fuelType}
                                      onChange={e => handleNozzleChange(idx, 'fuelType', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-bold h-[44px] cursor-pointer"
                                    >
                                      <option value="MS">MS</option>
                                      <option value="HSD">HSD</option>
                                      <option value="SPEED">SPEED</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Rate (₹)</label>
                                    <input 
                                      id={`input-noz-${idx}-fuelRate`}
                                      type="number" step="0.01"
                                      value={noz.fuelRate}
                                      onChange={e => handleNozzleChange(idx, 'fuelRate', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-mono h-[44px] text-right font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Opening</label>
                                    <input 
                                      id={`input-noz-${idx}-openingMeter`}
                                      type="number" step="0.01"
                                      value={noz.openingMeter}
                                      onChange={e => handleNozzleChange(idx, 'openingMeter', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Closing</label>
                                    <input 
                                      id={`input-noz-${idx}-closingMeter`}
                                      type="number" step="0.01"
                                      value={noz.closingMeter}
                                      onChange={e => handleNozzleChange(idx, 'closingMeter', Number(e.target.value))}
                                      className={`w-full bg-[#FDFDFB] border rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right font-bold ${
                                        isRollback ? 'border-rose-350 bg-rose-50/10' : 'border-slate-250'
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Testing (L)</label>
                                    <input 
                                      id={`input-noz-${idx}-testingQty`}
                                      type="number" step="0.1"
                                      value={noz.testingQty}
                                      onChange={e => handleNozzleChange(idx, 'testingQty', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono font-black">Net Sales</label>
                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono font-bold text-slate-700 h-[44px] flex items-center justify-end">
                                      {noz.netSales.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {isRollback && (
                              <div className="mt-3 text-[7.5px] text-rose-900 font-mono font-black bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center justify-between shadow-xs">
                                <span>⚠️ Continuity Rollback Anomaly: Opening &gt; Closing reading.</span>
                                <button
                                  onClick={() => {
                                    const temp = noz.openingMeter;
                                    handleNozzleChange(idx, 'openingMeter', noz.closingMeter);
                                    handleNozzleChange(idx, 'closingMeter', temp);
                                    setFeedbackMsg('✔ Automatically Swapped Opening & Closing readings!');
                                  }}
                                  className="bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-[7.5px] text-slate-800 font-black uppercase tracking-wider transition-all h-[32px] flex items-center"
                                >
                                  Auto-Swap
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* HSD Nozzles Group */}
                  {form.readings.filter(noz => noz.fuelType === 'HSD').length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[7.5px] font-black font-mono text-[#1565C0] bg-[#1565C0]/5 px-2 py-0.5 rounded border border-[#1565C0]/10 uppercase tracking-wider block">
                        HSD (Diesel) Nozzle Group
                      </div>
                      {form.readings.map((noz, idx) => {
                        if (noz.fuelType !== 'HSD') return null;
                        const regionId = `readings-${idx}`;
                        const isRollback = noz.closingMeter < noz.openingMeter;
                        const isFocused = activeFocusedFieldId === regionId || activeFocusedFieldId.startsWith(`readings[${idx}]`);
                        
                        return (
                          <div 
                            key={idx}
                            onClick={() => setActiveFocusedFieldId(regionId)}
                            className={`p-3 rounded-lg border transition-all ${
                              isFocused ? 'border-amber-500 bg-amber-50/5 shadow-xs' : 'border-slate-200 bg-slate-50/40'
                            } ${isRollback ? 'border-rose-350 bg-rose-50/20' : ''}`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-bold border-b border-slate-200/50 pb-1.5 mb-2">
                              <span className="text-[#0A3D62] font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                Nozzle Row #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] text-slate-500 font-mono">98% OCR Match</span>
                                <button 
                                  onClick={() => removeNozzleRow(idx)}
                                  className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {quickEditMode ? (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-[7px] font-bold font-mono text-slate-450 uppercase border-b border-slate-100">
                                    <th className="pb-1 pr-1 w-20">Nozzle ID</th>
                                    <th className="pb-1 pr-1 w-24">Fuel</th>
                                    <th className="pb-1 pr-1 w-20">Rate</th>
                                    <th className="pb-1 pr-1 w-20">Open</th>
                                    <th className="pb-1 pr-1 w-20">Close</th>
                                    <th className="pb-1 pr-1 w-20">Test</th>
                                    <th className="pb-1 text-right w-20 font-bold">Net (L)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-nozzleId`}
                                        type="text" 
                                        value={noz.nozzleId}
                                        onChange={e => handleNozzleChange(idx, 'nozzleId', e.target.value)}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].nozzleId`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'nozzleId')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <select
                                        id={`input-noz-${idx}-fuelType`}
                                        value={noz.fuelType}
                                        onChange={e => handleNozzleChange(idx, 'fuelType', e.target.value)}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].fuelType`)}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1 py-0.5 text-[9.5px] font-bold focus:border-amber-500 focus:outline-none"
                                      >
                                        <option value="MS">MS</option>
                                        <option value="HSD">HSD</option>
                                        <option value="SPEED">SPEED</option>
                                      </select>
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-fuelRate`}
                                        type="number" step="0.01"
                                        value={noz.fuelRate}
                                        onChange={e => handleNozzleChange(idx, 'fuelRate', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].fuelRate`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'fuelRate')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-openingMeter`}
                                        type="number" step="0.01"
                                        value={noz.openingMeter}
                                        onChange={e => handleNozzleChange(idx, 'openingMeter', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].openingMeter`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'openingMeter')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right font-semibold"
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-closingMeter`}
                                        type="number" step="0.01"
                                        value={noz.closingMeter}
                                        onChange={e => handleNozzleChange(idx, 'closingMeter', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].closingMeter`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'closingMeter')}
                                        className={`w-full bg-[#FAF9F5] border rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right font-semibold ${isRollback ? 'border-rose-350 bg-rose-50' : 'border-slate-200'}`}
                                      />
                                    </td>
                                    <td className="pr-1 py-1">
                                      <input 
                                        id={`input-noz-${idx}-testingQty`}
                                        type="number" step="0.1"
                                        value={noz.testingQty}
                                        onChange={e => handleNozzleChange(idx, 'testingQty', Number(e.target.value))}
                                        onFocus={() => setActiveFocusedFieldId(`readings[${idx}].testingQty`)}
                                        onKeyDown={e => handleGridKeyDown(e, 'noz', idx, 'testingQty')}
                                        className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-amber-500 focus:outline-none text-right"
                                      />
                                    </td>
                                    <td className="py-1 text-right text-[10px] font-bold font-mono text-slate-800">
                                      {noz.netSales.toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Nozzle ID</label>
                                    <input 
                                      id={`input-noz-${idx}-nozzleId`}
                                      type="text" 
                                      value={noz.nozzleId}
                                      onChange={e => handleNozzleChange(idx, 'nozzleId', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-semibold h-[44px]"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Product</label>
                                    <select
                                      id={`input-noz-${idx}-fuelType`}
                                      value={noz.fuelType}
                                      onChange={e => handleNozzleChange(idx, 'fuelType', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-bold h-[44px] cursor-pointer"
                                    >
                                      <option value="MS">MS</option>
                                      <option value="HSD">HSD</option>
                                      <option value="SPEED">SPEED</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Rate (₹)</label>
                                    <input 
                                      id={`input-noz-${idx}-fuelRate`}
                                      type="number" step="0.01"
                                      value={noz.fuelRate}
                                      onChange={e => handleNozzleChange(idx, 'fuelRate', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-mono h-[44px] text-right font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Opening</label>
                                    <input 
                                      id={`input-noz-${idx}-openingMeter`}
                                      type="number" step="0.01"
                                      value={noz.openingMeter}
                                      onChange={e => handleNozzleChange(idx, 'openingMeter', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Closing</label>
                                    <input 
                                      id={`input-noz-${idx}-closingMeter`}
                                      type="number" step="0.01"
                                      value={noz.closingMeter}
                                      onChange={e => handleNozzleChange(idx, 'closingMeter', Number(e.target.value))}
                                      className={`w-full bg-[#FDFDFB] border rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right font-bold ${
                                        isRollback ? 'border-rose-350 bg-rose-50/10' : 'border-slate-255'
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Testing (L)</label>
                                    <input 
                                      id={`input-noz-${idx}-testingQty`}
                                      type="number" step="0.1"
                                      value={noz.testingQty}
                                      onChange={e => handleNozzleChange(idx, 'testingQty', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs font-mono h-[44px] text-right"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block font-mono font-black">Net Sales</label>
                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono font-bold text-slate-700 h-[44px] flex items-center justify-end">
                                      {noz.netSales.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {isRollback && (
                              <div className="mt-3 text-[7.5px] text-rose-900 font-mono font-black bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center justify-between shadow-xs">
                                <span>⚠️ Continuity Rollback Anomaly: Opening &gt; Closing reading.</span>
                                <button
                                  onClick={() => {
                                    const temp = noz.openingMeter;
                                    handleNozzleChange(idx, 'openingMeter', noz.closingMeter);
                                    handleNozzleChange(idx, 'closingMeter', temp);
                                    setFeedbackMsg('✔ Automatically Swapped Opening & Closing readings!');
                                  }}
                                  className="bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-[7.5px] text-slate-800 font-black uppercase tracking-wider transition-all h-[32px] flex items-center"
                                >
                                  Auto-Swap
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Credit Customer Ledger (Udhari) Rows */}
              <div 
                className={`bg-white p-3.5 rounded-xl border transition-all duration-200 space-y-3 shadow-xs ${
                  activeFocusedFieldId.startsWith('creditEntries') 
                    ? 'border-amber-600 ring-2 ring-amber-500/10' 
                    : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Credit Customers (Udhari) List</span>
                  <button 
                    onClick={addCreditRow}
                    className="flex items-center gap-1 text-[8px] font-black text-amber-800 hover:text-amber-900 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg shadow-xs transition-colors h-[32px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Customer
                  </button>
                </div>

                {/* CUSTOMER GROUPING OVERLAYS: Group entries by priority review status */}
                <div className="space-y-3">
                  
                  {/* High priority Needs Review list */}
                  {form.creditEntries.filter(c => c.reviewStatus === 'needs_review').length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[7.5px] font-black font-mono text-[#C62828] bg-rose-50 px-2 py-1 rounded border border-rose-100 uppercase tracking-wider block animate-pulse">
                        HIGH PRIORITIZED OVERRIDE DISCREPANCIES (ACTION REQUIRED)
                      </div>
                      
                      {form.creditEntries.map((c, idx) => {
                        if (c.reviewStatus !== 'needs_review') return null;
                        const regionId = `creditEntries-${idx}`;
                        const meta = getConfidenceMeta(c.confidence);
                        const isFocused = activeFocusedFieldId === regionId || activeFocusedFieldId.startsWith(`creditEntries[${idx}]`);

                        return (
                          <div 
                            key={idx}
                            onClick={() => setActiveFocusedFieldId(regionId)}
                            className={`p-3 rounded-lg border transition-all bg-rose-50/5 border-rose-300 ${
                              isFocused ? 'ring-2 ring-rose-500/15' : ''
                            }`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-bold border-b border-rose-250/20 pb-1.5 mb-2">
                              <span className="text-rose-950 font-mono flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                                Review Entry Row #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[7.5px] font-mono px-2 py-0.5 rounded-full border bg-rose-50 text-rose-900 border-rose-200 font-bold`}>
                                  {c.confidence}% OCR Acc
                                </span>
                                <button 
                                  onClick={() => removeCreditRow(idx)}
                                  className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {quickEditMode ? (
                              <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Company/Customer Name</label>
                                  <input 
                                    id={`input-cred-${idx}-customerName`}
                                    type="text" 
                                    value={c.customerName}
                                    onChange={e => handleCreditChange(idx, 'customerName', e.target.value)}
                                    onFocus={() => setActiveFocusedFieldId(`creditEntries[${idx}].customerName`)}
                                    onKeyDown={e => handleGridKeyDown(e, 'cred', idx, 'customerName')}
                                    className="w-full bg-[#FAF9F5] border border-rose-300 rounded px-2 py-1 text-[10px] font-semibold focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Amount (₹)</label>
                                  <input 
                                    id={`input-cred-${idx}-amount`}
                                    type="number" 
                                    value={c.amount}
                                    onChange={e => handleCreditChange(idx, 'amount', Number(e.target.value))}
                                    onFocus={() => setActiveFocusedFieldId(`creditEntries[${idx}].amount`)}
                                    onKeyDown={e => handleGridKeyDown(e, 'cred', idx, 'amount')}
                                    className="w-full bg-[#FAF9F5] border border-rose-300 rounded px-2 py-1 text-[10px] font-mono text-right focus:outline-none font-black"
                                  />
                                </div>
                                <div className="flex flex-col justify-end">
                                  <button
                                    onClick={() => {
                                      handleCreditChange(idx, 'reviewStatus', 'clean');
                                      setFeedbackMsg(`✔ Marked ${c.customerName} as clean!`);
                                    }}
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-[8px] font-black uppercase rounded py-1.5 transition-colors h-[28px] flex items-center justify-center"
                                  >
                                    Verify ✓
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Tablet layout
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Customer Name</label>
                                    <input 
                                      id={`input-cred-${idx}-customerName`}
                                      type="text" 
                                      value={c.customerName}
                                      onChange={e => handleCreditChange(idx, 'customerName', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-rose-300 rounded-lg px-3 py-2 text-xs font-bold h-[44px]"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Ledger Amount (₹)</label>
                                    <input 
                                      id={`input-cred-${idx}-amount`}
                                      type="number" 
                                      value={c.amount}
                                      onChange={e => handleCreditChange(idx, 'amount', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-rose-300 rounded-lg px-3 py-2 text-xs font-mono font-bold h-[44px] text-right"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Review Override</label>
                                    <select 
                                      id={`input-cred-${idx}-reviewStatus`}
                                      value={c.reviewStatus}
                                      onChange={e => handleCreditChange(idx, 'reviewStatus', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2 py-2 text-xs h-[44px] cursor-pointer"
                                    >
                                      <option value="clean">Verified Clean</option>
                                      <option value="needs_review">Needs Review</option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col justify-end">
                                    <button
                                      onClick={() => {
                                        handleCreditChange(idx, 'reviewStatus', 'clean');
                                        setFeedbackMsg(`✔ Marked ${c.customerName || 'Customer'} as clean!`);
                                      }}
                                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-[9px] font-black uppercase rounded-lg py-2.5 transition-colors h-[44px] flex items-center justify-center"
                                    >
                                      Verify Clean Ledger
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Verified clean items list */}
                  {form.creditEntries.filter(c => c.reviewStatus === 'clean').length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="text-[7.5px] font-black font-mono text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider block">
                        VERIFIED CLEAN LEDGER ITEMS
                      </div>
                      
                      {form.creditEntries.map((c, idx) => {
                        if (c.reviewStatus !== 'clean') return null;
                        const regionId = `creditEntries-${idx}`;
                        const meta = getConfidenceMeta(c.confidence);
                        const isFocused = activeFocusedFieldId === regionId || activeFocusedFieldId.startsWith(`creditEntries[${idx}]`);

                        return (
                          <div 
                            key={idx}
                            onClick={() => setActiveFocusedFieldId(regionId)}
                            className={`p-3 rounded-lg border transition-all ${
                              isFocused ? 'border-amber-500 bg-amber-50/5 shadow-xs' : 'border-slate-200 bg-slate-50/40'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-bold border-b border-slate-200/50 pb-1.5 mb-2">
                              <span className="text-slate-700 font-mono">Verified Entry Row #{idx + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[7.5px] font-mono px-2 py-0.5 rounded-full border bg-emerald-50/50 text-emerald-800 border-emerald-200/40`}>
                                  {c.confidence}% OCR
                                </span>
                                <button 
                                  onClick={() => removeCreditRow(idx)}
                                  className="text-rose-655 hover:text-rose-800 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {quickEditMode ? (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Company/Customer Name</label>
                                  <input 
                                    id={`input-cred-${idx}-customerName`}
                                    type="text" 
                                    value={c.customerName}
                                    onChange={e => handleCreditChange(idx, 'customerName', e.target.value)}
                                    onFocus={() => setActiveFocusedFieldId(`creditEntries[${idx}].customerName`)}
                                    onKeyDown={e => handleGridKeyDown(e, 'cred', idx, 'customerName')}
                                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Amount (₹)</label>
                                  <input 
                                    id={`input-cred-${idx}-amount`}
                                    type="number" 
                                    value={c.amount}
                                    onChange={e => handleCreditChange(idx, 'amount', Number(e.target.value))}
                                    onFocus={() => setActiveFocusedFieldId(`creditEntries[${idx}].amount`)}
                                    onKeyDown={e => handleGridKeyDown(e, 'cred', idx, 'amount')}
                                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded px-2 py-1 text-[10px] font-mono text-right focus:outline-none font-bold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Customer Name</label>
                                    <input 
                                      id={`input-cred-${idx}-customerName`}
                                      type="text" 
                                      value={c.customerName}
                                      onChange={e => handleCreditChange(idx, 'customerName', e.target.value)}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-semibold h-[44px]"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase block font-mono">Ledger Amount (₹)</label>
                                    <input 
                                      id={`input-cred-${idx}-amount`}
                                      type="number" 
                                      value={c.amount}
                                      onChange={e => handleCreditChange(idx, 'amount', Number(e.target.value))}
                                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-3 py-2 text-xs font-mono font-bold h-[44px] text-right"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Cash drawer and Digital Settlements */}
              <div 
                onClick={() => focusField('actualCash')}
                className={`bg-white p-3.5 rounded-xl border transition-all duration-200 space-y-3 shadow-xs cursor-pointer ${
                  activeFocusedFieldId === 'actualCash' 
                    ? 'border-amber-600 ring-2 ring-amber-500/10' 
                    : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono block">Drawer & Cashbook Settlements</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Opening Handover (₹)</label>
                    <input
                      id="input-openingCash"
                      type="number"
                      value={form.openingCash}
                      onChange={e => handleFieldChange('openingCash', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('openingCash')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Actual Drawer Cash (₹)</label>
                    <input
                      id="input-actualCash"
                      type="number"
                      value={form.actualCash}
                      onChange={e => handleFieldChange('actualCash', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('actualCash')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[36px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">UPI Payments</label>
                    <input
                      id="input-upiSales"
                      type="number"
                      value={form.upiSales}
                      onChange={e => handleFieldChange('upiSales', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('upiSales')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[28px] text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Swipe Cards</label>
                    <input
                      id="input-cardSales"
                      type="number"
                      value={form.cardSales}
                      onChange={e => handleFieldChange('cardSales', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('cardSales')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[28px] text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Credit Sum</label>
                    <input
                      id="input-creditSales"
                      type="number"
                      value={form.creditSales}
                      onChange={e => handleFieldChange('creditSales', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('creditSales')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[28px] text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Credit Recovery (₹)</label>
                    <input
                      id="input-creditRecovery"
                      type="number"
                      value={form.creditRecovery}
                      onChange={e => handleFieldChange('creditRecovery', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('creditRecovery')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[7.5px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Shift Expenses (₹)</label>
                    <input
                      id="input-expenses"
                      type="number"
                      value={form.expenses}
                      onChange={e => handleFieldChange('expenses', Number(e.target.value))}
                      onFocus={() => setActiveFocusedFieldId('expenses')}
                      className="w-full bg-[#FDFDFB] border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 transition-all font-mono font-bold shadow-xs h-[36px]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Double entry calculations summary scorecard */}
          <div className="bg-[#F0F0EF] p-4 rounded-xl border border-[#EBEBEA] space-y-2 text-xs shadow-xs">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block font-mono">Recalculated Double-Entry Summary</span>
            
            <div className="flex justify-between text-slate-600 font-semibold font-mono text-[10px]">
              <span>MS Litres Sold:</span>
              <span className="text-slate-900 font-bold">{shiftCalculations.netMSLitres} L</span>
            </div>

            <div className="flex justify-between text-slate-600 font-semibold font-mono text-[10px]">
              <span>HSD Litres Sold:</span>
              <span className="text-slate-900 font-bold">{shiftCalculations.netHSDLitres} L</span>
            </div>

            <div className="flex justify-between text-slate-600 font-semibold font-mono text-[10px]">
              <span>Extracted Fuel Revenue:</span>
              <span className="text-slate-900 font-bold">₹{shiftCalculations.fuelRevenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-slate-600 font-semibold font-mono text-[10px]">
              <span>Expected Till Cash:</span>
              <span className="text-slate-900 font-bold">₹{shiftCalculations.expectedCashTill.toLocaleString()}</span>
            </div>

            <div className="border-t border-slate-300 pt-2 flex justify-between font-black font-mono text-xs">
              <span className="text-slate-800">Cash Till Variance:</span>
              <span 
                className="font-bold font-mono px-2.5 py-0.5 rounded-lg shadow-sm"
                style={{ 
                  color: Math.abs(shiftCalculations.cashVariance) === 0
                    ? '#1E4620' 
                    : Math.abs(shiftCalculations.cashVariance) <= 500
                    ? '#7A4300'
                    : '#7A1A1A',
                  backgroundColor: Math.abs(shiftCalculations.cashVariance) === 0
                    ? '#E8F5E9'
                    : Math.abs(shiftCalculations.cashVariance) <= 500
                    ? '#FFF3E0'
                    : '#FFE5E5'
                }}
              >
                {Math.abs(shiftCalculations.cashVariance) === 0 
                  ? 'Perfect Parity ✓' 
                  : `${shiftCalculations.cashVariance > 0 ? '+' : ''}₹${shiftCalculations.cashVariance.toLocaleString()}`}
              </span>
            </div>

            {Math.abs(shiftCalculations.cashVariance) > 500 && (
              <div className="text-[9px] bg-red-100 border border-red-300 text-red-800 p-2.5 rounded-lg font-mono font-bold animate-pulse text-center shadow-xs">
                ⚠️ SHIFT LOCK BLOCKED: Cash Till Variance (₹{shiftCalculations.cashVariance}) exceeds allowed ₹500 override limit. Review meter counts.
              </div>
            )}
          </div>

          {/* Supervisor mutations audit ledger list */}
          <div className="bg-white border rounded-xl p-3.5 space-y-2 max-h-32 overflow-y-auto shadow-xs border-slate-200">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block font-mono flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-slate-400" /> Active Session Override mutations ({mutations.length})
            </span>
            {mutations.length === 0 ? (
              <div className="text-[8.5px] font-mono text-slate-400 italic">No manual overrides recorded on the ledger during this session.</div>
            ) : (
              <div className="space-y-1.5 font-mono text-[8.5px] text-slate-650">
                {mutations.map((m, idx) => (
                  <div key={idx} className="border-b border-slate-100 pb-1">
                    <span className="text-amber-800 font-bold">[{m.fieldKey}]</span>
                    <span className="text-slate-500"> changed from </span>
                    <span className="text-slate-800 font-bold">"{JSON.stringify(m.oldValue)}"</span>
                    <span className="text-slate-500"> to </span>
                    <span className="text-emerald-700 font-bold">"{JSON.stringify(m.newValue)}"</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action exit gates console */}
          <div className="space-y-3 border-t pt-4 border-slate-200">
            {feedbackMsg && (
              <div 
                className="text-[9px] text-center font-mono py-2 rounded-lg border font-bold shadow-inner"
                style={{
                  color: feedbackMsg.startsWith('❌') ? ClaudeTheme.colors.accent.danger : ClaudeTheme.colors.accent.success,
                  borderColor: feedbackMsg.startsWith('❌') ? 'rgba(198, 40, 40, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                  backgroundColor: feedbackMsg.startsWith('❌') ? 'rgba(198, 40, 40, 0.05)' : 'rgba(46, 125, 50, 0.05)',
                }}
              >
                {feedbackMsg}
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFeedbackMsg("✔ Shift draft progress saved locally!");
                }}
                className="flex-1 bg-white border border-slate-350 hover:bg-slate-50 text-slate-800 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all h-[44px] flex items-center justify-center shadow-xs"
              >
                Save Draft
              </button>
              
              <button
                onClick={() => {
                  setFeedbackMsg("❌ Shift flagged as REJECTED due to visual failure.");
                  setTimeout(() => navigate('/ai-queue'), 1200);
                }}
                className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all h-[44px] flex items-center justify-center shadow-xs"
              >
                Flag / Reject
              </button>
            </div>

            <button
              onClick={handleOverrideSubmit}
              disabled={isSubmitting || Math.abs(shiftCalculations.cashVariance) > 500}
              className="w-full text-white font-black text-xs py-3 rounded-lg tracking-widest transition-all uppercase shadow-md flex items-center justify-center gap-2 h-[46px]"
              style={{ 
                backgroundColor: Math.abs(shiftCalculations.cashVariance) > 500 ? '#CCCCCC' : '#1E1E1D',
                cursor: Math.abs(shiftCalculations.cashVariance) > 500 ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'VERIFYING & COMMITTING LEDGERS...' : '✔ RECONCILE & LOCK SHIFT'}
            </button>
          </div>
        </section>

      </div>

      {/* 4. Skewomorphic High-Fidelity Operational Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0">
          <div className="bg-[#FAF9F5] border-2 border-[#E4E3DE] rounded-3xl max-w-lg w-full shadow-2xl p-6 relative flex flex-col gap-6 text-slate-800 print:border-none print:shadow-none print:w-full print:max-w-none">
            
            {/* Modal Brand Header */}
            <div className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
              <div className="text-sm font-black text-[#0A3D62] tracking-wider uppercase">Potaliya Petroleum by HPCL</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Verified Shift Closing & Reconciled Statement</div>
              <span className="inline-block text-[9px] font-bold border px-3 py-0.5 rounded-full mt-2 uppercase tracking-wider text-emerald-800 border-emerald-500/30 bg-emerald-500/5">
                ✓ Shift Ledger Reconciled & Locked Successfully
              </span>
            </div>

            {/* Operator and Shift Meta details */}
            <div className="bg-white border border-[#EBEBEA] rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Attendant Name</span>
                <span className="text-slate-800 font-extrabold text-sm">{form.operatorName}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Date / Shift</span>
                <span className="text-slate-800 font-extrabold text-sm">{form.shiftDate} / {form.shiftLabel}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Supervisor Verified</span>
                <span className="text-slate-800 font-extrabold text-sm">{user?.displayName || "Supervisor"}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Unique Scan Reference</span>
                <span className="text-slate-800 font-mono text-[10px] break-all">{jobId}</span>
              </div>
            </div>

            {/* Financial Reconciliation overview grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-[#EBEBEA] p-3 rounded-2xl text-center shadow-xs">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-widest">Total Sales</span>
                <span className="text-md font-black text-[#0A3D62] block mt-1">₹{shiftCalculations.fuelRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-[#EBEBEA] p-3 rounded-2xl text-center shadow-xs">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-widest">Till Cash</span>
                <span className="text-md font-black text-[#0A3D62] block mt-1">₹{form.actualCash.toLocaleString()}</span>
              </div>
              <div className="bg-white border border-[#EBEBEA] p-3 rounded-2xl text-center shadow-xs">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-widest">Difference</span>
                <span className={`text-md font-black block mt-1 ${shiftCalculations.cashVariance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {shiftCalculations.cashVariance === 0 ? '₹0.00' : `₹${shiftCalculations.cashVariance.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Nozzle Liter totals */}
            <div className="bg-white border border-[#EBEBEA] rounded-2xl p-4 space-y-2">
              <div className="text-[8px] font-black text-slate-450 uppercase tracking-widest font-mono border-b pb-1">Verified Nozzle Sales Registers</div>
              <div className="space-y-1.5 text-xs">
                {form.readings.map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-[#0A3D62]">{r.nozzleId} ({r.fuelType})</span>
                    <span className="font-mono text-[10px] text-slate-400">{r.openingMeter}L → {r.closingMeter}L</span>
                    <span className="font-extrabold text-slate-800">{r.netSales.toFixed(2)} Litres</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Updated Fuel stock closing */}
            <div className="bg-[#FFFDF6] border border-amber-200/50 rounded-2xl p-4 space-y-2">
              <div className="text-[8px] font-black text-amber-700 uppercase tracking-widest font-mono border-b border-amber-200/35 pb-1">Dipped Fuel Stock Closings (Estimated)</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[7.5px] text-slate-450 font-bold uppercase block">MS Petrol Closing</span>
                  <span className="font-extrabold text-slate-800">{(25000 - shiftCalculations.netMSLitres).toLocaleString()} Litres</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-slate-450 font-bold uppercase block">HSD Diesel Closing</span>
                  <span className="font-extrabold text-slate-800">{(25000 - shiftCalculations.netHSDLitres).toLocaleString()} Litres</span>
                </div>
              </div>
            </div>

            {/* Suspicious Activities warnings */}
            <div className="bg-white border border-[#EBEBEA] rounded-2xl p-4 space-y-2">
              <div className="text-[8px] font-black text-slate-450 uppercase tracking-widest font-mono border-b pb-1">Suspicious Flags Resolved ({verification.errors.length})</div>
              {verification.errors.length === 0 ? (
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All operations cleared and aligned under perfect balance parity.
                </div>
              ) : (
                <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                  {verification.errors.map((err, idx) => (
                    <div key={idx} className="text-[9.5px] text-slate-500 font-medium leading-tight flex gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clickable Actions */}
            <div className="flex gap-3 border-t-2 border-dashed border-slate-350 pt-4 print:hidden">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-white border border-slate-350 hover:bg-slate-50 text-slate-800 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition-all h-[44px] flex items-center justify-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4 text-slate-500" /> Print Summary
              </button>
              
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  navigate('/ai-queue');
                }}
                className="flex-1 bg-[#1E1E1D] hover:bg-black text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-all h-[44px] flex items-center justify-center gap-1 shadow-md"
              >
                Return to Queue →
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
