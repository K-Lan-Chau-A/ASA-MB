import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { navigateIfAuthorized } from '../utils/navigationGuard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import API_URL from '../config/api';
import { getShopId, getAuthToken } from '../services/AuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProductsQuery } from '../services/products';
import { handle403Error } from '../utils/apiErrorHandler';

interface ProductUnit {
  unitName: string;
  price: number;
  quantityInBaseUnit: number;
  isBaseUnit: boolean;
}

interface Category {
  categoryId: number;
  categoryName: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  units: ProductUnit[];
  selectedUnit: string;
  categoryId?: number;
  categoryName?: string;
  quantity?: number;
  lastUpdated?: string;
  imageUrl?: string;
  status?: number; // 1: active, 0: deactive
}

// Remote products will be loaded from API

// Memoized ProductItem component
const ProductItem = memo(({ item, onEdit, onToggleActive }: { 
  item: Product; 
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const actionBtnRef = React.useRef<View>(null);
  
  const getStockStatus = (quantity?: number) => {
    const q = typeof quantity === 'number' ? quantity : 0;
    if (q <= 0) return { text: `Hết hàng`, color: '#FF6B6B' };
    if (q <= 5) return { text: `Còn ${q}`, color: '#FF6B6B' };
    if (q <= 20) return { text: `Còn ${q}`, color: '#FFA726' };
    return { text: `Còn ${q}`, color: '#4CAF50' };
  };

  const stockStatus = getStockStatus(item.quantity);

  return (
    <View style={[styles.productItem, item.status === 0 && { opacity: 0.6 }]}>
    <View style={styles.productImage}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="cover" />
      ) : (
        <Icon name="package-variant" size={24} color="#009DA5" />
      )}
    </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.status === 0 && (
          <Text style={styles.deactiveBadge}>Đã ngưng bán</Text>
        )}
        <Text style={styles.productBarcode}>Mã: {item.barcode || 'Chưa có'}</Text>
        <Text style={styles.productCategory}>{item.categoryName || 'Chưa phân loại'}</Text>
        
        <View style={styles.productDetails}>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}₫</Text>
            <Text style={styles.productUnit}>/{item.selectedUnit}</Text>
          </View>
          <View style={styles.stockContainer}>
            <Text style={[styles.stockText, { color: stockStatus.color }]}>
              {stockStatus.text}
            </Text>
          </View>
        </View>
        
        {item.lastUpdated && (
          <Text style={styles.lastUpdated}>Cập nhật: {item.lastUpdated}</Text>
        )}
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity 
          ref={actionBtnRef}
          style={styles.actionButton}
          onPress={() => {
            try {
              actionBtnRef.current?.measureInWindow((x, y, width, height) => {
                setMenuPos({ x, y, width, height });
                setShowActions(true);
              });
            } catch {
              setShowActions(true);
            }
          }}
        >
          <Icon name="dots-vertical" size={20} color="#666" />
        </TouchableOpacity>
        
        {showActions && (
          <Modal transparent animationType="fade" visible onRequestClose={() => setShowActions(false)}>
            <TouchableWithoutFeedback onPress={() => setShowActions(false)}>
              <View style={styles.actionsModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.actionsModalCard, { position: 'absolute', top: menuPos.y + menuPos.height + 4, left: Math.max(8, menuPos.x - 120 + menuPos.width) }]}>
                    <TouchableOpacity 
                      style={styles.actionItem}
                      onPress={() => {
                        onEdit(item);
                        setShowActions(false);
                      }}
                    >
                      <Icon name="pencil" size={16} color="#009DA5" />
                      <Text style={styles.actionText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionItem}
                      onPress={() => {
                        onToggleActive(item);
                        setShowActions(false);
                      }}
                    >
                      {item.status === 0 ? (
                        <>
                          <Icon name="check-circle" size={16} color="#2E7D32" />
                          <Text style={[styles.actionText, { color: '#2E7D32' }]}>Kích hoạt</Text>
                        </>
                      ) : (
                        <>
                          <Icon name="block-helper" size={16} color="#FF6B6B" />
                          <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Ngưng bán</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    </View>
  );
});

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const ProductsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Pagination state
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  // Get category names for display
  const categoryNames = useMemo(() => {
    return ['Tất cả', ...categories.map(cat => cat.categoryName)];
  }, [categories]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'Tất cả') {
      filtered = filtered.filter(product => product.categoryName === selectedCategory);
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchTerm = searchText.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode?.includes(searchTerm) ||
        product.categoryName?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [products, searchText, selectedCategory]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      // Hide bottom tab when keyboard is visible
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' },
      });
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      // Restore bottom tab style
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      
      if (shopId <= 0) return;
      
      const url = `${API_URL}/api/categories?shopId=${shopId}&page=1&pageSize=100`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (handle403Error(res, navigation)) return;
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      
      console.log('📂 Categories API response:', data);
      console.log('📂 Categories items:', items);
      
      const mappedCategories: Category[] = items.map((cat: any) => ({
        categoryId: Number(cat.categoryId ?? 0),
        categoryName: String(cat.categoryName ?? ''),
        description: String(cat.description ?? ''),
      }));
      
      // Remove duplicate categories by categoryId
      const uniqueCategories = Array.from(
        new Map(mappedCategories.map(cat => [cat.categoryId, cat])).values()
      );
      
      console.log('📂 Mapped categories:', uniqueCategories);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadProducts = useCallback(async (showLoader: boolean, force: boolean = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const shopId = (await getShopId()) ?? 0;
      const token = await getAuthToken();
      const cacheKey = `products:${shopId}:v2`;

      // If force refresh requested, invalidate cache upfront
      if (force && shopId > 0) {
        try { await AsyncStorage.removeItem(cacheKey); } catch {}
      }

      // Try cache first if not force
      if (!force && shopId > 0) {
        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const ts: number = Number(parsed?.ts || 0);
            const items: Product[] = Array.isArray(parsed?.items) ? parsed.items : [];
            // Deduplicate products by id
            const uniqueItems = Array.from(
              new Map(items.map(p => [p.id, p])).values()
            );
            const fresh = Date.now() - ts < CACHE_TTL_MS;
            if (uniqueItems.length && fresh) {
              setProducts(uniqueItems);
              if (showLoader) setIsLoading(false);
              return;
            }
          }
        } catch {}
      }
      // Fallback: load first page quickly
      await loadPage(1, PAGE_SIZE, false, token, shopId);
      setInitialLoaded(true);
      // Background prefetch all pages for later fast sort/filter
      prefetchAllProducts(token, shopId).catch(() => {});
    } catch (e) {
      // ignore
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  // Generic loader for a page
  const loadPage = useCallback(async (targetPage: number, pageSize: number, append: boolean, token?: string | null, shopIdArg?: number) => {
    const shopId = shopIdArg ?? ((await getShopId()) ?? 0);
    const auth = token ?? (await getAuthToken());
    if (shopId <= 0) return;
    const url = `${API_URL}/api/products?ShopId=${shopId}&page=${targetPage}&pageSize=${pageSize}`;
    const res = await fetch(url, { headers: auth ? { Authorization: `Bearer ${auth}` } : undefined });
    if (handle403Error(res, navigation)) return;
    const data = await res.json().catch(() => ({} as any));
    const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const totalPages: number = Number(data?.totalPages ?? data?.data?.totalPages ?? 0) || 0;

    let mapped: Product[] = items.map((p: any, idx: number) => ({
      id: String(p.id ?? p.productId ?? `${targetPage}-${idx + 1}`),
      name: String(p.productName ?? p.name ?? 'Sản phẩm'),
      price: Number(p.price ?? p.defaultPrice ?? 0),
      barcode: p.barcode ? String(p.barcode) : undefined,
      categoryId: typeof p.categoryId === 'number' ? p.categoryId : undefined,
      categoryName: p.categoryName ? String(p.categoryName) : 'Chưa phân loại',
      quantity: typeof p.quantity === 'number' ? p.quantity : (typeof p.stock === 'number' ? p.stock : undefined),
      lastUpdated: p.updateAt ? String(p.updateAt).slice(0, 10) : (p.updatedAt ? String(p.updatedAt).slice(0,10) : undefined),
      imageUrl: p.imageUrl ? String(p.imageUrl) : (p.productImageURL ? String(p.productImageURL) : undefined),
      units: [{ unitName: 'Cái', price: Number(p.price ?? 0), quantityInBaseUnit: 1, isBaseUnit: true }],
      selectedUnit: 'Cái',
      status: typeof p.status === 'number' ? p.status : (typeof p.active === 'boolean' ? (p.active ? 1 : 0) : 1),
    }));

    setProducts(prev => {
      if (append) {
        // Remove duplicates by id
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = mapped.filter(p => !existingIds.has(p.id));
        const combined = [...prev, ...uniqueNew];
        // Deduplicate entire array once more to be safe
        return Array.from(new Map(combined.map(p => [p.id, p])).values());
      }
      // Deduplicate initial load as well
      return Array.from(new Map(mapped.map(p => [p.id, p])).values());
    });

    // hasNext: based on totalPages if available, or length==pageSize heuristic
    const more = totalPages ? targetPage < totalPages : (items.length === pageSize);
    setHasNext(more);
    setPage(targetPage);

    // Cache incrementally (append case merge)
    try {
      const cacheKey = `products:${shopId}:v2`;
      const existingRaw = await AsyncStorage.getItem(cacheKey);
      let merged: Product[] = [];
      if (append && existingRaw) {
        const rawItems = (JSON.parse(existingRaw)?.items || []) as Product[];
        // Deduplicate existing items
        merged = Array.from(new Map(rawItems.map(p => [p.id, p])).values());
      }
      const finalItems = append ? [...merged, ...mapped] : mapped;
      // Deduplicate before caching
      const uniqueFinalItems = Array.from(new Map(finalItems.map(p => [p.id, p])).values());
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: uniqueFinalItems }));
    } catch {}
  }, []);

  // Background prefetch all products to cache (does not change UI)
  const prefetchAllProducts = useCallback(async (token?: string | null, shopIdArg?: number) => {
    try {
      const shopId = shopIdArg ?? ((await getShopId()) ?? 0);
      const auth = token ?? (await getAuthToken());
      if (shopId <= 0) return;
      const pageSize = 100;
      let p = 1;
      let all: Product[] = [];
      while (true) {
        const url = `${API_URL}/api/products?ShopId=${shopId}&page=${p}&pageSize=${pageSize}`;
        const res = await fetch(url, { headers: auth ? { Authorization: `Bearer ${auth}` } : undefined });
        if (handle403Error(res, navigation)) break;
        const data = await res.json().catch(() => ({} as any));
        const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const chunk: Product[] = items.map((prodItem: any, idx: number) => ({
          id: String(prodItem.id ?? prodItem.productId ?? `${p}-${idx}`),
          name: String(prodItem.productName ?? prodItem.name ?? 'Sản phẩm'),
          price: Number(prodItem.price ?? prodItem.defaultPrice ?? 0),
          barcode: prodItem.barcode ? String(prodItem.barcode) : undefined,
          categoryId: typeof prodItem.categoryId === 'number' ? prodItem.categoryId : undefined,
          categoryName: prodItem.categoryName ? String(prodItem.categoryName) : 'Chưa phân loại',
          quantity: typeof prodItem.quantity === 'number' ? prodItem.quantity : (typeof prodItem.stock === 'number' ? prodItem.stock : undefined),
          lastUpdated: prodItem.updateAt ? String(prodItem.updateAt).slice(0, 10) : (prodItem.updatedAt ? String(prodItem.updatedAt).slice(0,10) : undefined),
          imageUrl: prodItem.imageUrl ? String(prodItem.imageUrl) : (prodItem.productImageURL ? String(prodItem.productImageURL) : undefined),
          units: [{ unitName: 'Cái', price: Number(prodItem.price ?? 0), quantityInBaseUnit: 1, isBaseUnit: true }],
          selectedUnit: 'Cái',
          status: typeof prodItem.status === 'number' ? prodItem.status : (typeof prodItem.active === 'boolean' ? (prodItem.active ? 1 : 0) : 1),
        }));
        all = [...all, ...chunk];
        const totalPages: number = Number(data?.totalPages ?? data?.data?.totalPages ?? 0) || 0;
        const more = totalPages ? p < totalPages : (items.length === pageSize);
        if (!more) break;
        p += 1;
      }
      // Deduplicate all products by id
      const uniqueAll = Array.from(
        new Map(all.map(p => [p.id, p])).values()
      );
      const cacheKey = `products:${shopId}:v2`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: uniqueAll }));
    } catch {}
  }, []);

  // Note: Products already have categoryName from API, no need for enrichment

  const { data: queriedProducts, isLoading: queryLoading, refetch } = useProductsQuery();

  useEffect(() => {
    // Load categories first
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    // Fast first page
    loadProducts(true, false);
  }, [loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setPage(1); setHasNext(true); setInitialLoaded(false);
    await loadProducts(false, true); // force refresh -> will reload first page and prefetch
    setRefreshing(false);
  }, [loadCategories, loadProducts]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleSearchFocus = useCallback(() => {
    // Auto focus handled by TextInput
  }, []);

  const handleSearchBlur = useCallback(() => {
    // Keep search text visible
  }, []);

  const handleTapOutside = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchText('');
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }, []);

  const handleAddProduct = useCallback(() => {
    navigateIfAuthorized(navigation, 'AddProduct', { buildUrl: (sid) => `${API_URL}/api/categories?ShopId=${sid}&page=1&pageSize=1` });
  }, [navigation]);

  const handleScanBarcode = useCallback(() => {
    navigation.navigate('Scanner', { returnScreen: 'Products' });
  }, [navigation]);

  const handleEditProduct = useCallback((product: Product) => {
    // Navigate to AddProduct with prefilled product data
    navigateIfAuthorized(navigation, 'AddProduct', { buildUrl: (sid) => `${API_URL}/api/categories?ShopId=${sid}&page=1&pageSize=1` }, { product: product });
  }, [navigation]);

  const handleToggleActive = useCallback((product: Product) => {
    const isDeactive = product.status === 0;
    const title = isDeactive ? 'Kích hoạt sản phẩm' : 'Ngưng bán sản phẩm';
    const message = isDeactive
      ? `Kích hoạt lại sản phẩm "${product.name}"?`
      : `Bạn có chắc chắn muốn ngưng bán sản phẩm "${product.name}"?`;
    Alert.alert(
      title,
      message,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isDeactive ? 'Kích hoạt' : 'Ngưng bán',
          style: isDeactive ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const shopId = (await getShopId()) ?? 0;
              const token = await getAuthToken();
              const idNum = encodeURIComponent(product.id);
              if (product.status === 1) {
                // Deactivate via DELETE /api/products/{id}?shopid=
                const res = await fetch(`${API_URL}/api/products/${idNum}?shopid=${shopId}` , {
                  method: 'DELETE',
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (handle403Error(res, navigation)) return;
                if (!res.ok) throw new Error('Deactive failed');
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: 0 } : p));
                Alert.alert('Thành công', 'Sản phẩm đã được ngưng bán');
              } else {
                // Activate via PUT /api/products/{id}/status?shopid=
                const res = await fetch(`${API_URL}/api/products/${idNum}/status?shopid=${shopId}`, {
                  method: 'PUT',
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (handle403Error(res, navigation)) return;
                if (!res.ok) throw new Error('Activate failed');
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: 1 } : p));
                Alert.alert('Thành công', 'Sản phẩm đã được kích hoạt');
              }
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái sản phẩm');
            }
          }
        }
      ]
    );
  }, []);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      item={item} 
      onEdit={handleEditProduct}
      onToggleActive={handleToggleActive}
    />
  ), [handleEditProduct, handleToggleActive]);

  const renderCategory = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item && styles.categoryChipSelected
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text style={[
        styles.categoryChipText,
        selectedCategory === item && styles.categoryChipTextSelected
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  ), [selectedCategory]);

  const keyExtractor = useCallback((item: Product | string, index: number) => 
    typeof item === 'string' ? `category_${index}_${item}` : `product_${item.id}`, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 120, // Height of productItem
    offset: 120 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <View style={styles.content}>
        {/* Search + Add in one row */}
        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { flex: 1 }]}>
            <Icon name="magnify" size={20} color="#666" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Tìm sản phẩm, mã vạch..."
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
              clearButtonMode="while-editing"
              onSubmitEditing={handleTapOutside}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.qrButton} onPress={handleScanBarcode}>
            <Icon name="qrcode-scan" size={20} color="#009DA5" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categoryNames}
            renderItem={renderCategory}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Product List */}
        <View style={styles.productList}>
            {isLoading || queryLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Đang tải sản phẩm...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="package-variant-closed" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchText ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchText 
                    ? 'Thử tìm kiếm với từ khóa khác' 
                    : 'Nhấn "Thêm" để thêm sản phẩm mới'
                  }
                </Text>
                {!searchText && (
                  <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddProduct}>
                    <Icon name="plus" size={16} color="#009DA5" />
                    <Text style={styles.emptyAddButtonText}>Thêm sản phẩm đầu tiên</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                getItemLayout={getItemLayout}
                removeClippedSubviews={false}
                maxToRenderPerBatch={15}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={8}
                keyboardShouldPersistTaps="handled"
                decelerationRate={0.992}
                scrollEventThrottle={16}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReachedThreshold={0.4}
                onEndReached={async () => {
                  if (!initialLoaded || !hasNext || loadingMore) return;
                  setLoadingMore(true);
                  try { await loadPage(page + 1, PAGE_SIZE, true); setPage(prev => prev + 1); } catch {}
                  setLoadingMore(false);
                }}
                contentContainerStyle={[styles.productListContent, { paddingBottom: isKeyboardVisible ? 0 : (insets.bottom || 0) }]}
              />
            )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009DA5',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  qrButton: {
    padding: 8,
    borderRadius: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryChipSelected: {
    backgroundColor: '#009DA5',
    borderColor: '#009DA5',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  resultsSummary: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  productList: {
    flex: 1,
    marginHorizontal: 16,
  },
  productListContent: {
    paddingBottom: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 50,
    height: 50,
    backgroundColor: '#F0F9FA',
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deactiveBadge: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '700',
    marginBottom: 6,
  },
  productBarcode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#009DA5',
    backgroundColor: '#F0F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 16,
    color: '#009DA5',
    fontWeight: 'bold',
  },
  productUnit: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  stockContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  productActions: {
    position: 'relative',
  },
  actionsModalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-start', alignItems: 'flex-start' },
  actionsModalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', paddingVertical: 6, minWidth: 160, elevation: 8 },
  actionButton: {
    padding: 8,
  },
  actionsDropdown: {
    position: 'absolute',
    top: 35,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#009DA5',
    gap: 6,
  },
  emptyAddButtonText: {
    fontSize: 14,
    color: '#009DA5',
    fontWeight: 'bold',
  },
});

export default ProductsScreen;
