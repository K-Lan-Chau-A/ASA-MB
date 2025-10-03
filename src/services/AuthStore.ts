import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config/api';

export type AuthData = {
  userId: number;
  username: string;
  status: number;
  shopId: number;
  shiftId?: number;
  role: number;
  avatar?: string | null;
  accessToken: string;
  createdAt?: string;
};

const STORAGE_KEY = 'auth:data:v1';
const CREDS_KEY = 'auth:creds:v1';

export const authStore = {
  async save(data: AuthData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } finally {
      // Debug log to verify saved identifiers
      // Do not log accessToken value
      console.log('[AuthStore][save] userId:', data?.userId, 'shopId:', data?.shopId, 'shiftId:', (data as any)?.shiftId ?? null);
    }
  },
  async load(): Promise<AuthData | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthData;
      // Debug log to verify loaded identifiers
      console.log('[AuthStore][load] userId:', parsed?.userId, 'shopId:', parsed?.shopId, 'shiftId:', (parsed as any)?.shiftId ?? null, 'token?', parsed?.accessToken ? 'yes' : 'no');
      return parsed;
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

export const getShiftId = async (): Promise<number | null> => {
  const d = await authStore.load();
  return typeof (d as any)?.shiftId === 'number' ? (d as any).shiftId as number : null;
};

export const getUserId = async (): Promise<number | null> => {
  const d = await authStore.load();
  return typeof d?.userId === 'number' ? d!.userId : null;
};

export const setShiftId = async (shiftId: number): Promise<void> => {
  const d = await authStore.load();
  const updated = { ...(d ?? {}), shiftId } as AuthData & { shiftId: number };
  await authStore.save(updated);
};

// Clear persisted shift id (force open-shift on next operations)
export const clearShiftId = async (): Promise<void> => {
  const d = await authStore.load();
  const updated: any = { ...(d ?? {}) };
  if (Object.prototype.hasOwnProperty.call(updated, 'shiftId')) {
    delete updated.shiftId;
  }
  await authStore.save(updated as AuthData);
};


// Fetch current open shift (closedDate is null) and persist its shiftId
export const refreshOpenShiftId = async (): Promise<number | null> => {
  try {
    const data = await authStore.load();
    const token = data?.accessToken ?? null;
    const shopId = typeof data?.shopId === 'number' ? data!.shopId : 0;
    if (!token || !(shopId > 0)) return null;

    const res = await fetch(`${API_URL}/api/shifts?ShopId=${shopId}&page=1&pageSize=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => null);
    const list = Array.isArray((json as any)?.items)
      ? (json as any).items
      : Array.isArray((json as any)?.data?.items)
      ? (json as any).data.items
      : Array.isArray((json as any)?.data)
      ? (json as any).data
      : Array.isArray(json)
      ? (json as any)
      : [];
    const open = (list as any[]).find((it) => (it?.closedDate ?? it?.closeDate) == null);
    const openId = Number(open?.shiftId ?? open?.id ?? 0);
    if (openId > 0) {
      await setShiftId(openId);
      console.log('[AuthStore][refreshOpenShiftId] set shiftId:', openId);
      return openId;
    }
    return null;
  } catch {
    return null;
  }
};

// Simple credential storage (for demo). Consider using a secure storage in production.
export type SavedCredentials = { username: string; password: string; remember: boolean };

export const saveCredentials = async (creds: SavedCredentials): Promise<void> => {
  try {
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  } catch {}
};

export const loadCredentials = async (): Promise<SavedCredentials | null> => {
  try {
    const raw = await AsyncStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === 'string') return parsed as SavedCredentials;
    return null;
  } catch {
    return null;
  }
};

export const clearCredentials = async (): Promise<void> => {
  try { await AsyncStorage.removeItem(CREDS_KEY); } catch {}
};

// Local-only logout: clear auth data and saved credentials
export const logoutLocal = async (): Promise<void> => {
  try {
    await Promise.allSettled([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(CREDS_KEY),
    ]);
    try { console.log('[AuthStore][logoutLocal] cleared auth and credentials'); } catch {}
  } catch {}
};

// Register FCM token for the current logged-in user
export const registerFCMTokenForCurrentUser = async (fcmToken: string, uniqueId: string | null = null): Promise<boolean> => {
  try {
    const authData = await authStore.load();
    if (!authData?.userId || !authData?.accessToken) {
      console.log('[AuthStore][registerFCMTokenForCurrentUser] No valid auth data found');
      return false;
    }

    // Check if FCM is available (not on emulator)
    const { isFCMAvailable } = await import('./FCMService');
    const fcmAvailable = await isFCMAvailable();
    if (!fcmAvailable) {
      console.log('[AuthStore][registerFCMTokenForCurrentUser] FCM not available on emulator/simulator');
      return false;
    }

    // Use FCMService for consistency
    const { fcmService } = await import('./FCMService');
    return await fcmService.registerFCMToken(authData.userId, fcmToken, uniqueId, authData.accessToken);
  } catch (error) {
    console.error('[AuthStore][registerFCMTokenForCurrentUser] Error:', error);
    return false;
  }
};

