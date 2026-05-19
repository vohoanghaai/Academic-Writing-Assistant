import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useEffect, useState } from 'react';
import LoginModal from './LoginModal';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setShowLogin(true);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center">...</div>;
  }

  if (!user) {
    if (!showLogin) {
      return <Navigate to="/" replace />;
    }
    
    return (
      <div className="min-h-[60vh]">
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </div>
    );
  }

  return <Outlet />;
}
