import React, { useEffect, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Keyboard, Modal, Text, TextInput, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList, TabParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getShiftId, getUserId, getShopId, getAuthToken, setShiftId } from '../services/AuthStore';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import BillsScreen from '../screens/BillsScreen';
import ProductsScreen from '../screens/ProductsScreen';
import MoreScreen from '../screens/MoreScreen';
import NotificationScreen from '../screens/NotificationScreen';
import OrderScreen from '../screens/OrderScreen';
import NotificationIcon from './NotificationIcon';

const Tab = createBottomTabNavigator<TabParamList>();

const AddOrderButton = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [openShiftVisible, setOpenShiftVisible] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('0');
  const [openingShiftSubmitting, setOpeningShiftSubmitting] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleOrderPress = useCallback(async () => {
    try {
      const existingShiftId = await getShiftId();
      if (Number(existingShiftId) > 0) {
        // Already have a shift in local storage → continue using it
        navigation.navigate('Order');
        return;
      }
      // No local shiftId → prompt to open shift
      setOpenShiftVisible(true);
    } catch {
      setOpenShiftVisible(true);
    }
  }, [navigation]);

  const handleOpenShift = useCallback(async () => {
    if (openingShiftSubmitting) return;
    setOpeningShiftSubmitting(true);
    try {
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      const userId = (await getUserId()) ?? 0;
      const body = {
        userId: Number(userId || 0),
        openingCash: Number(parseFloat(openingCashInput || '0')) || 0,
        shopId: Number(shopId || 0),
      };
      try { console.log('[OpenShift] payload:', body); } catch {}
      const res = await fetch(`${API_URL}/api/shifts/open-shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      try { console.log('[OpenShift] status:', res.status, res.statusText); } catch {}
      try { console.log('[OpenShift] response:', json); } catch {}
      if (!res.ok) {
        const txt = typeof json === 'object' ? JSON.stringify(json) : String(json);
        throw new Error(txt || 'Mở ca thất bại');
      }
      const envelope = json && typeof json === 'object' && 'data' in json ? json.data : json;
      // Expected shape:
      // { shiftId, userId, startDate, closedDate, status, revenue, openingCash, shopId }
      const newShiftId = Number(envelope?.shiftId ?? 0);
      if (!newShiftId) {
        throw new Error('Phản hồi mở ca không có shiftId');
      }
      await setShiftId(newShiftId);
      try { console.log('[OpenShift] saved shiftId:', newShiftId); } catch {}
      setOpenShiftVisible(false);
      navigation.navigate('Order');
    } catch (e: any) {
      // When shop already has an open shift, fetch the latest shift and use its id
      const messageText = typeof e?.message === 'string' ? e.message : '';
      const alreadyOpenHint = 'already has an open shift';
      if (messageText.toLowerCase().includes(alreadyOpenHint)) {
        // Show localized message as requested
        Alert.alert('Thông báo', 'Bạn phải đóng ca hiện tại mới mở ca được');
      } else {
        Alert.alert('Lỗi', messageText || 'Không thể mở ca');
      }
    } finally {
      setOpeningShiftSubmitting(false);
    }
  }, [openingCashInput, openingShiftSubmitting, navigation]);

  if (keyboardVisible) {
    return null;
  }

  return (
    <View style={styles.scanButtonContainer}>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={handleOrderPress}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Modal visible={openShiftVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.osOverlay}>
          <View style={styles.osCard}>
            <Text style={styles.osTitle}>Mở ca làm việc</Text>
            <Text style={styles.osSubtitle}>Nhập tiền đầu ca (có thể để 0)</Text>
            <View style={styles.osInputRow}>
              <Text style={styles.osCurrency}>đ</Text>
              <TextInput
                style={styles.osInput}
                keyboardType="numeric"
                value={openingCashInput}
                onChangeText={setOpeningCashInput}
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.osActions}>
              <TouchableOpacity style={styles.osCancelBtn} onPress={() => setOpenShiftVisible(false)} disabled={openingShiftSubmitting}>
                <Text style={styles.osCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.osConfirmBtn} onPress={handleOpenShift} disabled={openingShiftSubmitting}>
                <Text style={styles.osConfirmText}>{openingShiftSubmitting ? 'Đang mở...' : 'Mở ca'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const BottomNavigation = () => {
  return (
    <>
      <Tab.Navigator
        initialRouteName="TrangChu"
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: '#009DA5',
          tabBarInactiveTintColor: '#757575',
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 65,
            paddingBottom: 10,
            backgroundColor: '#FFFFFF',
            position: 'relative',
            borderTopWidth: 1,
            borderTopColor: '#E5E5E5',
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerRight: () => <NotificationIcon />,
        })}
      >
        <Tab.Screen
          name="TrangChu"
          component={HomeScreen}
          options={{
            title: 'Trang chủ',
            tabBarLabel: 'Trang chủ',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home-outline" color={color} size={24} />
            ),
          }}
        />
        <Tab.Screen
          name="HoaDon"
          component={BillsScreen}
          options={{
            title: 'Hóa đơn',
            tabBarLabel: 'Hóa đơn',
            tabBarIcon: ({ color, size }) => (
              <Icon name="receipt" color={color} size={24} />
            ),
          }}
        />
        <Tab.Screen
          name="LenDon"
          component={HomeScreen}
          options={{
            tabBarButton: () => <AddOrderButton />,
          }}
        />
        <Tab.Screen
          name="HangHoa"
          component={ProductsScreen}
          options={{
            title: 'Hàng hóa',
            tabBarLabel: 'Hàng hóa',
            tabBarIcon: ({ color, size }) => (
              <Icon name="cube-outline" color={color} size={24} />
            ),
          }}
        />
        <Tab.Screen
          name="NhieuHon"
          component={MoreScreen}
          options={{
            title: 'Nhiều hơn',
            tabBarLabel: 'Nhiều hơn',
            tabBarIcon: ({ color, size }) => (
              <Icon name="menu" color={color} size={24} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  scanButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  scanButton: {
    backgroundColor: '#009DA5',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  osOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  osCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 380,
  },
  osTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  osSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  osInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  osCurrency: {
    fontSize: 16,
    color: '#009DA5',
    fontWeight: 'bold',
    marginRight: 6,
  },
  osInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  osActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  osCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  osCancelText: {
    color: '#666',
    fontSize: 16,
  },
  osConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#009DA5',
    alignItems: 'center',
  },
  osConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

});

export default BottomNavigation;