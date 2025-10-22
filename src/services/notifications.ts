import API_URL from '../config/api';
import { getAuthToken } from './AuthStore';

export type NotificationItem = {
  notificationId: number;
  shopId: number;
  userId: number;
  title: string;
  content: string;
  type: 0 | 1 | 2 | 3 | 4; // 0 Default, 1 Cảnh báo, 2 Ưu đãi, 3 Gợi ý, 4 Thành công
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function fetchNotifications(params: {
  shopId: number;
  userId: number;
  page: number;
  pageSize: number;
}): Promise<NotificationsResponse> {
  const { shopId, userId, page, pageSize } = params;
  const url = `${API_URL}/api/notifications?ShopId=${encodeURIComponent(
    shopId
  )}&UserId=${encodeURIComponent(userId)}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;

  console.log('🔔 fetchNotifications - API URL:', url);
  console.log('🔔 fetchNotifications - Params:', params);

  const response = await fetch(url);
  console.log('🔔 fetchNotifications - Response status:', response.status);
  
  if (!response.ok) {
    const text = await response.text();
    console.log('🔔 fetchNotifications - Error response:', text);
    throw new Error(`Failed to fetch notifications: ${response.status} ${text}`);
  }
  
  const result = await response.json();
  console.log('🔔 fetchNotifications - Response data:', result);
  return result as NotificationsResponse;
}


// Mark a single notification as read
export async function markNotificationRead(notificationId: number): Promise<boolean> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return false;
  try {
    const json = await res.json();
    const dataField = (json && json.data) ?? json;
    return Boolean((json && json.success) ?? dataField === true);
  } catch {
    // Some backends may return empty body for 200 OK
    return true;
  }
}

// Mark all notifications as read for a given user
export async function markAllNotificationsRead(userId: number): Promise<boolean> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/notifications/users/${encodeURIComponent(userId)}/read-all`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return false;
  try {
    const json = await res.json();
    const dataField = (json && json.data) ?? json;
    return Boolean((json && json.success) ?? dataField === true);
  } catch {
    return true;
  }
}


