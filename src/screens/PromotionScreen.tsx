import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

const PromotionScreen = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD
  const [startTime, setStartTime] = useState(''); // HH:mm or custom
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<1 | 2>(1); // 1: amount, 2: percent
  const [value, setValue] = useState(''); // numeric string
  const [allProducts, setAllProducts] = useState<Array<{ id: number; name: string; categoryName: string }>>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categories, setCategories] = useState<Array<{ categoryId: number; categoryName: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Load product options
  useEffect(() => {
    const load = async () => {
      try {
        const shopId = (await getShopId()) ?? 0;
        const token = await getAuthToken();
        if (!shopId) return;
        const url = `${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=200`;
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const data = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const mapped = items.map((p: any, idx: number) => ({ id: Number(p.id ?? p.productId ?? idx + 1), name: String(p.productName ?? p.name ?? 'Sản phẩm'), categoryName: String(p.categoryName ?? 'Chưa phân loại') }));
        setAllProducts(mapped);
        // Load categories
        try {
          const cRes = await fetch(`${API_URL}/api/categories?ShopId=${shopId}&page=1&pageSize=100`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          const cData = await cRes.json().catch(() => ({}));
          const cItems: any[] = Array.isArray(cData?.items) ? cData.items : [];
          const mappedCats = cItems.map((c: any) => ({ categoryId: Number(c.categoryId ?? 0), categoryName: String(c.categoryName ?? '') })).filter((c: any) => c.categoryName);
          setCategories(mappedCats);
        } catch {}
      } catch {}
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return allProducts.filter(p => {
      const matchSearch = term ? (p.name.toLowerCase().includes(term)) : true;
      const matchCategory = selectedCategory === 'Tất cả' ? true : p.categoryName === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [allProducts, productSearch, selectedCategory]);

  const validate = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên chương trình khuyến mãi');
      return false;
    }
    if (!startDate.trim() || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate.trim())) {
      Alert.alert('Lỗi', 'Ngày bắt đầu phải có định dạng YYYY-MM-DD');
      return false;
    }
    if (!endDate.trim() || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(endDate.trim())) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải có định dạng YYYY-MM-DD');
      return false;
    }
    const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert('Lỗi', 'Giá trị khuyến mãi phải là số dương');
      return false;
    }
    if (type === 2) {
      if (numericValue < 1 || numericValue > 100) {
        Alert.alert('Lỗi', 'Khuyến mãi theo % phải từ 1 đến 100');
        return false;
      }
    }
    if (selectedProductIds.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập danh sách sản phẩm (ID) áp dụng');
      return false;
    }
    return true;
  }, [name, startDate, endDate, value, type, selectedProductIds]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const payload = {
        shopId,
        name: name.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        value: type === 2 ? Math.round(parseFloat(value) * 100) / 100 : Math.round(parseFloat(value)),
        type,
        productIds: selectedProductIds,
      } as any;

      try {
        console.log('[Promotion/Create] payload:', payload);
      } catch {}

      const res = await fetch(`${API_URL}/api/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      try {
        console.log('[Promotion/Create] status:', res.status, res.statusText);
        console.log('[Promotion/Create] response:', data);
      } catch {}
      if (!res.ok) {
        const message = data?.message || 'Tạo khuyến mãi thất bại';
        Alert.alert('Lỗi', message);
        return;
      }
      Alert.alert('Thành công', 'Đã tạo khuyến mãi');
      // Reset form
      setName('');
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setType(1);
      setValue('');
      setSelectedProductIds([]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, name, startDate, endDate, startTime, endTime, type, value, selectedProductIds]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      {/* Header */}
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khuyến mãi</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search and Add */}
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { flex: 1 }]}>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm khuyến mãi..."
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateOpen(true)}>
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Placeholder list / empty state could go here */}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Modal */}
      <Modal
        visible={isCreateOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsCreateOpen(false)}
      >
        <View style={styles.createOverlay}>
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>Tạo khuyến mãi</Text>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)} style={styles.createCloseBtn}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <View style={styles.card}>
            <Text style={styles.label}>Tên chương trình <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ví dụ: Giảm giá hè" />

            <View style={styles.row}>
              <View style={styles.half}> 
                <Text style={styles.label}>Ngày bắt đầu (YYYY-MM-DD) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2025-01-01" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Ngày kết thúc (YYYY-MM-DD) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2025-01-31" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}> 
                <Text style={styles.label}>Giờ bắt đầu</Text>
                <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="08:00" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Giờ kết thúc</Text>
                <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="21:00" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}> 
                <Text style={styles.label}>Loại khuyến mãi <Text style={styles.required}>*</Text></Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[styles.segment, type === 1 && styles.segmentActive]}
                    onPress={() => setType(1)}
                  >
                    <Text style={[styles.segmentText, type === 1 && styles.segmentTextActive]}>Giảm số tiền</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segment, type === 2 && styles.segmentActive]}
                    onPress={() => setType(2)}
                  >
                    <Text style={[styles.segmentText, type === 2 && styles.segmentTextActive]}>Giảm %</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Giá trị <Text style={styles.required}>*</Text> {type === 2 ? '(%)' : '(VND)'}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(t) => setValue(t.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={type === 2 ? 'Nhập % (1-100)' : 'Nhập số tiền'}
            />

            <Text style={styles.label}>Sản phẩm áp dụng <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.dropdownInput} onPress={() => setIsProductModalOpen(true)}>
              <Text style={styles.dropdownText}>
                {selectedProductIds.length > 0
                  ? `${selectedProductIds.length} sản phẩm đã chọn`
                  : 'Chọn sản phẩm'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Modal visible={isProductModalOpen} transparent animationType="fade" onRequestClose={() => setIsProductModalOpen(false)}>
              <View style={styles.modalOverlay}> 
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chọn sản phẩm</Text>
                    <TouchableOpacity onPress={() => setIsProductModalOpen(false)}>
                      <Icon name="close" size={22} color="#666" />
                    </TouchableOpacity>
                  </View>
                   {/* Category filter chips */}
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                     {['Tất cả', ...categories.map(c => c.categoryName)].map((cat) => (
                       <TouchableOpacity key={cat} style={[styles.catChip, selectedCategory === cat && styles.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                         <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                       </TouchableOpacity>
                     ))}
                   </ScrollView>

                   {/* Search bar */}
                   <View style={[styles.searchContainer, { marginHorizontal: 8, marginBottom: 8 }]}>
                     <Icon name="magnify" size={18} color="#666" />
                     <TextInput
                       style={[styles.searchInput, { paddingVertical: 8 }]}
                       placeholder="Tìm sản phẩm..."
                       value={productSearch}
                       onChangeText={setProductSearch}
                     />
                   </View>

                   <ScrollView style={{ maxHeight: 360 }}>
                     {filteredProducts.map((p) => {
                      const checked = selectedProductIds.includes(p.id);
                      return (
                        <TouchableOpacity key={p.id} style={styles.optionRow} onPress={() => {
                          setSelectedProductIds((prev) => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                        }}>
                          <Text style={styles.optionText}>{p.name}</Text>
                          {checked ? <Icon name="checkbox-marked" size={20} color="#009DA5" /> : <Icon name="checkbox-blank-outline" size={20} color="#999" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setIsProductModalOpen(false)}>
                    <Text style={styles.modalPrimaryText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

                  <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={submit} disabled={isSubmitting}>
                    <Text style={styles.submitText}>{isSubmitting ? 'Đang lưu...' : 'Tạo khuyến mãi'}</Text>
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
  content: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009DA5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 6 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16 },
  modalHeaderInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  label: { fontSize: 14, color: '#000', marginBottom: 8, fontWeight: '500' },
  required: { color: '#E53935', fontWeight: 'bold' },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    marginBottom: 12,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#009DA5' },
  segmentText: { color: '#333', fontWeight: '600' },
  segmentTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: '#009DA5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  dropdownInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  dropdownText: { fontSize: 16, color: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', maxWidth: 420, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  optionText: { fontSize: 14, color: '#333' },
  modalPrimaryBtn: { backgroundColor: '#009DA5', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  modalPrimaryText: { color: '#FFF', fontWeight: 'bold' },
  // New create modal styles
  createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  createCard: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 520, borderRadius: 16, overflow: 'hidden' },
  createHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  createTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  createCloseBtn: { position: 'absolute', right: 8, top: 8, padding: 8 },
  catChips: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5', marginRight: 6 },
  catChipActive: { backgroundColor: '#009DA5', borderColor: '#009DA5' },
  catChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  catChipTextActive: { color: '#FFFFFF' },
});

export default PromotionScreen;


