import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
};

interface User {
  username: string;
  team: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, key: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticating: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isOpen: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    let session = getCookie('user_session');
    if (session) {
      try {
        session = decodeURIComponent(session);
        setUser(JSON.parse(session));
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, key: string) => {
    try {
      const startTime = Date.now();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, key })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      setIsAuthenticating(true);
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise(r => setTimeout(r, 1200 - elapsed));
      }
      setUser(data.user);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    setIsAuthenticating(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await new Promise(r => setTimeout(r, 1200));
      setUser(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticating, isLoginModalOpen, setIsLoginModalOpen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
