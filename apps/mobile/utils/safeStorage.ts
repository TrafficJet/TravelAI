// Безопасный Storage — работает с AsyncStorage если доступен, иначе in-memory
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

let _asyncStorage: any = null;

async function getAsyncStorage() {
  if (_asyncStorage) return _asyncStorage;
  try {
    const mod = require('@react-native-async-storage/async-storage');
    _asyncStorage = mod.default ?? mod;
    // test if native module is available
    await _asyncStorage.getItem('__test__');
    return _asyncStorage;
  } catch {
    _asyncStorage = null;
    return null;
  }
}

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const as = await getAsyncStorage();
      if (as) return as.getItem(key);
    } catch {}
    return memoryStore[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      const as = await getAsyncStorage();
      if (as) await as.setItem(key, value);
    } catch {}
  },
  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      const as = await getAsyncStorage();
      if (as) await as.removeItem(key);
    } catch {}
  },
};

// Zustand persist storage adapter
export const zustandStorage = {
  getItem: async (name: string) => {
    const val = await safeStorage.getItem(name);
    return val ? JSON.parse(val) : null;
  },
  setItem: async (name: string, value: any) => {
    await safeStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await safeStorage.removeItem(name);
  },
};
