import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'fcm_token';

class FCMService {
  async init() {
    // Request permission for iOS
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await this.getFCMToken();
    }
  }

  async getFCMToken() {
    try {
      // Kiểm tra quyền thông báo trước khi lấy token
      const authStatus = await messaging().requestPermission({
        provisional: true,
        sound: true,
        badge: true,
        alert: true,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('User has not granted notification permission');
        return null;
      }

      // Đảm bảo Firebase đã được khởi tạo
      await messaging().registerDeviceForRemoteMessages();
      
      // Thử lấy token nhiều lần nếu cần
      let retryCount = 0;
      let fcmToken = null;
      
      while (!fcmToken && retryCount < 3) {
        try {
          fcmToken = await messaging().getToken();
          if (fcmToken) {
            console.log('FCM Token:', fcmToken);
            await this.setStoredFCMToken(fcmToken);
            return fcmToken;
          }
        } catch (error) {
          console.error(`Failed to get FCM token (attempt ${retryCount + 1}):`, error);
          retryCount++;
          if (retryCount < 3) {
            // Đợi 1 giây trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
    return null;
  }

  async setStoredFCMToken(token: string) {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store FCM token:', error);
    }
  }

  async getStoredFCMToken() {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get stored FCM token:', error);
      return null;
    }
  }

  async onTokenRefresh(callback: (token: string) => void) {
    return messaging().onTokenRefresh(async (fcmToken) => {
      await this.setStoredFCMToken(fcmToken);
      callback(fcmToken);
    });
  }

  async registerForegroundMessageHandler(callback: (message: any) => void) {
    return messaging().onMessage(callback);
  }

  async registerBackgroundMessageHandler(callback: (message: any) => void) {
    return messaging().setBackgroundMessageHandler(callback);
  }
}

export const fcmService = new FCMService();
