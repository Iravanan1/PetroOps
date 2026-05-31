'use client';

import React, { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, passwordPlain: password }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed. Invalid email or password.');
      }

      const data = await res.json();
      
      // Store JWT credentials in local browser storage
      localStorage.setItem('petroops_token', data.token);
      localStorage.setItem('petroops_role', data.role);
      localStorage.setItem('petroops_user', JSON.stringify(data));

      // Redirect to main admin dashboard overview
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Server connection timed out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 w-full">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500 items-center justify-center font-bold text-2xl text-slate-950 mx-auto">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">PetroOps Portal</h1>
          <p className="text-sm text-slate-400">Enter your manager credentials to access the HQ console.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-lg text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 tracking-wider mb-2">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="manager@petroops.in"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 tracking-wider mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Authenticating Session...' : 'SECURE SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
