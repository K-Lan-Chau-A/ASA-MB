import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';
import { handle403Error } from '../utils/apiErrorHandler';

interface CustomerItem {
  id?: number;
  fullName: string;
  phone?: string;
  email?: string;
  spent?: number;
  gender?: number;
  birthday?: string;
  rankid?: string;
  rankName?: string;
}

const CustomerScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<0 | 1 | 2>(0); // 0 unknown, 1 male, 2 female
  const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rank color logic removed: rank names will be rendered in default text color

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) { setCustomers([]); return; }
      const res = await fetch(`${API_URL}/api/customers?ShopId=${shopId}&page=1&pageSize=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (handle403Error(res, navigation)) return;
      const json = await res.json().catch(() => null);
      const items: any[] = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const mapped: CustomerItem[] = items.map((c: any) => ({
        id: Number(c?.customerId ?? c?.id ?? 0) || undefined,
        fullName: String(c?.fullName ?? ''),
        phone: c?.phone ? String(c.phone) : undefined,
        email: c?.email ? String(c.email) : undefined,
        spent: Number(c?.spent ?? 0),
        gender: typeof c?.gender === 'number' ? c.gender : undefined,
        birthday: c?.birthday ? String(c.birthday) : undefined,
        rankid: c?.rankid ? String(c.rankid) : undefined,
        rankName: c?.rankName ? String(c.rankName) : undefined,
      }));
      setCustomers(mapped);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.fullName.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  const submitCreate = useCallback(async () => {
    if (!fullName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập họ tên'); return; }
    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        rankid: 1,
        spent: 0,
        gender: Number(gender) || 0,
        birthday: birthday.trim() || undefined,
        status: 1,
        shopId,
      } as any;
      try { console.log('[Customer/Create] payload', payload); } catch {}
      const res = await fetch(`${API_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (handle403Error(res, navigation)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { Alert.alert('Lỗi', data?.message || 'Tạo khách hàng thất bại'); return; }
      Alert.alert('Thành công', 'Đã tạo khách hàng');
      setIsCreateOpen(false);
      setFullName(''); setPhone(''); setEmail(''); setGender(0); setBirthday('');
      fetchCustomers();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  }, [fullName, phone, email, gender, birthday, fetchCustomers]);

  const renderItem = ({ item }: { item: CustomerItem }) => {
    const genderText = typeof item.gender === 'number' ? (item.gender === 1 ? 'Nam' : 'Nữ') : undefined;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          // Pass selected customer back to Order screen
          if (item.id && item.id > 0) {
            navigation.navigate('Order', {
              customer: {
                id: item.id,
                fullName: item.fullName,
                phone: item.phone,
                email: item.email,
                // Also include fields used by InvoicePreview
                customerName: item.fullName,
                customerPhone: item.phone,
                customerEmail: item.email,
              } as any,
            });
          } else {
            navigation.navigate('Order', { customer: undefined });
          }
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.name}>{item.fullName || 'Khách lẻ'}</Text>
            {!!item.rankName && <Text style={styles.rankBadge}>{item.rankName}</Text>}
          </View>
          <View style={styles.subRow}>
            {!!genderText && (
              <View style={styles.subItem}>
                <Icon name={genderText === 'Nam' ? 'gender-male' : 'gender-female'} size={14} color="#666" />
                <Text style={styles.subText}>{genderText}</Text>
              </View>
            )}
            {!!item.phone && (
              <View style={styles.subItem}>
                <Icon name="phone" size={14} color="#666" />
                <Text style={styles.subText}>{item.phone}</Text>
              </View>
            )}
            {!!item.email && (
              <View style={styles.subItem}>
                <Icon name="email" size={14} color="#666" />
                <Text style={styles.subText}>{item.email}</Text>
              </View>
            )}
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={styles.spentLabel}>Đã tiêu: <Text style={styles.spentValue}>{(item.spent || 0).toLocaleString('vi-VN')} đồng</Text></Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn khách hàng</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { flex: 1 }]}>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, số điện thoại hoặc email"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsCreateOpen(true)}>
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 6 }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Order', { customer: undefined })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Khách lẻ</Text>
            <View style={styles.subRow}>
              <View style={styles.subItem}>
                <Icon name="account" size={14} color="#666" />
                <Text style={styles.subText}>Không lưu thông tin khách</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#009DA5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item.fullName}-${idx}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Create Modal */}
      <Modal visible={isCreateOpen} transparent animationType="fade" onRequestClose={() => setIsCreateOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Tạo khách hàng</Text>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.label}>Họ tên *</Text>
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" />

                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0987xxxxxx" keyboardType="phone-pad" />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" />

                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity style={[styles.segment, gender === 1 && styles.segmentActive]} onPress={() => setGender(1)}>
                    <Text style={[styles.segmentText, gender === 1 && styles.segmentTextActive]}>Nam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segment, gender === 2 && styles.segmentActive]} onPress={() => setGender(2)}>
                    <Text style={[styles.segmentText, gender === 2 && styles.segmentTextActive]}>Nữ</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Sinh nhật (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={birthday} onChangeText={setBirthday} placeholder="1990-01-01" />

                <TouchableOpacity style={styles.primaryBtn} onPress={submitCreate} disabled={isSubmitting}>
                  <Text style={styles.primaryText}>{isSubmitting ? 'Đang lưu...' : 'Tạo khách hàng'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#E5E5E5' },
  name: { fontSize: 16, color: '#000', fontWeight: '600' },
  subRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  subItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { fontSize: 12, color: '#666' },
  rankBadge: { fontSize: 12, fontWeight: '700' },
  spentLabel: { fontSize: 12, color: '#666' },
  spentValue: { fontSize: 14, color: '#009DA5', fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009DA5', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },

  // Modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  label: { fontSize: 14, color: '#000', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 12 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', overflow: 'hidden', marginBottom: 12 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#009DA5' },
  segmentText: { color: '#333', fontWeight: '600' },
  segmentTextActive: { color: '#FFF' },
  primaryBtn: { backgroundColor: '#009DA5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default CustomerScreen;
