import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const TOKEN_KEY = '@cifrawealth:token';
const USER_KEY = '@cifrawealth:user';
const REMEMBER_KEY = '@cifrawealth:remember';

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

  async clear(): Promise<void> {
    memoryToken = null;
    memoryUser = null;
    memoryRemember = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(REMEMBER_KEY);
    } catch {
      // Ignore
    }
  },
};
