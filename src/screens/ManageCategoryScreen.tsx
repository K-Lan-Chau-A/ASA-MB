import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

interface CategoryItem { categoryId: number; categoryName: string; description?: string }

const ManageCategoryScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => { setEditing(null); setName(''); setDesc(''); setIsModalOpen(true); };
  const openEdit = (cat: CategoryItem) => { setEditing(cat); setName(cat.categoryName); setDesc(cat.description || ''); setIsModalOpen(true); };

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/categories?shopId=${shopId}&page=1&pageSize=100`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json().catch(() => ({}));
      const arr: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const mapped: CategoryItem[] = arr.map((c: any) => ({ categoryId: Number(c.categoryId ?? 0), categoryName: String(c.categoryName ?? ''), description: c.description ? String(c.description) : undefined }));
      setItems(mapped);
    } catch { setItems([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.categoryName.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [items, search]);

  const submit = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục'); return; }
    try {
      setIsSubmitting(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const payload = { categoryName: name.trim(), description: desc.trim(), shopId } as any;
      const url = editing ? `${API_URL}/api/categories/${editing.categoryId}` : `${API_URL}/api/categories`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { Alert.alert('Lỗi', data?.message || (editing ? 'Cập nhật thất bại' : 'Tạo danh mục thất bại')); return; }
      setIsModalOpen(false); setName(''); setDesc(''); setEditing(null); load();
    } catch { Alert.alert('Lỗi', 'Không thể kết nối máy chủ'); }
    finally { setIsSubmitting(false); }
  }, [name, desc, editing, load]);

  const renderItem = ({ item }: { item: CategoryItem }) => (
    <TouchableOpacity style={styles.item} onPress={() => openEdit(item)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.categoryName}</Text>
        {!!item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
      </View>
      <Icon name="chevron-right" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh mục sản phẩm</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { flex: 1 }]}>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput style={styles.searchInput} placeholder="Tìm danh mục..." value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 6 }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {isLoading ? (
          <ActivityIndicator color="#009DA5" />
        ) : (
          <FlatList data={filtered} keyExtractor={(i) => String(i.categoryId)} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
        )}
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editing ? 'Sửa danh mục' : 'Tạo danh mục'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.label}>Tên danh mục *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ví dụ: Nước giải khát" />
                <Text style={styles.label}>Mô tả</Text>
                <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="Mô tả ngắn" />
                <TouchableOpacity style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]} onPress={submit} disabled={isSubmitting}>
                  <Text style={styles.primaryText}>{isSubmitting ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Tạo danh mục')}</Text>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009DA5', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  itemName: { fontSize: 16, color: '#000', fontWeight: '600' },
  itemDesc: { fontSize: 12, color: '#666', marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  label: { fontSize: 14, color: '#000', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#009DA5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default ManageCategoryScreen;

