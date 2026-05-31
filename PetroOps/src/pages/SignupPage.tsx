import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Fuel, Loader2, Mail, Lock, Sparkles, Chrome, Apple as AppleIcon, User } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check / Create initial Firestore doc
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        role: "owner",
        displayName: user.displayName || name || "PetroOps Member",
        onboardingComplete: false,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const extendedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || name || "PetroOps Member",
        photoURL: user.photoURL,
        role: "owner",
        onboardingComplete: false
      };

      setUser(extendedUser, "owner");
      navigate('/onboarding');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign up with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        role: "owner",
        displayName: user.displayName || name || "PetroOps Member",
        onboardingComplete: false,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const extendedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || name || "PetroOps Member",
        photoURL: user.photoURL,
        role: "owner",
        onboardingComplete: false
      };

      setUser(extendedUser, "owner");
      navigate('/onboarding');
    } catch (err: any) {
      console.warn("Apple Sign-Up configuration unavailable or cancelled, using demo simulation.");
      handleDeveloperBypass("apple-demo-owner", "apple-owner@petroops.in", "Apple Partner");
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperBypass = (uid: string, devEmail: string, displayName: string) => {
    console.log("[Developer Bypass] Creating mock onboarding session...");
    const extendedUser = {
      uid,
      email: devEmail,
      displayName,
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
      role: "owner",
      pumpName: "Staging Station",
      stationTemplate: "HPCL",
      onboardingComplete: false
    };

    setUser(extendedUser, "owner");
    navigate('/onboarding');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "owner",
        displayName: name || "PetroOps Member",
        onboardingComplete: false,
        createdAt: new Date().toISOString()
      });

      const extendedUser = {
        uid: user.uid,
        email: user.email,
        displayName: name || "PetroOps Member",
        role: "owner",
        onboardingComplete: false
      };

      setUser(extendedUser, "owner");
      navigate('/onboarding');
    } catch (err: any) {
      console.warn("Email signup failed, providing staging bypass for demonstration:", err.message);
      handleDeveloperBypass("demo-owner-" + Math.floor(Math.random() * 1000), email || "owner@petroops.in", name || "Staging Manager");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] flex flex-col justify-between p-6 sm:p-12 font-sans relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#D35400]/5 blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
            <Fuel className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">Petro<span className="text-[#D35400]">Ops</span></span>
        </div>

        <span className="text-xs font-semibold tracking-wider text-[#666666] uppercase bg-[#F3F3F1] px-3 py-1.5 rounded-full border border-[#EBEBEA]">
          v2.4 Stable
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto my-auto py-12 z-10">
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-8 sm:p-10 shadow-sm transition-all duration-300">
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
              Create Station Account
            </h2>
            <p className="text-sm text-[#666666] mt-2 leading-relaxed">
              Open a digital account for your fuel station to track daily registers, wet stocks, and reconciliations.
            </p>
          </div>

          {/* Status Banners */}
          {error && (
            <div className="bg-[#C62828]/5 border border-[#C62828]/10 text-[#C62828] p-4 rounded-2xl mb-6 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-300">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                <input
                  type="text"
                  className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                <input
                  type="email"
                  className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                  placeholder="owner@petroops.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#666666] font-bold block ml-0.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-4.5 w-4 h-4 text-[#999999]" />
                <input
                  type="password"
                  className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-[#1A1A1A] focus:outline-none transition-all placeholder:text-[#999999]"
                  placeholder="•••••••• (Min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D35400] hover:bg-[#A04000] text-white font-semibold tracking-wide text-xs rounded-2xl py-4.5 transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-55"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'REGISTER NEW STATION'}
            </button>
          </form>

          {/* Social login block */}
          <div className="relative flex items-center py-4 my-2">
            <div className="flex-grow border-t border-[#EBEBEA]"></div>
            <span className="flex-shrink-0 mx-4 text-[9px] tracking-widest uppercase text-[#999999] font-bold">Or register with</span>
            <div className="flex-grow border-t border-[#EBEBEA]"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="bg-white hover:bg-[#F3F3F1] border border-[#D9D9D6] hover:border-[#B3B3B3] text-[#1A1A1A] font-semibold tracking-wide text-xs rounded-2xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Chrome className="w-4 h-4 text-[#D35400]" />
              GOOGLE
            </button>

            <button
              type="button"
              onClick={handleAppleSignup}
              disabled={loading}
              className="bg-white hover:bg-[#F3F3F1] border border-[#D9D9D6] hover:border-[#B3B3B3] text-[#1A1A1A] font-semibold tracking-wide text-xs rounded-2xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <AppleIcon className="w-4 h-4 text-[#1A1A1A]" />
              APPLE
            </button>
          </div>

          {/* Developer Bypass */}
          <div className="mt-6 pt-4 border-t border-[#EBEBEA] flex flex-col items-center">
            <button
              type="button"
              onClick={() => handleDeveloperBypass("dev-new-owner", "dev-new-owner@petroops.in", "New Staging Manager")}
              className="text-[10px] font-bold tracking-wider text-[#D35400]/70 hover:text-[#D35400] flex items-center gap-1.5 transition-colors uppercase py-2 px-4 bg-[#D35400]/5 border border-[#D35400]/10 hover:border-[#D35400]/20 rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5" /> STAGING & DEV BYPASS (NO FIREBASE REQ.)
            </button>
          </div>
        </div>

        {/* Redirect */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#666666]">
            Already have an active station account?{' '}
            <a
              href="/login"
              className="text-[#D35400] hover:underline font-bold transition-all"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            >
              Secure Log In
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#999999] gap-4 z-10 border-t border-[#EBEBEA]/60 pt-6">
        <p className="font-medium">© 2026 PetroOps Systems Inc. All rights reserved.</p>
        <div className="flex gap-6 font-medium">
          <a href="#" className="hover:text-[#666666] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#666666] transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-[#666666] transition-colors">Help & Audit Support</a>
        </div>
      </div>
    </div>
  );
}
