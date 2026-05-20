import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Upload, Sparkles } from 'lucide-react';
import LoadingIndicator from '../components/LoadingIndicator';
import { useNavigate, useLocation } from 'react-router-dom';

import { getShortErrorCode } from '../utils/errorMapping';

import { useLanguage } from '../contexts/LanguageContext';

export default function AIDetect() {
  const { lang, t } = useLanguage();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizedText, setHumanizedText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
      handleAnalyze(location.state.text);
      // Clear state to prevent loop on reload
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
      // clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (textContent?: string | any) => {
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
      let totalAiScore = 0;
      let totalHumanScore = 0;
      let totalConfidence = 0;
      let totalLengthProcessed = 0;
      const allSegments: any[] = [];
      let overallExplanation = '';

      for (let i = 0; i < chunks.length; i++) {
        setProgress({ current: i + 1, total: chunks.length });
        const res = await fetch('/api/ai-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunks[i] }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'API failed');
        }
        
        if (data && typeof data.aiScore === 'number') {
          const chunkLen = chunks[i].length;
          totalLengthProcessed += chunkLen;
          totalAiScore += (data.aiScore * chunkLen);
          totalHumanScore += ((data.humanScore ?? (100 - data.aiScore)) * chunkLen);
          totalConfidence += ((data.confidence || 0) * chunkLen);
        }

        if (data.segments) {
          allSegments.push(...data.segments);
        }
        if (i === 0 && data.explanation) {
          overallExplanation = data.explanation;
        }
      }

      if (totalLengthProcessed === 0) {
        throw new Error('Analysis failed for all text segments');
      }

      let avgAiScore = Math.round(totalAiScore / totalLengthProcessed);
      let avgHumanScore = Math.round(totalHumanScore / totalLengthProcessed);
      const avgConfidence = Math.round(totalConfidence / totalLengthProcessed);
      
      const sum = avgAiScore + avgHumanScore;
      if (sum > 0) {
        avgAiScore = Math.round((avgAiScore / sum) * 100);
        avgHumanScore = 100 - avgAiScore;
      }

      let riskLevel = 'Low';
      if (avgAiScore > 70) riskLevel = 'High';
      else if (avgAiScore > 40) riskLevel = 'Medium';

      setResult({
        aiScore: avgAiScore,
        humanScore: avgHumanScore,
        confidence: avgConfidence,
        riskLevel,
        segments: allSegments,
        explanation: overallExplanation || 'Analysis complete across large text.'
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  const renderHighlightedText = () => {
    if (!result || !result.segments || result.segments.length === 0) return text;
    
    let parts: React.ReactNode[] = [text];
    result.segments.forEach((segment: any, index: number) => {
      const segText = segment.text;
      if (!segText) return;
      
      const newParts: React.ReactNode[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
           const splitText = part.split(segText);
           splitText.forEach((subPart, i) => {
             newParts.push(subPart);
             if (i < splitText.length - 1) {
               newParts.push(
                 <mark key={`mark-${index}-${i}`} className="bg-red-200 text-slate-900 px-1 rounded">
                   {segText}
                 </mark>
               );
             }
           });
        } else {
           newParts.push(part);
        }
      });
      parts = newParts;
    });
    
    return parts;
  };

  const handleHumanizeSegments = async () => {
     setIsHumanizing(true);
     try {
       const res = await fetch('/api/humanize-segments', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ text, segments: result.segments }),
       });
       const data = await res.json();
       if (data.humanizedText) {
         setHumanizedText(data.humanizedText);
       }
     } catch (e) {
       console.error(e);
       alert('Error humanizing segments');
     } finally {
       setIsHumanizing(false);
     }
  };

  const handleReCheck = () => {
    const newText = humanizedText;
    setText(newText);
    setHumanizedText('');
    setResult(null);
    handleAnalyze(newText);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-4">
        {/* Banner */}
        <div className="lg:col-span-2 lg:row-start-1 lg:col-start-1">
          <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl w-full">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{t('privacyMode')}</span>
            <span className="text-[10px] text-indigo-400 font-medium ml-auto hidden sm:block">{t('privacyModeDesc')}</span>
          </div>
        </div>

        {/* Input area */}
        <div className="lg:col-span-2 lg:row-start-2 lg:col-start-1 space-y-4">
          <div className="relative group rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
            <textarea
              className="w-full h-[500px] p-6 pb-28 outline-none resize-none text-lg leading-relaxed font-sans bg-transparent"
              placeholder="Paste your academic text here (min 50 characters)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* Gradient Fade Overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none"></div>
            
            <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10 bg-white/50 backdrop-blur-sm p-2 rounded-full border border-white/40 shadow-sm">
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
          
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
          
          {result && result.segments && result.segments.length > 0 && result.aiScore > 40 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"
            >
              <h3 className="font-bold text-slate-700 flex items-center gap-2 px-2 mb-4">
                 <AlertCircle className="w-5 h-5 text-orange-500" />
                 AI Detected Segments
              </h3>
              <div className={`grid grid-cols-1 ${(isHumanizing || humanizedText) ? 'lg:grid-cols-2' : ''} gap-4`}>
                <div className="space-y-4">
                  <div className="w-full h-80 p-6 rounded-3xl border border-slate-200 bg-slate-50 overflow-y-auto custom-scrollbar text-sm leading-relaxed font-sans whitespace-pre-wrap text-slate-500">
                    {renderHighlightedText()}
                  </div>
                  <button
                    disabled={isHumanizing || !!humanizedText}
                    onClick={handleHumanizeSegments}
                    className="w-full group bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    {isHumanizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-emerald-100 group-hover:animate-bounce" />}
                    {isHumanizing ? 'Humanizing...' : 'Humanize Highlighted Segments'}
                  </button>
                </div>

                {(isHumanizing || humanizedText) && (
                  <div className="space-y-4">
                    <div className="w-full h-80 p-6 rounded-3xl border border-slate-200 bg-emerald-50/30 overflow-y-auto custom-scrollbar text-sm leading-relaxed font-sans whitespace-pre-wrap text-slate-700 relative">
                      {isHumanizing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                           <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                           <p className="text-emerald-700 font-medium text-sm animate-pulse">Rewriting segments safely...</p>
                        </div>
                      ) : (
                        humanizedText
                      )}
                    </div>
                    {humanizedText && (
                      <button
                        onClick={handleReCheck}
                        className="w-full group bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                      >
                        <RefreshCw className="w-5 h-5 group-hover:animate-spin" />
                        Re-Check AI Score
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar Results */}
        <div className="lg:col-span-1 lg:row-start-2 lg:col-start-3 sticky top-24 h-fit">
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
                <LoadingIndicator />
                <div>
                  <h3 className="font-bold text-lg mb-2">Analyzing Sentences</h3>
                  {progress.total > 1 && (
                    <p className="text-sm font-bold text-indigo-600 mb-2">
                      Processing Part {progress.current} of {progress.total}
                    </p>
                  )}
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
                    <div className={`text-center p-4 rounded-2xl ${result.humanScore >= 70 ? 'bg-green-50 text-green-600' : result.humanScore >= 40 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      <div className="text-3xl font-black">{result.humanScore}%</div>
                      <div className="text-[10px] uppercase font-bold mt-1">Human</div>
                    </div>
                    <div className={`text-center p-4 rounded-2xl ${result.aiScore >= 70 ? 'bg-red-50 text-red-600' : result.aiScore >= 40 ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      <div className="text-3xl font-black">{result.aiScore}%</div>
                      <div className="text-[10px] uppercase font-bold mt-1">AI Gen</div>
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
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
