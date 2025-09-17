import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';

const HomeScreen = () => {
  const [hideMoney, setHideMoney] = useState(true);

  // Mock stats data
  const todayInfo = {
    dateLabel: 'Hôm nay',
    invoices: 12,
    revenue: 27632000,
  };

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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

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
