import React from 'react';
import { motion } from 'motion/react';
import { FileCheck, FileClock, Printer, Scan, FileArchive, Activity, TrendingUp } from 'lucide-react';
import { UndertakingData } from '../types';
import { cn } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';

interface DashboardProps {
  documents: UndertakingData[];
}

export default function Dashboard({ documents }: DashboardProps) {
  const stats = [
    { label: 'Generated', value: documents.filter(d => d.status === 'GENERATED').length, icon: FileClock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Printed', value: documents.filter(d => d.status === 'PRINTED').length, icon: Printer, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Notarised', value: documents.filter(d => d.status === 'NOTARISED').length, icon: FileCheck, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Scanned', value: documents.filter(d => d.status === 'SCANNED').length, icon: Scan, color: 'text-primary', bg: 'bg-maroon/5' },
    { label: 'Stored', value: documents.filter(d => d.status === 'STORED').length, icon: FileArchive, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  const chartData = [
    { name: 'Generated', value: documents.filter(d => d.status === 'GENERATED').length },
    { name: 'Printed', value: documents.filter(d => d.status === 'PRINTED').length },
    { name: 'Notarised', value: documents.filter(d => d.status === 'NOTARISED').length },
    { name: 'Scanned', value: documents.filter(d => d.status === 'SCANNED').length },
    { name: 'Stored', value: documents.filter(d => d.status === 'STORED').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3B82F6', '#F59E0B', '#A855F7', '#7A2021', '#10B981'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Overview</h2>
          <p className="text-slate-500 text-sm">Real-time status of your undertaking lifecycle.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-100 shadow-sm">
          <Activity className="w-3.5 h-3.5" />
          System Live
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Lifecycle Distribution</h3>
             <TrendingUp className="w-5 h-5 text-slate-300" />
          </div>
          <div className="h-[300px]">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartData}
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {chartData.map((_entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   />
                   <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <FileArchive className="w-8 h-8" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No data to visualize yet</p>
               </div>
             )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Activity Volume</h3>
             <Activity className="w-5 h-5 text-slate-300" />
          </div>
          <div className="h-[300px]">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   />
                   <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                     {chartData.map((_entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Add entries to see trends</p>
               </div>
             )}
          </div>
        </div>
      </div>
      
      <div className="bg-primary p-12 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20 mt-8">
        <div className="relative z-10 max-w-xl">
          <h3 className="text-3xl font-black mb-4 uppercase tracking-tight">Automated Bifurcation</h3>
          <p className="text-maroon/20 text-lg leading-relaxed mb-8 font-medium">
            Our intelligent scanning system automatically splits bulk PDF scans and identifies documents via encrypted QR codes. 
            Experience zero-effort document management.
          </p>
          <button className="px-8 py-4 bg-white text-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-black/10">
            Learn More
          </button>
        </div>
        <div className="absolute -right-12 -bottom-12 opacity-10">
           <FileArchive className="w-96 h-96" />
        </div>
      </div>
    </div>
  );
}
