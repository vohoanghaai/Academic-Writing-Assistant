import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Loader2, Globe, AlertCircle, Link as LinkIcon, ChevronRight, FileText, ExternalLink, ShieldCheck, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const scanModes = [
  { id: 'quick', label: 'Quick Scan', desc: 'Checks internal database and common academic templates only. Fast and secure.' },
  { id: 'web', label: 'Web Scan', desc: 'Actively searches 20-30 live web sources for exact and fuzzy matches. Highly recommended.' },
  { id: 'deep', label: 'Deep Scan', desc: 'AI-driven semantic analysis and cross-lingual translation checks. Deepest check.' },
];

export default function Plagiarism() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('web');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setText(data.text);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      alert('Error uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScan = async () => {
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/plagiarism-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, scanDepth: mode }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plagiarism & Similarity Checker</h1>
          <p className="text-slate-500 text-sm">Verify originality with multi-layered scans across internal databases and the live web.</p>
        </div>
        <div className="flex gap-2">
          {text && (
            <button 
              onClick={() => setText('')}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Editor & Scan Config */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Privacy-First Plagiarism Scan</span>
            <span className="text-[10px] text-indigo-400 font-medium ml-auto">Your text is scanned against the web but never stored.</span>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden border-t-8 border-t-indigo-500">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-wrap gap-4 items-center">
              <div className="flex gap-2">
                {scanModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      mode === m.id 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 font-medium ml-auto max-w-sm text-right leading-tight">
                {scanModes.find(m => m.id === mode)?.desc}
              </div>
            </div>

            <textarea
              className="w-full h-[500px] p-8 outline-none resize-none text-lg leading-relaxed text-slate-800 placeholder:text-slate-300"
              placeholder="Paste your original work here to check for similarity..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Globe className="w-4 h-4" />
                Live Web Index Active
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf,.docx,.txt" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Upload Document (.pdf, .docx, .txt)"
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm w-full md:w-auto"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  Upload
                </button>
                <button
                  disabled={loading || !text}
                  onClick={handleScan}
                  className="bg-indigo-600 hover:bg-slate-900 text-white px-10 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 text-sm w-full md:w-auto"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
                  Run Full Originality Scan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <div className="h-96 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Scan results will appear here after analysis.</p>
              </div>
            )}

            {loading && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                    <motion.circle 
                      cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray="376.99"
                      initial={{ strokeDashoffset: 376.99 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-indigo-600"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-8 h-8 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Cross-referencing Sources</h3>
                  <div className="text-slate-400 text-xs font-mono space-y-1">
                    <p className="animate-pulse">Searching 30+ web indexes...</p>
                    <p className="animate-pulse delay-75">Analyzing fuzzy patterns...</p>
                    <p className="animate-pulse delay-150">Checking semantic similarity...</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Result Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700">Similarity Report</h3>
                    <div className={`px-4 py-1 rounded-full text-xs font-bold border ${result.overallSimilarity > 20 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {result.overallSimilarity > 20 ? 'Action Recommended' : 'Low Risk'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-red-50 rounded-2xl">
                      <div className="text-xl font-black text-red-600">{result.exactMatch}%</div>
                      <div className="text-[10px] uppercase font-bold text-red-400 mt-1 leading-tight">Exact</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-2xl">
                      <div className="text-xl font-black text-orange-600">{result.fuzzyMatch}%</div>
                      <div className="text-[10px] uppercase font-bold text-orange-400 mt-1 leading-tight">Fuzzy</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-2xl">
                      <div className="text-xl font-black text-purple-600">{result.semanticMatch}%</div>
                      <div className="text-[10px] uppercase font-bold text-purple-400 mt-1 leading-tight">Semantic</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matched Sources</h4>
                    <div className="space-y-3">
                      {result.sources?.map((s: any, i: number) => (
                        <div key={i} className="group p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="text-xs font-bold text-slate-700 line-clamp-1">{s.title}</h5>
                            <span className="text-[10px] font-black text-indigo-500">{s.percentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                            <span className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {new URL(s.url).hostname}
                            </span>
                            <ExternalLink className="w-3 h-3 group-hover:text-indigo-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {result.overallSimilarity > 20 && (
                  <button 
                    onClick={() => navigate('/paraphrase', { state: { text } })}
                    className="w-full bg-slate-900 group hover:bg-indigo-600 text-white p-5 rounded-3xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-indigo-400" />
                    Paraphrase Significant Matches
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
