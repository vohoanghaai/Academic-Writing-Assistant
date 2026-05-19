import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  UserRound, 
  FileCheck, 
  Type, 
  History, 
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  Globe,
  BadgeCheck
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LoginModal from './LoginModal';

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  const { user, logout, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const navItems = [
    { path: '/', label: t('home'), icon: Home },
    { path: '/ai-detect', label: t('aiDetect'), icon: Search },
    { path: '/humanize', label: t('humanize'), icon: UserRound },
    { path: '/plagiarism', label: t('plagiarism'), icon: FileCheck },
    { path: '/paraphrase', label: t('paraphrase'), icon: Type },
    { path: '/reports', label: t('reports'), icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">
                Academic<span className="text-indigo-600">Assistant</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isProtected = item.path !== '/';
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => {
                      if (!user && isProtected) {
                        e.preventDefault();
                        setIsLoginModalOpen(true);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* CTA & Lang */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-1"
                title="Toggle Language"
              >
                <Globe className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">{lang}</span>
              </button>

              {!user ? (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                >
                  {t('getStarted')}
                </button>
              ) : (
                <div 
                  className="relative" 
                  onMouseEnter={() => setIsProfileDropdownOpen(true)}
                  onMouseLeave={() => setIsProfileDropdownOpen(false)}
                >
                  <div className="flex items-center gap-2 bg-white text-slate-700 px-1.5 py-1.5 pr-4 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm flex items-center gap-1">
                      {user.username}
                      <BadgeCheck className="w-4 h-4 text-blue-500 fill-white" />
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  </div>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 py-1"
                      >
                        <button 
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-slate-50 transition-colors"
                        >
                          {t('signOut')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <button onClick={() => setLang('en')} className={`text-sm font-bold ${lang === 'en' ? 'text-indigo-600' : 'text-slate-500'}`}>EN</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setLang('vi')} className={`text-sm font-bold ${lang === 'vi' ? 'text-indigo-600' : 'text-slate-500'}`}>VI</button>
                  </div>
                  
                  {!user ? (
                    <button 
                      onClick={() => { setIsLoginModalOpen(true); setIsMobileMenuOpen(false); }}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold"
                    >
                      {t('getStarted')}
                    </button>
                  ) : (
                    <button onClick={logout} className="text-red-500 text-sm font-bold">
                      {t('signOut')}
                    </button>
                  )}
                </div>

                {navItems.map((item) => {
                  const isProtected = item.path !== '/';
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={(e) => {
                        if (!user && isProtected) {
                          e.preventDefault();
                          setIsLoginModalOpen(true);
                          setIsMobileMenuOpen(false);
                        } else {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium ${
                        location.pathname === item.path
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 relative z-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 text-indigo-600 mb-6">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{t('privacyFirst')}</span>
          </div>
          <p className="text-slate-500 text-sm">
            {t('copyright')}
          </p>
          <p className="text-slate-400 text-xs mt-4 italic px-8 max-w-2xl mx-auto">
            {t('disclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
