import { motion } from 'framer-motion';
import { ShieldCheck, Search, UserRound, FileCheck, Type, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'AI Detect Text',
    desc: 'Analyze AI-likelihood and detect robotic writing patterns.',
    icon: Search,
    path: '/ai-detect',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    title: 'Humanize Text',
    desc: 'Improve flow and natural cadence without losing academic rigor.',
    icon: UserRound,
    path: '/humanize',
    color: 'bg-green-100 text-green-600'
  },
  {
    title: 'Plagiarism Checker',
    desc: 'Deep web scan for exact, fuzzy, and semantic similarity.',
    icon: FileCheck,
    path: '/plagiarism',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    title: 'Paraphrase Tool',
    desc: 'Responsibly rewrite and strengthen your arguments.',
    icon: Type,
    path: '/paraphrase',
    color: 'bg-orange-100 text-orange-600'
  }
];

export default function Home() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold"
        >
          <ShieldCheck className="w-4 h-4" />
          The Gold Standard for Academic Integrity
        </motion.div>
        
        <motion.h1 
          className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Check, Improve, and Strengthen Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Academic Writing</span>
        </motion.h1>
        
        <motion.p 
          className="text-lg text-slate-600 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Analyze AI-likelihood, detect similarity risks, humanize your writing, and paraphrase responsibly with our integrated NLP toolkit.
        </motion.p>

        <motion.div 
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/ai-detect" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
            Start Checking <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-full font-bold transition-all shadow-sm">
            Upload Document
          </button>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i }}
          >
            <Link 
              to={f.path} 
              className="group block bg-white h-full p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`${f.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Privacy & Trust Banner */}
      <section className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl overflow-hidden relative">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-1 rounded-full text-xs font-bold mb-6 border border-indigo-500/30">
            <ShieldCheck className="w-4 h-4" />
            Zero-Data Training Policy
          </div>
          <h2 className="text-3xl font-bold mb-4">Your Intelligence, Protected.</h2>
          <p className="text-slate-300 leading-relaxed mb-8 text-lg">
            Chúng tôi cam kết <strong>không lưu trữ, không thu thập và không sử dụng</strong> bất kỳ nội dung nào của bạn để huấn luyện mô hình AI. Điều này đảm bảo tài liệu của bạn luôn là duy nhất và không bao giờ bị đánh dấu là "đã tồn tại" bởi các hệ thống kiểm tra khác.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-medium">
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-white">Real-time Processing</p>
                <p className="text-slate-400 font-normal">Văn bản được phân tích trực tiếp và xóa ngay sau khi phiên làm việc kết thúc.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-white">Anti-Plagiarism Safety</p>
                <p className="text-slate-400 font-normal">Đảm bảo bài viết của bạn không bị lọt vào leak-database của bên thứ ba.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] -mr-40 -mt-40 opacity-20" />
      </section>
    </div>
  );
}
