import { useState, useEffect } from 'react';
import { fcmService } from '../services/FCMService';

export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        // Thử lấy token từ storage trước
        let token = await fcmService.getStoredFCMToken();
        
        // Nếu không có trong storage, lấy token mới
        if (!token) {
          token = await fcmService.getFCMToken();
        }
        
        setFcmToken(token);
      } catch (error) {
        console.error('Error loading FCM token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();

    // Lắng nghe sự thay đổi token
    const unsubscribe = fcmService.onTokenRefresh((newToken) => {
      setFcmToken(newToken);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { fcmToken, loading };
};
