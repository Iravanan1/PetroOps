import React from 'react';

export const PetroOpsBranding = {
  appName: 'PetroOps',
  tagline: 'AI-Assisted Petroleum Operations',
  colors: {
    burntCopper: '#B45309',
    charcoalBlack: '#111827',
    mutedCobaltBlue: '#1E3A8A',
    offWhite: '#F9F9F8',
  },
  typography: {
    fontFamily: '"Inter", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }
};

/**
 * Premium minimalist operational PO Infinity-Loop Monogram.
 * Features the Burnt Copper (#B45309), Charcoal Black (#111827),
 * and Muted Cobalt Blue (#1E3A8A) accent in flat vector style with large negative space.
 */
export const PetroOpsLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PetroOps Brand Monogram"
    >
      {/* Background large negative space clean layout */}
      <rect width="100" height="100" rx="24" fill="#111827" />

      {/* Infinity-loop monogram / PO symbol */}
      {/* Loop 1: The 'P' structural ring in burnt copper */}
      <path
        d="M32 30H55C66.598 30 76 39.402 76 50C76 60.598 66.598 70 55 70C43.402 70 34 60.598 34 50"
        stroke="#B45309"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Loop 2: The 'O' closing structural connection in charcoal/white accent */}
      <path
        d="M68 50C68 39.402 58.598 30 47 30C35.402 30 26 39.402 26 50C26 60.598 35.402 70 47 70"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
      />

      {/* Precision Cobalt Blue Accent dot */}
      <circle cx="50" cy="50" r="7" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="2" />
    </svg>
  );
};

export default PetroOpsBranding;
