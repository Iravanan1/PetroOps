import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ShiftReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Step 6 of the unified reconciliation wizard
    navigate(`/operations/shifts/${id}/reconcile`);
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-bold font-mono">
      <span>Generating Digital Closing Summary Sheets...</span>
    </div>
  );
}
