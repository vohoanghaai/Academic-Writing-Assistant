import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Loader2, Globe, AlertCircle, Link as LinkIcon, ChevronRight, FileText, ExternalLink, ShieldCheck, Upload, Trash2 } from 'lucide-react';
import LoadingIndicator from '../components/LoadingIndicator';
import { useNavigate, useLocation } from 'react-router-dom';

const scanModes = [
  { id: 'quick', label: 'Quick Scan', desc: 'Checks internal database and common academic templates only. Fast and secure.' },
  { id: 'deep', label: 'Deep Scan', desc: 'AI-driven semantic analysis and cross-lingual translation checks. Deepest check.' },
];

import { getShortErrorCode } from '../utils/errorMapping';

import { useLanguage } from '../contexts/LanguageContext';

export default function Plagiarism() {
  const { lang } = useLanguage();
  const [text, setText] = useState('');
  const [mode, setMode] = useState('deep');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
      handleScan(location.state.text);
      // Clear state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
        setError('');
      } else {
        setError(data.error || (lang === 'vi' ? 'Tải tệp lên thất bại' : 'Upload failed'));
      }
    } catch (error) {
      console.error(error);
      setError(lang === 'vi' ? 'Lỗi khi tải tệp lên' : 'Error uploading file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScan = async (textContent?: string | React.MouseEvent) => {
    const textToAnalyze = typeof textContent === 'string' ? textContent : text;
    if (!textToAnalyze || textToAnalyze.length < 50) {
      setError(lang === 'vi' ? 'Vui lòng nhập tối thiểu 50 ký tự.' : 'Please enter at least 50 characters.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    // Smart chunking by sentences (approx 8000 chars per chunk)
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = textToAnalyze.match(/[^.!?]+[.!?]+/g) || [textToAnalyze];
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 8000 && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += sentence;
    }
    if (currentChunk) chunks.push(currentChunk);

    setProgress({ current: 0, total: chunks.length });

    try {
      let totalSimilarity = 0;
      let totalExact = 0;
      let totalFuzzy = 0;
      let totalSemantic = 0;
      let totalLengthProcessed = 0;
      
      const allSourcesMap = new Map();
      const allHighlights: any[] = [];
      let combinedExplanation = '';

      for (let i = 0; i < chunks.length; i++) {
        setProgress({ current: i + 1, total: chunks.length });
        const res = await fetch('/api/plagiarism-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunks[i], scanDepth: mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'API failed');
        }

        if (data && typeof data.overallSimilarity === 'number') {
          const chunkLen = chunks[i].length;
          totalLengthProcessed += chunkLen;
          totalSimilarity += (data.overallSimilarity * chunkLen);
          totalExact += ((data.exactMatch || 0) * chunkLen);
          totalFuzzy += ((data.fuzzyMatch || 0) * chunkLen);
          totalSemantic += ((data.semanticMatch || 0) * chunkLen);
        }

        if (data.highlights) {
          allHighlights.push(...data.highlights);
        }

        if (data.sources) {
          data.sources.forEach((s: any) => {
            const key = s.url || s.title;
            if (allSourcesMap.has(key)) {
               const existing = allSourcesMap.get(key);
               existing.percentage = Math.max(existing.percentage, s.percentage);
            } else {
               allSourcesMap.set(key, s);
            }
          });
        }
        
        if (i === 0 && data.explanation) {
          combinedExplanation = data.explanation;
        }
      }

      const avgSimilarity = totalLengthProcessed > 0 ? Math.round(totalSimilarity / totalLengthProcessed) : 0;
      const avgExact = totalLengthProcessed > 0 ? Math.round(totalExact / totalLengthProcessed) : 0;
      const avgFuzzy = totalLengthProcessed > 0 ? Math.round(totalFuzzy / totalLengthProcessed) : 0;
      const avgSemantic = totalLengthProcessed > 0 ? Math.round(totalSemantic / totalLengthProcessed) : 0;
      const combinedSources = Array.from(allSourcesMap.values()).sort((a: any, b: any) => b.percentage - a.percentage);

      setResult({
        overallSimilarity: avgSimilarity,
        exactMatch: avgExact,
        fuzzyMatch: avgFuzzy,
        semanticMatch: avgSemantic,
        sources: combinedSources,
        highlights: allHighlights,
        explanation: chunks.length > 1 ? combinedExplanation + ' (Averaged across multiple segments)' : combinedExplanation
      });
    } catch (err: any) {
      console.error(err);
      const code = getShortErrorCode(err);
      setError(lang === 'vi' ? `Lỗi: ${code}. Vui lòng thử lại sau.` : `Error: ${code}. Please try again later.`);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plagiarism & Similarity Checker</h1>
          <p className="text-slate-500 text-sm">Verify originality with multi-layered scans across internal databases and advanced semantic analysis.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-x-8 gap-y-4">
        {/* Banner */}
        <div className="xl:col-span-8 xl:row-start-1 xl:col-start-1">
          <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl w-full">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Privacy-First Plagiarism Scan</span>
            <span className="text-[10px] text-indigo-400 font-medium ml-auto">Your text is scanned securely but never stored.</span>
          </div>
        </div>

        {/* Editor & Scan Config */}
        <div className="xl:col-span-8 xl:row-start-2 xl:col-start-1 space-y-4">
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

            <div className="relative group focus-within:ring-4 focus-within:ring-indigo-100 transition-all rounded-b-[2.5rem]">
              <textarea
                className="w-full h-[500px] p-8 pb-28 outline-none resize-none text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 bg-transparent"
                placeholder="Paste your original work here to check for similarity..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {/* Gradient Fade Overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-[2.5rem]"></div>

              <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-slate-200 shadow-sm">
                <span className="text-slate-400 text-sm font-medium pl-4">{text.length} characters</span>
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
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  Upload
                </button>
                <button
                  disabled={loading || !text}
                  onClick={handleScan}
                  className="bg-indigo-600 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95 text-sm"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
                  Run Full Originality Scan
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium mt-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Results Sidebar */}
        <div className="xl:col-span-4 xl:row-start-2 xl:col-start-9 space-y-6 sticky top-24 h-fit">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <div className="h-96 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Scan results will appear here after analysis.</p>
              </div>
            )}

            {loading && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 text-center flex flex-col items-center">
                <LoadingIndicator />
                <div className="space-y-2 w-full">
                  <h3 className="font-bold text-lg">Cross-referencing Sources</h3>
                  {progress.total > 1 && (
                    <p className="text-sm font-bold text-indigo-600 mb-2">
                       Processing Part {progress.current} of {progress.total}
                    </p>
                  )}
                  <div className="text-slate-400 text-xs font-mono space-y-1">
                    <p className="animate-pulse">Checking exact patterns...</p>
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
                    <div className={`px-4 py-1 rounded-full text-xs font-bold border ${
                      result.overallSimilarity <= 30 ? 'bg-green-50 text-green-600 border-green-100' : 
                      result.overallSimilarity <= 60 ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {result.overallSimilarity <= 30 ? 'Low Risk' : result.overallSimilarity <= 60 ? 'Moderate' : 'High Risk'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className={`text-center p-3 rounded-2xl ${result.exactMatch > 60 ? 'bg-red-50 text-red-600' : result.exactMatch <= 30 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      <div className="text-xl font-black">{result.exactMatch}%</div>
                      <div className={`text-[10px] uppercase font-bold mt-1 leading-tight ${result.exactMatch > 60 ? 'text-red-400' : result.exactMatch <= 30 ? 'text-green-400' : 'text-blue-400'}`}>Exact</div>
                    </div>
                    <div className={`text-center p-3 rounded-2xl ${result.fuzzyMatch > 60 ? 'bg-red-50 text-red-600' : result.fuzzyMatch <= 30 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      <div className="text-xl font-black">{result.fuzzyMatch}%</div>
                      <div className={`text-[10px] uppercase font-bold mt-1 leading-tight ${result.fuzzyMatch > 60 ? 'text-red-400' : result.fuzzyMatch <= 30 ? 'text-green-400' : 'text-blue-400'}`}>Fuzzy</div>
                    </div>
                    <div className={`text-center p-3 rounded-2xl ${result.semanticMatch > 60 ? 'bg-red-50 text-red-600' : result.semanticMatch <= 30 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      <div className="text-xl font-black">{result.semanticMatch}%</div>
                      <div className={`text-[10px] uppercase font-bold mt-1 leading-tight ${result.semanticMatch > 60 ? 'text-red-400' : result.semanticMatch <= 30 ? 'text-green-400' : 'text-blue-400'}`}>Semantic</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matched Sources</h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
