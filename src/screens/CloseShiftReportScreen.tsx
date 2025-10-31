import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { RootStackParamList } from '../types/navigation';
import { getAuthToken } from '../services/AuthStore';

type ShiftReport = {
  shiftId: number;
  startDate: string;
  closedDate: string;
  createdAt: string;
  userId: number;
  openingCash: number;
  grossRevenueTotal: number;
  programDiscountsTotal: number;
  manualDiscountAmount: number;
  orderCount: number;
  guestCount: number;
  netRevenue: number;
  aov: number;
  theoreticalCashInDrawer: number;
  voucherCounts?: Array<{ voucherId: number; voucherName: string; count: number }>;
  paymentMethods?: Array<{ method: string; orderCount: number; amount: number }>;
  productGroups?: Array<{ productName: string; quantity: number; revenue: number }>;
};

const CloseShiftReportScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CloseShiftReportScreen'>>();
  const shiftId = Number((route.params as any)?.shiftId ?? 0);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ShiftReport | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!shiftId) {
          Alert.alert('Lỗi', 'Thiếu mã ca để xem báo cáo');
          navigation.goBack();
          return;
        }
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/api/reports/shift-close-report?shiftId=${shiftId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.message || 'Không tải được báo cáo chốt ca';
          Alert.alert('Lỗi', msg);
          return;
        }
        setReport(data as ShiftReport);
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [shiftId, navigation]);

  const formatCurrency = (n?: number) => {
    const v = Number(n || 0);
    return v.toLocaleString('vi-VN') + '₫';
  };

  const dateRange = useMemo(() => {
    if (!report) return '';
    const start = new Date(report.startDate);
    const end = new Date(report.closedDate);
    const fmt = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    return `${fmt(start)} - ${fmt(end)}`;
  }, [report]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo chốt ca</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator color="#009DA5" />
        </View>
      ) : !report ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#000' }}>Không có dữ liệu</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.center}>
              <Text style={styles.title}>BÁO CÁO CHỐT CA</Text>
              <Text style={styles.muted}>Ca #{report.shiftId}</Text>
              <Text style={styles.muted}>{dateRange}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tổng quan</Text>
              <View style={styles.rowBetween}><Text style={styles.label}>Tiền đầu ca</Text><Text style={styles.value}>{formatCurrency(report.openingCash)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Doanh thu gộp</Text><Text style={styles.value}>{formatCurrency(report.grossRevenueTotal)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Giảm giá CTKM</Text><Text style={styles.value}>{formatCurrency(report.programDiscountsTotal)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Giảm giá thủ công</Text><Text style={styles.value}>{formatCurrency(report.manualDiscountAmount)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Đơn hàng</Text><Text style={styles.value}>{report.orderCount}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Số khách</Text><Text style={styles.value}>{report.guestCount}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.totalLabel}>Doanh thu (NET)</Text><Text style={styles.totalValue}>{formatCurrency(report.netRevenue)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>AOV</Text><Text style={styles.value}>{formatCurrency(report.aov)}</Text></View>
              <View style={styles.rowBetween}><Text style={styles.label}>Tiền lý thuyết trong két</Text><Text style={styles.value}>{formatCurrency(report.theoreticalCashInDrawer)}</Text></View>
            </View>

            {!!(report.paymentMethods && report.paymentMethods.length) && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
                  {report.paymentMethods!.map((m, idx) => (
                    <View key={`${m.method}-${idx}`} style={styles.rowBetween}>
                      <Text style={styles.label}>{m.method} (ĐH: {m.orderCount})</Text>
                      <Text style={styles.value}>{formatCurrency(m.amount)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!(report.voucherCounts && report.voucherCounts.length) && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Phiếu quà tặng</Text>
                  {report.voucherCounts!.map((v) => (
                    <View key={v.voucherId} style={styles.rowBetween}>
                      <Text style={styles.label}>{v.voucherName}</Text>
                      <Text style={styles.value}>x{v.count}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!(report.productGroups && report.productGroups.length) && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nhóm món</Text>
                  {report.productGroups!.map((p, idx) => (
                    <View key={`${p.productName}-${idx}`} style={styles.rowBetween}>
                      <Text style={styles.label}>{p.productName} (SL: {p.quantity})</Text>
                      <Text style={styles.value}>{formatCurrency(p.revenue)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  center: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  muted: { fontSize: 12, color: '#666', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E5E5', marginVertical: 12 },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 14, color: '#000' },
  value: { fontSize: 14, color: '#000' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#000' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#009DA5' },
});

export default CloseShiftReportScreen;


