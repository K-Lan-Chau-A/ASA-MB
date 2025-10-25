import { useState, useEffect } from 'react';
import { fcmService } from '../services/FCMService';

export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔔 useFCMToken: Hook initialized');
    
    const loadToken = async () => {
      try {
        console.log('🔔 useFCMToken: Loading token from storage...');
        // Thử lấy token từ storage trước
        let token = await fcmService.getStoredFCMToken();
        console.log('🔔 useFCMToken: Stored token:', token?.substring(0, 20) + '...' || 'null');
        
        // Nếu không có trong storage, lấy token mới
        if (!token) {
          console.log('🔔 useFCMToken: No stored token, fetching new one...');
          token = await fcmService.getFCMToken();
          console.log('🔔 useFCMToken: New token:', token?.substring(0, 20) + '...' || 'null');
        }
        
        setFcmToken(token);
        console.log('🔔 useFCMToken: Token set in state');
      } catch (error) {
        console.error('🔔 useFCMToken: Error loading FCM token:', error);
        console.error('🔔 useFCMToken: Error details:', {
          name: (error as any)?.name,
          message: (error as any)?.message
        });
      } finally {
        console.log('🔔 useFCMToken: Loading complete, setting loading=false');
        setLoading(false);
      }
    };

    loadToken();

    // Lắng nghe sự thay đổi token
    const unsubscribe = fcmService.onTokenRefresh((newToken) => {
      console.log('🔔 useFCMToken: Token refreshed:', newToken?.substring(0, 20) + '...');
      setFcmToken(newToken);
    });

    return () => {
      console.log('🔔 useFCMToken: Unsubscribing from token refresh');
      unsubscribe();
    };
  }, []);

  console.log('🔔 useFCMToken: Returning state -', { hasToken: !!fcmToken, loading });
  return { fcmToken, loading };
};
