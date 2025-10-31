import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import API_URL from '../config/api';
import { handle403Error } from '../utils/apiErrorHandler';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

const VoucherScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [searchText, setSearchText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vouchers, setVouchers] = useState<Array<{ voucherId: number; value: number; type: number; code: string; expired: string; createdAt: string }>>([]);
  // Form state
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<1 | 2>(1); // 1 money, 2 percent
  const [expireDate, setExpireDate] = useState(''); // YYYY-MM-DD
  const [expireTime, setExpireTime] = useState(''); // HH:mm
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback(() => {
    if (!code.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập mã voucher'); return false; }
    if (!/^[A-Z0-9]+$/.test(code.trim())) { Alert.alert('Lỗi', 'Mã chỉ gồm CHỮ HOA và SỐ, không dấu'); return false; }
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(num) || num <= 0) { Alert.alert('Lỗi', 'Giá trị phải là số dương'); return false; }
    if (type === 2 && (num < 1 || num > 100)) { Alert.alert('Lỗi', 'Phần trăm phải từ 1 đến 100'); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expireDate.trim())) { Alert.alert('Lỗi', 'Ngày hết hạn phải theo định dạng YYYY-MM-DD'); return false; }
    if (expireTime && !/^\d{2}:\d{2}$/.test(expireTime.trim())) { Alert.alert('Lỗi', 'Giờ hết hạn phải theo định dạng HH:mm'); return false; }
    return true;
  }, [code, value, type, expireDate, expireTime]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const expiredIso = (() => {
        try {
          const time = (expireTime || '23:59').padStart(5, '0');
          const d = new Date(`${expireDate}T${time}:00`);
          return d.toISOString();
        } catch { return new Date().toISOString(); }
      })();
      const payload = {
        value: type === 2 ? Math.round(parseFloat(value) * 100) / 100 : Math.round(parseFloat(value)),
        createdAt: new Date().toISOString(),
        type,
        expired: expiredIso,
        shopId,
        code: code.trim(),
      } as any;
      try { console.log('[Voucher/Create] payload:', payload); } catch {}
      const res = await fetch(`${API_URL}/api/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (handle403Error(res, navigation)) return;
      const data = await res.json().catch(() => ({}));
      try { console.log('[Voucher/Create] status:', res.status, res.statusText, data); } catch {}
      if (!res.ok) { Alert.alert('Lỗi', data?.message || 'Tạo voucher thất bại'); return; }
      Alert.alert('Thành công', 'Đã tạo phiếu quà tặng');
      setIsCreateOpen(false);
      setCode(''); setValue(''); setType(1); setExpireDate(''); setExpireTime('');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, value, type, expireDate, expireTime, code]);

  const loadVouchers = useCallback(async () => {
    try {
      setIsLoading(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const url = `${API_URL}/api/vouchers?ShopId=${shopId}&page=1&pageSize=100`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (handle403Error(res, navigation)) return;
      const data = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const mapped = items.map((v: any) => ({
        voucherId: Number(v.voucherId ?? v.id ?? 0),
        value: Number(v.value ?? 0),
        type: Number(v.type ?? 1),
        code: String(v.code ?? ''),
        expired: String(v.expired ?? ''),
        createdAt: String(v.createdAt ?? ''),
      }));
      setVouchers(mapped);
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const filtered = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return vouchers;
    return vouchers.filter(v => v.code.toLowerCase().includes(term));
  }, [vouchers, searchText]);

  const renderVoucher = ({ item }: { item: typeof vouchers[number] }) => {
    const isPercent = item.type === 2;
    const valueText = isPercent ? `${item.value}%` : `${item.value.toLocaleString('vi-VN')}₫`;
    const expiredLocal = (() => { try { return new Date(item.expired).toLocaleString('vi-VN'); } catch { return item.expired; } })();
    return (
      <View style={styles.voucherItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.voucherCode}>{item.code}</Text>
          <Text style={styles.voucherMeta}>HSD: {expiredLocal}</Text>
        </View>
        <View style={styles.voucherValueBadge}>
          <Text style={styles.voucherValueText}>{valueText}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phiếu quà tặng</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search + Add */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { flex: 1 }] }>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm voucher..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateOpen(true)}>
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 16 }}>
          {isLoading ? (
            <Text style={{ textAlign: 'center', color: '#666' }}>Đang tải voucher...</Text>
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: '#666' }}>{searchText ? 'Không tìm thấy voucher' : 'Chưa có voucher'}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => String(it.voucherId)}
              renderItem={renderVoucher}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Create Modal */}
      <Modal visible={isCreateOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setIsCreateOpen(false)}>
        <View style={styles.createOverlay}>
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>Tạo phiếu quà tặng</Text>
              <TouchableOpacity style={styles.createCloseBtn} onPress={() => setIsCreateOpen(false)}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <View style={styles.card}>
                  <Text style={styles.label}>Mã voucher (chữ in hoa, không dấu và số) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="VD: SUMMER50"
                  />

                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>Loại <Text style={styles.required}>*</Text></Text>
                      <View style={styles.segmentRow}>
                        <TouchableOpacity style={[styles.segment, type === 1 && styles.segmentActive]} onPress={() => setType(1)}>
                          <Text style={[styles.segmentText, type === 1 && styles.segmentTextActive]}>Tiền</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.segment, type === 2 && styles.segmentActive]} onPress={() => setType(2)}>
                          <Text style={[styles.segmentText, type === 2 && styles.segmentTextActive]}>%</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>Giá trị {type === 2 ? '(%)' : '(VND)'} <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={(t) => setValue(t.replace(/[^\d.]/g, ''))}
                        keyboardType="numeric"
                        placeholder={type === 2 ? '1-100' : 'Số tiền'}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Thời hạn hết hạn <Text style={styles.required}>*</Text></Text>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <TextInput style={styles.input} value={expireDate} onChangeText={setExpireDate} placeholder="YYYY-MM-DD" />
                    </View>
                    <View style={styles.half}>
                      <TextInput style={styles.input} value={expireTime} onChangeText={setExpireTime} placeholder="HH:mm (tuỳ chọn)" />
                    </View>
                  </View>
                  <View style={styles.quickRow}>
                    <TouchableOpacity style={styles.quickChip} onPress={() => {
                      const d = new Date(); d.setDate(d.getDate() + 7);
                      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
                      setExpireDate(`${y}-${m}-${day}`); setExpireTime('23:59');
                    }}>
                      <Text style={styles.quickText}>+7 ngày</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickChip} onPress={() => {
                      const d = new Date(); d.setMonth(d.getMonth() + 1);
                      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
                      setExpireDate(`${y}-${m}-${day}`); setExpireTime('23:59');
                    }}>
                      <Text style={styles.quickText}>+1 tháng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickChip} onPress={() => {
                      const d = new Date(); d.setMonth(d.getMonth() + 3);
                      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
                      setExpireDate(`${y}-${m}-${day}`); setExpireTime('23:59');
                    }}>
                      <Text style={styles.quickText}>+3 tháng</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={submit} disabled={isSubmitting}>
                    <Text style={styles.submitText}>{isSubmitting ? 'Đang lưu...' : 'Tạo voucher'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009DA5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 6 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16 },
  label: { fontSize: 14, color: '#000', marginBottom: 8, fontWeight: '500' },
  required: { color: '#E53935', fontWeight: 'bold' },
  input: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', overflow: 'hidden', marginBottom: 12 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#009DA5' },
  segmentText: { color: '#333', fontWeight: '600' },
  segmentTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: '#009DA5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  // modal styles
  createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  createCard: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 520, borderRadius: 16, overflow: 'hidden' },
  createHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  createTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  createCloseBtn: { position: 'absolute', right: 8, top: 8, padding: 8 },
  voucherItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E5E5' },
  voucherCode: { fontSize: 16, fontWeight: '700', color: '#000' },
  voucherMeta: { fontSize: 12, color: '#666', marginTop: 4 },
  voucherValueBadge: { backgroundColor: '#009DA5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  voucherValueText: { color: '#FFFFFF', fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickChip: { backgroundColor: '#F0F9FA', borderColor: '#009DA5', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  quickText: { color: '#009DA5', fontWeight: '700', fontSize: 12 },
});

export default VoucherScreen;

