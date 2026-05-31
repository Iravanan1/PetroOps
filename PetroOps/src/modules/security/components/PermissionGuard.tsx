import React from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { AccessControlEngine } from '../AccessControlEngine';
import { SecurityPermissions } from '../RolePermissionMatrix';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  permission: keyof SecurityPermissions;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGuard({
  permission,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { role } = useAuthStore();
  const authorized = AccessControlEngine.isAuthorized(role, permission);

  if (!authorized) {
    if (fallback === 'UI_WARNING') {
      return (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-950 flex items-start gap-2.5 text-xs font-bold font-sans">
          <ShieldAlert className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Access Restriction Alert</span>
            <span className="text-[9px] font-medium leading-relaxed block mt-0.5 text-[#666666]">
              Your active role permissions are insufficient to access this action dashboard or adjust these balances.
            </span>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
