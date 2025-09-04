import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface BillItem {
  id: string;
  code: string;
  status: 'success' | 'cancel';
  buyer: string;
  time: string;
  total: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'nfc';
  discount?: { amount: number; reason?: string };
  products: Array<{ name: string; qty: number; price: number; unit?: string }>;
}

const BillsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selected, setSelected] = useState<BillItem | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'cancel'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const bills = useMemo<BillItem[]>(() => ([
    {
      id: '1',
      code: '#123',
      status: 'success',
      buyer: 'Khách lẻ',
      time: '13:45, 2 tháng 7, 2025',
      total: 110000,
      paymentMethod: 'cash',
      discount: { amount: 10000, reason: 'Khuyến mãi thành viên' },
      products: [
        { name: 'Coca Cola', qty: 2, price: 15000, unit: 'Chai' },
        { name: 'Bánh gạo', qty: 1, price: 90000, unit: 'Gói' },
      ],
    },
    {
      id: '2',
      code: '#122',
      status: 'cancel',
      buyer: 'Khách lẻ',
      time: '12:29, 2 tháng 7, 2025',
      total: 36000,
      paymentMethod: 'bank_transfer',
      products: [
        { name: 'Cà phê đen', qty: 2, price: 18000, unit: 'Ly' },
      ],
    },
  ]), []);

  const getStatus = (s: BillItem['status']) => s === 'success' ? { text: 'Thành công', color: '#D1F2EB', textColor: '#1ABC9C' } : { text: 'Hủy', color: '#FDEDEC', textColor: '#E74C3C' };
  const getMethod = (m: BillItem['paymentMethod']) => m === 'cash' ? { icon: 'cash', text: 'Tiền mặt' } : m === 'bank_transfer' ? { icon: 'bank-transfer', text: 'Chuyển khoản' } : { icon: 'nfc', text: 'Thẻ thành viên NFC' };

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
    const lower = query.trim().toLowerCase();
    const list = bills.filter(b => {
      const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter;
      const matchText = !lower ||
        b.code.toLowerCase().includes(lower) ||
        b.buyer.toLowerCase().includes(lower) ||
        b.products.some(p => p.name.toLowerCase().includes(lower));
      return matchStatus && matchText;
    });
    list.sort((a, b) => {
      const ta = parseVietnameseDate(a.time);
      const tb = parseVietnameseDate(b.time);
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [bills, query, statusFilter, sortOrder]);

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

  const renderItem = ({ item }: { item: BillItem }) => {
    const s = getStatus(item.status);
    return (
      <TouchableOpacity style={styles.billItem} onPress={() => setSelected(item)}>
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
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
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

        <FlatList
          data={filteredBills}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: keyboardVisible ? 0 : (insets.bottom || 0) }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>
      </KeyboardAvoidingView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Icon name="close" size={22} color="#000" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Chi tiết hóa đơn {selected.code}</Text>
                  <View style={{ width: 22 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailRow}>
                    <Icon name="account" size={18} color="#666" />
                    <Text style={styles.detailText}>Khách: {selected.buyer}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="clock-outline" size={18} color="#666" />
                    <Text style={styles.detailText}>{selected.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name={getMethod(selected.paymentMethod).icon} size={18} color="#666" />
                    <Text style={styles.detailText}>PTTT: {getMethod(selected.paymentMethod).text}</Text>
                  </View>

                  <View style={styles.sectionDivider} />

                  {selected.products.map((p, idx) => (
                    <View key={idx} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{p.name}</Text>
                        <Text style={styles.productMeta}>{p.qty} x {p.price.toLocaleString('vi-VN')}₫ {p.unit ? `• ${p.unit}` : ''}</Text>
                      </View>
                      <Text style={styles.productAmount}>{(p.qty * p.price).toLocaleString('vi-VN')}₫</Text>
                    </View>
                  ))}

                  <View style={styles.sectionDivider} />

                  {selected.discount && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Chiết khấu</Text>
                      <Text style={[styles.totalValue,{ color: '#E67E22' }]}>- {selected.discount.amount.toLocaleString('vi-VN')}₫</Text>
                    </View>
                  )}
                  {selected.discount?.reason && (
                    <Text style={styles.discountReason}>Lý do giảm: {selected.discount.reason}</Text>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                    <Text style={styles.totalValue}>{selected.total.toLocaleString('vi-VN')}₫</Text>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginBottom: 8,
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
  modalCard: { backgroundColor: '#FFFFFF', maxHeight: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
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
});

export default BillsScreen;
