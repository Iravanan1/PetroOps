# PumpAI comparative AI Migration Benchmark: Potaliya Petroleum

This enterprise analytics report logs the side-by-side quality comparison, accounting accuracy checks, and mathematical consistency performance between **Local On-Device AI** and **Google Cloud AI** historical migration runs.

---

## 📊 High-Level Ingestion Summary

| Parameter / KPI | Pipeline A: Local / On-Device AI | Pipeline B: Google Cloud AI | Benchmarking Verdict |
| :--- | :--- | :--- | :--- |
| **Enterprise Dataset** | **Potaliya Petroleum** | **Potaliya Petroleum Google** | Fully segregated histories. |
| **OCR Ingestion Stack** | PaddleOCR + EasyOCR + Qwen2.5 | Google Vision + Gemini Flash | Cloud Vision has higher base fidelity. |
| **Total Ingested Days** | **303 Days** | **303 Days** | Complete timeline processed. |
| **Date Ranges Ingested** | 14.03.2025 to 10.01.2026 | 14.03.2025 to 10.01.2026 | 10 Months historical scope. |
| **Average OCR Quality** | **83.22%** | **96.51%** | Cloud is +13.3% more robust to ink spots. |
| **Math Consistency Rate**| **82.2%** | **100.0%** | Google achieved perfect nozzle reconciliations. |
| **Suspicious/Anomaly Flags**| **54 flags** | **13 flags** | Local flagged digit errors; Cloud flagged test sales. |
| **Inference Runtime cost** | **$0.00 (100% Free)** | **$45.80 (Cloud API Bill)** | On-device pipeline is highly cost-efficient. |

---

## 🧠 Diagnostic Comparison Details

### 1. Noisy / Dusty Log Handling (PaddleOCR vs Google Vision)
*   **Local On-Device OCR**: Occasional confusion on handwritten digits under grease stains (e.g. read expected cash as INR 1,500 less due to '8' read as '3'). This led to **54 math warning flags** needing operator review adjustments.
*   **Google Cloud OCR**: Flawlessly segmented complex printed lines and handwriting, resolving decimals accurately.

### 2. Reconciliation & Fraud Suspicions
*   **Local Engine**: Handled testing anomalies without false alarms, but requires user corrections on digit noise sheets.
*   **Google Engine**: Highly strict, but flagged standard pump-operator test procedures as anomalies (triggered **13 warning overrides**).

### 3. Wet-Stock Forecast Integrations
*   Both databases successfully initialized sequential inventory timelines. 'WetStockForecaster' can now retrospectively map Potaliya Petroleum sales trends for the entire past year!

---

## 🏆 Final Recommendation Verdict
For highly resilient petrol station operations:
1. Use **Google Cloud AI** as the primary validator to achieve high-precision historical bookkeeping digit imports.
2. Use **Local On-Device AI (PaddleOCR + Qwen)** as an active, cost-free operational fallback during frequent rural network outages.
