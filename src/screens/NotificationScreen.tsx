import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchNotifications, NotificationItem as NotificationDTO } from '../services/notifications';
import { getShopId as loadShopId } from '../services/AuthStore';
import { notificationsStore } from '../services/NotificationsStore';

type RenderNotificationProps = {
  icon: string;
  color: string;
  title: string;
  description: string;
  time: string;
};

const NotificationItem = ({ icon, color, title, description, time }: RenderNotificationProps) => (
  <TouchableOpacity style={styles.notificationItem}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={24} color="#FFFFFF" />
    </View>
    <View style={styles.notificationContent}>
      <Text style={styles.notificationTitle}>{title}</Text>
      <Text style={styles.notificationDescription}>{description}</Text>
      <Text style={styles.notificationTime}>{time}</Text>
    </View>
  </TouchableOpacity>
);

const NotificationScreen = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack(); // Sử dụng goBack() để quay lại màn hình trước đó
  };

  const PAGE_SIZE = 10;
  const [shopId, setShopId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    loadShopId().then((id) => {
      if (mounted) setShopId(id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const mapTypeToIconAndColor = useCallback((type: NotificationDTO['type']): { icon: string; color: string } => {
    switch (type) {
      case 1: // Cảnh báo
        return { icon: 'alert-outline', color: '#F44336' };
      case 2: // Ưu đãi
        return { icon: 'sale-outline', color: '#9C27B0' };
      case 3: // Gợi ý
        return { icon: 'lightbulb-on-outline', color: '#FFC107' };
      case 4: // Thành công
        return { icon: 'check-circle-outline', color: '#4CAF50' };
      case 0: // Default
      default:
        return { icon: 'bell-outline', color: '#2196F3' };
    }
  }, []);

  const formatRelativeTime = useCallback((iso: string): string => {
    const created = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - created);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'Vừa xong';
    if (diff < hour) return `${Math.floor(diff / minute)} phút trước`;
    if (diff < day) return `${Math.floor(diff / hour)} giờ trước`;
    return `${Math.floor(diff / day)} ngày trước`;
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
    queryKey: ['notifications', shopId],
    queryFn: ({ pageParam = 1 }) =>
      fetchNotifications({ shopId: shopId as number, page: pageParam as number, pageSize: PAGE_SIZE }),
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

  // Whenever list is refreshed, recompute unread count from items (isRead === false)
  useEffect(() => {
    const items = flatData ?? [];
    const unread = items.reduce((acc, it) => acc + (it?.isRead ? 0 : 1), 0);
    notificationsStore.setCount(unread);
  }, [flatData]);

  const renderItem = useCallback(({ item }: { item: NotificationDTO }) => {
    const map = mapTypeToIconAndColor(item.type);
    return (
      <NotificationItem
        icon={map.icon}
        color={map.color}
        title={item.title}
        description={item.content}
        time={formatRelativeTime(item.createdAt)}
      />
    );
  }, [mapTypeToIconAndColor, formatRelativeTime]);

  const keyExtractor = useCallback((item: NotificationDTO) => String(item.notificationId), []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="chevron-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
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
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Tất cả</Text>
        }
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
              <Text>Không có thông báo</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
});

export default NotificationScreen;