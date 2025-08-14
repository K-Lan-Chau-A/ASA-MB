import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
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
    { id: 2, title: 'Đặt hàng', onPress: () => console.log('Đặt hàng') },
    { id: 3, title: 'Trả hàng', onPress: () => console.log('Trả hàng') },
    { id: 4, title: 'Quản lý ca', onPress: () => console.log('Quản lý ca') },
    { id: 5, title: 'Kiểm kho', onPress: () => console.log('Kiểm kho') },
    { id: 6, title: 'Khách hàng', onPress: () => console.log('Khách hàng') },
    { id: 7, title: 'Nhà cung cấp', onPress: () => console.log('Nhà cung cấp') },
    { id: 8, title: 'Trả hàng nhập', onPress: () => console.log('Trả hàng nhập') },
    { id: 9, title: 'Xuất hủy', onPress: () => console.log('Xuất hủy') },
    { id: 10, title: 'Sổ quỹ', onPress: () => console.log('Sổ quỹ') },
    { id: 11, title: 'Báo cáo', onPress: () => console.log('Báo cáo') },
    { id: 12, title: 'Cài đặt', onPress: () => console.log('Cài đặt') },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
      <Text style={styles.menuText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
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
