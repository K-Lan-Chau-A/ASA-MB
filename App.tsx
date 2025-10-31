import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { fcmService } from './src/services/FCMService';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/services/queryClient';
import BottomNavigation from './src/components/BottomNavigation';
import NotificationScreen from './src/screens/NotificationScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import OrderScreen from './src/screens/OrderScreen';
import ConfirmOrderScreen from './src/screens/ConfirmOrderScreen';
import InvoicePreviewScreen from './src/screens/InvoicePreviewScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import CustomerScreen from './src/screens/CustomerScreen';
import { useNotification } from './src/hooks/useNotification';
import PromotionScreen from './src/screens/PromotionScreen';
import VoucherScreen from './src/screens/VoucherScreen';
import InventoryTransactionScreen from './src/screens/InventoryTransactionScreen';
import ManageCustomerScreen from './src/screens/ManageCustomerScreen';
import ManageCategoryScreen from './src/screens/ManageCategoryScreen';
import LogActivityScreen from './src/screens/LogActivityScreen';
import ManageAccount from './src/screens/ManageAccount';
import RankScreen from './src/screens/RankScreen';
import ReportScreen from './src/screens/ReportScreen';
import SettingScreen from './src/screens/SettingScreen';
import CloseShiftReportScreen from './src/screens/CloseShiftReportScreen';
import { signalRService } from './src/services/SignalRService';
import { getShopId } from './src/services/AuthStore';
import { notificationsStore } from './src/services/NotificationsStore';

const Stack = createNativeStackNavigator();

function App() {
  useNotification();
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      const id = await getShopId();
      if (mounted && typeof id === 'number' && id > 0) {
        try { await signalRService.connect(id); } catch {}
        // Subscribe realtime events to update badge and refresh list
        unsubscribe = signalRService.subscribe((evt) => {
          try { console.log('[SignalR][event]', evt?.type); } catch {}
          notificationsStore.inc(1);
          // Refresh notifications list in background
          try { queryClient.invalidateQueries({ queryKey: ['notifications', id] }); } catch {}
        });
      }
    })();
    return () => {
      mounted = false;
      if (unsubscribe) { try { unsubscribe(); } catch {} }
      signalRService.disconnect();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
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
          name="OrderDetail" 
          component={OrderDetailScreen}
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
        <Stack.Screen 
          name="Customer" 
          component={CustomerScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="PromotionScreen" 
          component={PromotionScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen name="VoucherScreen" component={VoucherScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="InventoryTransactionScreen" component={InventoryTransactionScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="ManageCustomerScreen" component={ManageCustomerScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="ManageCategoryScreen" component={ManageCategoryScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="LogActivityScreen" component={LogActivityScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="ManageAccount" component={ManageAccount} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="RankScreen" component={RankScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="ReportScreen" component={ReportScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="SettingScreen" component={SettingScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="CloseShiftReportScreen" component={CloseShiftReportScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack.Navigator>
      </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;