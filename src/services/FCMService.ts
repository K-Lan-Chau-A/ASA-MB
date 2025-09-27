// FCM Service temporarily commented out for testing

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import API_URL from '../config/api';

const FCM_TOKEN_KEY = 'fcm_token';

//Đã comment CODE để thuận tiện cho việc LOGIN BẰNG GIẢ LẬP KHÔNG CÓ FCM

// Check if device is emulator/simulator
const isEmulator = async (): Promise<boolean> => {
  try {
    const isEmulator = await DeviceInfo.isEmulator();
    console.log('🔥 Device is emulator:', isEmulator);
    return isEmulator;
  } catch (error) {
    console.error('🔥 Error checking emulator status:', error);
    // Fallback: check common emulator indicators
    if (Platform.OS === 'android') {
      const model = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();
      return model.toLowerCase().includes('emulator') || 
             brand.toLowerCase().includes('emulator') ||
             model.toLowerCase().includes('sdk') ||
             brand.toLowerCase().includes('google_sdk');
    } else if (Platform.OS === 'ios') {
      const model = DeviceInfo.getModel();
      return model.toLowerCase().includes('simulator');
    }
    return false;
  }
};

class FCMService {
  async init() {
    console.log('🔥 Initializing FCM Service...');
    
    // Check if device is emulator
    const isEmulatorDevice = await isEmulator();
    if (isEmulatorDevice) {
      console.log('🔥 FCM disabled on emulator/simulator');
      return null;
    }
    
    try {
      // Request permission for iOS
      const authStatus = await messaging().requestPermission({
        provisional: true,
        sound: true,
        badge: true,
        alert: true,
      });
      
      console.log('🔥 FCM Permission status:', authStatus);
      
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('🔥 FCM Enabled:', enabled);

      if (enabled) {
        const token = await this.getFCMToken();
        console.log('🔥 FCM Token from init:', token);
        return token;
      }
    } catch (error) {
      console.error('🔥 FCM init error:', error);
    }
    return null;
  }

  async getFCMToken() {
    console.log('🔥 Getting FCM Token...');
    
    try {
      // Đăng ký thiết bị cho remote messages
      console.log('🔥 Registering device for remote messages...');
      await messaging().registerDeviceForRemoteMessages();
      
      // Thử lấy token nhiều lần nếu cần
      let retryCount = 0;
      let fcmToken = null;
      
      while (!fcmToken && retryCount < 3) {
        try {
          console.log(`🔥 Attempting to get token (attempt ${retryCount + 1})...`);
          fcmToken = await messaging().getToken();
          
          if (fcmToken) {
            console.log('🔥 SUCCESS - FCM Token:', fcmToken);
            await this.setStoredFCMToken(fcmToken);
            return fcmToken;
          } else {
            console.log('🔥 Token is null, retrying...');
          }
        } catch (error) {
          console.error(`🔥 Failed to get FCM token (attempt ${retryCount + 1}):`, error);
          retryCount++;
          if (retryCount < 3) {
            // Đợi 1 giây trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!fcmToken) {
        console.error('🔥 Failed to get FCM token after 3 attempts');
      }
    } catch (error) {
      console.error('🔥 Failed to get FCM token:', error);
    }
    return null;
  }

  async setStoredFCMToken(token: string) {
    console.log('🔥 FCM Token storage temporarily disabled');
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

  onTokenRefresh(callback: (token: string) => void) {

    return messaging().onTokenRefresh(async (fcmToken) => {
      await this.setStoredFCMToken(fcmToken);
      callback(fcmToken);
    });
  }

  async registerForegroundMessageHandler(callback: (message: any) => void) {

    return messaging().onMessage(callback);
  }

  async registerBackgroundMessageHandler(callback: (message: any) => Promise<any>) {

    return messaging().setBackgroundMessageHandler(callback);
  }

  async registerFCMToken(userId: number, fcmToken: string, uniqueId: string | null = null, accessToken?: string): Promise<boolean> {
    try {
      // Check if device is emulator
      const isEmulatorDevice = await isEmulator();
      if (isEmulatorDevice) {
        console.log('🔥 FCM registration skipped on emulator/simulator');
        return false;
      }

      console.log('🔥 Registering FCM token for userId:', userId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if accessToken is provided
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${API_URL}/api/fcm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          fcmToken,
          uniqueId,
        }),
      });

      if (response.ok) {
        console.log('🔥 FCM token registered successfully');
        return true;
      } else {
        console.error('🔥 Failed to register FCM token:', response.status);
        return false;
      }
    } catch (error) {
      console.error('🔥 FCM registration error:', error);
      return false;
    }
  }
}

export const fcmService = new FCMService();

// Helper function to check if FCM is available (not on emulator)
export const isFCMAvailable = async (): Promise<boolean> => {
  const isEmulatorDevice = await isEmulator();
  return !isEmulatorDevice;
};
