import API_URL from '../config/api';

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
  page: number;
  pageSize: number;
}): Promise<NotificationsResponse> {
  const { shopId, page, pageSize } = params;
  const url = `${API_URL}/api/notifications?ShopId=${encodeURIComponent(
    shopId
  )}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch notifications: ${response.status} ${text}`);
  }
  return (await response.json()) as NotificationsResponse;
}


