import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';

interface BillItem {
  id: string;
  code: string;
  status: 'success' | 'cancel';
  buyer: string;
  time: string;
  total: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'nfc';
}

interface ShiftItem {
  id: number;
  name?: string;
  openedDate?: string | null;
  closedDate?: string | null;
}

const BillsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selected, setSelected] = useState<BillItem | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<Array<{ name: string; qty: number; price: number; unit?: string }>>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'cancel'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [orders, setOrders] = useState<BillItem[]>([]);

  const methodFromCode = (code: number | string | undefined): BillItem['paymentMethod'] => {
    const n = Number(code ?? 0);
    if (n === 1) return 'cash';
    if (n === 2) return 'bank_transfer';
    if (n === 3) return 'nfc';
    return 'cash';
  };

  const formatVnDateTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${time}, ${date}`;
  };

  const formatShortVn = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} ${dd}/${m}`;
  };

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) return;
      const res = await fetch(`${API_URL}/api/shifts?ShopId=${shopId}&page=1&pageSize=100`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const mapped: ShiftItem[] = items.map((it: any) => ({
        id: Number(it?.shiftId ?? it?.id ?? 0),
        name: String(it?.name ?? it?.shiftName ?? ''),
        openedDate: it?.openedDate ?? it?.openDate ?? it?.startDate ?? it?.createdAt ?? null,
        closedDate: it?.closedDate ?? it?.closeDate ?? null,
      })).filter((s: ShiftItem) => s.id > 0);
      setShifts(mapped);
      const open = mapped.find(s => s.closedDate == null);
      setSelectedShiftId(open ? open.id : (mapped[0]?.id ?? null));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được ca làm');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (shiftId: number | null) => {
    if (!shiftId) { setOrders([]); return; }
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) return;
      const url = `${API_URL}/api/orders?ShopId=${shopId}&ShiftId=${shiftId}&page=1&pageSize=100`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const mapped: BillItem[] = items.map((o: any) => {
        const idNum = Number(o?.orderId ?? o?.id ?? 0);
        const statusNum = Number(o?.status ?? 0);
        const total = Number(o?.totalPrice ?? o?.totalAmount ?? 0);
        const buyer = String(o?.customerName ?? 'Khách lẻ');
        const code = idNum > 0 ? `#${idNum}` : String(o?.code ?? '#');
        const time = formatVnDateTime(o?.createdAt ?? o?.datetime);
        const method = methodFromCode(o?.paymentMethod ?? o?.paymentMethodCode);
        return {
          id: String(idNum || code),
          code,
          status: statusNum === 1 ? 'success' : 'cancel',
          buyer,
          time,
          total,
          paymentMethod: method,
        } as BillItem;
      });
      // Sort newest first
      mapped.sort((a, b) => {
        const ta = a.time; const tb = b.time;
        // parse using existing parser for consistency
        const pa = parseVietnameseDate(ta); const pb = parseVietnameseDate(tb);
        return pb - pa;
      });
      setOrders(mapped);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrderDetails = useCallback(async (orderId: number) => {
    try {
      setLoadingDetails(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) return;
      const url = `${API_URL}/api/order-details?ShopId=${shopId}&OrderId=${orderId}&page=1&pageSize=100`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const details = items.map((d: any) => ({
        name: String(d?.productName ?? d?.name ?? ''),
        qty: Number(d?.quantity ?? d?.qty ?? 0),
        price: Number(d?.unitPrice ?? d?.price ?? 0),
        unit: String(d?.unitName ?? d?.unit ?? ''),
      }));
      setSelectedDetails(details);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được chi tiết hóa đơn');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const searchOrderById = useCallback(async (orderId: string) => {
    try {
      setSearchLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) return;
      
      // Extract number from orderId (remove # if present)
      const idNum = parseInt(orderId.replace('#', ''), 10);
      if (isNaN(idNum)) {
        setOrders([]);
        return;
      }
      
      const url = `${API_URL}/api/orders?OrderId=${idNum}&ShopId=${shopId}&page=1&pageSize=1`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      
      const mapped: BillItem[] = items.map((o: any) => {
        const idNum = Number(o?.orderId ?? o?.id ?? 0);
        const statusNum = Number(o?.status ?? 0);
        const total = Number(o?.totalPrice ?? o?.totalAmount ?? 0);
        const buyer = String(o?.customerName ?? 'Khách lẻ');
        const code = idNum > 0 ? `#${idNum}` : String(o?.code ?? '#');
        const time = formatVnDateTime(o?.createdAt ?? o?.datetime);
        const method = methodFromCode(o?.paymentMethod ?? o?.paymentMethodCode);
        return {
          id: String(idNum || code),
          code,
          status: statusNum === 1 ? 'success' : 'cancel',
          buyer,
          time,
          total,
          paymentMethod: method,
        } as BillItem;
      });
      
      setOrders(mapped);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tìm thấy hóa đơn');
      setOrders([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const getStatus = (s: BillItem['status']): { text: string; color: string; textColor: string } => s === 'success' ? { text: 'Thành công', color: '#D1F2EB', textColor: '#1ABC9C' } : { text: 'Hủy', color: '#FDEDEC', textColor: '#E74C3C' };
  const getMethod = (m: BillItem['paymentMethod']): { icon: string; text: string } => m === 'cash' ? { icon: 'cash', text: 'Tiền mặt' } : m === 'bank_transfer' ? { icon: 'bank-transfer', text: 'Chuyển khoản' } : { icon: 'nfc', text: 'Thẻ thành viên NFC' };

  const parseVietnameseDate = (text: string) => {
    // Expect format: "HH:mm, D tháng M, YYYY"
    try {
      const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
      const dateMatch = text.match(/(\d{1,2})\s*tháng\s*(\d{1,2}),\s*(\d{4})/);
      if (!timeMatch || !dateMatch) return 0;
      const hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = parseInt(dateMatch[3], 10);
      return new Date(year, month, day, hour, minute).getTime();
    } catch {
      return 0;
    }
  };

  const filteredBills = useMemo(() => {
    // If there's a search query, return orders as-is (already filtered by API)
    if (query.trim()) {
      return orders.filter(b => statusFilter === 'all' ? true : b.status === statusFilter);
    }
    
    // Otherwise, filter normally
    const list = orders.filter(b => {
      const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter;
      return matchStatus;
    });
    list.sort((a, b) => {
      const ta = parseVietnameseDate(a.time);
      const tb = parseVietnameseDate(b.time);
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [orders, query, statusFilter, sortOrder]);

  const shiftBills = useMemo(() => {
    return filteredBills.filter(bill => {
      const billTime = parseVietnameseDate(bill.time);
      let shiftStart, shiftEnd;
      // If API provided times, we already filtered by shift server-side. Keep all.
      shiftStart = 0; shiftEnd = Number.MAX_SAFE_INTEGER;
      return billTime >= shiftStart && billTime < shiftEnd;
    });
  }, [filteredBills]);

  const totalRevenue = useMemo(() => {
    return shiftBills.reduce((sum, bill) => bill.status === 'success' ? sum + bill.total : sum, 0);
  }, [shiftBills]);

  const totalOrders = shiftBills.length;

  // Hide bottom navigation when keyboard is open and track visibility
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [navigation]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    loadOrders(selectedShiftId);
  }, [selectedShiftId, loadOrders]);

  // Search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchOrderById(query.trim());
      } else {
        // If query is empty, reload orders for current shift
        loadOrders(selectedShiftId);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [query, searchOrderById, loadOrders, selectedShiftId]);

  const renderItem = ({ item }: { item: BillItem }) => {
    const s = getStatus(item.status);
    return (
      <TouchableOpacity
        style={styles.billItem}
        onPress={async () => {
          const idNum = parseInt(item.id.replace('#',''), 10);
          if (!isNaN(idNum)) {
            // Navigate to detail screen
            // @ts-ignore - navigation typing generic
            navigation.navigate('OrderDetail', { orderId: idNum });
          }
        }}
      >
        <View style={styles.billLeft}>
          <Text style={styles.billTitle}>Thanh toán đơn {item.code}</Text>
          <Text style={styles.billTime}>{item.time}</Text>
        </View>
        <View style={styles.billRight}>
          <View style={[styles.statusChip,{ backgroundColor: s.color }]}>
            <Text style={[styles.statusChipText,{ color: s.textColor }]}>{s.text}</Text>
          </View>
          <Text style={styles.billAmount}>{item.total.toLocaleString('vi-VN')} VNĐ</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1 }}>
      <View style={styles.content}>
        {/* Search + Sort */}
        <View style={styles.searchSortRow}>
          <View style={[styles.searchContainer, { flex: 1 }] }>
            <Icon name="magnify" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm mã hóa đơn"
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
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            accessibilityLabel="Sắp xếp theo thời gian"
          >
            <Icon name="filter-variant" size={22} color="#009DA5" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: 'Tất cả' },
            { key: 'success', label: 'Thành công' },
            { key: 'cancel', label: 'Hủy' },
          ] as const).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.shiftContainer}>
          <Picker
            selectedValue={selectedShiftId ?? undefined}
            onValueChange={(itemValue) => setSelectedShiftId(Number(itemValue))}
            style={styles.picker}
          >
            {(shifts || []).map(shift => {
              const isOpen = shift.closedDate == null;
              const label = isOpen
                ? `Ca đang mở (${formatShortVn(shift.openedDate ?? undefined)})`
                : `Ca đã đóng (${formatShortVn(shift.openedDate ?? undefined)} - ${formatShortVn((shift.closedDate ?? undefined))})`;
              return (
                <Picker.Item key={shift.id} label={label} value={shift.id} />
              );
            })}
          </Picker>
        </View>

        <View style={styles.statisticsContainer}>
          <Text style={styles.statisticsText}>Doanh thu: {totalRevenue.toLocaleString('vi-VN')} VNĐ</Text>
          <Text style={styles.statisticsText}>Tổng đơn hàng: {totalOrders}</Text>
        </View>

        {loading || searchLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#009DA5" />
            <Text style={{ marginTop: 8, color: '#666' }}>
              {searchLoading ? 'Đang tìm kiếm...' : 'Đang tải...'}
            </Text>
          </View>
        ) : (
        <FlatList
          data={shiftBills}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ 
            paddingVertical: 8, 
            paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom + 60, 60) // Đảm bảo ít nhất 120px padding
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={() => (
            <View style={{ 
              height: keyboardVisible ? 0 : Math.max(insets.bottom + 100, 100),
              backgroundColor: 'transparent' 
            }} />
          )}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await loadOrders(selectedShiftId);
              } finally {
                setRefreshing(false);
              }
            }}
        />
        )}
      </View>
      </KeyboardAvoidingView>

      {/* Detail moved to OrderDetailScreen */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 5,
    height: 45,
    justifyContent: 'flex-start',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 1,
  },
  sortButton: {
    alignItems: 'center',
    height: 45,
    width: 45,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterChipActive: {
    backgroundColor: '#009DA5',
    borderColor: '#009DA5',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6FBFC',
    borderRadius: 12,
    padding: 14,
  },
  billLeft: { flex: 1 },
  billRight: { alignItems: 'flex-end', gap: 6 },
  billTitle: { fontSize: 14, color: '#000', marginBottom: 6, fontWeight: '600' },
  billTime: { fontSize: 12, color: '#666' },
  billAmount: { fontSize: 14, color: '#000' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { fontSize: 12, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', maxHeight: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  detailText: { fontSize: 14, color: '#333' },
  sectionDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productName: { fontSize: 14, color: '#000', fontWeight: '500' },
  productMeta: { fontSize: 12, color: '#666' },
  productAmount: { fontSize: 14, color: '#000' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  totalLabel: { fontSize: 14, color: '#000' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  discountReason: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 4 },
  shiftContainer: {
    marginBottom:20,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statisticsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  }
});

export default BillsScreen;
