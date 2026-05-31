import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const TextInputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 font-sans font-bold text-xs text-[#1A1A1A]">
        <label className="text-[#666666] uppercase text-[9px] tracking-wider block">{label}</label>
        <input
          ref={ref}
          className={`w-full bg-[#F9F9F8] border rounded-xl px-4 py-3 text-xs font-bold text-[#1A1A1A] focus:outline-none transition-all focus:border-[#B3B3B3] placeholder-[#999999] min-h-[44px] ${
            error ? 'border-rose-300 focus:border-rose-400 bg-rose-50/10' : 'border-[#D9D9D6]'
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-rose-700 text-[10px] block mt-0.5">⚠️ {error}</span>
        )}
        {helperText && !error && (
          <span className="text-[#999999] text-[9px] block mt-0.5">{helperText}</span>
        )}
      </div>
    );
  }
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 font-sans font-bold text-xs text-[#1A1A1A]">
        <label className="text-[#666666] uppercase text-[9px] tracking-wider block">{label}</label>
        <select
          ref={ref}
          className={`w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-4 py-3 text-xs font-bold text-[#1A1A1A] focus:outline-none transition-all focus:border-[#B3B3B3] min-h-[44px] ${
            error ? 'border-rose-300 focus:border-rose-400 bg-rose-50/10' : 'border-[#D9D9D6]'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-rose-700 text-[10px] block mt-0.5">⚠️ {error}</span>
        )}
      </div>
    );
  }
);
