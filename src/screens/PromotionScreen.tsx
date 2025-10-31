import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

const PromotionScreen = () => {
  const [name, setName] = useState('');
  // UI nhập theo dd/MM/yyyy. Khi submit sẽ convert sang yyyy-MM-dd
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Giờ nhập định dạng HH:mm; sẽ tự chèn ':' khi người dùng gõ
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<1 | 2>(1); // 1: amount, 2: percent
  const [value, setValue] = useState(''); // numeric string
  const [allProducts, setAllProducts] = useState<Array<{ id: number; productId: number; name: string; unitName: string; categoryName?: string }>>([]); // id = productUnitId
  const [productCategoryById, setProductCategoryById] = useState<Record<number, string>>({});
  const [selectedProductUnitIds, setSelectedProductUnitIds] = useState<number[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categories, setCategories] = useState<Array<{ categoryId: number; categoryName: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<number>(1); // 1: active, 0: inactive
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  // no local UI state for select-all; derive from current selection
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState<Array<{ promotionId: number; name: string; value: number; type: number; startDate: string; endDate: string; startTime?: string; endTime?: string; appliedProducts?: Array<{ productId: number; productName: string; unitName?: string }> }>>([]);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsOfPromotion, setProductsOfPromotion] = useState<string[]>([]);
  const [productsModalTitle, setProductsModalTitle] = useState<string>('Sản phẩm áp dụng');
  const [editingPromotion, setEditingPromotion] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletePromotionId, setDeletePromotionId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<number[]>([]);

  // Helpers: date/time input masks and validators
  const maskDateInput = useCallback((raw: string) => {
    const d = raw.replace(/[^0-9]/g, '').slice(0, 8); // ddMMyyyy (8 digits)
    let out = '';
    if (d.length <= 2) out = d;
    else if (d.length <= 4) out = `${d.slice(0,2)}/${d.slice(2)}`;
    else out = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
    return out;
  }, []);

  const isValidDateDMY = useCallback((val: string) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return false;
    const [dd, mm, yyyy] = val.split('/').map((x) => parseInt(x, 10));
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    const dt = new Date(yyyy, mm - 1, dd);
    return dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd;
  }, []);

  const toISODate = useCallback((dmy: string) => {
    // convert dd/MM/yyyy -> yyyy-MM-dd
    const [dd, mm, yyyy] = dmy.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const maskTimeInput = useCallback((raw: string) => {
    const s = raw.replace(/[^0-9]/g, '').slice(0, 4); // HHmm
    if (s.length <= 2) return s;
    return `${s.slice(0,2)}:${s.slice(2)}`;
  }, []);

  const isValidTime = useCallback((val: string) => {
    if (!/^\d{2}:\d{2}$/.test(val)) return false;
    const [hh, mm] = val.split(':').map((x) => parseInt(x, 10));
    return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
  }, []);

  const loadPromotions = useCallback(async () => {
    try {
      if (!refreshing) setIsLoading(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const url = `${API_URL}/api/promotions?ShopId=${shopId}&page=1&pageSize=100`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const mapped = items.map((p: any) => ({
        promotionId: Number(p.promotionId ?? p.id ?? 0),
        name: String(p.name ?? ''),
        value: Number(p.value ?? 0),
        type: Number(p.type ?? 1),
        startDate: String(p.startDate ?? ''),
        endDate: String(p.endDate ?? ''),
        startTime: p.startTime ? String(p.startTime) : undefined,
        endTime: p.endTime ? String(p.endTime) : undefined,
        appliedProducts: Array.isArray(p.appliedProducts)
          ? p.appliedProducts
              .map((ap: any) => ({
                productId: Number(ap.productId ?? ap.id ?? 0),
                productName: String(ap.productName ?? ap.name ?? ''),
                unitName: ap.unitName ? String(ap.unitName) : undefined,
              }))
              .filter((ap: any) => ap.productId > 0 && ap.productName)
          : undefined,
      }));
      setPromotions(mapped);
    } catch {
      setPromotions([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => { loadPromotions(); }, [loadPromotions]);

  const filteredPromotions = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return promotions;
    return promotions.filter(p => p.name.toLowerCase().includes(term));
  }, [promotions, searchText]);

  const openPromotionProducts = useCallback(async (promotionId: number, promotionName: string) => {
    try {
      setProductsModalTitle(`Sản phẩm áp dụng - ${promotionName}`);
      setProductsModalOpen(true);
      setProductsLoading(true);

      // Prefer in-memory data from promotions list (includes unitName)
      const p = promotions.find(pm => pm.promotionId === promotionId);
      if (p && Array.isArray(p.appliedProducts) && p.appliedProducts.length > 0) {
        const names = p.appliedProducts.map(ap => {
          const unit = ap.unitName ? ` (Đơn vị: ${ap.unitName})` : '';
          return `${ap.productName}${unit}`;
        });
        setProductsOfPromotion(names);
        return;
      }

      // Fallback: fetch from API if not present
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/promotion-products?PromotionId=${promotionId}&page=1&pageSize=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const names = items
        .map((i: any) => {
          const name = String(i.productName ?? '');
          const unit = i.unitName ? ` (Đơn vị: ${String(i.unitName)})` : '';
          return name ? `${name}${unit}` : '';
        })
        .filter((n: string) => n.trim().length > 0);
      setProductsOfPromotion(names);
    } catch {
      setProductsOfPromotion([]);
    } finally {
      setProductsLoading(false);
    }
  }, [promotions]);

  const loadPromotionDetails = useCallback(async (promotionId: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/promotion-products?PromotionId=${promotionId}&page=1&pageSize=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const unitIds = items.map((i: any) => Number(i.productUnitId ?? 0)).filter(id => id > 0);
      return unitIds;
    } catch {
      return [];
    }
  }, []);

  const openEditPromotion = useCallback(async (promotion: any) => {
    try {
      setEditingPromotion(promotion);
      const productIds = await loadPromotionDetails(promotion.promotionId);
      
      // Set form data
      setName(promotion.name);
      setStartDate(promotion.startDate);
      setEndDate(promotion.endDate);
      setStartTime(promotion.startTime || '');
      setEndTime(promotion.endTime || '');
      setType(promotion.type);
      setValue(promotion.value.toString());
      setSelectedProductUnitIds(productIds);
      setStatus(1); // Default to active
      
      setIsEditOpen(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin khuyến mãi');
    }
  }, [loadPromotionDetails]);

  const deletePromotion = useCallback(async (promotionId: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      if (res.ok) {
        Alert.alert('Thành công', 'Đã xóa khuyến mãi');
        loadPromotions();
      } else {
        const data = await res.json().catch(() => ({}));
        const message = data?.message || 'Xóa khuyến mãi thất bại';
        Alert.alert('Lỗi', message);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    }
  }, [loadPromotions]);

  // Load product unit options (use productUnitId)
  useEffect(() => {
    const load = async () => {
      try {
        const shopId = (await getShopId()) ?? 0;
        const token = await getAuthToken();
        if (!shopId) return;
        const url = `${API_URL}/api/product-units?ShopId=${shopId}&page=1&pageSize=1000`;
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const data = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const mappedBase = items.map((u: any) => ({
          id: Number(u.productUnitId ?? 0),
          productId: Number(u.productId ?? 0),
          name: String(u.productName ?? 'Sản phẩm'),
          unitName: String(u.unitName ?? ''),
        })).filter(p => p.id > 0 && p.productId > 0 && p.name);
        // Load product -> category map to enable category filtering for units
        try {
          const prodRes = await fetch(`${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=1000`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          const prodData = await prodRes.json().catch(() => ({}));
          const prodItems: any[] = Array.isArray(prodData?.items) ? prodData.items : Array.isArray(prodData) ? prodData : [];
          const catMap: Record<number, string> = {};
          prodItems.forEach((p: any) => {
            const pid = Number(p.id ?? p.productId ?? 0);
            const cname = String(p.categoryName ?? '');
            if (pid > 0 && cname) catMap[pid] = cname;
          });
          setProductCategoryById(catMap);
          const mapped = mappedBase.map(m => ({ ...m, categoryName: catMap[m.productId] }));
          setAllProducts(mapped);
        } catch {
          setAllProducts(mappedBase);
        }
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

  const groupedProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    const filtered = allProducts.filter(p => {
      const matchSearch = term ? (p.name.toLowerCase().includes(term) || (p.unitName || '').toLowerCase().includes(term)) : true;
      const matchCategory = selectedCategory === 'Tất cả' ? true : (p.categoryName === selectedCategory);
      return matchSearch && matchCategory;
    });
    const byProduct = new Map<number, { productId: number; name: string; units: Array<{ id: number; unitName: string }> }>();
    filtered.forEach(p => {
      const existing = byProduct.get(p.productId);
      if (!existing) {
        byProduct.set(p.productId, { productId: p.productId, name: p.name, units: [{ id: p.id, unitName: p.unitName }] });
      } else {
        existing.units.push({ id: p.id, unitName: p.unitName });
      }
    });
    // Sort by product name, then unitName
    const groups = Array.from(byProduct.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    groups.forEach(g => g.units.sort((a, b) => (a.unitName || '').localeCompare(b.unitName || '', 'vi')));
    return groups;
  }, [allProducts, productSearch, selectedCategory]);

  const isGroupFullySelected = useCallback((grp: { units: Array<{ id: number }> }) => {
    return grp.units.every(u => selectedProductUnitIds.includes(u.id));
  }, [selectedProductUnitIds]);

  const isGroupPartiallySelected = useCallback((grp: { units: Array<{ id: number }> }) => {
    const any = grp.units.some(u => selectedProductUnitIds.includes(u.id));
    return any && !isGroupFullySelected(grp);
  }, [selectedProductUnitIds, isGroupFullySelected]);

  const toggleGroupExpand = useCallback((productId: number) => {
    setExpandedProductIds(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  }, []);

  const toggleGroupSelection = useCallback((grp: { units: Array<{ id: number }> }) => {
    const ids = grp.units.map(u => u.id);
    const allSelected = ids.every(id => selectedProductUnitIds.includes(id));
    if (allSelected) {
      setSelectedProductUnitIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedProductUnitIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  }, [selectedProductUnitIds]);

  const handleSelectAllInView = useCallback(() => {
    const ids = groupedProducts.flatMap(g => g.units.map(u => u.id));
    const allSelected = ids.length > 0 && ids.every(id => selectedProductUnitIds.includes(id));
    if (allSelected) {
      setSelectedProductUnitIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedProductUnitIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  }, [groupedProducts, selectedProductUnitIds]);

  const allSelectedInView = useMemo(() => {
    const ids = groupedProducts.flatMap(g => g.units.map(u => u.id));
    return ids.length > 0 && ids.every(id => selectedProductUnitIds.includes(id));
  }, [groupedProducts, selectedProductUnitIds]);

  const validate = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên chương trình khuyến mãi');
      return false;
    }
    if (!startDate.trim() || !isValidDateDMY(startDate.trim())) {
      Alert.alert('Lỗi', 'Ngày bắt đầu phải có định dạng DD/MM/YYYY và hợp lệ');
      return false;
    }
    if (!endDate.trim() || !isValidDateDMY(endDate.trim())) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải có định dạng DD/MM/YYYY và hợp lệ');
      return false;
    }
    // ensure end >= start
    try {
      const sd = new Date(toISODate(startDate));
      const ed = new Date(toISODate(endDate));
      if (ed < sd) {
        Alert.alert('Lỗi', 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
        return false;
      }
    } catch {}

    if (startTime.trim() && !isValidTime(startTime.trim())) {
      Alert.alert('Lỗi', 'Giờ bắt đầu phải có định dạng HH:mm và hợp lệ');
      return false;
    }
    if (endTime.trim() && !isValidTime(endTime.trim())) {
      Alert.alert('Lỗi', 'Giờ kết thúc phải có định dạng HH:mm và hợp lệ');
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
    if (selectedProductUnitIds.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập danh sách sản phẩm (ID) áp dụng');
      return false;
    }
    return true;
  }, [name, startDate, endDate, startTime, endTime, value, type, selectedProductUnitIds, isValidDateDMY, isValidTime, toISODate]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const normalizeTime = (t: string) => {
        const v = (t || '').trim();
        if (!v) return '';
        if (!/^\d{2}:\d{2}$/.test(v) && !/^\d{2}:\d{2}:\d{2}$/.test(v)) return '';
        // ensure HH:mm:ss
        if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
        return v;
      };
      const payload = {
        shopId,
        name: name.trim(),
        startDate: toISODate(startDate.trim()),
        endDate: toISODate(endDate.trim()),
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        value: type === 2 ? Math.round(parseFloat(value) * 100) / 100 : Math.round(parseFloat(value)),
        type,
        status: typeof status === 'number' ? status : 1,
        productUnitIds: selectedProductUnitIds,
      } as any;

      const isEdit = editingPromotion !== null;
      const url = isEdit ? `${API_URL}/api/promotions/${editingPromotion.promotionId}` : `${API_URL}/api/promotions`;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        console.log(`[Promotion/${isEdit ? 'Update' : 'Create'}] payload:`, payload);
      } catch {}

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      try {
        console.log(`[Promotion/${isEdit ? 'Update' : 'Create'}] status:`, res.status, res.statusText);
        console.log(`[Promotion/${isEdit ? 'Update' : 'Create'}] response:`, data);
      } catch {}
      if (!res.ok) {
        const message = data?.message || `${isEdit ? 'Cập nhật' : 'Tạo'} khuyến mãi thất bại`;
        Alert.alert('Lỗi', message);
        return;
      }
      Alert.alert('Thành công', `Đã ${isEdit ? 'cập nhật' : 'tạo'} khuyến mãi`);
      // Reset form
      setName('');
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setType(1);
      setValue('');
      setSelectedProductUnitIds([]);
      setEditingPromotion(null);
      setIsCreateOpen(false);
      setIsEditOpen(false);
      loadPromotions();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, name, startDate, endDate, startTime, endTime, type, value, selectedProductUnitIds, editingPromotion]);

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
        <View style={styles.content}>
          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#009DA5" />
            </View>
          ) : (
            <FlatList
              data={filteredPromotions}
              keyExtractor={(item) => String(item.promotionId)}
              renderItem={({ item }) => {
                const isPercent = item.type === 2;
                const valueText = isPercent ? `${item.value}%` : `${item.value.toLocaleString('vi-VN')}₫`;
                
                // Format date from YYYY-MM-DD to DD/MM/YYYY
                const formatDate = (dateStr: string) => {
                  if (!dateStr) return '';
                  const [year, month, day] = dateStr.split('-');
                  return `${day}/${month}/${year}`;
                };
                
                // Format time from HH:mm:ss to HH:mm
                const formatTime = (timeStr: string) => {
                  if (!timeStr) return '00:00';
                  return timeStr.substring(0, 5); // Take only HH:mm part
                };
                
                const startDate = formatDate(item.startDate);
                const endDate = formatDate(item.endDate);
                const startTime = formatTime(item.startTime || '00:00');
                const endTime = formatTime(item.endTime || '00:00');
                
                const timeRange = `Từ ${startTime} ${startDate} đến ${endTime} ${endDate}`;
                
                return (
                  <View style={styles.promoItem}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openPromotionProducts(item.promotionId, item.name)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.promoName}>{item.name}</Text>
                        <Text style={styles.promoMeta}>{timeRange}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.promoBadge}>
                      <Text style={styles.promoBadgeText}>{valueText}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.menuBtn}
                      onPress={() => setMenuVisible(menuVisible === item.promotionId ? null : item.promotionId)}
                    >
                      <Icon name="dots-vertical" size={20} color="#666" />
                    </TouchableOpacity>
                    
                    {menuVisible === item.promotionId && (
                      <>
                        <TouchableOpacity 
                          style={styles.menuOverlay}
                          onPress={() => setMenuVisible(null)}
                        />
                        <View style={styles.menuDropdown}>
                          <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                              setMenuVisible(null);
                              openEditPromotion(item);
                            }}
                          >
                            <Icon name="pencil" size={16} color="#009DA5" />
                            <Text style={styles.menuItemText}>Sửa</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.menuItem}
                            onPress={() => {
                              setMenuVisible(null);
                              Alert.alert(
                                'Xác nhận xóa',
                                `Bạn có chắc chắn muốn xóa khuyến mãi "${item.name}"?`,
                                [
                                  { text: 'Hủy', style: 'cancel' },
                                  { 
                                    text: 'Xóa', 
                                    style: 'destructive',
                                    onPress: () => deletePromotion(item.promotionId)
                                  }
                                ]
                              );
                            }}
                          >
                            <Icon name="delete" size={16} color="#E53935" />
                            <Text style={[styles.menuItemText, { color: '#E53935' }]}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
            />
          )}
        </View>
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
                <Text style={styles.label}>Ngày bắt đầu<Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={(t) => setStartDate(maskDateInput(t))}
                  placeholder="31/12/2025"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Ngày kết thúc<Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={(t) => setEndDate(maskDateInput(t))}
                  placeholder="31/12/2025"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}> 
                <Text style={styles.label}>Giờ bắt đầu</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={(t) => setStartTime(maskTimeInput(t))}
                  placeholder="08:00"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Giờ kết thúc</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={(t) => setEndTime(maskTimeInput(t))}
                  placeholder="21:00"
                  keyboardType="number-pad"
                />
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

            <Text style={styles.label}>Sản phẩm/Đơn vị áp dụng <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.dropdownInput} onPress={() => setIsProductModalOpen(true)}>
              <Text style={styles.dropdownText}>
                {selectedProductUnitIds.length > 0
                  ? `${selectedProductUnitIds.length} mục đã chọn`
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

                  {/* Search row with Select All */}
                  <View style={styles.modalSearchRow}>
                    <View style={[styles.searchContainer, { flex: 1, marginLeft: 8 }] }>
                      <Icon name="magnify" size={18} color="#666" />
                      <TextInput
                        style={[styles.searchInput, { paddingVertical: 8 }]}
                        placeholder="Tìm sản phẩm..."
                        value={productSearch}
                        onChangeText={setProductSearch}
                      />
                    </View>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAllInView}>
                      <Icon name={allSelectedInView ? 'check-all' : 'select-all'} size={18} color="#FFF" />
                      <Text style={styles.selectAllText}>{allSelectedInView ? 'Bỏ chọn' : 'Chọn tất cả'}</Text>
                    </TouchableOpacity>
                  </View>

                   <ScrollView style={{ maxHeight: 360 }}>
                     {groupedProducts.map((grp) => {
                       const expanded = expandedProductIds.includes(grp.productId);
                       const groupChecked = isGroupFullySelected(grp);
                       const groupPartial = isGroupPartiallySelected(grp);
                       const groupIcon = groupChecked ? 'checkbox-marked' : (groupPartial ? 'checkbox-intermediate' : 'checkbox-blank-outline');
                       return (
                         <View key={`grp-${grp.productId}`} style={{ paddingVertical: 6 }}>
                           <View style={styles.groupHeader}>
                             <TouchableOpacity style={styles.groupTitle} onPress={() => toggleGroupExpand(grp.productId)}>
                               <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={18} color="#009DA5" />
                               <Text style={styles.groupTitleText}>{grp.name}</Text>
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => toggleGroupSelection(grp)}>
                               <Icon name={groupIcon} size={20} color={groupChecked || groupPartial ? '#009DA5' : '#999'} />
                             </TouchableOpacity>
                           </View>
                           {expanded && grp.units.map((u) => {
                             const checked = selectedProductUnitIds.includes(u.id);
                             return (
                               <TouchableOpacity key={u.id} style={styles.optionRow} onPress={() => {
                                 setSelectedProductUnitIds((prev) => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                               }}>
                                 <Text style={styles.optionText}>{u.unitName}</Text>
                                 {checked ? <Icon name="checkbox-marked" size={20} color="#009DA5" /> : <Icon name="checkbox-blank-outline" size={20} color="#999" />}
                               </TouchableOpacity>
                             );
                           })}
                         </View>
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

      {/* Edit Modal */}
      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsEditOpen(false)}
      >
        <View style={styles.createOverlay}>
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>Sửa khuyến mãi</Text>
              <TouchableOpacity onPress={() => setIsEditOpen(false)} style={styles.createCloseBtn}>
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
                <Text style={styles.label}>Ngày bắt đầu<Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2025-01-01" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Ngày kết thúc<Text style={styles.required}>*</Text></Text>
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
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={(t) => setEndTime(maskTimeInput(t))}
                  placeholder="21:00"
                  keyboardType="number-pad"
                />
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

            <Text style={styles.label}>Sản phẩm/Đơn vị áp dụng <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.dropdownInput} onPress={() => setIsProductModalOpen(true)}>
              <Text style={styles.dropdownText}>
                {selectedProductUnitIds.length > 0
                  ? `${selectedProductUnitIds.length} mục đã chọn`
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

                  {/* Search row with Select All */}
                  <View style={styles.modalSearchRow}>
                    <View style={[styles.searchContainer, { flex: 1, marginLeft: 8 }] }>
                      <Icon name="magnify" size={18} color="#666" />
                      <TextInput
                        style={[styles.searchInput, { paddingVertical: 8 }]}
                        placeholder="Tìm sản phẩm..."
                        value={productSearch}
                        onChangeText={setProductSearch}
                      />
                    </View>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAllInView}>
                      <Icon name={allSelectedInView ? 'check-all' : 'select-all'} size={18} color="#FFF" />
                      <Text style={styles.selectAllText}>{allSelectedInView ? 'Bỏ chọn' : 'Chọn tất cả'}</Text>
                    </TouchableOpacity>
                  </View>

                   <ScrollView style={{ maxHeight: 360 }}>
                     {groupedProducts.map((grp) => (
                       <View key={`grp-${grp.productId}`} style={{ paddingVertical: 6 }}>
                         <Text style={{ fontSize: 14, fontWeight: '700', color: '#000', paddingHorizontal: 4, marginBottom: 4 }}>
                           {grp.name}
                         </Text>
                         {grp.units.map((u) => {
                           const checked = selectedProductUnitIds.includes(u.id);
                           return (
                             <TouchableOpacity key={u.id} style={styles.optionRow} onPress={() => {
                               setSelectedProductUnitIds((prev) => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                             }}>
                               <Text style={styles.optionText}>{u.unitName}</Text>
                               {checked ? <Icon name="checkbox-marked" size={20} color="#009DA5" /> : <Icon name="checkbox-blank-outline" size={20} color="#999" />}
                             </TouchableOpacity>
                           );
                         })}
                       </View>
                     ))}
                   </ScrollView>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setIsProductModalOpen(false)}>
                    <Text style={styles.modalPrimaryText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

                  <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={submit} disabled={isSubmitting}>
                    <Text style={styles.submitText}>{isSubmitting ? 'Đang lưu...' : 'Cập nhật khuyến mãi'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Products of promotion modal */}
      <Modal visible={productsModalOpen} transparent animationType="fade" onRequestClose={() => setProductsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{productsModalTitle}</Text>
              <TouchableOpacity onPress={() => setProductsModalOpen(false)}>
                <Icon name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            {productsLoading ? (
              <View style={{ padding: 16 }}>
                <ActivityIndicator color="#009DA5" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {productsOfPromotion.length === 0 ? (
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: '#666' }}>Không có sản phẩm áp dụng</Text>
                  </View>
                ) : (
                  productsOfPromotion.map((n, idx) => (
                    <View key={`${n}-${idx}`} style={styles.optionRow}>
                      <Text style={styles.optionText}>{n}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setProductsModalOpen(false)}>
              <Text style={styles.modalPrimaryText}>Đóng</Text>
            </TouchableOpacity>
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
  modalSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, marginBottom: 8 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#009DA5', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  selectAllText: { color: '#FFF', fontWeight: '700', marginLeft: 6, fontSize: 12 },
  promoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E5E5E5',
    position: 'relative',
  },
  promoName: { fontSize: 14, fontWeight: '700', color: '#000' },
  promoMeta: { fontSize: 12, color: '#666', marginTop: 4 },
  promoBadge: { 
    backgroundColor: '#009DA5', 
    width: 50,
    height: 50,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  promoBadgeText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 12,
  },
  menuBtn: { 
    padding: 8, 
    marginLeft: 8,
    borderRadius: 6, 
    backgroundColor: '#F5F5F5', 
    borderWidth: 1, 
    borderColor: '#E5E5E5',
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupTitleText: { fontSize: 14, fontWeight: '700', color: '#000' },
});

export default PromotionScreen;


