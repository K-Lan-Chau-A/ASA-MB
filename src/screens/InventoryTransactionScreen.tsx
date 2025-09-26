import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

type Txn = {
  inventoryTransactionId: number;
  type: number; // 1 sell, 2 import
  productId: number;
  orderId?: number | null;
  unitId?: number | null;
  quantity: number;
  imageUrl?: string;
  price: number;
  createdAt: string;
};

const InventoryTransactionScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [productNameById, setProductNameById] = useState<Record<number, string>>({});
  const [unitNameById, setUnitNameById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      // Load transactions
      const tRes = await fetch(`${API_URL}/api/inventory-transactions?ShopId=${shopId}&page=1&pageSize=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const tData = await tRes.json().catch(() => ({}));
      const tItems: any[] = Array.isArray(tData?.items) ? tData.items : Array.isArray(tData) ? tData : [];
      const mappedTxns: Txn[] = tItems.map((i: any) => ({
        inventoryTransactionId: Number(i.inventoryTransactionId ?? i.id ?? 0),
        type: Number(i.type ?? 0),
        productId: Number(i.productId ?? 0),
        orderId: i.orderId != null ? Number(i.orderId) : null,
        unitId: i.unitId != null ? Number(i.unitId) : null,
        quantity: Number(i.quantity ?? 0),
        imageUrl: i.imageUrl ? String(i.imageUrl) : undefined,
        price: Number(i.price ?? 0),
        createdAt: String(i.createdAt ?? ''),
      }));
      setTxns(mappedTxns);

      // Build unique product and unit ids
      const productIds = Array.from(new Set(mappedTxns.map(t => t.productId).filter(Boolean)));
      // Fetch product names in one call (page large enough)
      try {
        const pRes = await fetch(`${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=500`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const pData = await pRes.json().catch(() => ({}));
        const pItems: any[] = Array.isArray(pData?.items) ? pData.items : Array.isArray(pData) ? pData : [];
        const nameMap: Record<number, string> = {};
        pItems.forEach((p: any) => {
          const id = Number(p.id ?? p.productId ?? 0);
          if (id) nameMap[id] = String(p.productName ?? p.name ?? 'Sản phẩm');
        });
        setProductNameById(nameMap);
      } catch {}

      // Fetch unit names per product (parallel)
      try {
        const entries = await Promise.all(
          productIds.map(async (pid) => {
            try {
              const uRes = await fetch(`${API_URL}/api/product-units?ShopId=${shopId}&ProductId=${pid}&page=1&pageSize=50`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              const uData = await uRes.json().catch(() => ({}));
              const uItems: any[] = Array.isArray(uData?.items) ? uData.items : [];
              const map: Record<number, string> = {};
              uItems.forEach((u: any) => {
                const uid = Number(u.unitId ?? u.id ?? 0);
                if (uid) map[uid] = String(u.unitName ?? u.name ?? 'Đơn vị');
              });
              return map;
            } catch { return {}; }
          })
        );
        const merged: Record<number, string> = entries.reduce((acc, m) => ({ ...acc, ...m }), {} as Record<number, string>);
        setUnitNameById(merged);
      } catch {}
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: Txn }) => {
    const isOut = item.type === 1; // bán hàng
    const typeText = isOut ? 'Bán hàng' : item.type === 2 ? 'Nhập hàng' : 'Khác';
    const qtyText = `${isOut ? '-' : '+'}${item.quantity}`;
    const priceText = `${item.price.toLocaleString('vi-VN')}₫`;
    const timeText = (() => { try { return new Date(item.createdAt).toLocaleString('vi-VN'); } catch { return item.createdAt; } })();
    const productName = productNameById[item.productId] || `#${item.productId}`;
    const unitName = item.unitId ? (unitNameById[item.unitId] || '') : '';
    return (
      <View style={styles.row}>
        <View style={styles.leftIcon}>
          <Icon name={isOut ? 'arrow-up-bold' : 'arrow-down-bold'} size={18} color={isOut ? '#E53935' : '#4CAF50'} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.title}>{productName}{unitName ? ` • ${unitName}` : ''}</Text>
            <Text style={[styles.qty, { color: isOut ? '#E53935' : '#4CAF50' }]}>{qtyText}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{typeText}{item.orderId ? ` • Đơn #${item.orderId}` : ''}</Text>
            <Text style={styles.price}>{priceText}</Text>
          </View>
          <Text style={styles.time}>{timeText}</Text>
        </View>
        {!!item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử kho</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#009DA5" />
          </View>
        ) : (
          <FlatList
            data={txns}
            keyExtractor={(i) => String(i.inventoryTransactionId)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  leftIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { fontSize: 14, color: '#000', fontWeight: '600' },
  qty: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 12, color: '#666' },
  price: { fontSize: 14, color: '#009DA5', fontWeight: '700' },
  time: { fontSize: 12, color: '#999', marginTop: 4 },
  thumb: { width: 44, height: 44, borderRadius: 6, marginLeft: 10 },
});

export default InventoryTransactionScreen;

