import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Loader2, Copy, Download, RefreshCw, Check, Library, Info, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';
import LoadingIndicator from '../components/LoadingIndicator';
import { useLocation, useNavigate } from 'react-router-dom';

const modes = [
  { id: 'Standard', label: 'Standard' },
  { id: 'Academic', label: 'Academic Rigor' },
  { id: 'Shorter', label: 'Concise' },
  { id: 'Detailed', label: 'Elaborate' },
  { id: 'Vietnamese', label: 'Vietnamese Style' },
];

import { getShortErrorCode } from '../utils/errorMapping';

import { useLanguage } from '../contexts/LanguageContext';

export default function Paraphrase() {
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [mode, setMode] = useState('Academic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleParaphrase = async () => {
    if (!text || text.length < 50) {
      setError(lang === 'vi' ? 'Vui lòng nhập tối thiểu 50 ký tự.' : 'Please enter at least 50 characters.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      const code = getShortErrorCode(err);
      setError(lang === 'vi' ? `Lỗi: ${code}. Vui lòng thử lại sau.` : `Error: ${code}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result?.paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Responsible Paraphrasing</h1>
        <p className="text-slate-500 text-sm">Rewrite ideas in your own words while maintaining proper citation cues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {/* Banner */}
        <div className="lg:row-start-1 lg:col-start-1">
          <div className="flex items-center gap-2 px-6 py-3 bg-orange-50 border border-orange-100 rounded-2xl w-full">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Ethical Paraphrasing</span>
            <span className="text-[10px] text-orange-400 font-medium ml-auto">Privacy-Safe Redrafting.</span>
          </div>
        </div>

        {/* Input */}
        <div className="lg:row-start-2 lg:col-start-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-0 border-t-8 border-t-orange-500">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-wrap gap-2 items-center">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    mode === m.id 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="relative group focus-within:ring-4 focus-within:ring-indigo-100 transition-all rounded-b-[2.5rem]">
              <textarea
                className="w-full h-[500px] p-8 pb-28 outline-none resize-none text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 bg-transparent"
                placeholder="Paste text to paraphrase responsibly..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {/* Gradient Fade Overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-[2.5rem]"></div>

              <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-slate-200 shadow-sm">
                <span className="text-slate-400 text-sm font-medium pl-4">{text.length} characters</span>
                <button
                  disabled={loading || !text}
                  onClick={handleParaphrase}
                  className="bg-indigo-600 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95 text-sm"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Library className="w-5 h-5" />}
                  Paraphrase Document
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium mt-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="lg:row-start-2 lg:col-start-2">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <div className="h-full border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Type className="w-12 h-12 mb-4 opacity-10" />
                <p>Improved version will be generated here.</p>
              </div>
            )}

            {loading && (
              <div className="h-full bg-white border border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-6 shadow-sm">
                <LoadingIndicator />
                <p className="text-slate-600 font-medium">Restructuring your argument...</p>
              </div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <span className="font-bold text-slate-600 text-sm">Enhanced Version</span>
                  <div className="flex gap-2">
                    <button onClick={copyToClipboard} className="p-2 hover:bg-white rounded-lg transition-colors" title="Copy">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Download">
                      <Download className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{result.paraphrasedText}</p>
                </div>

                <div className="p-6 bg-indigo-50/50 border-t border-indigo-100 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-2xl shadow-sm border border-indigo-100">
                    <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-indigo-600 uppercase">System Intelligence Report</p>
                      <p className="text-sm text-slate-600 leading-snug">{result.explanation}</p>
                    </div>
                  </div>

                  {result.citationWarnings?.length > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                      <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-red-600 uppercase">Citation Compliance Required</p>
                        <ul className="text-xs text-red-700/80 space-y-1 list-disc list-inside">
                          {result.citationWarnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => navigate('/plagiarism', { state: { text: result.paraphrasedText } })}
                    className="w-full bg-white border border-indigo-200 text-indigo-600 py-3 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Similarity Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
