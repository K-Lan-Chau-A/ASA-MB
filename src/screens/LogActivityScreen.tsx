import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useInfiniteQuery } from '@tanstack/react-query';
import API_URL from '../config/api';
import { handle403Error } from '../utils/apiErrorHandler';
import { getAuthToken, getShopId } from '../services/AuthStore';

type LogActivity = {
  logActivityId: number;
  userId: number;
  content: string;
  type: number;
  shopId: number;
  createdAt: string;
};

type LogActivitiesResponse = {
  items: LogActivity[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const fetchLogActivities = async (params: {
  shopId: number;
  page: number;
  pageSize: number;
}, navigation?: NavigationProp<RootStackParamList>): Promise<LogActivitiesResponse> => {
  const { shopId, page, pageSize } = params;
  const token = await getAuthToken();
  const url = `${API_URL}/api/log-activities?ShopId=${encodeURIComponent(shopId)}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (navigation && handle403Error(response, navigation)) {
    throw new Error('403 Forbidden');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch log activities: ${response.status} ${text}`);
  }
  return (await response.json()) as LogActivitiesResponse;
};

const getTypeInfo = (type: number): { name: string; color: string; icon: string } => {
  switch (type) {
    case 1: return { name: 'Đăng nhập', color: '#4CAF50', icon: 'login' };
    case 2: return { name: 'Đăng xuất', color: '#F44336', icon: 'logout' };
    case 3: return { name: 'Đổi mật khẩu', color: '#FF9800', icon: 'key-change' };
    case 4: return { name: 'Khóa/Mở khóa', color: '#9C27B0', icon: 'lock' };
    case 5: return { name: 'Tạo người dùng', color: '#2196F3', icon: 'account-plus' };
    case 6: return { name: 'Cập nhật người dùng', color: '#00BCD4', icon: 'account-edit' };
    case 7: return { name: 'Tạo đơn hàng', color: '#8BC34A', icon: 'shopping' };
    case 8: return { name: 'Áp dụng giảm giá', color: '#FFC107', icon: 'percent' };
    case 9: return { name: 'Thêm sản phẩm', color: '#795548', icon: 'plus-box' };
    case 10: return { name: 'Cập nhật sản phẩm', color: '#607D8B', icon: 'pencil-box' };
    case 11: return { name: 'Xóa sản phẩm', color: '#E91E63', icon: 'delete' };
    case 12: return { name: 'Nhập kho', color: '#009688', icon: 'arrow-down-bold' };
    case 13: return { name: 'Xuất kho', color: '#FF5722', icon: 'arrow-up-bold' };
    case 14: return { name: 'Điều chỉnh tồn kho', color: '#3F51B5', icon: 'adjust' };
    case 15: return { name: 'Mở ca', color: '#4CAF50', icon: 'clock-start' };
    case 16: return { name: 'Đóng ca', color: '#F44336', icon: 'clock-end' };
    case 17: return { name: 'Tạo báo cáo', color: '#9E9E9E', icon: 'file-document' };
    case 18: return { name: 'Xuất báo cáo', color: '#607D8B', icon: 'download' };
    case 19: return { name: 'Cập nhật cấu hình', color: '#795548', icon: 'cog' };
    default: return { name: 'Hoạt động khác', color: '#757575', icon: 'information' };
  }
};

const LogActivityItem = ({ item }: { item: LogActivity }) => {
  const typeInfo = getTypeInfo(item.type);
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

  return (
    <View style={styles.logItem}>
      <View style={[styles.typeIndicator, { backgroundColor: typeInfo.color }]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logType}>{typeInfo.name}</Text>
          <Text style={styles.logTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.logDescription}>{item.content}</Text>
      </View>
    </View>
  );
};

const LogActivityScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
    queryKey: ['logActivities', shopId],
    queryFn: ({ pageParam = 1 }) =>
      fetchLogActivities({ shopId: shopId as number, page: pageParam as number, pageSize: PAGE_SIZE }, navigation),
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

  const renderItem = useCallback(({ item }: { item: LogActivity }) => (
    <LogActivityItem item={item} />
  ), []);

  const keyExtractor = useCallback((item: LogActivity) => String(item.logActivityId), []);

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
        <Text style={styles.headerTitle}>Lịch sử hoạt động</Text>
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
              <Text>Không có hoạt động nào</Text>
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
  logItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  typeIndicator: {
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  logContent: {
    flex: 1,
    padding: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logDescription: {
    fontSize: 14,
    color: '#555',
  },
});

export default LogActivityScreen;

