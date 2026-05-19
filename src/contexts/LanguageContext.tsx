import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'vi';

const translations = {
  en: {
    // Nav & Common
    home: 'Home',
    aiDetect: 'AI Detect',
    humanize: 'Humanize',
    plagiarism: 'Plagiarism',
    paraphrase: 'Paraphrase',
    reports: 'Reports',
    getStarted: 'Get Started',
    signOut: 'Sign Out',
    privacyFirst: 'Privacy First • No AI Training • Session Only',
    copyright: '© 2026 Academic Writing Assistant. All rights reserved.',
    disclaimer: 'Disclaimer: This tool provides assistive analysis based on AI patterns and similarity matching. Content is processed temporarily and never used to train AI models.',
    uploadDocument: 'Upload Document',
    
    // Home
    heroTag: 'The Gold Standard for Academic Integrity',
    heroTitle1: 'Check, Improve, and Strengthen Your',
    heroTitle2: 'Academic Writing',
    heroDesc: 'Analyze AI-likelihood, detect similarity risks, humanize your writing, and paraphrase responsibly with our integrated NLP toolkit.',
    startChecking: 'Start Checking',
    
    feature1Title: 'AI Detect Text',
    feature1Desc: 'Analyze AI-likelihood and detect robotic writing patterns.',
    feature2Title: 'Humanize Text',
    feature2Desc: 'Improve flow and natural cadence without losing academic rigor.',
    feature3Title: 'Plagiarism Checker',
    feature3Desc: 'Deep web scan for exact, fuzzy, and semantic similarity.',
    feature4Title: 'Paraphrase Tool',
    feature4Desc: 'Responsibly rewrite and strengthen your arguments.',
    
    privacyTitle: 'Your Intelligence, Protected.',
    privacyDesc: 'We are committed to NOT storing, collecting, and using any of your content to train AI models. This ensures your documents are always unique and never marked as "existing" by other checkers.',
    privacyItem1Title: 'Real-time Processing',
    privacyItem1Desc: 'Text is analyzed directly and deleted immediately after the session ends.',
    privacyItem2Title: 'Anti-Plagiarism Safety',
    privacyItem2Desc: 'Ensures your articles are not leaked to third-party databases.',
    
    // Login Modal
    loginTitle: 'Access Required',
    loginDesc: 'Please sign in to access these features.',
    username: 'Username',
    password: 'Password',
    loginBtn: 'Sign In',
  },
  vi: {
    // Nav & Common
    home: 'Trang chủ',
    aiDetect: 'Phát hiện AI',
    humanize: 'Tự nhiên hoá',
    plagiarism: 'Kiểm tra Đạo văn',
    paraphrase: 'Viết lại',
    reports: 'Báo cáo',
    getStarted: 'Bắt đầu',
    signOut: 'Đăng xuất',
    privacyFirst: 'Ưu tiên Riêng tư • Không huấn luyện AI • Chỉ phiên hiện tại',
    copyright: '© 2026 Trợ lý Viết học thuật. Bảo lưu mọi quyền.',
    disclaimer: 'Tuyên bố từ chối trách nhiệm: Công cụ này cung cấp phân tích hỗ trợ dựa trên các mô hình AI và kiểm tra tương đồng. Nội dung được xử lý tạm thời và không bao giờ được dùng để huấn luyện.',
    uploadDocument: 'Tải tài liệu lên',

    // Home
    heroTag: 'Tiêu chuẩn vàng cho Tính toàn vẹn Học thuật',
    heroTitle1: 'Kiểm tra, Cải thiện và Tăng cường',
    heroTitle2: 'Bài viết học thuật',
    heroDesc: 'Phân tích khả năng AI, phát hiện rủi ro đạo văn, làm tự nhiên bài viết và viết lại một cách có trách nhiệm với bộ công cụ NLP của chúng tôi.',
    startChecking: 'Bắt đầu kiểm tra',

    feature1Title: 'Phát hiện AI',
    feature1Desc: 'Phân tích khả năng do AI viết và các mẫu câu cứng nhắc.',
    feature2Title: 'Làm tự nhiên văn bản',
    feature2Desc: 'Cải thiện luồng câu tự nhiên mà không mất đi tính học thuật.',
    feature3Title: 'Kiểm tra Đạo văn',
    feature3Desc: 'Quét web sâu để tìm bản sao chính xác, mờ và ngữ nghĩa.',
    feature4Title: 'Công cụ Viết lại',
    feature4Desc: 'Viết lại có trách nhiệm để củng cố lập luận của bạn.',
    
    privacyTitle: 'Trí tuệ của bạn, được bảo vệ.',
    privacyDesc: 'Chúng tôi cam kết KHÔNG lưu trữ, không thu thập và không sử dụng bất kỳ nội dung nào của bạn để huấn luyện mô hình AI. Điều này đảm bảo tài liệu của bạn luôn là duy nhất và không bao giờ bị đánh dấu là "đã tồn tại" bởi các hệ thống kiểm tra khác.',
    privacyItem1Title: 'Xử lý Thời gian thực',
    privacyItem1Desc: 'Văn bản được phân tích trực tiếp và xóa ngay sau khi phiên làm việc kết thúc.',
    privacyItem2Title: 'An toàn chống Đạo văn',
    privacyItem2Desc: 'Đảm bảo bài viết của bạn không bị lọt vào leak-database của bên thứ ba.',

    // Login Modal
    loginTitle: 'Yêu cầu quyền truy cập',
    loginDesc: 'Vui lòng đăng nhập để sử dụng các tính năng này.',
    username: 'Tên người dùng',
    password: 'Mật khẩu',
    loginBtn: 'Đăng nhập',
  }
};

type TransKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TransKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'en' || saved === 'vi') return saved;
      
      const value = `; ${document.cookie}`;
      const parts = value.split(`; app_lang=`);
      if (parts.length === 2) {
        const savedCookie = parts.pop()?.split(';').shift();
        if (savedCookie === 'en' || savedCookie === 'vi') return savedCookie as Language;
      }
    }
    return 'en'; // default en
  });
  
  useEffect(() => {
    // keeping this just in case, but initial state already handles it
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_lang', newLang);
      document.cookie = `app_lang=${newLang}; path=/; max-age=31536000`;
    }
  };

  const t = (key: TransKey): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
