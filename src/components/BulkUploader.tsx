import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileSearch, ArrowRight, Loader2, CheckCircle2, AlertCircle, FileStack, Download } from 'lucide-react';
import { splitAndRecognizePDF } from '../services/pdfService';
import { UndertakingData, DocumentStatus } from '../types';
import { cn } from '../lib/utils';
import JSZip from 'jszip';

interface BulkUploaderProps {
  onProcessed: (updatedDocs: Partial<UndertakingData>[]) => void;
  existingDocs: UndertakingData[];
}

export default function BulkUploader({ onProcessed, existingDocs }: BulkUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{uhid: string, success: boolean, blob?: Blob}[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setResults([]);
    try {
      const splitResults = await splitAndRecognizePDF(file);
      
      const processedResults = splitResults.map(res => {
        const found = existingDocs.find(d => d.uhid === res.uhid);
        return {
          uhid: res.uhid,
          id: found?.id,
          status: 'STORED' as DocumentStatus,
          success: res.uhid !== 'UNKNOWN',
          blob: res.pageBlob
        };
      });

      setResults(processedResults);
      onProcessed(processedResults);
    } catch (error) {
      console.error(error);
      alert("Error processing PDF. Ensure it's a valid document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    
    const zip = new JSZip();
    results.forEach((res, index) => {
      if (res.blob) {
        // Find existing doc to get hospital name
        const doc = existingDocs.find(d => d.uhid === res.uhid || d.id === res.id);
        const hospitalFolder = doc?.hospitalName || 'Unidentified_Hospital';
        const cleanHospital = hospitalFolder.replace(/[^a-z0-9]/gi, '_').trim();
        
        const fileName = res.success ? `Undertaking_${res.uhid}.pdf` : `Unknown_Doc_${index + 1}.pdf`;
        // Create folder structure: HospitalName/FileName
        zip.folder(cleanHospital)?.file(fileName, res.blob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RK_Biotech_Bifurcated_Docs_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert("ZIP package prepared. Individual PDFs are now organized in folders by Hospital Name.");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 mb-2">Automated Bifurcation</h2>
        <p className="text-slate-500">Upload bulk scanned notarised documents. We'll split and identify each automatically.</p>
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-[2rem] p-12 transition-all duration-300 flex flex-col items-center justify-center text-center bg-white gap-6",
          dragActive ? "border-primary bg-maroon/5 scale-[0.99]" : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="w-20 h-20 bg-maroon/5 text-primary rounded-[1.5rem] flex items-center justify-center">
          {isProcessing ? <Loader2 className="w-10 h-10 animate-spin" /> : <FileStack className="w-10 h-10" />}
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">
            {isProcessing ? "Processing Scanned Pages..." : "Drop Scanned Bulk PDF Here"}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Supported formats: PDF (up to 100MB)
          </p>
          
          {!isProcessing && (
            <label className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm cursor-pointer hover:opacity-90 transition-all shadow-xl shadow-primary/10">
              Select Scanned File
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} 
                className="hidden" 
              />
            </label>
          )}
        </div>

        {isProcessing && (
          <div className="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
             <motion.div 
               initial={{ x: '-100%' }}
               animate={{ x: '100%' }}
               transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
               className="w-full h-full bg-primary"
             />
          </div>
        )}
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bifurcation Results</h3>
                <p className="text-sm text-slate-500">All pages split and identified. Download the package to save locally.</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {results.filter(r => r.success).length} Identified
                </div>
                <button 
                  onClick={handleDownloadZip}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Individually (ZIP)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((res, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    res.success ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                  )}>
                    {res.success ? <FileSearch className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{res.success ? `UHID: ${res.uhid}` : 'Failed to track'}</p>
                    <p className="text-xs text-slate-500">{res.success ? 'Automatically Renamed & Stored' : 'Manual identification required'}</p>
                  </div>
                  {res.success && <ArrowRight className="w-4 h-4 text-slate-300" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
