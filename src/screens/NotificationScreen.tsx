import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationItem = ({ icon, color, title, description, time }) => (
  <TouchableOpacity style={styles.notificationItem}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={24} color="#FFFFFF" />
    </View>
    <View style={styles.notificationContent}>
      <Text style={styles.notificationTitle}>{title}</Text>
      <Text style={styles.notificationDescription}>{description}</Text>
      <Text style={styles.notificationTime}>{time}</Text>
    </View>
  </TouchableOpacity>
);

const NotificationScreen = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack(); // Sử dụng goBack() để quay lại màn hình trước đó
  };

  const notifications = [
    {
      icon: 'package-variant',
      color: '#4CAF50',
      title: 'Xuất kho thành công',
      description: 'Đã xuất xong đường cho đơn hàng #DH001',
      time: '2 phút trước',
    },
    {
      icon: 'clock-outline',
      color: '#FFC107',
      title: 'Hẹn giờ kiểm kho',
      description: 'Kiểm kho định kỳ sẽ bắt đầu lúc 14:00',
      time: '3 phút trước',
    },
    {
      icon: 'alert-outline',
      color: '#F44336',
      title: 'Cảnh báo tồn kho',
      description: 'Nguyên liệu bột mì sắp hết (còn 5kg)',
      time: '5 phút trước',
    },
    {
      icon: 'check-circle-outline',
      color: '#2196F3',
      title: 'Đặt hàng thành công',
      description: 'Đã đặt xong đường thành công từ nhà cung cấp NCC XYZ',
      time: 'Hôm qua',
    },
    {
      icon: 'bell-outline',
      color: '#FF9800',
      title: 'Nhắc nhở đặt hàng',
      description: 'Đặt 30 thùng nước suối Aquafina 500ml từ nhà cung cấp ABC',
      time: 'Hôm qua',
    },
    {
      icon: 'close-circle-outline',
      color: '#E91E63',
      title: 'Đặt hàng thất bại',
      description: 'Nhà cung cấp đã hủy đơn hàng 5 thùng mì Kokomi',
      time: 'Hôm qua',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="chevron-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Hôm nay</Text>
        {notifications.slice(0, 3).map((notification, index) => (
          <NotificationItem key={`today-${index}`} {...notification} />
        ))}

        <Text style={styles.sectionTitle}>Hôm qua</Text>
        {notifications.slice(3).map((notification, index) => (
          <NotificationItem key={`yesterday-${index}`} {...notification} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
});

export default NotificationScreen;