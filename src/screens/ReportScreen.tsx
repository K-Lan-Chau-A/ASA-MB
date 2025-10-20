import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
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

  useEffect(() => {
    let mounted = true;
    getShopId().then((id) => {
      if (mounted) setShopId(id);
    });
    return () => {
      mounted = false;
    };
  }, []);

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
});

export default ReportScreen;

