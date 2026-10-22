import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, pass: string, remember?: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedUser = await storage.getUser();
        const storedToken = await storage.getToken();

        const remember = await storage.getRemember();

        if (storedToken && storedUser) {
          if (remember) {
            setUser(storedUser);
          } else {
            // "Lembrar de mim" desmarcado: a sessão não sobrevive ao fechamento do app
            await storage.clear();
          }
        }
      } catch (e) {
        console.error('Failed to restore auth session:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function login(email: string, pass: string, remember = true) {
    const response = await api.login(email, pass);
    await storage.setRemember(remember);
    setUser(response.user);
  }

  async function loginWithGoogle(idToken: string) {
    const response = await api.googleLogin(idToken);
    await storage.setRemember(true);
    setUser(response.user);
  }

  async function logout() {
    await storage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
