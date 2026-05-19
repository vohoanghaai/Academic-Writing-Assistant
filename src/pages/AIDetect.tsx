import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIDetect() {
  const [text, setText] = useState('');
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
      // clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!text || text.length < 50) {
      alert('Please enter at least 50 characters for a meaningful analysis.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Medium': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Content Detector</h1>
          <p className="text-slate-500 text-sm">Analyze patterns, perplexity, and burstiness to estimate AI involvement.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setText('')}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors border border-transparent rounded-xl hover:bg-slate-50"
            title="Clear Text"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Privacy Mode: Non-Storing Scan</span>
            <span className="text-[10px] text-indigo-400 font-medium ml-auto">Data is processed in-memory and not used for AI training.</span>
          </div>
          <div className="relative group">
            <textarea
              className="w-full h-[500px] p-6 rounded-3xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none text-lg leading-relaxed font-sans"
              placeholder="Paste your academic text here (min 50 characters)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              <span className="text-slate-400 text-sm font-medium">{text.length} characters</span>
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
                title="Upload PDF, DOCX, or TXT"
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 disabled:opacity-50 px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                Upload
              </button>
              <button
                disabled={loading}
                onClick={handleAnalyze}
                className="bg-indigo-600 hover:bg-white border hover:border-indigo-600 hover:text-indigo-600 disabled:opacity-50 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Analyze Text
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Results */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="h-full border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/50"
              >
                <div className="bg-slate-100 p-4 rounded-full">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-600">Ready for Analysis</h3>
                <p className="text-slate-400 text-sm">Enter your text and click analyze to see detailed AI-probability scores.</p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="h-full bg-white border border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center space-y-6 shadow-sm"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Analyzing Sentences</h3>
                  <div className="space-y-2">
                    <div className="h-1.5 w-48 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="h-full w-full bg-indigo-500"
                      />
                    </div>
                    <p className="text-slate-400 text-xs animate-pulse">Checking perplexity & burstiness...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Score Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Analysis Result</h3>
                    <div className={`px-4 py-1 rounded-full text-xs font-bold border ${getRiskColor(result.riskLevel)}`}>
                      {result.riskLevel} Risk
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-indigo-50 rounded-2xl">
                      <div className="text-3xl font-black text-indigo-600">{result.humanScore}%</div>
                      <div className="text-[10px] uppercase font-bold text-indigo-400 mt-1">Human</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-2xl">
                      <div className="text-3xl font-black text-slate-700">{result.aiScore}%</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">AI Gen</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Confidence Level</span>
                      <span className="font-bold text-indigo-600">{result.confidence}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Markers */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Detection Markers
                  </h4>
                  <div className="space-y-3">
                    {result.segments?.map((s: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-400 italic mb-2 line-clamp-1">"{s.text}"</p>
                        <p className="text-sm font-medium text-slate-700">{s.reason}</p>
                      </div>
                    ))}
                    {(!result.segments || result.segments.length === 0) && (
                      <div className="text-center py-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No abnormal AI patterns detected.</p>
                      </div>
                    )}
                  </div>
                </div>

                {result.aiScore > 40 && (
                  <button 
                    onClick={() => navigate('/humanize', { state: { text } })}
                    className="w-full group bg-slate-900 hover:bg-indigo-600 text-white p-5 rounded-3xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg"
                  >
                    <ShieldCheck className="w-5 h-5 group-hover:animate-bounce" />
                    Try Humanize Text
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
