# Hướng dẫn áp dụng xử lý 403 Error

## Tổng quan
Khi backend trả về lỗi 403 (Forbidden), ứng dụng sẽ tự động điều hướng đến màn hình `ForbiddenScreen` thay vì hiển thị "không có dữ liệu".

## Cách áp dụng

### Bước 1: Import utility function
Thêm vào đầu file screen:
```typescript
import { handle403Error } from '../utils/apiErrorHandler';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
```

### Bước 2: Lấy navigation object (nếu chưa có)
Nếu component chưa có navigation, thêm:
```typescript
const navigation = useNavigation<NavigationProp<RootStackParamList>>();
```

### Bước 3: Thêm check 403 sau mỗi fetch call
Sau mỗi `fetch()` call, thêm check:
```typescript
const res = await fetch(url, options);
if (handle403Error(res, navigation)) return; // Navigate to ForbiddenScreen nếu 403
const json = await res.json();
```

## Ví dụ

### Trước:
```typescript
const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json().catch(() => null);
```

### Sau:
```typescript
const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (handle403Error(res, navigation)) return; // ✅ Thêm dòng này
const json = await res.json().catch(() => null);
```

## Các files đã được cập nhật
- ✅ ChatbotScreen.tsx
- ✅ HomeScreen.tsx
- ✅ CustomerScreen.tsx
- ✅ OrderScreen.tsx (một phần)

## Các files cần cập nhật
- ProductsScreen.tsx
- ConfirmOrderScreen.tsx
- AddProductScreen.tsx
- ManageAccount.tsx
- ManageCustomerScreen.tsx
- ManageCategoryScreen.tsx
- PromotionScreen.tsx
- VoucherScreen.tsx
- InventoryTransactionScreen.tsx
- RankScreen.tsx
- ReportScreen.tsx
- SettingScreen.tsx
- OrderDetailScreen.tsx
- BillsScreen.tsx
- CloseShiftReportScreen.tsx
- MoreScreen.tsx
- LogActivityScreen.tsx
- Và các services có fetch calls (notifications.ts, FCMService.ts, AuthStore.ts)

## Lưu ý
- LoginScreen.tsx KHÔNG cần check 403 (vì đó là màn hình login)
- Nếu fetch trong service/utility không có navigation, có thể bỏ qua hoặc truyền navigation từ caller

