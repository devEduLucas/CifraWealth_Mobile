import * as SecureStore from 'expo-secure-store';
import { AuthMethod, ProfileStyle, User } from '../types';

type ThemeName = 'light' | 'dark';

const TOKEN_KEY = 'cifrawealth.token';
const USER_KEY = 'cifrawealth.user';
const REMEMBER_KEY = 'cifrawealth.remember';
// SecureStore só aceita letras, números, ".", "-" e "_" nas chaves
const AUTH_METHOD_KEY = 'cifrawealth.authMethod';
const THEME_KEY = 'cifrawealth.theme';
const ONBOARDED_KEY = 'cifrawealth.onboarded';
const HIDE_VALUES_KEY = 'cifrawealth.hideValues';
const profileKey = (id: number) => `cifrawealth.profile.${id}`;

// In-memory fallback if SecureStore is running in Web/Simulator without keychain
let memoryToken: string | null = null;
let memoryUser: User | null = null;
let memoryRemember: boolean | null = null;

export const storage = {
  async setToken(token: string): Promise<void> {
    memoryToken = token;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // Fallback in environments without hardware keystore
    }
  },

  async getToken(): Promise<string | null> {
    if (memoryToken) return memoryToken;
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      memoryToken = token;
      return token;
    } catch {
      return memoryToken;
    }
  },

  async setUser(user: User): Promise<void> {
    memoryUser = user;
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch {
      // Fallback
    }
  },

  async getUser(): Promise<User | null> {
    if (memoryUser) return memoryUser;
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      if (data) {
        memoryUser = JSON.parse(data) as User;
        return memoryUser;
      }
      return null;
    } catch {
      return memoryUser;
    }
  },

  async setRemember(value: boolean): Promise<void> {
    memoryRemember = value;
    try {
      await SecureStore.setItemAsync(REMEMBER_KEY, value ? '1' : '0');
    } catch {
      // Fallback
    }
  },

  // Padrão: lembrar (sessões anteriores à opção continuam válidas)
  async getRemember(): Promise<boolean> {
    if (memoryRemember !== null) return memoryRemember;
    try {
      const data = await SecureStore.getItemAsync(REMEMBER_KEY);
      memoryRemember = data !== '0';
      return memoryRemember;
    } catch {
      return true;
    }
  },

  async setAuthMethod(method: AuthMethod): Promise<void> {
    try {
      await SecureStore.setItemAsync(AUTH_METHOD_KEY, method);
    } catch {
      // Fallback
    }
  },

  async getAuthMethod(): Promise<AuthMethod | null> {
    try {
      const data = await SecureStore.getItemAsync(AUTH_METHOD_KEY);
      return data === 'google' || data === 'email' ? data : null;
    } catch {
      return null;
    }
  },

  // Personalização do perfil: por usuário e mantida após encerrar a sessão
  async getProfileStyle(userId: number): Promise<ProfileStyle | null> {
    try {
      const data = await SecureStore.getItemAsync(profileKey(userId));
      return data ? (JSON.parse(data) as ProfileStyle) : null;
    } catch {
      return null;
    }
  },

  async setProfileStyle(userId: number, style: ProfileStyle): Promise<void> {
    try {
      await SecureStore.setItemAsync(profileKey(userId), JSON.stringify(style));
    } catch {
      // Fallback
    }
  },

  async clearProfileStyle(userId: number): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(profileKey(userId));
    } catch {
      // Ignore
    }
  },

  // Tela de boas-vindas: aparece só na primeira abertura, do aparelho (não é apagada no logout)
  async getOnboarded(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(ONBOARDED_KEY)) === '1';
    } catch {
      return false;
    }
  },

  async setOnboarded(): Promise<void> {
    try {
      await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
    } catch {
      // Fallback
    }
  },

  // Preferência de tema: do aparelho, não da sessão (não é apagada no logout)
  async getTheme(): Promise<ThemeName | null> {
    try {
      const data = await SecureStore.getItemAsync(THEME_KEY);
      return data === 'light' || data === 'dark' ? data : null;
    } catch {
      return null;
    }
  },

  async setTheme(theme: ThemeName): Promise<void> {
    try {
      await SecureStore.setItemAsync(THEME_KEY, theme);
    } catch {
      // Fallback
    }
  },

  // Modo privacidade (ocultar valores): preferência do aparelho
  async getHideValues(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(HIDE_VALUES_KEY)) === '1';
    } catch {
      return false;
    }
  },

  async setHideValues(value: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(HIDE_VALUES_KEY, value ? '1' : '0');
    } catch {
      // Fallback
    }
  },

  async clear(): Promise<void> {
    memoryToken = null;
    memoryUser = null;
    memoryRemember = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(REMEMBER_KEY);
      await SecureStore.deleteItemAsync(AUTH_METHOD_KEY);
    } catch {
      // Ignore
    }
  },
};