import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager, Alert, PermissionsAndroid, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useInfiniteQuery } from '@tanstack/react-query';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Optional imports
let DateTimePicker: any = null;
let BlobUtil: any = null;
try { DateTimePicker = require('@react-native-community/datetimepicker').default; } catch {}
try {
  const mod = require('react-native-blob-util');
  BlobUtil = (mod && (mod.default || mod)) || null;
} catch {}

// Helper: ArrayBuffer to base64 (fallback if needed)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // @ts-ignore
  if (typeof global.btoa === 'function') return global.btoa(binary);
  try { return Buffer.from(binary, 'binary').toString('base64'); } catch { return ''; }
};

const formatShort = (d: Date) => {
  try { return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${dd}/${mm}/${d.getFullYear()}`; }
};

type ReportDetail = {
  reportDetailId: number;
  reportId: number;
  productId: number;
  productName: string;
  productCategory: string;
  productPrice: number;
  quantity: number;
};

type Report = {
  reportId: number;
  type: number;
  startDate: string;
  endDate: string;
  createAt: string;
  revenue: number;
  orderCounter: number;
  shopId: number;
  grossProfit: number;
  cost: number;
  reportDetails: ReportDetail[];
};

type ReportsResponse = {
  items: Report[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const fetchReports = async (params: {
  shopId: number;
  page: number;
  pageSize: number;
}): Promise<ReportsResponse> => {
  const { shopId, page, pageSize } = params;
  const token = await getAuthToken();
  const url = `${API_URL}/api/reports?ShopId=${encodeURIComponent(shopId)}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch reports: ${response.status} ${text}`);
  }
  return (await response.json()) as ReportsResponse;
};

const getReportTypeInfo = (type: number): { name: string; color: string; icon: string } => {
  switch (type) {
    case 1: return { name: 'Báo cáo tuần', color: '#2196F3', icon: 'calendar-week' };
    case 2: return { name: 'Báo cáo tháng', color: '#FF9800', icon: 'calendar-month' };
    default: return { name: 'Báo cáo khác', color: '#757575', icon: 'file-document' };
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

const ReportItem = ({ item }: { item: Report }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeInfo = getReportTypeInfo(item.type);
  
  const formatTime = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <TouchableOpacity style={styles.reportItem} onPress={toggleExpanded}>
      <View style={[styles.typeIndicator, { backgroundColor: typeInfo.color }]} />
      <View style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <View style={styles.reportTitleRow}>
            <Icon name={typeInfo.icon} size={20} color={typeInfo.color} />
            <Text style={styles.reportType}>{typeInfo.name}</Text>
          </View>
          <Text style={styles.reportTime}>{formatTime(item.createAt)}</Text>
        </View>
        
        <View style={styles.dateRange}>
          <Text style={styles.dateText}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Doanh thu</Text>
            <Text style={styles.statValue}>{formatCurrency(item.revenue)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Đơn hàng</Text>
            <Text style={styles.statValue}>{item.orderCounter}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lợi nhuận</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{formatCurrency(item.grossProfit)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Chi phí</Text>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{formatCurrency(item.cost)}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsText}>
            {item.reportDetails.length} sản phẩm
          </Text>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>

        {isExpanded && (
          <View style={styles.productDetailsContainer}>
            <Text style={styles.productDetailsTitle}>Chi tiết sản phẩm:</Text>
            {item.reportDetails.map((detail) => (
              <View key={detail.reportDetailId} style={styles.productDetailItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{detail.productName}</Text>
                  <Text style={styles.productCategory}>{detail.productCategory}</Text>
                </View>
                <View style={styles.productStats}>
                  <Text style={styles.productQuantity}>SL: {detail.quantity}</Text>
                  <Text style={styles.productPrice}>{formatCurrency(detail.productPrice)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ReportScreen = () => {
  const navigation = useNavigation();
  const PAGE_SIZE = 10;
  const [shopId, setShopId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  // Date range state (default last 30 days)
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate()-30); return d; });
  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerVisible, setPickerVisible] = useState<{ which: 'start' | 'end' | null }>({ which: null });

  useEffect(() => {
    let mounted = true;
    getShopId().then((id) => { if (mounted) setShopId(id); });
    return () => { mounted = false; };
  }, []);

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const sdkInt = (Platform as any).Version ?? 0;
    if (sdkInt >= 29) return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        { title: 'Quyền lưu tệp', message: 'Ứng dụng cần quyền để lưu file Excel báo cáo', buttonNeutral: 'Hỏi lại sau', buttonNegative: 'Từ chối', buttonPositive: 'Đồng ý' }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch { return false; }
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      if (!shopId) return;
      setExporting(true);
      const token = await getAuthToken();
      const body = { startDate: startDate.toISOString(), endDate: endDate.toISOString(), shopId } as any;
      const url = `${API_URL}/api/reports/professional-revenue`;
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileName = `bao-cao-${Date.now()}.xlsx`;

      if (BlobUtil && typeof BlobUtil.config === 'function') {
        if (Platform.OS === 'android') {
          const ok = await requestStoragePermission(); if (!ok) { Alert.alert('Thiếu quyền', 'Không thể lưu file vì thiếu quyền.'); setExporting(false); return; }
          // Download file to cache first
          const res = await BlobUtil.config({ fileCache: true, appendExt: 'xlsx' }).fetch('POST', url, {
            'Content-Type': 'application/json',
            Accept: mime,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }, JSON.stringify(body));
          let path = res.path();
          // Move to public Download directory for visibility in File apps
          try {
            const dirs = BlobUtil.fs.dirs;
            const dest = `${dirs.DownloadDir}/${fileName}`;
            try {
              await BlobUtil.fs.mv(path, dest);
            } catch (e) {
              // If mv fails (e.g., cross-volume), copy as fallback
              await BlobUtil.fs.cp(path, dest);
            }
            path = dest;
          } catch {}
          try { console.log('[Report][Excel path]', path); } catch {}
          try { BlobUtil.android && BlobUtil.android.actionViewIntent && BlobUtil.android.actionViewIntent(path, mime); } catch {}
          Alert.alert('Thành công', `Đã tải xong. Đang mở tệp.\n\nĐường dẫn: ${path}`);
        } else {
          const res = await BlobUtil.config({ fileCache: true, appendExt: 'xlsx' }).fetch('POST', url, {
            'Content-Type': 'application/json',
            Accept: mime,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }, JSON.stringify(body));
          const path = res.path();
          try { BlobUtil.ios && BlobUtil.ios.previewDocument && BlobUtil.ios.previewDocument(path); } catch {}
          Alert.alert('Thành công', `Đã lưu tệp và mở xem trước.`);
        }
      } else {
        // Fallback: fetch then try open via data URL (limited support)
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: mime, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
        if (!res.ok) { const t = await res.text(); throw new Error(`Export failed ${res.status}: ${t}`); }
        const buffer = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        Alert.alert('Thiếu thư viện tải tệp', 'Chưa cài react-native-blob-util. Đã ghi base64 ra console để tải thủ công.');
        console.log('[Report][xlsx-base64]', base64);
      }
    } catch (e: any) {
      Alert.alert('Xuất Excel thất bại', e?.message || 'Vui lòng thử lại');
    } finally {
      setExporting(false);
    }
  }, [shopId, requestStoragePermission, startDate, endDate]);

  const openDateModal = useCallback(() => setShowDateModal(true), []);
  const closeDateModal = useCallback(() => setShowDateModal(false), []);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['reports', shopId],
    queryFn: ({ pageParam = 1 }) =>
      fetchReports({ shopId: shopId as number, page: pageParam as number, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    enabled: typeof shopId === 'number' && shopId > 0,
  });

  const flatData = useMemo(() => {
    const items = data?.pages?.flatMap(p => p.items) ?? [];
    return items;
  }, [data]);

  const renderItem = useCallback(({ item }: { item: Report }) => (
    <ReportItem item={item} />
  ), []);

  const keyExtractor = useCallback((item: Report) => String(item.reportId), []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.exportBar}>
        <TouchableOpacity style={[styles.exportButton, exporting && { opacity: 0.7 }]} onPress={openDateModal} disabled={exporting}>
          <Icon name="file-excel" size={18} color="#fff" />
          <Text style={styles.exportText}>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Modal */}
      <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={closeDateModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chọn khoảng thời gian</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Từ ngày</Text>
              <TouchableOpacity style={styles.modalInput} onPress={() => setPickerVisible({ which: 'start' })}>
                <Icon name="calendar" size={18} color="#444" />
                <Text style={styles.modalInputText}>{formatShort(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Đến ngày</Text>
              <TouchableOpacity style={styles.modalInput} onPress={() => setPickerVisible({ which: 'end' })}>
                <Icon name="calendar" size={18} color="#444" />
                <Text style={styles.modalInputText}>{formatShort(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {!!DateTimePicker && pickerVisible.which && (
              <DateTimePicker
                value={pickerVisible.which === 'start' ? startDate : endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event: any, date?: Date) => {
                  if (Platform.OS === 'android') setPickerVisible({ which: null });
                  if (!date) return;
                  if (pickerVisible.which === 'start') {
                    // Ensure start <= end
                    const adjusted = date > endDate ? endDate : date;
                    setStartDate(adjusted);
                  } else {
                    const adjusted = date < startDate ? startDate : date;
                    setEndDate(adjusted);
                  }
                }}
              />
            )}

            {!DateTimePicker && (
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ color: '#666', marginBottom: 8 }}>Thiếu @react-native-community/datetimepicker. Dùng nhanh:</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.quickBtn]} onPress={() => { const d = new Date(); d.setDate(d.getDate()-7); setStartDate(d); setEndDate(new Date()); }}>
                    <Text style={styles.quickBtnText}>7 ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickBtn]} onPress={() => { const d = new Date(); d.setDate(d.getDate()-30); setStartDate(d); setEndDate(new Date()); }}>
                    <Text style={styles.quickBtnText}>30 ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickBtn]} onPress={() => { const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth(), 1); setStartDate(d); setEndDate(new Date()); }}>
                    <Text style={styles.quickBtnText}>Tháng này</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={closeDateModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalPrimary]} onPress={() => { handleExportExcel(); closeDateModal(); }}>
                <Text style={styles.modalPrimaryText}>Xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        style={styles.content}
        data={flatData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={(typeof shopId !== 'number' || shopId <= 0) ? true : (isLoading || isRefetching)}
        onRefresh={refetch}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text>Đang tải thêm...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text>Không có báo cáo nào</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  content: { flex: 1 },
  exportBar: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8, backgroundColor: '#F5F5F5' },
  rangeRow: { flexDirection: 'row', marginBottom: 8 },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECEFF1', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  rangeText: { color: '#37474F', fontWeight: '600' },
  exportButton: { backgroundColor: '#2E7D32', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  exportText: { color: '#fff', fontWeight: 'bold' },
  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeIndicator: {
    width: 6,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  reportContent: {
    flex: 1,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  reportTime: {
    fontSize: 12,
    color: '#666',
  },
  dateRange: {
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 12,
    color: '#888',
  },
  productDetailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  productDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 6,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', maxWidth: 420, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  modalRow: { marginBottom: 12 },
  modalLabel: { color: '#333', marginBottom: 6, fontWeight: '600' },
  modalInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  modalInputText: { color: '#333', fontWeight: '500' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancel: { backgroundColor: '#ECEFF1' },
  modalPrimary: { backgroundColor: '#2E7D32' },
  modalCancelText: { color: '#000', fontWeight: '600' },
  modalPrimaryText: { color: '#FFF', fontWeight: '700' },
  quickBtn: { backgroundColor: '#ECEFF1', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  quickBtnText: { color: '#333', fontWeight: '600' },
});

export default ReportScreen;

