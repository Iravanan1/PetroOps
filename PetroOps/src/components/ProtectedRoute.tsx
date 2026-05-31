import React from 'react';
import { Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  // Temporary Operational Bypass Mode: Directly render dashboard sub-routes without any login/onboarding redirects
  return <Outlet />;
}
