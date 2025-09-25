import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

interface MenuItem {
  id: number;
  title: string;
  onPress: () => void;
}

const MoreScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const menuItems: MenuItem[] = [
    { id: 1, title: 'Chat với AI', onPress: () => navigation.navigate('ChatbotScreen') },
    { id: 2, title: 'Nhập hàng', onPress: () => navigation.navigate('AddProduct') },
    { id: 3, title: 'Phiếu quà tặng', onPress: () => navigation.navigate('VoucherScreen') },
    { id: 4, title: 'Khuyến mãi', onPress: () => navigation.navigate('PromotionScreen') },
    { id: 5, title: 'Lịch sử kho', onPress: () => navigation.navigate('InventoryTransactionScreen') },
    { id: 6, title: 'Khách hàng', onPress: () => navigation.navigate('ManageCustomerScreen') },
    { id: 7, title: 'Danh mục sản phẩm', onPress: () => navigation.navigate('ManageCategoryScreen') },
    { id: 8, title: 'Lịch sử hoạt động', onPress: () => navigation.navigate('LogActivityScreen') },
    { id: 9, title: 'Quản lý tài khoản', onPress: () => navigation.navigate('ManageAccount') },
    { id: 10, title: 'Đóng ca', onPress: () => console.log('Đóng ca') },
    { id: 11, title: 'Báo cáo', onPress: () => navigation.navigate('ReportScreen') },
    { id: 12, title: 'Cài đặt', onPress: () => navigation.navigate('SettingScreen') },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
      <Text style={styles.menuText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menuItems.map(renderMenuItem)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#E5E5E5',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
});

export default MoreScreen;
