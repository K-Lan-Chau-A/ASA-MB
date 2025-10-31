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
  // optional list of feature ids this user has access to
  featureIds?: number[];
  // cached shop info for convenience
  shopName?: string | null;
  shopAddress?: string | null;
  shopToken?: string | null;
  sepayApiKey?: string | null;
  qrcodeUrl?: string | null;
};

const STORAGE_KEY = 'auth:data:v1';
const CREDS_KEY = 'auth:creds:v1';
const CHATBOT_CACHE_PREFIX = 'chatbot_messages_';

export const authStore = {
  async save(data: AuthData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } finally {
      // Debug log to verify saved identifiers
      // Do not log accessToken value
      console.log('[AuthStore][save] userId:', data?.userId, 'shopId:', data?.shopId, 'shiftId:', (data as any)?.shiftId ?? null);
      // Auto refresh shop info in background if missing
      try {
        const needShop = (!data?.shopName || !data?.shopAddress) && !!data?.shopId && !!data?.accessToken;
        if (needShop) {
          setTimeout(() => {
            try { refreshShopInfo(); } catch {}
          }, 0);
        }
      } catch {}
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

export const getFeatureIds = async (): Promise<number[]> => {
  const d = await authStore.load();
  const ids = (d as any)?.featureIds;
  return Array.isArray(ids) ? ids.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n)) : [];
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

// Fetch and persist shop info: shopName, shopAddress, shopToken, sepayApiKey, qrcodeUrl
export const refreshShopInfo = async (): Promise<{ 
  shopName: string | null; 
  shopAddress: string | null; 
  shopToken: string | null; 
  sepayApiKey: string | null; 
  qrcodeUrl: string | null; 
} | null> => {
  try {
    const data = await authStore.load();
    const token = data?.accessToken ?? null;
    const shopId = typeof data?.shopId === 'number' ? data!.shopId : 0;
    if (!token || !(shopId > 0)) return null;

    const url = `${API_URL}/api/shops?ShopId=${encodeURIComponent(shopId)}&page=1&pageSize=1`;
    try { console.log('[AuthStore][refreshShopInfo] GET', url); } catch {}
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      try { console.log('[AuthStore][refreshShopInfo] HTTP', res.status, await res.text().catch(()=>'')); } catch {}
      return null;
    }
    const json = await res.json().catch(() => null);
    const items = Array.isArray(json?.items) ? json.items : Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    try { console.log('[AuthStore][refreshShopInfo] items len:', Array.isArray(items) ? items.length : -1, 'sample:', items && items[0]); } catch {}
    const shop = (items as any[])[0] || null;
    const shopName: string | null = shop?.shopName ?? null;
    const shopAddress: string | null = shop?.address ?? null;
    const shopToken: string | null = shop?.shopToken ?? null;
    const sepayApiKey: string | null = shop?.sepayApiKey ?? null;
    const qrcodeUrl: string | null = shop?.qrcodeUrl ?? null;

    const updated: AuthData = { 
      ...(data as AuthData), 
      shopName, 
      shopAddress, 
      shopToken, 
      sepayApiKey, 
      qrcodeUrl 
    } as AuthData;
    await authStore.save(updated);
    try { console.log('[AuthStore][refreshShopInfo] shopName:', shopName, 'address:', shopAddress, 'shopToken:', shopToken ? 'yes' : 'no', 'sepayApiKey:', sepayApiKey ? 'yes' : 'no', 'qrcodeUrl:', qrcodeUrl ? 'yes' : 'no'); } catch {}
    return { shopName, shopAddress, shopToken, sepayApiKey, qrcodeUrl };
  } catch (e) {
    return null;
  }
};

export const getShopInfo = async (): Promise<{ 
  shopName: string | null; 
  shopAddress: string | null; 
  shopToken: string | null; 
  sepayApiKey: string | null; 
  qrcodeUrl: string | null; 
}> => {
  const d = await authStore.load();
  let shopName = d?.shopName ?? null;
  let shopAddress = d?.shopAddress ?? null;
  let shopToken = d?.shopToken ?? null;
  let sepayApiKey = d?.sepayApiKey ?? null;
  let qrcodeUrl = d?.qrcodeUrl ?? null;
  
  if (!shopName || !shopAddress) {
    try {
      console.log('[AuthStore][getShopInfo] missing cached info -> fetching...');
      const info = await refreshShopInfo();
      if (info) {
        shopName = info.shopName;
        shopAddress = info.shopAddress;
        shopToken = info.shopToken;
        sepayApiKey = info.sepayApiKey;
        qrcodeUrl = info.qrcodeUrl;
      }
    } catch (e) {
      try { console.log('[AuthStore][getShopInfo] refresh error:', e); } catch {}
    }
  }
  try { console.log('[AuthStore][getShopInfo] return:', { shopName, shopAddress, shopToken: shopToken ? 'yes' : 'no', sepayApiKey: sepayApiKey ? 'yes' : 'no', qrcodeUrl: qrcodeUrl ? 'yes' : 'no' }); } catch {}
  return { shopName, shopAddress, shopToken, sepayApiKey, qrcodeUrl };
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

// Clear all cached chatbot messages for all shops
export const clearChatbotCaches = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(CHATBOT_CACHE_PREFIX));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
    try { console.log('[AuthStore][clearChatbotCaches] removed keys:', toRemove.length); } catch {}
  } catch {}
};

// Local-only logout: clear auth data and saved credentials
export const logoutLocal = async (): Promise<void> => {
  try {
    await Promise.allSettled([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(CREDS_KEY),
    ]);
    // Also clear chatbot caches to avoid showing old messages after account switch
    await clearChatbotCaches();
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

// Save login response data into auth store
export const saveLoginData = async (loginJson: any): Promise<boolean> => {
  try {
    const payload = (loginJson && loginJson.data) ? loginJson.data : loginJson;
    const userId = Number(payload?.userId ?? 0);
    const status = Number(payload?.status ?? 0);
    const shopId = Number(payload?.shopId ?? 0);
    const role = Number(payload?.role ?? 0);
    const username = String(payload?.username ?? '');
    const token = String(payload?.accessToken ?? '');
    if (!(userId > 0) || !(shopId > 0) || !token) return false;
    // Do not persist inactive users
    if (status === 0) return false;
    const auth: AuthData = {
      userId,
      username,
      status,
      shopId,
      role,
      avatar: payload?.avatar ?? null,
      accessToken: token,
      createdAt: payload?.createdAt ?? undefined,
      featureIds: Array.isArray(payload?.featureIds) ? payload.featureIds.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n)) : [],
    };
    await authStore.save(auth);
    try { console.log('[AuthStore][login] saved. userId:', userId, 'shopId:', shopId); } catch {}
    // After saving, try to fetch and persist shop info
    try {
      console.log('[AuthStore][login] fetching shop info...');
      const info = await refreshShopInfo();
      console.log('[AuthStore][login] shop info:', info);
    } catch (e) {
      try { console.log('[AuthStore][login] refreshShopInfo error:', e); } catch {}
    }
    return true;
  } catch {
    return false;
  }
};

export const getShopName = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.shopName ?? null;
};

export const getShopAddress = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.shopAddress ?? null;
};

export const getShopToken = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.shopToken ?? null;
};

export const getSepayApiKey = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.sepayApiKey ?? null;
};

export const getQrcodeUrl = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.qrcodeUrl ?? null;
};

export const getUsername = async (): Promise<string | null> => {
  const d = await authStore.load();
  return d?.username ?? null;
};
