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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, NotificationItem as NotificationDTO, markNotificationRead, markAllNotificationsRead } from '../services/notifications';
import { getShopId as loadShopId, getUserId as loadUserId } from '../services/AuthStore';
import { notificationsStore } from '../services/NotificationsStore';

type RenderNotificationProps = {
  icon: string;
  color: string;
  title: string;
  description: string;
  time: string;
  onPress?: () => void;
  isRead?: boolean;
};

const NotificationItem = ({ icon, color, title, description, time, onPress, isRead }: RenderNotificationProps) => {
  // Fallback icon nếu icon name không hợp lệ
  const safeIcon = icon || 'bell';
  return (
    <TouchableOpacity style={styles.notificationItem} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Icon name={safeIcon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !isRead ? styles.unreadText : undefined]}>{title}</Text>
        <Text style={[styles.notificationDescription, !isRead ? styles.unreadText : undefined]}>{description}</Text>
        <Text style={styles.notificationTime}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
};

const NotificationScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const handleBack = () => {
    navigation.goBack(); // Sử dụng goBack() để quay lại màn hình trước đó
  };

  const PAGE_SIZE = 10;
  const [shopId, setShopId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadShopId(), loadUserId()]).then(([sid, uid]) => {
      if (!mounted) return;
      console.log('🔔 NotificationScreen - Loaded IDs:', { shopId: sid, userId: uid });
      setShopId(sid);
      setUserId(uid);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const mapTypeToIconAndColor = useCallback((type: NotificationDTO['type']): { icon: string; color: string } => {
    // Log type để debug
    try {
      console.log('🔔 mapTypeToIconAndColor - type:', type, typeof type);
    } catch {}
    
    const typeNum = Number(type);
    switch (typeNum) {
      case 1: // Cảnh báo - Alert
        return { icon: 'alert', color: '#F44336' };
      case 2: // Ưu đãi - Promotion/Sale
        return { icon: 'ticket-percent', color: '#9C27B0' };
      case 3: // Gợi ý - Suggestion
        return { icon: 'lightbulb-outline', color: '#FFC107' };
      case 4: // Thành công - Success
        return { icon: 'check-circle', color: '#4CAF50' };
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
    queryKey: ['notifications', shopId, userId],
    queryFn: ({ pageParam = 1 }) => {
      console.log('🔔 NotificationScreen - Fetching notifications with params:', { 
        shopId: shopId as number, 
        userId: userId as number, 
        page: pageParam as number, 
        pageSize: PAGE_SIZE 
      });
      return fetchNotifications({ 
        shopId: shopId as number, 
        userId: userId as number, 
        page: pageParam as number, 
        pageSize: PAGE_SIZE 
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    enabled: typeof shopId === 'number' && shopId > 0 && typeof userId === 'number' && userId > 0,
  });

  const flatData = useMemo(() => {
    const items = data?.pages?.flatMap(p => p.items) ?? [];
    console.log('🔔 NotificationScreen - Flat data items:', items);
    console.log('🔔 NotificationScreen - Total items count:', items.length);
    return items;
  }, [data]);

  // Whenever list is refreshed, recompute unread count from items (isRead === false)
  useEffect(() => {
    const items = flatData ?? [];
    const unread = items.reduce((acc, it) => acc + (it?.isRead ? 0 : 1), 0);
    notificationsStore.setCount(unread);
  }, [flatData]);

  // Debug logs
  useEffect(() => {
    console.log('🔔 NotificationScreen - Query state:', { 
      isLoading, 
      isError, 
      isRefetching, 
      hasNextPage, 
      isFetchingNextPage 
    });
  }, [isLoading, isError, isRefetching, hasNextPage, isFetchingNextPage]);

  const handlePressNotification = useCallback(async (item: NotificationDTO) => {
    if (item.isRead) return;
    // Optimistic: update cache
    queryClient.setQueryData(['notifications', shopId], (oldData: any) => {
      if (!oldData) return oldData;
      const updatedPages = oldData.pages.map((p: any) => ({
        ...p,
        items: p.items.map((it: NotificationDTO) => it.notificationId === item.notificationId ? { ...it, isRead: true } : it),
      }));
      return { ...oldData, pages: updatedPages };
    });
    notificationsStore.inc(-1);
    try { await markNotificationRead(item.notificationId); } catch {}
  }, [queryClient, shopId]);

  const renderItem = useCallback(({ item }: { item: NotificationDTO }) => {
    const map = mapTypeToIconAndColor(item.type);
    // Debug logging
    try {
      console.log('🔔 Notification render:', { 
        notificationId: item.notificationId, 
        type: item.type, 
        icon: map.icon, 
        color: map.color,
        title: item.title 
      });
    } catch {}
    return (
      <NotificationItem
        icon={map.icon}
        color={map.color}
        title={item.title}
        description={item.content}
        time={formatRelativeTime(item.createdAt)}
        onPress={() => handlePressNotification(item)}
        isRead={item.isRead}
      />
    );
  }, [mapTypeToIconAndColor, formatRelativeTime, handlePressNotification]);

  const keyExtractor = useCallback((item: NotificationDTO) => String(item.notificationId), []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onMarkAllRead = useCallback(async () => {
    if (!(userId && userId > 0)) return;
    // Optimistic
    queryClient.setQueryData(['notifications', shopId], (oldData: any) => {
      if (!oldData) return oldData;
      const updatedPages = oldData.pages.map((p: any) => ({
        ...p,
        items: p.items.map((it: NotificationDTO) => ({ ...it, isRead: true })),
      }));
      return { ...oldData, pages: updatedPages };
    });
    notificationsStore.setCount(0);
    try { await markAllNotificationsRead(userId); } catch {}
  }, [queryClient, shopId, userId]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="chevron-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity style={styles.markAllBtn} onPress={onMarkAllRead}>
          <Text style={styles.markAllText}>Đánh dấu đã đọc tất cả</Text>
        </TouchableOpacity>
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
    flex: 1,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#E0F2F1',
    borderRadius: 6,
  },
  markAllText: {
    color: '#00796B',
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: 'normal',
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
  unreadText: {
    fontWeight: 'bold',
    color: '#212121',
  },
});

export default NotificationScreen;