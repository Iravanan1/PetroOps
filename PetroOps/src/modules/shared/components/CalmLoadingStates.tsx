import React from 'react';

export function SkeletalBar({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#EBEBEA] rounded-md animate-pulse ${className}`} />
  );
}

export function RosterTableSkeleton() {
  return (
    <div className="border border-[#EBEBEA] rounded-2xl p-6 bg-white space-y-4 shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#EBEBEA]">
        <SkeletalBar className="h-4.5 w-1/3" />
        <SkeletalBar className="h-8 w-24" />
      </div>
      <div className="space-y-3 pt-2">
        <SkeletalBar className="h-10 w-full" />
        <SkeletalBar className="h-10 w-full" />
        <SkeletalBar className="h-10 w-full" />
        <SkeletalBar className="h-10 w-full" />
      </div>
    </div>
  );
}

export function PremiumSpinnerRing() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-[#EBEBEA] border-t-[#D35400] rounded-full animate-spin" />
    </div>
  );
}
