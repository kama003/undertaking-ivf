import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, Lock, ShieldCheck, ShieldAlert, ChevronDown, Check, Loader2, Plus, X } from 'lucide-react';
import { SalesRecord, SalesMonth, UndertakingData } from '../types';
import { firebaseService } from '../services/firebaseService';

interface SalesManagerProps {
  userRole: 'admin' | 'viewer';
  undertakings: UndertakingData[];
}

export default function SalesManager({ userRole, undertakings }: SalesManagerProps) {
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [monthStatus, setMonthStatus] = useState<SalesMonth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchMonthData = useCallback(async (month: string) => {
    setIsLoading(true);
    try {
      const fetchedRecords = await firebaseService.fetchSalesRecords(month);
      const fetchedStatus = await firebaseService.fetchSalesMonthStatus(month);
      setRecords(fetchedRecords);
      setMonthStatus(fetchedStatus);
    } catch (error) {
      console.error("Failed to load sales data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth, fetchMonthData]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (userRole === 'viewer') {
      alert("Viewers cannot upload sales data.");
      return;
    }
    if (monthStatus?.isLocked) {
      alert("This month is locked and cannot be modified.");
      return;
    }
    
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const data = await parseFile(file);
      if (data.length === 0) {
        alert("No valid data found in file.");
        return;
      }

      const newRecords: SalesRecord[] = data.map((rawRow: any, index: number) => {
        const row: any = {};
        for (const key in rawRow) {
          row[key.replace(/\s+/g, ' ').trim().toLowerCase()] = rawRow[key];
        }

        return {
          id: `${currentMonth}_${String(row['donor number (uhid)'] || row['donor number'] || row['uhid'] || index).replace(/\//g, '-')}_${Date.now()}_${index}`,
          monthKey: currentMonth,
          uhid: String(row['donor number (uhid)'] || row['donor number'] || row['uhid'] || ''),
          dateIssued: row['date issued'] || row['date'] || new Date().toISOString().split('T')[0],
          serialNumber: row['serial number'] || '',
          batchNo: row['batch no'] || '',
          vialsIssued: row['vials issued'] || 0,
          artClinic: row['art clinic'] || ''
        };
      });

      await firebaseService.mergeSalesRecords(newRecords);
      
      // Merge locally for immediate feedback
      setRecords(prev => [...newRecords, ...prev]);
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to process file.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentMonth, monthStatus, userRole]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDrop as any,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    disabled: !!(isProcessing || monthStatus?.isLocked || userRole === 'viewer')
  } as any);


  const handleLock = async () => {
    if (userRole === 'viewer') return;
    if (window.confirm(`Are you sure you want to lock ${currentMonth}? No further uploads will be allowed.`)) {
      setIsProcessing(true);
      try {
        await firebaseService.lockSalesMonth(currentMonth);
        setMonthStatus(prev => prev ? { ...prev, isLocked: true } : { monthKey: currentMonth, isLocked: true, updatedAt: new Date().toISOString() });
      } catch (error) {
        alert("Failed to lock month.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          resolve(json);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    dateIssued: '', serialNumber: '', uhid: '', batchNo: '', vialsIssued: '', artClinic: ''
  });

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.uhid || !manualForm.dateIssued) {
      alert("UHID and Date Issued are required");
      return;
    }
    
    setIsProcessing(true);
    try {
      const newRecord: SalesRecord = {
        id: `${currentMonth}_${String(manualForm.uhid).replace(/\//g, '-')}_${Date.now()}`,
        monthKey: currentMonth,
        uhid: manualForm.uhid,
        dateIssued: manualForm.dateIssued,
        serialNumber: manualForm.serialNumber,
        batchNo: manualForm.batchNo,
        vialsIssued: manualForm.vialsIssued,
        artClinic: manualForm.artClinic
      };

      await firebaseService.mergeSalesRecords([newRecord]);
      setRecords(prev => [newRecord, ...prev]);
      setIsAddingManual(false);
      setManualForm({ dateIssued: '', serialNumber: '', uhid: '', batchNo: '', vialsIssued: '', artClinic: '' });
    } catch (error) {
      alert("Failed to add record manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to determine if a UHID is notarized
  const isNotarized = (uhid: string) => {
    const undertaking = undertakings.find(u => u.uhid === uhid);
    return undertaking?.status === 'NOTARISED';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales & Notary Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Upload monthly sales and track notarization status</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
          />
          
          {userRole === 'admin' && (
            <button
              onClick={handleLock}
              disabled={monthStatus?.isLocked || isProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                monthStatus?.isLocked 
                  ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-sm cursor-pointer'
              }`}
            >
              <Lock className="w-4 h-4" />
              {monthStatus?.isLocked ? 'Locked' : 'Lock Month'}
            </button>
          )}
        </div>
      </div>

      {!monthStatus?.isLocked && userRole === 'admin' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-primary/50 cursor-pointer'
          } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
          <p className="text-slate-700 font-medium mb-1">
            {isProcessing ? 'Processing upload...' : 'Drag & drop sales file here'}
          </p>
          <p className="text-slate-500 text-sm">
            Supports CSV, XLS, XLSX. Columns: DATE ISSUED, SERIAL NUMBER, DONOR NUMBER, BATCH NO, VIALS ISSUED, ART CLINIC.
          </p>
        </div>
      )}

      {monthStatus?.isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-800">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500" />
            <p className="font-medium text-sm">This month is locked for bulk uploads. You can still manually add records.</p>
          </div>
          {userRole === 'admin' && (
            <button
              onClick={() => setIsAddingManual(true)}
              className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          )}
        </div>
      )}

      {!monthStatus?.isLocked && userRole === 'admin' && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAddingManual(true)}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Record Manually
          </button>
        </div>
      )}

      {isAddingManual && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add Sales Record Manually</h2>
              <button onClick={() => setIsAddingManual(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Donor Number (UHID)*</label>
                  <input required value={manualForm.uhid} onChange={e => setManualForm({...manualForm, uhid: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="e.g. D12345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Issued*</label>
                  <input required type="date" value={manualForm.dateIssued} onChange={e => setManualForm({...manualForm, dateIssued: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                  <input value={manualForm.serialNumber} onChange={e => setManualForm({...manualForm, serialNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch No</label>
                  <input value={manualForm.batchNo} onChange={e => setManualForm({...manualForm, batchNo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vials Issued</label>
                  <input type="number" value={manualForm.vialsIssued} onChange={e => setManualForm({...manualForm, vialsIssued: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ART Clinic</label>
                  <input value={manualForm.artClinic} onChange={e => setManualForm({...manualForm, artClinic: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddingManual(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date Issued</th>
                <th className="px-6 py-4">Serial Number</th>
                <th className="px-6 py-4">Donor Number (UHID)</th>
                <th className="px-6 py-4">Batch No</th>
                <th className="px-6 py-4">Vials Issued</th>
                <th className="px-6 py-4">ART Clinic</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No sales records found for this month.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const notarized = isNotarized(record.uhid);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{record.dateIssued}</td>
                      <td className="px-6 py-4 text-slate-600">{record.serialNumber || '-'}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{record.uhid}</td>
                      <td className="px-6 py-4 text-slate-600">{record.batchNo || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{record.vialsIssued || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{record.artClinic || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          notarized 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {notarized ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {notarized ? 'Notarized' : 'Not Notarized'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
