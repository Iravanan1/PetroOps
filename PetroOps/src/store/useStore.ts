import { create } from 'zustand';

interface PumpState {
  pendingReviews: any[];
  setPendingReviews: (reviews: any[]) => void;
  alerts: any[];
  setAlerts: (alerts: any[]) => void;
}

export const usePumpStore = create<PumpState>((set) => ({
  pendingReviews: [],
  setPendingReviews: (reviews) => set({ pendingReviews: reviews }),
  alerts: [],
  setAlerts: (alerts) => set({ alerts: alerts }),
}));
