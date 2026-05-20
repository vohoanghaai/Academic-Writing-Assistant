import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileText, ChevronRight, Download, Eye, ExternalLink, Calendar, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        setReports(data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const clearHistory = async () => {
    if (confirm('Are you sure you want to delete all reports? This action cannot be undone and data is not stored on our servers.')) {
      await fetch('/api/reports', { method: 'DELETE' });
      setReports([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
          <p className="text-slate-500 text-sm">Session-only reports. Data is never used for AI training.</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={clearHistory}
            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest bg-red-50 px-4 py-2 rounded-xl"
          >
            Clear Session History
          </button>
          <div className="hidden sm:block">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search reports..."
               className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-64"
             />
           </div>
        </div>
      </div>
    </div>

    {loading ? (
        <div className="flex justify-center py-24">
          <LoadingIndicator />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-24 text-center border border-slate-100 shadow-sm flex flex-col items-center space-y-6">
          <div className="p-6 bg-slate-50 rounded-full">
            <History className="w-12 h-12 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-700">No Reports Yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Your analysis history will appear here once you start checking documents.</p>
          </div>
          <Link to="/ai-detect" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-all">
            Start Your First Check
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <motion.div
              layout
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-indigo-500" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate mb-1">{report.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.date).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-50 rounded italic">
                    ID: {report.id.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full sm:w-auto">
                <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-10">
                   <div className="text-center">
                     <div className={`text-sm font-black ${report.overallSimilarity > 20 ? 'text-red-500' : 'text-green-500'}`}>{report.overallSimilarity}%</div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Similarity</div>
                   </div>
                   <div className="text-center">
                     <div className="text-sm font-black text-slate-700">{report.exactMatch}%</div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Exact</div>
                   </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-2 text-sm font-bold px-4">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
