import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthData = {
  userId: number;
  username: string;
  status: number;
  shopId: number;
  role: number;
  avatar?: string | null;
  accessToken: string;
  createdAt?: string;
};

const STORAGE_KEY = 'auth:data:v1';

export const authStore = {
  async save(data: AuthData): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  async load(): Promise<AuthData | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthData;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

export const getAuthToken = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.accessToken ?? null;
};

export const getShopId = async (): Promise<number | null> => {
  const d = await authStore.load();
  return typeof d?.shopId === 'number' ? d!.shopId : null;
};


