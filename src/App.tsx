/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BulkGenerator from './components/BulkGenerator';
import BulkUploader from './components/BulkUploader';
import DocumentList from './components/DocumentList';
import SalesManager from './components/SalesManager';
import UserManagement from './components/UserManagement';
import { UndertakingData, DocumentStatus } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './components/Login';

import { firebaseService } from './services/firebaseService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState<UndertakingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const role = await firebaseService.getUserRole(currentUser.uid, currentUser.email);
          setUserRole(role);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('viewer');
        }
      } else {
        setUserRole('viewer');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        let data = await firebaseService.fetchUndertakings();
        
        // Migrate existing local storage data to Firebase
        const localData = localStorage.getItem('art_undertakings');
        if (localData) {
          try {
            const parsedLocal = JSON.parse(localData) as UndertakingData[];
            if (parsedLocal && Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              const existingIds = new Set(data.map(d => d.id));
              const toMigrate = parsedLocal.filter(d => !existingIds.has(d.id));
              if (toMigrate.length > 0) {
                console.log(`Migrating ${toMigrate.length} documents from localStorage to Firebase...`);
                await firebaseService.createUndertakings(toMigrate);
                data = await firebaseService.fetchUndertakings(); // Refetch
              }
            }
            // Clear to prevent re-migration
            localStorage.removeItem('art_undertakings');
          } catch (e) {
            console.error("Migration error", e);
          }
        }

        setDocuments(data);
      } catch (error) {
        console.error("Failed to fetch documents", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleToggleRole = async () => {
    if (!user) return;
    const newRole = userRole === 'admin' ? 'viewer' : 'admin';
    try {
      await firebaseService.updateUserRole(user.uid, newRole);
      setUserRole(newRole);
      
      // If switched to viewer and on restricted tab, redirect to dashboard
      if (newRole === 'viewer' && (activeTab === 'generate' || activeTab === 'upload')) {
        setActiveTab('dashboard');
      }
    } catch (error) {
      console.error("Failed to toggle role:", error);
      alert("Failed to update user role.");
    }
  };

  const handleGenerated = async (newDocs: UndertakingData[]) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to generate documents.");
      return;
    }
    try {
      await firebaseService.createUndertakings(newDocs);
      setDocuments(prev => [...newDocs, ...prev]);
      setActiveTab('archive');
    } catch (error) {
      console.error("Failed to save documents", error);
      alert("Failed to save documents to database.");
    }
  };

  const handleProcessed = async (processed: Partial<UndertakingData>[]) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to upload scans.");
      return;
    }
    try {
      const updates = documents.map(doc => {
        const match = processed.find(p => p.id === doc.id || p.uhid === doc.uhid);
        if (match) {
          return { ...doc, status: (match.status as DocumentStatus) || 'STORED' };
        }
        return doc;
      });
      
      const changedDocs = updates.filter((u, i) => u.status !== documents[i].status);
      if (changedDocs.length > 0) {
        const changedIds = changedDocs.map(d => d.id);
        await firebaseService.bulkUpdateStatus(changedIds, 'STORED');
        setDocuments(updates);
      }
    } catch (error) {
      console.error("Failed to process documents", error);
      alert("Failed to sync scanned documents to database.");
    }
  };

  const handleStatusUpdate = async (id: string, status: DocumentStatus) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to modify status.");
      return;
    }
    try {
      await firebaseService.updateUndertakingStatus(id, status);
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status } : doc
      ));
    } catch (error) {
       console.error("Failed to update status", error);
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], status: DocumentStatus) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to modify status.");
      return;
    }
    try {
      await firebaseService.bulkUpdateStatus(ids, status);
      setDocuments(prev => prev.map(doc => 
        ids.includes(doc.id) ? { ...doc, status } : doc
      ));
    } catch (error) {
       console.error("Failed to bulk update status", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to delete documents.");
      return;
    }
    try {
      await firebaseService.deleteUndertaking(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
       console.error("Failed to delete", error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (userRole === 'viewer') {
      alert("Viewer is not authorized to delete documents.");
      return;
    }
    try {
      await firebaseService.bulkDelete(ids);
      setDocuments(prev => prev.filter(doc => !ids.includes(doc.id)));
    } catch (error) {
       console.error("Failed to bulk delete", error);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    // Unique key to force update animations and data in dashboard
    const dashboardKey = `dash-${documents.length}-${documents.filter(d => d.status === 'STORED').length}`;
    
    switch (activeTab) {
      case 'dashboard': return <div key={dashboardKey}><Dashboard documents={documents} userRole={userRole} /></div>;
      case 'generate': 
        if (userRole === 'viewer') return <div key={dashboardKey}><Dashboard documents={documents} userRole={userRole} /></div>;
        return <BulkGenerator onGenerated={handleGenerated} />;
      case 'upload': 
        if (userRole === 'viewer') return <div key={dashboardKey}><Dashboard documents={documents} userRole={userRole} /></div>;
        return <BulkUploader onProcessed={handleProcessed} existingDocs={documents} />;
      case 'archive': return <DocumentList 
        documents={documents} 
        onStatusUpdate={handleStatusUpdate} 
        onDelete={handleDelete}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDelete={handleBulkDelete}
        userRole={userRole}
      />;
      case 'sales': return <SalesManager 
        userRole={userRole}
        undertakings={documents}
      />;
      case 'users': 
        if (userRole === 'viewer') return <div key={dashboardKey}><Dashboard documents={documents} userRole={userRole} /></div>;
        return <UserManagement />;
      default: return <div key={dashboardKey}><Dashboard documents={documents} userRole={userRole} /></div>;

    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole}
        userEmail={user.email}
        onToggleRole={handleToggleRole}
      />
      
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


