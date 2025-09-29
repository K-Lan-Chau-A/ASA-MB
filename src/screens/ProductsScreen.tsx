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
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import API_URL from '../config/api';
import { getShopId, getAuthToken } from '../services/AuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

// Remote products will be loaded from API

// Memoized ProductItem component
const ProductItem = memo(({ item, onEdit, onDelete }: { 
  item: Product; 
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const actionBtnRef = React.useRef<View>(null);
  
  const getStockStatus = (quantity?: number) => {
    if (!quantity) return { text: 'Không xác định số lượng', color: '#999' };
    if (quantity <= 5) return { text: `Còn ${quantity}`, color: '#FF6B6B' };
    if (quantity <= 20) return { text: `Còn ${quantity}`, color: '#FFA726' };
    return { text: `Còn ${quantity}`, color: '#4CAF50' };
  };

  const stockStatus = getStockStatus(item.quantity);

  return (
    <View style={styles.productItem}>
    <View style={styles.productImage}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="cover" />
      ) : (
        <Icon name="package-variant" size={24} color="#009DA5" />
      )}
    </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
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
                        onDelete(item);
                        setShowActions(false);
                      }}
                    >
                      <Icon name="delete" size={16} color="#FF6B6B" />
                      <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Xóa</Text>
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
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      
      console.log('📂 Categories API response:', data);
      console.log('📂 Categories items:', items);
      
      const mappedCategories: Category[] = items.map((cat: any) => ({
        categoryId: Number(cat.categoryId ?? 0),
        categoryName: String(cat.categoryName ?? ''),
        description: String(cat.description ?? ''),
      }));
      
      console.log('📂 Mapped categories:', mappedCategories);
      setCategories(mappedCategories);
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
            const fresh = Date.now() - ts < CACHE_TTL_MS;
            if (items.length && fresh) {
              setProducts(items);
              if (showLoader) setIsLoading(false);
              return;
            }
          }
        } catch {}
      }
      const url = `${API_URL}/api/products?ShopId=${shopId}&page=1&pageSize=100`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      
      console.log('📦 Products API response:', data);
      console.log('📦 Products items:', items);
      
      // Debug: Check first product's category data
      if (items.length > 0) {
        console.log('📦 First product sample:', items[0]);
        console.log('📦 Product categoryId:', items[0]?.categoryId);
        console.log('📦 Product categoryName:', items[0]?.categoryName);
      }
      
      let mapped: Product[] = items.map((p: any, idx: number) => ({
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

      // Enrich units by calling product-units per product (base unit has conversionFactor=1)
      try {
        const enriched = await Promise.all(
          mapped.map(async (prod) => {
            try {
              const uRes = await fetch(`${API_URL}/api/product-units?ShopId=${shopId}&ProductId=${prod.id}&page=1&pageSize=50`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              const uData = await uRes.json();
              const arr: any[] = Array.isArray(uData?.items) ? uData.items : [];
              if (arr.length > 0) {
                let units = arr.map((u: any) => ({
                  unitName: String(u.unitName ?? u.name ?? 'Cái'),
                  price: Number(u.price ?? prod.price ?? 0),
                  quantityInBaseUnit: Number(u.conversionFactor ?? 1),
                  isBaseUnit: Number(u.conversionFactor ?? 1) === 1,
                })).sort((a: any, b: any) => (a.quantityInBaseUnit || 1) - (b.quantityInBaseUnit || 1));
                const baseIdx = units.findIndex((u: any) => u.isBaseUnit);
                const base = baseIdx >= 0 ? units[baseIdx] : units[0];
                // Trust products API price as the source of truth for base unit.
                // If it differs from units API, override base unit price to keep UI consistent.
                if (typeof prod.price === 'number' && prod.price > 0) {
                  units = units.map((u: any, idx: number) => idx === (baseIdx >= 0 ? baseIdx : 0) ? { ...u, price: prod.price } : u);
                }
                const finalBase = baseIdx >= 0 ? units[baseIdx] : units[0];
                return { ...prod, units, price: finalBase.price, selectedUnit: finalBase.unitName };
              }
            } catch {}
            // fallback keep original price and selectedUnit
            return { ...prod, units: [{ unitName: 'Cái', price: prod.price, quantityInBaseUnit: 1, isBaseUnit: true }], selectedUnit: 'Cái' };
          })
        );
        mapped = enriched;
      } catch {}

      setProducts(mapped);

      // Save fresh cache (overwrite any previous data)
      try {
        if (shopId > 0) {
          const cachePayload = JSON.stringify({ ts: Date.now(), items: mapped });
          await AsyncStorage.setItem(cacheKey, cachePayload);
        }
      } catch {}
    } catch (e) {
      // ignore
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  // Note: Products already have categoryName from API, no need for enrichment

  useEffect(() => {
    // Load categories first, then products
    const loadData = async () => {
      await loadCategories();
      await loadProducts(true, false);
    };
    loadData();
  }, [loadCategories, loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    await loadProducts(false, true); // force refresh
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
    navigation.navigate('AddProduct');
  }, [navigation]);

  const handleScanBarcode = useCallback(() => {
    navigation.navigate('Scanner');
  }, [navigation]);

  const handleEditProduct = useCallback((product: Product) => {
    // Navigate to AddProduct with prefilled product data
    navigation.navigate('AddProduct', { product: product });
  }, [navigation]);

  const handleDeleteProduct = useCallback((product: Product) => {
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => {
            setProducts(prev => prev.filter(p => p.id !== product.id));
            Alert.alert('Thành công', 'Sản phẩm đã được xóa');
          }
        },
      ]
    );
  }, []);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      item={item} 
      onEdit={handleEditProduct}
      onDelete={handleDeleteProduct}
    />
  ), [handleEditProduct, handleDeleteProduct]);

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

  const keyExtractor = useCallback((item: Product | string) => 
    typeof item === 'string' ? item : item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 120, // Height of productItem
    offset: 120 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleTapOutside}>
      <View style={styles.content} >
      

          {/* Search + Add in one row */}
          <View style={styles.searchRow}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.searchContainer, { flex: 1 }] }>
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
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={clearSearch}>
                    <Icon name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
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
            {isLoading ? (
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
                contentContainerStyle={[styles.productListContent, { paddingBottom: isKeyboardVisible ? 0 : (insets.bottom || 0) }]}
              />
            )}
          </View>
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
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
