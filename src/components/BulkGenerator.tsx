import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, FileText, Plus, Trash2, Loader2, QrCode, FileCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { UndertakingData } from '../types';
import { generateUndertakingPDF, mergePDFs } from '../services/pdfService';
import { cn } from '../lib/utils';
import ReactDOMServer from 'react-dom/server';

interface BulkGeneratorProps {
  onGenerated: (docs: UndertakingData[]) => void;
}

export default function BulkGenerator({ onGenerated }: BulkGeneratorProps) {
  const [data, setData] = useState<Partial<UndertakingData>[]>([]);
  const [useDetailedFormat, setUseDetailedFormat] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws);
      
      const mapped = json.map((row: any) => ({
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        uhid: row.UHID || row.uhid || '',
        hospitalName: row.Hospital || row['Hospital Name'] || '',
        wifeName: row.Wife || row['Wife Name'] || '',
        husbandName: row.Husband || row['Husband Name'] || '',
        wifeAadhar: row.WifeAadhar || row['Wife Aadhar'] || '',
        husbandAadhar: row.HusbandAadhar || row['Husband Aadhar'] || '',
        status: 'GENERATED' as const,
        useDetailedFormat: useDetailedFormat,
        generatedDate: new Date().toLocaleDateString('en-IN'),
      }));
      setData(mapped);
    };
    reader.readAsBinaryString(file);
  };

  const addRow = () => {
    setData([...data, {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      uhid: '',
      hospitalName: '',
      status: 'GENERATED',
      useDetailedFormat: useDetailedFormat,
      generatedDate: new Date().toLocaleDateString('en-IN'),
    }]);
  };

  const removeRow = (index: number) => {
    setData(data.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const handleGenerate = async () => {
    if (data.length === 0) return;
    setIsProcessing(true);
    try {
      const generatedDocs: UndertakingData[] = [];
      const pdfBlobs: Blob[] = [];
      
      for (const item of data) {
        if (!item.uhid || !item.hospitalName) continue;
        
        const docData = item as UndertakingData;
        docData.useDetailedFormat = useDetailedFormat;
        
        const qrContainer = document.createElement('div');
        const qrSvg = (
          <QRCodeSVG 
            value={docData.uhid} 
            size={128}
            level="H" 
            includeMargin={true}
          />
        );
        qrContainer.innerHTML = ReactDOMServer.renderToString(qrSvg);
        const svg = qrContainer.querySelector('svg');
        const xml = new XMLSerializer().serializeToString(svg!);
        const svg64 = btoa(xml);
        const b64Start = 'data:image/svg+xml;base64,';
        const image64 = b64Start + svg64;

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
        const blob = await generateUndertakingPDF(docData, qrPng);
        pdfBlobs.push(blob);
        generatedDocs.push(docData);
      }

      if (pdfBlobs.length > 0) {
        // Merge all PDFs for bulk printing
        const finalPdfBlob = pdfBlobs.length === 1 ? pdfBlobs[0] : await mergePDFs(pdfBlobs);
        const url = URL.createObjectURL(finalPdfBlob);
        
        // Open in new tab AND trigger download for reliability
        window.open(url, '_blank');
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `RK_Biotech_Bulk_Undertakings_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      onGenerated(generatedDocs);
      setIsProcessing(false);
      setData([]);
      
      if (generatedDocs.length > 1) {
        alert(`Successfully generated ${generatedDocs.length} undertakings in a single combined PDF for easy bulk printing.`);
      }
    } catch (error) {
      console.error(error);
      alert('Error generating PDFs');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bulk Generator</h2>
          <p className="text-slate-500">Generate print-ready undertakings from manual entry or Excel.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button 
              onClick={() => {
                const csvRows = [
                  ['UHID', 'Hospital Name', 'Wife Name', 'Husband Name', 'Wife Aadhar', 'Husband Aadhar'],
                  ['O/12345', 'Sunrise Fertility', 'Jane Doe', 'John Doe', '1234-5678-9012', '9876-5432-1098'],
                  ['O/67890', 'Hope IVF', '', '', '', '']
                ];
                const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "sample_undertakings.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-white hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
            >
              Sample CSV
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setUseDetailedFormat(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                !useDetailedFormat ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Basic
            </button>
            <button 
              onClick={() => setUseDetailedFormat(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                useDetailedFormat ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Detailed (Couple Info)
            </button>
          </div>
          
          <label className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm cursor-pointer hover:opacity-90 transition-colors">
            <Upload className="w-4 h-4" />
            Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital Name</th>
                {useDetailedFormat && (
                  <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Wife Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Wife Aadhar</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Husband Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Husband Aadhar</th>
                  </>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={row.uhid} 
                      onChange={(e) => updateRow(index, 'uhid', e.target.value)}
                      placeholder="e.g. O/12345"
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={row.hospitalName} 
                      onChange={(e) => updateRow(index, 'hospitalName', e.target.value)}
                      placeholder="e.g. City IVF Center"
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm p-0 text-slate-600 placeholder:text-slate-300"
                    />
                  </td>
                  {useDetailedFormat && (
                    <>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={row.wifeName} 
                          onChange={(e) => updateRow(index, 'wifeName', e.target.value)}
                          placeholder="Name"
                          className="w-full bg-transparent border-0 focus:ring-0 text-xs p-0 block"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={row.wifeAadhar} 
                          onChange={(e) => updateRow(index, 'wifeAadhar', e.target.value)}
                          placeholder="Aadhar No"
                          className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-500 p-0 block"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={row.husbandName} 
                          onChange={(e) => updateRow(index, 'husbandName', e.target.value)}
                          placeholder="Name"
                          className="w-full bg-transparent border-0 focus:ring-0 text-xs p-0 block"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={row.husbandAadhar} 
                          onChange={(e) => updateRow(index, 'husbandAadhar', e.target.value)}
                          placeholder="Aadhar No"
                          className="w-full bg-transparent border-0 focus:ring-0 text-xs text-slate-500 p-0 block"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => removeRow(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 text-slate-300 rounded-full mb-4">
              <QrCode className="w-8 h-8" />
            </div>
            <p className="text-slate-500 text-sm">No data entries yet. Click "Add Entry" or upload an Excel file.</p>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-white rounded-lg text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
          
          <button 
            disabled={data.length === 0 || isProcessing}
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shadow-lg shadow-primary/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate & Prepare for Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
