import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { storage } from '../services/storage';
import { api, ApiError } from '../services/api';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
          // Sync with backend profile in background
          api
            .getProfile()
            .then((fresh) => {
              setUser(fresh);
              storage.setUser(fresh);
            })
            .catch(() => {
              // Ignore background sync error
            });
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

  async function refreshUser() {
    try {
      const fresh = await api.getProfile();
      setUser(fresh);
      await storage.setUser(fresh);
    } catch {
      // Ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUser,
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
