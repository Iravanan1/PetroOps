import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ShiftClosePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the unified 6-step guided reconciliation wizard
    navigate(`/operations/shifts/${id}/reconcile`);
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-bold font-mono">
      <span>Redirecting to Unified Attendant Audit Console...</span>
    </div>
  );
}
