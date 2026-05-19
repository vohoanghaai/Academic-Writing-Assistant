import { motion } from 'framer-motion';
import { ShieldCheck, Search, UserRound, FileCheck, Type, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { t } = useLanguage();
  const { user, setIsLoginModalOpen } = useAuth();

  const handleProtectedAction = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setIsLoginModalOpen(true);
    }
  };

  const features = [
    {
      title: t('feature1Title'),
      desc: t('feature1Desc'),
      icon: Search,
      path: '/ai-detect',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: t('feature2Title'),
      desc: t('feature2Desc'),
      icon: UserRound,
      path: '/humanize',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: t('feature3Title'),
      desc: t('feature3Desc'),
      icon: FileCheck,
      path: '/plagiarism',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: t('feature4Title'),
      desc: t('feature4Desc'),
      icon: Type,
      path: '/paraphrase',
      color: 'bg-orange-100 text-orange-600'
    }
  ];

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
          {t('heroTag')}
        </motion.div>
        
        <motion.h1 
          className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('heroTitle1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{t('heroTitle2')}</span>
        </motion.h1>
        
        <motion.p 
          className="text-lg text-slate-600 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t('heroDesc')}
        </motion.p>

        <motion.div 
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/ai-detect" onClick={handleProtectedAction} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
            {t('startChecking')} <ArrowRight className="w-5 h-5" />
          </Link>
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
              onClick={handleProtectedAction}
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
          <h2 className="text-3xl font-bold mb-4">{t('privacyTitle')}</h2>
          <p className="text-slate-300 leading-relaxed mb-8 text-lg">
            {t('privacyDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-medium">
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-white">{t('privacyItem1Title')}</p>
                <p className="text-slate-400 font-normal">{t('privacyItem1Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-white">{t('privacyItem2Title')}</p>
                <p className="text-slate-400 font-normal">{t('privacyItem2Desc')}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] -mr-40 -mt-40 opacity-20" />
      </section>
    </div>
  );
}
