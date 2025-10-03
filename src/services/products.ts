import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API_URL from '../config/api';
import { getAuthToken, getShopId } from './AuthStore';

export type Product = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  categoryId?: number;
  categoryName?: string;
  quantity?: number;
  lastUpdated?: string;
  imageUrl?: string;
  units: Array<{ unitName: string; price: number; quantityInBaseUnit: number; isBaseUnit: boolean }>; 
  selectedUnit: string;
};

const mapProducts = (items: any[]): Product[] => {
  return items.map((p: any, idx: number) => ({
    id: String(p.id ?? p.productId ?? idx + 1),
    name: String(p.productName ?? p.name ?? 'Sản phẩm'),
    price: Number(p.price ?? p.defaultPrice ?? 0),
    barcode: p.barcode ? String(p.barcode) : undefined,
    categoryId: typeof p.categoryId === 'number' ? p.categoryId : undefined,
    categoryName: p.categoryName ? String(p.categoryName) : 'Chưa phân loại',
    quantity: typeof p.quantity === 'number' ? p.quantity : (typeof p.stock === 'number' ? p.stock : undefined),
    lastUpdated: p.updateAt ? String(p.updateAt).slice(0, 10) : (p.updatedAt ? String(p.updatedAt).slice(0,10) : undefined),
    imageUrl: p.imageUrl ? String(p.imageUrl) : (p.productImageURL ? String(p.productImageURL) : undefined),
    units: [],
    selectedUnit: 'Cái',
  }));
};

export const productKeys = {
  all: ['products'] as const,
  byShop: (shopId: number) => [...productKeys.all, shopId] as const,
};

export function useProductsQuery() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: async () => {
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const url = `${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=100`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const mapped = mapProducts(items);
      return mapped;
    },
  });
}

export function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: productKeys.all });
}


