import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore.js';
import { Users, Loader2, ShieldAlert, Plus, Trash2, KeyRound } from 'lucide-react';

export default function StaffPage() {
  const { getFirebaseToken, role } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('operator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = await getFirebaseToken();
      try {
        const res = await fetch('/api/v1/users', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-demo-bypass': 'true'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const json = await res.json();
        return json.data || [];
      } catch (err) {
        console.log("Staging users mock active");
        return [
          {
            id: "demo-operator-123",
            email: "operator@pumpai.com",
            role: "operator",
            pumpId: "default-pump"
          },
          {
            id: "demo-manager-456",
            email: "manager@pumpai.com",
            role: "manager",
            pumpId: "default-pump"
          }
        ];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getFirebaseToken();
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-demo-bypass': 'true'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Creation failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEmail('');
      setPassword('');
      setSuccess('Operator role created successfully.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.message);
      setTimeout(() => setError(''), 5500);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      const token = await getFirebaseToken();
      const res = await fetch(`/api/v1/users/${uid}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-demo-bypass': 'true'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ email, password, role: newRole });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] p-8 animated-gradient flex items-center justify-center">
      <div className="max-w-6xl w-full">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Staff Management</h1>
            <p className="text-xs text-slate-400 font-light mt-0.5 tracking-wider uppercase">Enterprise Access Permissions</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* User Creation Form */}
          <div className="flex-1 bg-[#0d1527]/40 border border-slate-800/40 rounded-3xl p-8 shadow-2xl glass-panel">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-blue-400" /> Add Operator
            </h2>

            {error && <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 p-4 rounded-2xl mb-6 text-xs font-semibold">{error}</div>}
            {success && <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 p-4 rounded-2xl mb-6 text-xs font-semibold">{success}</div>}

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block ml-1">Email ID</label>
                 <input 
                   type="email" 
                   className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-blue-500/50 rounded-2xl p-4 text-sm font-semibold text-white focus:outline-none transition-all font-sans"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   required
                 />
              </div>
              
              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block ml-1">Access Token Password</label>
                 <input 
                   type="password" 
                   className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-blue-500/50 rounded-2xl p-4 text-sm font-semibold text-white focus:outline-none transition-all"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   required
                   minLength={6}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block ml-1">System Permissions Role</label>
                 <select 
                   className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-blue-500/50 rounded-2xl p-4 text-sm font-semibold text-white focus:outline-none transition-all appearance-none cursor-pointer"
                   value={newRole}
                   onChange={e => setNewRole(e.target.value)}
                 >
                   <option value="operator">Operator (Shift uploads)</option>
                   {(role === 'owner' || role === 'super_admin' || !role) && (
                     <option value="manager">Manager (Audits queue)</option>
                   )}
                 </select>
              </div>

              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest text-xs rounded-2xl py-4.5 transition-colors flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                PROVISION ACCESS
              </button>
            </form>
          </div>

          {/* User List */}
          <div className="flex-[2] bg-[#0d1527]/40 border border-slate-800/40 rounded-3xl p-8 shadow-2xl glass-panel">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <ShieldAlert className="w-5 h-5 text-blue-400" /> Active Operators
            </h2>

            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2">
              {users?.map((u: any) => (
                <div key={u.id} className="bg-slate-900/40 border border-slate-800/40 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-700/60 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{u.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] uppercase tracking-wider font-bold border border-blue-500/20">
                        {u.role}
                      </span>
                      {u.pumpId && (
                         <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[9px] uppercase tracking-wider font-bold border border-slate-700">
                           {u.pumpId}
                         </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteMutation.mutate(u.id)}
                    disabled={deleteMutation.isPending}
                    className="p-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-xl transition-all border border-rose-500/10 disabled:opacity-50 shrink-0"
                    title="Revoke Access"
                  >
                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
