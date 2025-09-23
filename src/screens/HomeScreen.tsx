import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getShiftId, refreshOpenShiftId } from '../services/AuthStore';

const HomeScreen = () => {
  const [hideMoney, setHideMoney] = useState(true);
  const [loading, setLoading] = useState(false);
  const [todayInfo, setTodayInfo] = useState({ dateLabel: 'Hôm nay', invoices: 0, revenue: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadShiftStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) {
        setTodayInfo({ dateLabel: 'Hôm nay', invoices: 0, revenue: 0 });
        return;
      }
      let shiftId = await getShiftId();
      if (!shiftId) {
        shiftId = await refreshOpenShiftId();
      }
      if (!shiftId) {
        setTodayInfo({ dateLabel: 'Hôm nay', invoices: 0, revenue: 0 });
        return;
      }
      const res = await fetch(`${API_URL}/api/orders?ShopId=${shopId}&ShiftId=${shiftId}&page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const successful = items.filter((o: any) => Number(o?.status ?? 0) === 1);
      const invoices = successful.length;
      const revenue = successful.reduce((sum: number, o: any) => sum + Number(o?.totalPrice ?? o?.totalAmount ?? 0), 0);
      setTodayInfo({ dateLabel: 'Hôm nay', invoices, revenue });
    } catch {
      setTodayInfo({ dateLabel: 'Hôm nay', invoices: 0, revenue: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShiftStats();
  }, [loadShiftStats]);

  // Removed charts: keep only summary cards

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
      rotation: 0,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
    fillShadowGradient: '#009DA5',
    fillShadowGradientOpacity: 1, // Use solid color
  };

  const data = {
    labels: ['Bánh gạo', 'Cà phê', 'Nước suối', 'Mì gói'],
    datasets: [
      {
        data: [20, 45, 78, 80],
        colors: [
          (opacity = 1) => `rgba(0, 157, 165, ${opacity})`,
          (opacity = 1) => `rgba(0, 157, 165, ${opacity})`,
          (opacity = 1) => `rgba(0, 157, 165, ${opacity})`,
          (opacity = 1) => `rgba(0, 157, 165, ${opacity})`,
        ],
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadShiftStats(); setRefreshing(false); }} />}
      >

        {/* Today row */}
        <View style={styles.todayRow}>
          <Icon name="calendar-today" size={18} color="#000" />
          <Text style={styles.todayText}>{todayInfo.dateLabel}, ngày {(new Date()).toLocaleDateString('vi-VN')}</Text>
        </View>

        {/* Summary cards */}
        <View style={styles.cardsRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Số hóa đơn</Text>
            <Text style={styles.cardValue}>{todayInfo.invoices}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>Doanh thu</Text>
              <TouchableOpacity onPress={() => setHideMoney(!hideMoney)}>
                <Icon name={hideMoney ? 'eye-off-outline' : 'eye-outline'} size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardValueSmaller}>
              {hideMoney ? '••••••' : todayInfo.revenue.toLocaleString('vi-VN') + ' VNĐ'}
            </Text>
          </View>
        </View>

        {/* Top-selling items chart */}
        <BarChart
          style={styles.chart}
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero={true}
        />

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  todayText: {
    fontSize: 14,
    color: '#000',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  cardValueSmaller: { fontSize: 18, fontWeight: 'bold', color: '#000' },

  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  }
});

export default HomeScreen;
