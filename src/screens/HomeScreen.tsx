import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getShiftId, refreshOpenShiftId } from '../services/AuthStore';

const HomeScreen = () => {
  const [hideMoney, setHideMoney] = useState(true);
  const [loading, setLoading] = useState(false);
  const [todayInfo, setTodayInfo] = useState({ dateLabel: 'Hôm nay', invoices: 0, revenue: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{date: string, revenue: number, profit?: number, orderCount?: number, productCount?: number} | null>(null);

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

  const loadStatisticsData = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      if (!token || !shopId) {
        return;
      }
      
      const res = await fetch(`${API_URL}/api/reports/statistics-overview?shopId=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (data) {
        setStatisticsData(data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShiftStats();
    loadStatisticsData();
  }, [loadShiftStats, loadStatisticsData]);

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(99, 110, 114, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 1,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '500',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      strokeWidth: 1,
      stroke: '#F0F0F0',
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
    },
    fillShadowGradientFrom: '#EA4335',
    fillShadowGradientFromOpacity: 1,
    fillShadowGradientTo: '#EA4335',
    fillShadowGradientToOpacity: 1,
  };

  // Process revenue chart data
  const revenueChartData = useMemo(() => {
    if (!statisticsData?.revenueStats?.dailyRevenues || !Array.isArray(statisticsData.revenueStats.dailyRevenues)) {
      return null;
    }
    
    const dailyRevenues = statisticsData.revenueStats.dailyRevenues;
    if (dailyRevenues.length === 0) return null;
    
    const labels = dailyRevenues.map((item: any) => {
      if (!item || !item.date) return 'N/A';
      try {
        const date = new Date(item.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      } catch {
        return 'N/A';
      }
    });
    
    const data = dailyRevenues.map((item: any) => {
      const revenue = Number(item?.revenue || 0);
      return isNaN(revenue) ? 0 : revenue / 1000000; // Convert to millions
    });
    
    if (data.length === 0 || data.every((val: number) => val === 0)) {
      return null;
    }
    
    // Calculate proper Y-axis values
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue;
    
    // Create 5 evenly spaced Y-axis values
    const yAxisValues = [];
    if (range === 0) {
      // If all values are the same, create a small range around the value
      const centerValue = maxValue;
      yAxisValues.push(0, centerValue * 0.5, centerValue, centerValue * 1.5, centerValue * 2);
    } else {
      const step = range / 4;
      for (let i = 0; i <= 4; i++) {
        yAxisValues.push(minValue + (step * i));
      }
    }
    
    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(52, 168, 83, ${opacity})`,
        strokeWidth: 3,
      }],
      yAxisValues: yAxisValues.map(val => Math.round(val * 10) / 10), // Round to 1 decimal
    };
  }, [statisticsData]);

  // Handle data point selection
  const handleDataPointPress = useCallback((data: any) => {
    if (!statisticsData?.revenueStats?.dailyRevenues) return;
    
    const dailyRevenues = statisticsData.revenueStats.dailyRevenues;
    const index = data.index;
    
    if (index >= 0 && index < dailyRevenues.length) {
      const selectedItem = dailyRevenues[index];
      const revenue = Number(selectedItem?.revenue || 0);
      const profit = Number(selectedItem?.profit || 0);
      const orderCount = Number(selectedItem?.orderCount || 0);
      const productCount = Number(selectedItem?.productCount || 0);
      const date = selectedItem?.date;
      
      if (date) {
        try {
          const dateObj = new Date(date);
          const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
          setSelectedDataPoint({
            date: formattedDate,
            revenue,
            profit,
            orderCount,
            productCount
          });
        } catch {
          setSelectedDataPoint({
            date: date,
            revenue,
            profit,
            orderCount,
            productCount
          });
        }
      }
    }
  }, [statisticsData]);

  // Process top products data
  const topProductsData = useMemo(() => {
    if (!statisticsData?.topProducts || !Array.isArray(statisticsData.topProducts)) {
      return null;
    }
    
    const top5 = statisticsData.topProducts.slice(0, 5).filter((item: any) => item && item.productName);
    if (top5.length === 0) return null;
    
    const labels = top5.map((item: any) => {
      const name = item.productName || 'Unknown';
      return name.length > 10 ? name.substring(0, 10) + '...' : name;
    });
    
    const data = top5.map((item: any) => {
      const quantity = Number(item?.totalQuantitySold || 0);
      return isNaN(quantity) ? 0 : quantity;
    });
    
    if (data.length === 0 || data.every((val: number) => val === 0)) {
      return null;
    }
    
    return {
      labels,
      datasets: [{
        data,
      }],
    };
  }, [statisticsData]);

  // Process top categories data for pie chart
  const topCategoriesData = useMemo(() => {
    if (!statisticsData?.topCategories || !Array.isArray(statisticsData.topCategories)) {
      return null;
    }
    
    const validCategories = statisticsData.topCategories.filter((item: any) => 
      item && item.categoryName && item.totalRevenue > 0
    );
    
    if (validCategories.length === 0) return null;
    
    const colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D01', '#46BDC6'];
    
    return validCategories.map((item: any, index: number) => {
      const revenue = Number(item.totalRevenue || 0);
      return {
        name: item.categoryName || 'Unknown',
        population: isNaN(revenue) ? 0 : revenue,
        color: colors[index % colors.length],
        legendFontColor: '#333',
        legendFontSize: 12,
      };
    });
  }, [statisticsData]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await Promise.all([loadShiftStats(), loadStatisticsData()]); setRefreshing(false); }} />}
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

        {/* Statistics Charts */}
        {statisticsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Đang tải thống kê...</Text>
          </View>
        ) : statisticsData ? (
          <>
            {/* Revenue Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="chart-line" size={24} color="#34A853" />
                <Text style={styles.chartTitle}>Doanh thu 7 ngày qua</Text>
              </View>
              {revenueChartData && revenueChartData.labels && revenueChartData.labels.length > 0 ? (
                <>
                  <LineChart
                    data={revenueChartData}
                    width={screenWidth - 64}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    yAxisSuffix=""
                    withInnerLines={true}
                    withOuterLines={false}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withDots={true}
                    withShadow={false}
                    fromZero={true}
                    segments={4}
                    formatYLabel={(value) => {
                      const num = parseFloat(value);
                      if (num === 0) return '0';
                      if (num < 1) return num.toFixed(1);
                      return Math.round(num).toString();
                    }}
                    onDataPointClick={handleDataPointPress}
                  />
                  <Text style={styles.chartNote}>Đơn vị: triệu VNĐ</Text>
                  
                  {/* Selected Data Point Info */}
                  {selectedDataPoint && (
                    <View style={styles.selectedDataPointContainer}>
                      <View style={styles.selectedDataPointCard}>
                        <Icon name="calendar" size={20} color="#34A853" />
                        <View style={styles.selectedDataPointInfo}>
                          <Text style={styles.selectedDataPointDate}>{selectedDataPoint.date}</Text>
                          <Text style={styles.selectedDataPointRevenue}>
                            Doanh thu: {selectedDataPoint.revenue.toLocaleString('vi-VN')} VNĐ
                          </Text>
                          {selectedDataPoint.profit !== undefined && selectedDataPoint.profit > 0 && (
                            <Text style={styles.selectedDataPointProfit}>
                              Lợi nhuận: {selectedDataPoint.profit.toLocaleString('vi-VN')} VNĐ
                            </Text>
                          )}
                          {selectedDataPoint.orderCount !== undefined && selectedDataPoint.orderCount > 0 && (
                            <Text style={styles.selectedDataPointStats}>
                              Đơn hàng: {selectedDataPoint.orderCount} • Sản phẩm: {selectedDataPoint.productCount}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity 
                          onPress={() => setSelectedDataPoint(null)}
                          style={styles.closeButton}
                        >
                          <Icon name="close" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="chart-line-variant" size={48} color="#E0E0E0" />
                  <Text style={styles.noDataText}>Chưa có dữ liệu doanh thu</Text>
                </View>
              )}
            </View>

            {/* Top Products Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="package-variant" size={24} color="#EA4335" />
                <Text style={styles.chartTitle}>Top sản phẩm bán chạy</Text>
              </View>
              {topProductsData && topProductsData.labels && topProductsData.labels.length > 0 ? (
                <>
                  <BarChart
                    data={topProductsData}
                    width={screenWidth - 64}
                    height={200}
                    chartConfig={chartConfig}
                    verticalLabelRotation={0}
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={styles.chart}
                    showValuesOnTopOfBars={true}
                    fromZero={true}
                    withInnerLines={true}
                  />
                  <Text style={styles.chartNote}>Số lượng sản phẩm đã bán</Text>
                  
                  {/* Product list with images */}
                  <View style={styles.productList}>
                    {statisticsData.topProducts.slice(0, 5).map((product: any, index: number) => (
                      <View key={product.productId} style={styles.productItem}>
                        <View style={styles.productRank}>
                          <Text style={styles.rankNumber}>#{index + 1}</Text>
                        </View>
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>{product.productName}</Text>
                          <Text style={styles.productCategory}>{product.categoryName}</Text>
                          <Text style={styles.productStats}>
                            Đã bán: {product.totalQuantitySold} • Giá TB: {product.averagePrice?.toLocaleString('vi-VN')}₫
                          </Text>
                          <Text style={styles.productStats}>
                            Doanh thu: {product.totalRevenue.toLocaleString('vi-VN')}₫ • Lợi nhuận: {product.totalProfit?.toLocaleString('vi-VN')}₫
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="package-variant-closed" size={48} color="#E0E0E0" />
                  <Text style={styles.noDataText}>Chưa có dữ liệu sản phẩm</Text>
                </View>
              )}
            </View>

            {/* Top Categories Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Icon name="shape" size={24} color="#4285F4" />
                <Text style={styles.chartTitle}>Top danh mục bán chạy</Text>
              </View>
              {topCategoriesData && topCategoriesData.length > 0 ? (
                <>
                  <PieChart
                    data={topCategoriesData}
                    width={screenWidth - 64}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[0, 0]}
                    absolute
                    hasLegend={false}
                  />
                  
                  {/* Category details */}
                  <View style={styles.categoryList}>
                    {statisticsData.topCategories.map((category: any, index: number) => {
                      const colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D01', '#46BDC6'];
                      return (
                        <View key={category.categoryId} style={styles.categoryItem}>
                          <View style={[styles.categoryDot, { backgroundColor: colors[index % colors.length] }]} />
                          <View style={styles.categoryInfo}>
                            <Text style={styles.categoryName}>{category.categoryName}</Text>
                            <Text style={styles.categoryStats}>
                              {category.productCount} loại • Đã bán: {category.totalQuantitySold} • {category.totalRevenue.toLocaleString('vi-VN')} VNĐ ({category.percentageOfTotal.toFixed(1)}%)
                            </Text>
                            <Text style={styles.categoryStats}>
                              Lợi nhuận: {category.totalProfit?.toLocaleString('vi-VN')} VNĐ
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="shape-outline" size={48} color="#E0E0E0" />
                  <Text style={styles.noDataText}>Chưa có dữ liệu danh mục</Text>
                </View>
              )}
            </View>
          </>
        ) : null}

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
  scrollContent: {
    paddingBottom: 80,
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

  // Chart styles
  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 32,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  chartNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 150,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  // Product list styles
  productList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 4,
  },
  productStats: {
    fontSize: 11,
    color: '#999',
  },
  // Category list styles
  categoryList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryStats: {
    fontSize: 12,
    color: '#666',
  },
  // Selected data point styles
  selectedDataPointContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  selectedDataPointCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#34A853',
  },
  selectedDataPointInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedDataPointDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedDataPointRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34A853',
    marginBottom: 2,
  },
  selectedDataPointProfit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
    marginBottom: 2,
  },
  selectedDataPointStats: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});

export default HomeScreen;