import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { fcmService } from './src/services/FCMService';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import BottomNavigation from './src/components/BottomNavigation';
import NotificationScreen from './src/screens/NotificationScreen';
import ScannerScreen from './src/screens/ScannerScreen';

const Stack = createNativeStackNavigator();

function App() {
  useEffect(() => {
    const initFCM = async () => {
      try {
        await fcmService.init();
        
        // Lắng nghe token mới
        fcmService.onTokenRefresh((token) => {
          console.log('New FCM Token:', token);
          // Gửi token mới lên server của bạn ở đây
        });

        // Xử lý thông báo khi app đang mở
        fcmService.registerForegroundMessageHandler((remoteMessage) => {
          console.log('Received foreground message:', remoteMessage);
          Alert.alert(
            remoteMessage.notification?.title || 'Thông báo',
            remoteMessage.notification?.body
          );
        });

        // Xử lý thông báo khi app đang chạy nền
        fcmService.registerBackgroundMessageHandler(async (remoteMessage) => {
          console.log('Received background message:', remoteMessage);
          // Xử lý thông báo ở background
        });

      } catch (error) {
        console.error('FCM initialization failed:', error);
      }
    };

    initFCM();
  }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainApp" component={BottomNavigation} />
        <Stack.Screen 
          name="Notification" 
          component={NotificationScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="Scanner" 
          component={ScannerScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_bottom'
          }}
        />
      </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;