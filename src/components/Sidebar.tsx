import React from 'react';
import { cn } from '../lib/utils';
import { LayoutDashboard, FilePlus, Upload, Archive, Settings, FileText, LogOut } from 'lucide-react';

import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userEmail: string | null;
  onToggleRole: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'generate', label: 'Bulk Generate', icon: FilePlus },
  { id: 'upload', label: 'Upload Scans', icon: Upload },
  { id: 'archive', label: 'Store & Track', icon: Archive },
];

export default function Sidebar({ activeTab, setActiveTab, userRole, userEmail, onToggleRole }: SidebarProps) {
  const isViewer = userRole === 'viewer';
  const filteredNavItems = navItems.filter(item => {
    if (isViewer && (item.id === 'generate' || item.id === 'upload')) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-64 bg-white text-slate-900 h-full flex flex-col border-r border-slate-200 shadow-sm">
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-black text-lg leading-none tracking-tight text-primary">R.K. BIOTECH</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Fertile Solutions</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium cursor-pointer",
              activeTab === item.id 
                ? "bg-maroon/5 text-primary shadow-sm ring-1 ring-maroon/10" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              activeTab === item.id ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
            )} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Profile Card & Role Switcher */}
        <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-900 truncate" title={userEmail || ''}>
                {userEmail || 'Active User'}
              </p>
              <span className={cn(
                "inline-block px-2 py-0.5 mt-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                userRole === 'admin' ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-800"
              )}>
                {userRole === 'admin' ? 'Administrator' : 'Viewer'}
              </span>
            </div>
          </div>
          
          <button
            onClick={onToggleRole}
            className="w-full mt-1 text-center py-1.5 px-3 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            title="Conveniently toggle role for testing"
          >
            Switch to {userRole === 'admin' ? 'Viewer' : 'Admin'}
          </button>
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

