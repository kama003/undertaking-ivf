import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Filter, MoreVertical, FileText, ExternalLink, Trash2, Loader2, Check, ChevronDown, CheckCircle2 } from 'lucide-react';
import { UndertakingData, DocumentStatus } from '../types';
import { cn } from '../lib/utils';
import { generateUndertakingPDF } from '../services/pdfService';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOMServer from 'react-dom/server';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentListProps {
  documents: UndertakingData[];
  onStatusUpdate: (id: string, status: DocumentStatus) => void;
  onDelete: (id: string) => void;
  onBulkStatusUpdate: (ids: string[], status: DocumentStatus) => void;
  onBulkDelete: (ids: string[]) => void;
  userRole: 'admin' | 'viewer';
}

export default function DocumentList({ 
  documents, 
  onStatusUpdate, 
  onDelete,
  onBulkStatusUpdate,
  onBulkDelete,
  userRole
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'ALL'>('ALL');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  const filtered = documents.filter(doc => {
    const matchesSearch = doc.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.hospitalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(d => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleIndividualDownload = async (doc: UndertakingData, openPrint = false) => {
    setIsProcessing(doc.id);
    try {
      const qrContainer = document.createElement('div');
      const qrSvg = (
        <QRCodeSVG 
          value={doc.uhid} 
          size={128}
          level="H" 
          includeMargin={true}
        />
      );
      qrContainer.innerHTML = ReactDOMServer.renderToString(qrSvg);
      const svg = qrContainer.querySelector('svg');
      const xml = new XMLSerializer().serializeToString(svg!);
      const svg64 = btoa(xml);
      const image64 = 'data:image/svg+xml;base64,' + svg64;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = 512;
          canvas.height = 512;
          ctx?.drawImage(img, 0, 0, 512, 512);
          resolve(null);
        };
        img.src = image64;
      });
      
      const qrPng = canvas.toDataURL('image/png');
      const blob = await generateUndertakingPDF(doc, qrPng);
      const url = URL.createObjectURL(blob);
      
      if (openPrint) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Undertaking_${doc.uhid}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error(error);
      alert('Error generating document');
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusStyle = (status: DocumentStatus) => {
    switch (status) {
      case 'GENERATED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'PRINTED': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'NOTARISED': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'SCANNED': return 'bg-maroon/5 text-primary border-maroon/10';
      case 'STORED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Archive & Tracking</h2>
          <p className="text-slate-500 text-sm">Manage and retrieve the digital records of all undertakings.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search UHID or Hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-64 shadow-sm"
            />
          </div>
          
          <div className="relative group/filter">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm font-bold text-slate-600 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="GENERATED">Generated</option>
              <option value="PRINTED">Printed</option>
              <option value="NOTARISED">Notarised</option>
              <option value="SCANNED">Scanned</option>
              <option value="STORED">Stored</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-primary p-4 rounded-2xl text-white flex items-center justify-between shadow-xl shadow-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg">
                <Check className="w-5 h-5" />
              </div>
              <span className="font-black uppercase tracking-widest text-xs">{selectedIds.length} items selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  Mark Status <ChevronDown className={cn("w-3 h-3 transition-transform", bulkMenuOpen && "rotate-180")} />
                </button>
                
                {bulkMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setBulkMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {(['PRINTED', 'NOTARISED', 'SCANNED', 'STORED'] as DocumentStatus[]).map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            onBulkStatusUpdate(selectedIds, s);
                            setSelectedIds([]);
                            setBulkMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-maroon/5 hover:text-primary text-slate-500 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => {
                  onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Quick Delete
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <Filter className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {userRole === 'admin' && (
                  <th className="px-6 py-4 w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-5 h-5 rounded border transition-all flex items-center justify-center cursor-pointer",
                        selectedIds.length === filtered.length && filtered.length > 0
                          ? "bg-primary border-primary text-white" 
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="w-3 h-3" />}
                    </button>
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gen. Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr 
                  key={doc.id} 
                  className={cn(
                    "hover:bg-slate-50 transition-all group",
                    selectedIds.includes(doc.id) ? "bg-maroon/5" : ""
                  )}
                >
                  {userRole === 'admin' && (
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleSelect(doc.id)}
                        className={cn(
                          "w-5 h-5 rounded border transition-all flex items-center justify-center cursor-pointer",
                          selectedIds.includes(doc.id)
                            ? "bg-primary border-primary text-white" 
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        )}
                      >
                        {selectedIds.includes(doc.id) && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-maroon/5 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{doc.uhid}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-bold">{doc.hospitalName}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest inline-flex items-center gap-1",
                      getStatusStyle(doc.status)
                    )}>
                      {doc.status === 'STORED' && <CheckCircle2 className="w-3 h-3" />}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{doc.generatedDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                       <button 
                         disabled={isProcessing === doc.id}
                         onClick={() => handleIndividualDownload(doc, true)}
                         className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-maroon/5 rounded-lg cursor-pointer"
                         title="Preview & Print"
                       >
                          {isProcessing === doc.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Printer className="w-4 h-4" />}
                       </button>
                       <button 
                         disabled={isProcessing === doc.id}
                         onClick={() => handleIndividualDownload(doc, false)}
                         className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-maroon/5 rounded-lg cursor-pointer"
                         title="Download PDF"
                       >
                          {isProcessing === doc.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="w-4 h-4" />}
                       </button>
                       {userRole === 'admin' && (
                         <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                              }}
                              className={cn(
                                "p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg cursor-pointer",
                                activeMenuId === doc.id ? "bg-slate-100 text-slate-900" : "hover:bg-slate-100"
                              )}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeMenuId === doc.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                  {(['PRINTED', 'NOTARISED', 'SCANNED', 'STORED'] as DocumentStatus[]).map(s => (
                                    <button 
                                      key={s}
                                      onClick={() => {
                                        onStatusUpdate(doc.id, s);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-maroon/5 hover:text-primary text-slate-500 transition-colors cursor-pointer"
                                    >
                                      Mark as {s}
                                    </button>
                                  ))}
                                  <div className="border-t border-slate-100">
                                     <button 
                                       onClick={() => {
                                          onDelete(doc.id);
                                          setActiveMenuId(null);
                                       }}
                                       className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 text-red-500 transition-colors cursor-pointer"
                                     >
                                       Delete Entry
                                     </button>
                                  </div>
                                </div>
                              </>
                            )}
                         </div>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                       <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">No documents found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
