import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getAuthToken, getShiftId, refreshOpenShiftId, clearShiftId, logoutLocal } from '../services/AuthStore';

interface MenuItem {
  id: number;
  title: string;
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Đóng ca thất bại. Vui lòng thử lại.';
        Alert.alert('Lỗi', msg);
        return;
      }
      Alert.alert('Thành công', 'Đã đóng ca.');
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
    { id: 1, title: 'Chat với AI', onPress: () => navigation.navigate('ChatbotScreen') },
    { id: 2, title: 'Nhập hàng', onPress: () => navigation.navigate('AddProduct') },
    { id: 3, title: 'Phiếu quà tặng', onPress: () => navigation.navigate('VoucherScreen') },
    { id: 4, title: 'Khuyến mãi', onPress: () => navigation.navigate('PromotionScreen') },
    { id: 5, title: 'Lịch sử kho', onPress: () => navigation.navigate('InventoryTransactionScreen') },
    { id: 6, title: 'Khách hàng', onPress: () => navigation.navigate('ManageCustomerScreen') },
    { id: 7, title: 'Danh mục sản phẩm', onPress: () => navigation.navigate('ManageCategoryScreen') },
    { id: 8, title: 'Lịch sử hoạt động', onPress: () => navigation.navigate('LogActivityScreen') },
    { id: 9, title: 'Quản lý nhân viên', onPress: () => navigation.navigate('ManageAccount') },
    { id: 10, title: 'Đóng ca', onPress: handleCloseShiftPress },
    { id: 11, title: 'Báo cáo', onPress: () => navigation.navigate('ReportScreen') },
    { id: 12, title: 'Cài đặt', onPress: () => navigation.navigate('SettingScreen') },
    { id: 13, title: 'Đăng xuất', onPress: async () => {
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
