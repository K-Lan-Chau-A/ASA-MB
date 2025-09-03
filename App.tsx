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
import OrderScreen from './src/screens/OrderScreen';
import ConfirmOrderScreen from './src/screens/ConfirmOrderScreen';
import InvoicePreviewScreen from './src/screens/InvoicePreviewScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import { useNotification } from './src/hooks/useNotification';

const Stack = createNativeStackNavigator();

function App() {
  useNotification();
  

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
        <Stack.Screen 
          name="Order" 
          component={OrderScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="ConfirmOrder" 
          component={ConfirmOrderScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="InvoicePreview" 
          component={InvoicePreviewScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="AddProduct" 
          component={AddProductScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="ChatbotScreen" 
          component={ChatbotScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
      </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;