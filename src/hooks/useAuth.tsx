import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { AuthMethod, User } from '../types';
import { API_BASE_URL } from '../services/config';
import {
  clearCifraWidgetAccess,
  setCifraWidgetFavorites,
  setCifraWidgetSessionToken,
} from '../../modules/cifra-widget';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  authMethod: AuthMethod | null;
  loading: boolean;
  login: (email: string, pass: string, remember?: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

let widgetProvisioningQueue: Promise<void> = Promise.resolve();

function provisionWidgetAccess(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();

  const task = widgetProvisioningQueue.then(async () => {
    // Read favorites before rotating the device credential. If the API is down,
    // an existing widget session remains usable instead of being invalidated.
    const normalToken = await storage.getToken();
    if (!normalToken) return;

    const deviceId = await storage.getWidgetDeviceId();
    const favorites = await api.listWidgetFavorites();
    if ((await storage.getToken()) !== normalToken) return;

    const session = await api.createWidgetSession(deviceId);
    if ((await storage.getToken()) !== normalToken) return;

    await setCifraWidgetFavorites(favorites);
    await setCifraWidgetSessionToken(session.token, API_BASE_URL);
  });

  // Keep provisioning serialized and prevent one failed request from blocking
  // a later login/restore attempt.
  widgetProvisioningQueue = task.catch(() => undefined);
  return task;
}

async function revokeWidgetAccess(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Wait for an in-flight provisioning operation so it cannot store a fresh
  // widget credential after logout has already cleared local access.
  await widgetProvisioningQueue;

  try {
    const deviceId = await storage.getWidgetDeviceId();
    await api.revokeWidgetSession(deviceId);
  } catch {
    // Always clear the local Keystore credential even if the device is offline.
  } finally {
    try {
      await clearCifraWidgetAccess();
    } catch (error) {
      console.warn('[CifraWealth] Não foi possível limpar o segredo local do widget:', error);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
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
            setAuthMethod(await storage.getAuthMethod());
            void provisionWidgetAccess().catch((error) => {
              console.warn('[CifraWealth] Não foi possível sincronizar o widget:', error);
            });
          } else {
            await clearCifraWidgetAccess();
            await storage.clear();
          }
        } else {
          await clearCifraWidgetAccess();
        }
      } catch (error) {
        console.error('Failed to restore auth session:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function login(email: string, pass: string, remember = true) {
    const response = await api.login(email, pass);
    await storage.setRemember(remember);
    await storage.setAuthMethod('email');
    setAuthMethod('email');
    setUser(response.user);

    if (remember) {
      void provisionWidgetAccess().catch((error) => {
        console.warn('[CifraWealth] Não foi possível ativar os favoritos no widget:', error);
      });
    } else {
      await clearCifraWidgetAccess();
    }
  }

  async function loginWithGoogle(idToken: string) {
    const response = await api.googleLogin(idToken);
    await storage.setRemember(true);
    await storage.setAuthMethod('google');
    setAuthMethod('google');
    setUser(response.user);
    void provisionWidgetAccess().catch((error) => {
      console.warn('[CifraWealth] Não foi possível ativar os favoritos no widget:', error);
    });
  }

  async function logout() {
    await revokeWidgetAccess();
    await storage.clear();
    setAuthMethod(null);
    setUser(null);
  }

  async function deleteAccount() {
    await api.deleteAccount();
    if (user) await storage.clearProfileStyle(user.id_usuario);
    await logout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authMethod,
        loading,
        login,
        loginWithGoogle,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
