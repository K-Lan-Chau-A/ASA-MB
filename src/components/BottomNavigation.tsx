import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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

  const handleOrderPress = () => {
    navigation.navigate('Order');
  };

  return (
    <View style={styles.scanButtonContainer}>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={handleOrderPress}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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

});

export default BottomNavigation;