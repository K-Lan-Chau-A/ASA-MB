import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Modal, Text, SafeAreaView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList, TabParamList } from '../types/navigation';

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
  const [showModal, setShowModal] = useState(false);

  const handleScanPress = () => {
    setShowModal(false);
    navigation.navigate('Scanner');
  };

  const handleOrderPress = () => {
    setShowModal(false);
    navigation.navigate('Order');
  };

  return (
    <>
      <View style={styles.scanButtonContainer}>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setShowModal(true)}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lên đơn bán hàng</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleScanPress}
            >
              <Icon name="qrcode-scan" size={24} color="#009DA5" />
              <Text style={styles.modalOptionText}>Quét mã vạch</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleOrderPress}
            >
              <Icon name="cube-outline" size={24} color="#009DA5" />
              <Text style={styles.modalOptionText}>Chọn sản phẩm</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancel}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  modalCancel: {
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
});

export default BottomNavigation;