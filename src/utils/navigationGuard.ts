import { NavigationProp } from '@react-navigation/native';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

type GuardConfig = {
  // Full URL or path builder; if builder provided, it will be called to produce URL
  url?: string;
  buildUrl?: (shopId: number) => string;
  method?: 'GET' | 'HEAD';
};

export const navigateIfAuthorized = async (
  navigation: NavigationProp<RootStackParamList>,
  target: keyof RootStackParamList,
  guard: GuardConfig,
  params?: any,
) => {
  try {
    const token = await getAuthToken();
    const shopId = (await getShopId()) ?? 0;
    const url = guard.url || (guard.buildUrl ? guard.buildUrl(shopId) : undefined);
    if (!url) {
      (navigation as any).navigate(target as any, params);
      return;
    }
    const res = await fetch(url, {
      method: guard.method || 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.status === 403) {
      (navigation as any).navigate('ForbiddenScreen');
      return;
    }
    (navigation as any).navigate(target as any, params);
  } catch {
    // On network error, allow navigation (fallback to in-screen handling)
    (navigation as any).navigate(target as any, params);
  }
};


