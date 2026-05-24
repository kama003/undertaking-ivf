import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Users, Loader2, ShieldCheck, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { secondaryAuth } from '../lib/firebase';
import { firebaseService } from '../services/firebaseService';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await firebaseService.fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await firebaseService.createUserProfile(userCredential.user.uid, email, role);
      setMessage(`User ${email} created successfully as ${role}.`);
      setEmail('');
      setPassword('');
      setRole('viewer');
      loadUsers(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await firebaseService.updateUserRole(uid, newRole);
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Failed to update role", err);
      alert("Failed to update user role.");
    }
  };

  const handleDeleteUser = async (uid: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}? This will revoke their access.`)) {
      return;
    }
    try {
      await firebaseService.deleteUserProfile(uid);
      setUsers(users.filter(u => u.uid !== uid));
    } catch (err) {
      console.error("Failed to delete user", err);
      alert("Failed to delete user profile.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">User Management</h2>
          <p className="text-slate-500 text-sm">Create and manage system access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">New User</h3>
                <p className="text-slate-500 text-xs">Add a new member</p>
              </div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">{error}</div>}
            {message && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl border border-emerald-100">{message}</div>}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Email</label>
                <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                    placeholder="user@hospital.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Password</label>
                <div className="relative">
                   <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-900 cursor-pointer"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer",
                  isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                )}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                ) : (
                  "Create User"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Active Users</h3>
                  <p className="text-slate-500 text-xs">Manage roles and access</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                {users.length} Total
              </div>
            </div>

            {isLoading ? (
               <div className="flex items-center justify-center h-48">
                 <Loader2 className="w-8 h-8 text-primary animate-spin" />
               </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <motion.div 
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black uppercase",
                         user.role === 'admin' ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-600"
                       )}>
                         {user.email.substring(0, 2)}
                       </div>
                       <div>
                         <div className="font-bold text-slate-900 text-sm">{user.email}</div>
                         <div className="text-xs text-slate-500">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {user.role === 'admin' && (
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-widest">
                          <ShieldAlert className="w-3 h-3" /> Admin
                        </div>
                      )}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        className={cn(
                          "bg-white border rounded-lg py-1.5 px-3 text-xs font-bold outline-none cursor-pointer transition-colors",
                          user.role === 'admin' ? "border-primary/20 text-primary focus:border-primary" : "border-slate-200 text-slate-700 focus:border-slate-300"
                        )}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.email)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm font-medium">
                    No users found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
