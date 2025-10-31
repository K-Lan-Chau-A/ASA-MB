import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getAuthToken, getShiftId, refreshOpenShiftId, clearShiftId, logoutLocal } from '../services/AuthStore';
import { handle403Error } from '../utils/apiErrorHandler';
import { navigateIfAuthorized } from '../utils/navigationGuard';

interface MenuItem {
  id: number;
  title: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  onPress: () => void;
}

const MoreScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [closeModalVisible, setCloseModalVisible] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const handleCloseShiftPress = React.useCallback(() => {
    setCloseModalVisible(true);
  }, []);

  const doCloseShift = React.useCallback(async () => {
    try {
      setClosing(true);
      let shiftId = await getShiftId();
      if (!shiftId) {
        const refreshed = await refreshOpenShiftId();
        shiftId = refreshed ?? 0;
      }
      if (!shiftId || shiftId <= 0) {
        Alert.alert('Thông báo', 'Không tìm thấy ca đang mở để đóng.');
        setCloseModalVisible(false);
        return;
      }
      const token = await getAuthToken();
      const payload = { shiftId };
      try { console.log('[CloseShift] payload:', payload); } catch {}
      const res = await fetch(`${API_URL}/api/shifts/close-shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (handle403Error(res, navigation)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Đóng ca thất bại. Vui lòng thử lại.';
        Alert.alert('Lỗi', msg);
        return;
      }
      const closedShiftId = Number(data?.shiftId ?? (await getShiftId()) ?? 0);
      Alert.alert(
        'Thành công',
        'Đã đóng ca.',
        [
          { text: 'Để sau', style: 'cancel', onPress: () => setCloseModalVisible(false) },
          { text: 'Xem báo cáo chốt ca', onPress: () => {
              setCloseModalVisible(false);
              // @ts-ignore - name matches RootStackParamList in app routing
              navigation.navigate('CloseShiftReportScreen' as any, { shiftId: closedShiftId });
            }
          },
        ]
      );
      // Clear shiftId so app requires opening a new shift next time
      try { await clearShiftId(); console.log('[CloseShift] cleared local shiftId'); } catch {}
      setCloseModalVisible(false);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setClosing(false);
    }
  }, []);

  const menuItems: MenuItem[] = [
    { 
      id: 1, 
      title: 'Chat với AI', 
      icon: 'robot', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigation.navigate('ChatbotScreen') 
    },
    { 
      id: 2, 
      title: 'Nhập hàng', 
      icon: 'package-variant-closed', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'AddProduct', { buildUrl: (sid) => `${API_URL}/api/categories?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 3, 
      title: 'Phiếu quà tặng', 
      icon: 'gift', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'VoucherScreen', { buildUrl: (sid) => `${API_URL}/api/vouchers?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 4, 
      title: 'Khuyến mãi', 
      icon: 'sale', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'PromotionScreen', { buildUrl: (sid) => `${API_URL}/api/promotions?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 5, 
      title: 'Lịch sử kho', 
      icon: 'history', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'InventoryTransactionScreen', { buildUrl: (sid) => `${API_URL}/api/inventory-transactions?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 6, 
      title: 'Khách hàng', 
      icon: 'account-group', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'ManageCustomerScreen', { buildUrl: (sid) => `${API_URL}/api/customers?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 7, 
      title: 'Danh mục sản phẩm', 
      icon: 'view-grid', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'ManageCategoryScreen', { buildUrl: (sid) => `${API_URL}/api/categories?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 8, 
      title: 'Lịch sử hoạt động', 
      icon: 'clipboard-text-clock', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'LogActivityScreen', { buildUrl: (sid) => `${API_URL}/api/log-activities?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 9, 
      title: 'Quản lý nhân viên', 
      icon: 'account-tie', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigation.navigate('ManageAccount') 
    },
    { 
      id: 10, 
      title: 'Quản lý xếp hạng', 
      icon: 'medal', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'RankScreen', { buildUrl: (sid) => `${API_URL}/api/ranks?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 11, 
      title: 'Đóng ca', 
      icon: 'lock-clock', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: handleCloseShiftPress 
    },
    { 
      id: 12, 
      title: 'Báo cáo', 
      icon: 'chart-box', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'ReportScreen', { buildUrl: (sid) => `${API_URL}/api/reports?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 13, 
      title: 'Cài đặt', 
      icon: 'cog', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: () => navigateIfAuthorized(navigation, 'SettingScreen', { buildUrl: (sid) => `${API_URL}/api/shops?ShopId=${sid}&page=1&pageSize=1` }) 
    },
    { 
      id: 14, 
      title: 'Đăng xuất', 
      icon: 'logout', 
      iconColor: '#009DA5', 
      bgColor: '#FFFFFF',
      onPress: async () => {
        try {
          await logoutLocal();
        } finally {
          // Reset navigation to Login screen
          // @ts-ignore - name matches RootStackParamList
          navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
        }
      }
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.menuItem} 
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Icon name={item.icon} size={24} color={item.iconColor} />
      <Text style={styles.menuText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuGrid}>
          {menuItems.map(renderMenuItem)}
        </View>
      </ScrollView>
      <Modal visible={closeModalVisible} transparent animationType="fade" onRequestClose={() => setCloseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đóng ca</Text>
            <Text style={styles.modalText}>Bạn có chắc chắn muốn đóng ca hiện tại?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setCloseModalVisible(false)} disabled={closing}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalPrimary]} onPress={doCloseShift} disabled={closing}>
                {closing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalPrimaryText}>Đồng ý</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 90,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', maxWidth: 420, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#333', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancel: { backgroundColor: '#F0F0F0' },
  modalCancelText: { color: '#333', fontWeight: '700' },
  modalPrimary: { backgroundColor: '#009DA5' },
  modalPrimaryText: { color: '#FFF', fontWeight: '700' },
});

export default MoreScreen;
