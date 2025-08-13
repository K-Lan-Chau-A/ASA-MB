// FCM Service temporarily commented out for testing
// import messaging from '@react-native-firebase/messaging';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const FCM_TOKEN_KEY = 'fcm_token';

//Đã comment CODE để thuận tiện cho việc LOGIN BẰNG GIẢ LẬP KHÔNG CÓ FCM

class FCMService {
  async init() {
    console.log('🔥 FCM Service temporarily disabled');
    return null;
    // console.log('🔥 Initializing FCM Service...');
    
    // try {
    //   // Request permission for iOS
    //   const authStatus = await messaging().requestPermission({
    //     provisional: true,
    //     sound: true,
    //     badge: true,
    //     alert: true,
    //   });
      
    //   console.log('🔥 FCM Permission status:', authStatus);
      
    //   const enabled =
    //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    //   console.log('🔥 FCM Enabled:', enabled);

    //   if (enabled) {
    //     const token = await this.getFCMToken();
    //     console.log('🔥 FCM Token from init:', token);
    //     return token;
    //   }
    // } catch (error) {
    //   console.error('🔥 FCM init error:', error);
    // }
    // return null;
  }

  async getFCMToken() {
    console.log('🔥 FCM Token retrieval temporarily disabled');
    return null;
    // console.log('🔥 Getting FCM Token...');
    
    // try {
    //   // Đăng ký thiết bị cho remote messages
    //   console.log('🔥 Registering device for remote messages...');
    //   await messaging().registerDeviceForRemoteMessages();
      
    //   // Thử lấy token nhiều lần nếu cần
    //   let retryCount = 0;
    //   let fcmToken = null;
      
    //   while (!fcmToken && retryCount < 3) {
    //     try {
    //       console.log(`🔥 Attempting to get token (attempt ${retryCount + 1})...`);
    //       fcmToken = await messaging().getToken();
          
    //       if (fcmToken) {
    //         console.log('🔥 SUCCESS - FCM Token:', fcmToken);
    //         await this.setStoredFCMToken(fcmToken);
    //         return fcmToken;
    //       } else {
    //         console.log('🔥 Token is null, retrying...');
    //       }
    //     } catch (error) {
    //       console.error(`🔥 Failed to get FCM token (attempt ${retryCount + 1}):`, error);
    //       retryCount++;
    //       if (retryCount < 3) {
    //         // Đợi 1 giây trước khi thử lại
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //       }
    //     }
    //   }
      
    //   if (!fcmToken) {
    //     console.error('🔥 Failed to get FCM token after 3 attempts');
    //   }
    // } catch (error) {
    //   console.error('🔥 Failed to get FCM token:', error);
    // }
    // return null;
  }

  async setStoredFCMToken(token: string) {
    console.log('🔥 FCM Token storage temporarily disabled');
    // try {
    //   await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    // } catch (error) {
    //   console.error('Failed to store FCM token:', error);
    // }
  }

  async getStoredFCMToken() {
    console.log('🔥 FCM Stored token retrieval temporarily disabled');
    return null;
    // try {
    //   return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    // } catch (error) {
    //   console.error('Failed to get stored FCM token:', error);
    //   return null;
    // }
  }

  onTokenRefresh(callback: (token: string) => void) {
    console.log('🔥 FCM Token refresh temporarily disabled');
    return () => {}; // Return empty unsubscribe function
    // return messaging().onTokenRefresh(async (fcmToken) => {
    //   await this.setStoredFCMToken(fcmToken);
    //   callback(fcmToken);
    // });
  }

  async registerForegroundMessageHandler(callback: (message: any) => void) {
    console.log('🔥 FCM Foreground message handler temporarily disabled');
    return () => {}; // Return empty unsubscribe function
    // return messaging().onMessage(callback);
  }

  async registerBackgroundMessageHandler(callback: (message: any) => Promise<any>) {
    console.log('🔥 FCM Background message handler temporarily disabled');
    return () => {}; // Return empty unsubscribe function
    // return messaging().setBackgroundMessageHandler(callback);
  }
}

export const fcmService = new FCMService();
