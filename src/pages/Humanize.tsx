import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRound, Loader2, Copy, Download, RefreshCw, Check, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tones = [
  { id: 'Academic', label: 'Academic (Standard)' },
  { id: 'Professional', label: 'Professional Report' },
  { id: 'NaturalStudent', label: 'Natural Student Writing' },
  { id: 'Formal', label: 'Strictly Formal' },
];

export default function Humanize() {
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [tone, setTone] = useState('Academic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleHumanize = async () => {
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tone }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result?.humanizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Humanize Writing</h1>
        <p className="text-slate-500 text-sm">Refine your text to sound more natural and engaging while keeping academic integrity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {/* Banner */}
        <div className="lg:row-start-1 lg:col-start-1">
          <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl w-full">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Secure Humanizing</span>
            <span className="text-[10px] text-emerald-400 font-medium ml-auto">No logs kept for AI training.</span>
          </div>
        </div>

        {/* Input */}
        <div className="lg:row-start-2 lg:col-start-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    tone === t.id 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <textarea
              className="w-full h-96 p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-100 outline-none resize-none text-slate-800"
              placeholder="Paste text to humanize..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              disabled={loading || !text}
              onClick={handleHumanize}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Humanize Text
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="lg:row-start-2 lg:col-start-2">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <div className="h-full border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <UserRound className="w-12 h-12 mb-4 opacity-20" />
                <p>Humanized version will appear here.</p>
              </div>
            )}

            {loading && (
              <div className="h-full bg-white border border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-6 shadow-sm">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-slate-600 font-medium">Re-drafting your content...</p>
              </div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <span className="font-bold text-slate-600 text-sm">Refined Output</span>
                  <div className="flex gap-2">
                    <button onClick={copyToClipboard} className="p-2 hover:bg-white rounded-lg transition-colors" title="Copy">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Download">
                      <Download className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{result.humanizedText}</p>
                </div>

                {result.warnings?.length > 0 && (
                  <div className="p-6 bg-amber-50 border-t border-amber-100 m-4 rounded-3xl">
                    <h5 className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Academic Advice
                    </h5>
                    <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
                      {result.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-6 bg-indigo-50 flex gap-4">
                  <button 
                    onClick={() => navigate('/ai-detect', { state: { text: result.humanizedText } })}
                    className="flex-1 bg-white border border-indigo-200 text-indigo-600 py-3 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-check AI Score
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
