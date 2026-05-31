import { create } from 'zustand';

interface AuthState {
  user: any | null;
  role: string | null;
  loading: boolean;
  setUser: (user: any | null, role?: string | null) => void;
  setLoading: (loading: boolean) => void;
  getFirebaseToken: () => Promise<string | null>;
}

// Synchronously restore previous session during initialization to prevent race conditions & loading flickers
const getInitialSession = () => {
  const defaultAdmin = {
    uid: "demo-admin-999",
    email: "admin@petroops.demo",
    displayName: "Potaliya Admin (Owner)",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150",
    role: "owner",
    pumpName: "Potaliya Petroleum",
    branchName: "Potaliya Petroleum by HPCL",
    gstNumber: "27AAAAA1111A1Z1",
    address: "Highway Hub, HPCL Petrol Pump, Potaliya, Rajasthan",
    managerName: "Rajesh Patil",
    stationTemplate: "HPCL",
    onboardingComplete: true,
  };

  try {
    const cached = localStorage.getItem("petroops_bypass_user");
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        user: parsed,
        role: parsed.role || "owner",
        loading: false // Immediate restore, bypass load state
      };
    }
  } catch (e) {
    console.error("Failed to restore cached session during boot:", e);
  }

  // Auto-persist default admin configuration for permanent offline testing
  try {
    localStorage.setItem("petroops_bypass_user", JSON.stringify(defaultAdmin));
    localStorage.setItem("petroops_onboarding_complete", "true");
  } catch (e) {}

  return {
    user: defaultAdmin,
    role: "owner",
    loading: false
  };
};

const initialSession = getInitialSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialSession.user,
  role: initialSession.role,
  loading: initialSession.loading,
  setUser: (user, role = null) => {
    set({ user, role });
    if (user) {
      // Synchronously cache the session metadata for immediate offline startup restore
      const sessionUser = {
        ...user,
        role: role || user.role || 'owner',
      };
      localStorage.setItem("petroops_bypass_user", JSON.stringify(sessionUser));
      if (user.onboardingComplete === true) {
        localStorage.setItem("petroops_onboarding_complete", "true");
      }
    } else {
      localStorage.removeItem("petroops_bypass_user");
      localStorage.removeItem("petroops_onboarding_complete");
    }
  },
  setLoading: (loading) => set({ loading }),
  getFirebaseToken: async () => {
    const user = get().user;
    if (user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
    return "demo-bearer-token-123";
  }
}));
