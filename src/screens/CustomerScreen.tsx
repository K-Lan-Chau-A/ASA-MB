import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from '../services/AuthStore';
import { RootStackParamList } from '../types/navigation';

interface CustomerItem {
  id?: number;
  fullName: string;
  phone?: string;
  email?: string;
  spent?: number;
  gender?: number;
  birthday?: string;
  rankid?: string;
  rankName?: string;
}

const CustomerScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  // Rank color logic removed: rank names will be rendered in default text color

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) { setCustomers([]); return; }
      const res = await fetch(`${API_URL}/api/customers?ShopId=${shopId}&page=1&pageSize=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
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
      const mapped: CustomerItem[] = items.map((c: any) => ({
        id: Number(c?.customerId ?? c?.id ?? 0) || undefined,
        fullName: String(c?.fullName ?? ''),
        phone: c?.phone ? String(c.phone) : undefined,
        email: c?.email ? String(c.email) : undefined,
        spent: Number(c?.spent ?? 0),
        gender: typeof c?.gender === 'number' ? c.gender : undefined,
        birthday: c?.birthday ? String(c.birthday) : undefined,
        rankid: c?.rankid ? String(c.rankid) : undefined,
        rankName: c?.rankName ? String(c.rankName) : undefined,
      }));
      setCustomers(mapped);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.fullName.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  const renderItem = ({ item }: { item: CustomerItem }) => {
    const genderText = typeof item.gender === 'number' ? (item.gender === 1 ? 'Nam' : 'Nữ') : undefined;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          // Pass selected customer back to Order screen
          if (item.id && item.id > 0) {
            navigation.navigate('Order', {
              customer: {
                id: item.id,
                fullName: item.fullName,
                phone: item.phone,
                email: item.email,
                // Also include fields used by InvoicePreview
                customerName: item.fullName,
                customerPhone: item.phone,
                customerEmail: item.email,
              } as any,
            });
          } else {
            navigation.navigate('Order', { customer: undefined });
          }
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.name}>{item.fullName || 'Khách lẻ'}</Text>
            {!!item.rankName && <Text style={styles.rankBadge}>{item.rankName}</Text>}
          </View>
          <View style={styles.subRow}>
            {!!genderText && (
              <View style={styles.subItem}>
                <Icon name={genderText === 'Nam' ? 'gender-male' : 'gender-female'} size={14} color="#666" />
                <Text style={styles.subText}>{genderText}</Text>
              </View>
            )}
            {!!item.phone && (
              <View style={styles.subItem}>
                <Icon name="phone" size={14} color="#666" />
                <Text style={styles.subText}>{item.phone}</Text>
              </View>
            )}
            {!!item.email && (
              <View style={styles.subItem}>
                <Icon name="email" size={14} color="#666" />
                <Text style={styles.subText}>{item.email}</Text>
              </View>
            )}
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={styles.spentLabel}>Đã tiêu: <Text style={styles.spentValue}>{(item.spent || 0).toLocaleString('vi-VN')} đồng</Text></Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn khách hàng</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên, số điện thoại hoặc email"
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

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Order', { customer: undefined })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Khách lẻ</Text>
            <View style={styles.subRow}>
              <View style={styles.subItem}>
                <Icon name="account" size={14} color="#666" />
                <Text style={styles.subText}>Không lưu thông tin khách</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#009DA5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item.fullName}-${idx}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, margin: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#E5E5E5' },
  name: { fontSize: 16, color: '#000', fontWeight: '600' },
  subRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  subItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { fontSize: 12, color: '#666' },
  rankBadge: { fontSize: 12, fontWeight: '700' },
  spentLabel: { fontSize: 12, color: '#666' },
  spentValue: { fontSize: 14, color: '#009DA5', fontWeight: 'bold' },
});

export default CustomerScreen;
