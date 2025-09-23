import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, NavigationProp, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

type DetailLine = { name: string; qty: number; price: number; unit?: string };
type HeaderInfo = { code: string; buyer: string; time: string; total: number; methodText: string };

const OrderDetailScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { orderId } = route.params ?? { orderId: 0 };

  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [header, setHeader] = useState<HeaderInfo>({ code: '', buyer: 'Khách lẻ', time: '', total: 0, methodText: '' });
  const [lines, setLines] = useState<DetailLine[]>([]);

  const methodFromCode = (code: unknown): { icon: string; text: string } => {
    // Accept numeric codes or string names from API
    const normalized = String(code ?? '').toLowerCase();
    if (normalized === '1' || normalized === 'cash') return { icon: 'cash', text: 'Tiền mặt' };
    if (normalized === '2' || normalized === 'banktransfer' || normalized === 'bank_transfer') return { icon: 'bank-transfer', text: 'Chuyển khoản' };
    if (normalized === '3' || normalized === 'nfccard' || normalized === 'nfc_card') return { icon: 'nfc', text: 'Thẻ thành viên NFC' };
    return { icon: 'cash', text: 'Tiền mặt' };
  };

  const formatVnDateTime = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${time}, ${date}`;
  };

  const loadOrderHeader = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId || !orderId) return;
      const url = `${API_URL}/api/orders?OrderId=${orderId}&ShopId=${shopId}&page=1&pageSize=10`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
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
      const o: any = items[0] || {};
      const idNum = Number(o?.orderId ?? o?.id ?? orderId);
      const code = idNum > 0 ? `#${idNum}` : '#';
      const buyer = String(o?.customerName ?? 'Khách lẻ');
      const time = formatVnDateTime(o?.createdAt ?? o?.datetime);
      const total = Number(o?.totalPrice ?? o?.totalAmount ?? 0);
      const m = methodFromCode(o?.paymentMethod ?? o?.paymentMethodCode);
      setHeader({ code, buyer, time, total, methodText: m.text });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoadingDetails(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !orderId) return;
      // 1) Load order details
      const url = `${API_URL}/api/order-details?OrderId=${orderId}&page=1&pageSize=10`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
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
      // 2) Load products and product-units for enriching names/units
      let products: any[] = [];
      let productUnits: any[] = [];
      try {
        const pRes = await fetch(`${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=100`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const pJson = await pRes.json().catch(() => null);
        products = Array.isArray(pJson?.items) ? pJson.items : Array.isArray(pJson?.data?.items) ? pJson.data.items : Array.isArray(pJson?.data) ? pJson.data : Array.isArray(pJson) ? pJson : [];
      } catch {}
      try {
        const puRes = await fetch(`${API_URL}/api/product-units?ShopId=${shopId}&page=1&pageSize=100`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const puJson = await puRes.json().catch(() => null);
        productUnits = Array.isArray(puJson?.items) ? puJson.items : Array.isArray(puJson?.data?.items) ? puJson.data.items : Array.isArray(puJson?.data) ? puJson.data : Array.isArray(puJson) ? puJson : [];
      } catch {}

      const productIdToName = new Map<number, string>(products.map((p: any) => [Number(p?.productId ?? p?.id ?? 0), String(p?.productName ?? p?.name ?? '')]));
      const productUnitIdToUnit = new Map<number, string>(productUnits.map((u: any) => [Number(u?.productUnitId ?? u?.id ?? 0), String(u?.unitName ?? u?.name ?? '')]));
      const productUnitIdToPrice = new Map<number, number>(productUnits.map((u: any) => [Number(u?.productUnitId ?? u?.id ?? 0), Number(u?.price ?? 0)]));

      const details: DetailLine[] = items.map((d: any) => {
        const qty: number = Number(d?.quantity ?? d?.qty ?? 0);
        const unitPriceFromUnit: number = productUnitIdToPrice.get(Number(d?.productUnitId ?? 0)) ?? 0;
        const totalPrice: number = Number(d?.totalPrice ?? 0);
        const price: number = unitPriceFromUnit > 0 ? unitPriceFromUnit : (qty > 0 ? Math.round(totalPrice / qty) : 0);
        return {
          name: productIdToName.get(Number(d?.productId ?? 0)) || '',
          qty,
          price,
          unit: productUnitIdToUnit.get(Number(d?.productUnitId ?? 0)) || '',
        };
      });
      setLines(details);
    } catch {
    } finally {
      setLoadingDetails(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderHeader();
    loadOrderDetails();
  }, [loadOrderHeader, loadOrderDetails]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết hóa đơn {header.code}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#009DA5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.detailRow}>
            <Icon name="account" size={18} color="#666" />
            <Text style={styles.detailText}>Khách: {header.buyer}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={18} color="#666" />
            <Text style={styles.detailText}>{header.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="credit-card" size={18} color="#666" />
            <Text style={styles.detailText}>PTTT: {header.methodText}</Text>
          </View>

          <View style={styles.sectionDivider} />

          {loadingDetails ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#009DA5" />
            </View>
          ) : (
            lines.map((p, idx) => (
              <View key={idx} style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productMeta}>{p.qty} x {p.price.toLocaleString('vi-VN')}₫ {p.unit ? `• ${p.unit}` : ''}</Text>
                </View>
                <Text style={styles.productAmount}>{(p.qty * p.price).toLocaleString('vi-VN')}₫</Text>
              </View>
            ))
          )}

          <View style={styles.sectionDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{header.total.toLocaleString('vi-VN')}₫</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
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
});

export default OrderDetailScreen;
