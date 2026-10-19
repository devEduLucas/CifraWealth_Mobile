import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
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

        if (storedToken && storedUser) {
          setUser(storedUser);
        }
      } catch (e) {
        console.error('Failed to restore auth session:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function login(email: string, pass: string) {
    const response = await api.login(email, pass);
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
