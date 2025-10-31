// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getShopId, getAuthToken, getShiftId, getUserId } from '../services/AuthStore';
import { setShiftId } from '../services/AuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProductUnit {
  unitName: string;
  price: number;
  quantityInBaseUnit: number; // Số lượng đơn vị chuẩn trong 1 đơn vị này
  isBaseUnit: boolean;
  productUnitId?: number;
  unitId?: number;
  availableQuantity?: number; // Số lượng có sẵn cho đơn vị này
}

interface Product {
  id: string;
  name: string;
  price: number; // Giá của đơn vị hiện tại được chọn
  quantity: number;
  barcode?: string;
  units: ProductUnit[]; // Danh sách các đơn vị có sẵn
  selectedUnit: string; // Tên đơn vị hiện tại được chọn
  imageUrl?: string;
  availableQuantity?: number; // Tổng số lượng có sẵn (đơn vị chuẩn)
}

type AvailableProduct = {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  units: Array<{ unitName: string; price: number; quantityInBaseUnit: number; isBaseUnit: boolean; availableQuantity?: number }>;
  selectedUnit: string;
  imageUrl?: string;
  availableQuantity?: number;
};

// Memoized ProductItem component for better performance
const ProductItem = memo(({ item, onUpdateQuantity, onUnitChange, isLast, canIncrease }: { 
  item: Product; 
  onUpdateQuantity: (id: string, change: number) => void;
  onUnitChange: (id: string, unitName: string) => void;
  isLast?: boolean;
  canIncrease?: () => boolean;
}) => {
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  
  // Filter available units based on quantity
  const availableUnits = item.units.filter(unit => {
    if (!item.availableQuantity || !unit.quantityInBaseUnit) return true;
    return item.availableQuantity >= unit.quantityInBaseUnit;
  });
  
  // Check if current quantity can be increased
  const canIncreaseQuantity = () => {
    if (typeof canIncrease === 'function') return canIncrease();
    if (!item.availableQuantity) return true;
    const currentUnit = item.units.find(u => u.unitName === item.selectedUnit);
    if (!currentUnit) return true;
    const maxQuantity = Math.floor(item.availableQuantity / currentUnit.quantityInBaseUnit);
    return item.quantity < maxQuantity;
  };
  
  return (
    <View style={styles.productItem}>
      <View style={styles.productImage}>
        {item?.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="cover" />
        ) : (
          <Icon name="package-variant" size={24} color="#009DA5" />
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        
        {/* Unit Selector */}
        {availableUnits && availableUnits.length > 0 && (
          <View style={styles.unitContainer}>
            <TouchableOpacity 
              style={styles.unitSelector}
              onPress={() => setUnitModalVisible(true)}
            >
              <Text style={styles.unitText}>
                {(() => {
                  const current = availableUnits.find(u => u.unitName === item.selectedUnit);
                  const factor = current?.quantityInBaseUnit ?? 1;
                  return factor === 1 ? current?.unitName : `${current?.unitName} ${factor}`;
                })()}
              </Text>
              <Icon name={unitModalVisible ? "chevron-up" : "chevron-down"} size={16} color="#009DA5" />
            </TouchableOpacity>

            {/* Unit Picker Modal to avoid clipping inside lists */}
            <Modal visible={unitModalVisible} transparent animationType="fade" onRequestClose={() => setUnitModalVisible(false)}>
              <TouchableOpacity style={styles.unitPickerModalOverlay} activeOpacity={1} onPress={() => setUnitModalVisible(false)}>
                <View style={styles.unitPickerCard}>
                  {availableUnits
                    .slice()
                    .sort((a, b) => (a.quantityInBaseUnit || 1) - (b.quantityInBaseUnit || 1))
                    .map((unit) => (
                      <TouchableOpacity
                        key={unit.unitName}
                        style={[styles.unitPickerOption, unit.unitName === item.selectedUnit && styles.unitPickerOptionSelected]}
                        onPress={() => {
                          onUnitChange(item.id, unit.unitName);
                          setUnitModalVisible(false);
                        }}
                      >
                        <Text style={[styles.unitPickerText, unit.unitName === item.selectedUnit && styles.unitPickerTextSelected]}>
                          {unit.quantityInBaseUnit === 1 ? unit.unitName : `${unit.unitName} ${unit.quantityInBaseUnit}`}
                        </Text>
                        <Text style={styles.unitPickerPrice}>{unit.price.toLocaleString('vi-VN')}đ</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        )}
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, -1)}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={[styles.quantityButton, !canIncreaseQuantity() && styles.quantityButtonDisabled]}
          onPress={() => canIncreaseQuantity() && onUpdateQuantity(item.id, 1)}
          disabled={!canIncreaseQuantity()}
        >
          <Text style={[styles.quantityButtonText, !canIncreaseQuantity() && styles.quantityButtonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Memoized AvailableProductItem component
const AvailableProductItem = memo(({ 
  item, 
  currentQuantity, 
  onAddProduct, 
  onUpdateQuantity,
  canIncrease,
}: {
  item: Omit<Product, 'quantity'>;
  currentQuantity: number;
  onAddProduct: () => void;
  onUpdateQuantity: (id: string, change: number) => void;
  canIncrease?: (unitName: string) => boolean;
}) => {
  // Check if current quantity can be increased
  const canIncreaseQuantity = () => {
    if (typeof canIncrease === 'function') return canIncrease(item.selectedUnit);
    if (!item.availableQuantity) return true;
    const currentUnit = item.units.find(u => u.unitName === item.selectedUnit);
    if (!currentUnit) return true;
    const maxQuantity = Math.floor(item.availableQuantity / currentUnit.quantityInBaseUnit);
    return currentQuantity < maxQuantity;
  };

  return (
  <View style={[
    styles.availableProductItem,
    currentQuantity > 0 && styles.availableProductItemInCart
  ]}>
    <View style={styles.productImage}>
      {item?.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="cover" />
      ) : (
        <Icon name="package-variant" size={24} color="#009DA5" />
      )}
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
      {currentQuantity > 0 && (
        <Text style={styles.inCartIndicator}>Đã có trong giỏ hàng</Text>
      )}
    </View>
    
    {currentQuantity > 0 ? (
      // Show quantity controls if already in cart
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, -1)}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{currentQuantity}</Text>
        <TouchableOpacity
          style={[styles.quantityButton, !canIncreaseQuantity() && styles.quantityButtonDisabled]}
          onPress={() => canIncreaseQuantity() && onUpdateQuantity(item.id, 1)}
          disabled={!canIncreaseQuantity()}
        >
          <Text style={[styles.quantityButtonText, !canIncreaseQuantity() && styles.quantityButtonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    ) : (
      // Show add button if not in cart yet
      <TouchableOpacity
        style={styles.addToCartButton}
        onPress={onAddProduct}
      >
        <Icon name="plus" size={16} color="#009DA5" />
        <Text style={styles.addToCartText}>Thêm</Text>
      </TouchableOpacity>
    )}
  </View>
  );
});

// Global state to persist products across navigations
let persistedProducts: Product[] = [];

// Global function to clear order state
export const clearGlobalOrderState = () => {
  console.log('📱 Clearing global order state');
  persistedProducts = [];
};

// Function to fetch all products for preloading
const fetchAllProducts = async (shopId: number): Promise<AvailableProduct[]> => {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}&Status=1&page=1&pageSize=1000`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const data = await res.json();
  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  
  return items.map((p: any, idx: number) => {
    const availableQuantity = Number(p.quantity ?? p.availableQuantity ?? 0);
    // Build units: include base from p.unitName + extra units from p.units
    const extraUnits = (Array.isArray(p.units) ? p.units : []).map((u: any) => ({
      unitName: String(u.unitName ?? u.name ?? 'Cái'),
      price: Number((u.promotionPrice ?? u.price ?? p.promotionPrice ?? p.price ?? 0)),
      quantityInBaseUnit: Number(u.conversionFactor ?? u.quantityInBaseUnit ?? 1),
      isBaseUnit: Number(u.conversionFactor ?? u.quantityInBaseUnit ?? 1) === 1,
      availableQuantity: availableQuantity ? Math.floor(availableQuantity / Number(u.conversionFactor ?? u.quantityInBaseUnit ?? 1)) : undefined,
    }));
    const baseUnit = { unitName: String(p.unitName ?? 'Cái'), price: Number((p.promotionPrice ?? p.price ?? 0)), quantityInBaseUnit: 1, isBaseUnit: true, availableQuantity };
    const units = [baseUnit, ...extraUnits.filter(u => u.quantityInBaseUnit !== 1)];
    const selectedUnit = baseUnit.unitName;
    // Create unique ID: prefer actual ID, then timestamp + index as fallback
    const uniqueId = p.id ?? p.productId ?? `${Date.now()}-${idx}`;
    return {
      id: String(uniqueId),
      name: String(p.productName ?? p.name ?? 'Sản phẩm'),
      price: Number(baseUnit.price ?? p.promotionPrice ?? p.price ?? 0),
      barcode: p.barcode ? String(p.barcode) : undefined,
      imageUrl: p.imageUrl ? String(p.imageUrl) : (p.productImageURL ? String(p.productImageURL) : undefined),
      units,
      selectedUnit,
      availableQuantity,
    };
  });
};

const OrderScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Order'>>();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>(persistedProducts);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [shopId, setShopId] = useState<number | null>(null);

  // Preload all products when component mounts
  const { 
    data: allProducts = [], 
    isLoading: isLoadingProducts, 
    error: productsError 
  } = useQuery({
    queryKey: ['allProducts', shopId],
    queryFn: () => fetchAllProducts(shopId!),
    enabled: shopId !== null && shopId > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Get shopId on mount
  useEffect(() => {
    let mounted = true;
    getShopId().then((id) => {
      if (mounted) setShopId(id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Save products to global state whenever it changes
  useEffect(() => {
    persistedProducts = products;
    console.log('📱 Saved products to global state:', products.length);
  }, [products]);

  // Keyboard listeners for better scroll performance
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      // Slight delay to allow layout to settle before improving scroll performance
      setTimeout(() => {
        if (flatListRef.current && showDropdown) {
          // Force a layout pass to improve scroll performance
          flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
      }, 50);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [showDropdown]);

  // Restore state when screen gains focus (coming back from other screens)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 OrderScreen focused');
      console.log('📱 Current products in state:', products.length);
      console.log('📱 Persisted products:', persistedProducts.length);
      
      // Check if we're coming back from ConfirmOrder screen
      // If so, clear the products as the order was completed or cancelled
      if (route.params?.orderCompleted) {
        console.log('📱 Order completed, clearing products');
        clearOrderState();
        // Clear the orderCompleted param to prevent re-clearing
        navigation.setParams({ orderCompleted: undefined });
        return;
      }
      
      // Always restore from persisted state when focusing
      // This ensures state is maintained when coming back from Scanner or AddProduct
      if (persistedProducts.length > 0 || products.length !== persistedProducts.length) {
        console.log('📱 Restoring products from global state');
        setProducts([...persistedProducts]);
      }
      
      // Refetch products when coming back from AddProductScreen to include new products
      // This ensures newly created products are available for search
      if (shopId) {
        console.log('📱 Refetching products to include any new products');
        queryClient.invalidateQueries({ queryKey: ['allProducts', shopId] });
      }
    }, [route.params?.orderCompleted, shopId, queryClient])
  );

  // Function to completely clear order state
  const clearOrderState = useCallback(() => {
    console.log('📱 Clearing order state completely');
    setProducts([]);
    persistedProducts = [];
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'quantity'>) => {
    console.log('📱 Adding product:', product.name);
    setProducts(prevProducts => {
      const existingIndex = prevProducts.findIndex(p => p.id === product.id && p.selectedUnit === product.selectedUnit);
      
      // Stock check across all units: compute committed base units
      const findFactor = (units: any[], unitName: string) => (units.find(u => u.unitName === unitName)?.quantityInBaseUnit ?? 1);
      const committedBase = prevProducts
        .filter(p => p.id === product.id)
        .reduce((sum, p) => sum + p.quantity * findFactor(p.units as any, p.selectedUnit), 0);
      const addFactor = findFactor(product.units as any, product.selectedUnit);
      const availableBase = Number((product as any).availableQuantity ?? 0);
      if (availableBase && committedBase + addFactor > availableBase) {
        Alert.alert('Không đủ hàng', 'Số lượng tồn kho không đủ cho đơn vị đã chọn.');
        return prevProducts;
      }

      if (existingIndex >= 0) {
        // Increase quantity if product with same unit already exists
        const updatedProducts = [...prevProducts];
        const candidate = updatedProducts[existingIndex];
        const unitFactor = findFactor(candidate.units as any, candidate.selectedUnit);
        if (availableBase && committedBase + unitFactor > availableBase) {
          Alert.alert('Không đủ hàng', 'Số lượng tồn kho không đủ cho đơn vị đã chọn.');
          return prevProducts;
        }
        updatedProducts[existingIndex] = { ...candidate, quantity: candidate.quantity + 1 };
        console.log('📱 Updated quantity for:', product.name, product.selectedUnit);
        return updatedProducts;
      } else {
        // Add new product at the TOP of the list (index 0) for better UX
        const newProducts = [{ ...product, quantity: 1 }, ...prevProducts];
        console.log('📱 Added new product at top, total products:', newProducts.length);
        return newProducts;
      }
    });
    // Don't clear search or hide dropdown, so user can continue adding products
  }, []);

  // Handle scanned product from route params
  useEffect(() => {
    if (route.params?.scannedProduct) {
      const { barcode, type } = route.params.scannedProduct;
          // Prefer fetching from API by barcode for selling flow
      const run = async () => {
        try {
          const shopId = (await getShopId()) ?? 0;
          const token = await getAuthToken();
          // First try local suggestions list for performance
          const local = availableProducts.find(p => p.barcode === barcode);
          let candidate: any | null = local || null;
          if (!candidate) {
            const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}&Status=1&Barcode=${encodeURIComponent(barcode)}&page=1&pageSize=1`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const data = await res.json().catch(() => ({}));
            const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            const p: any = items[0];
            if (p) {
                candidate = {
                id: String(p.id ?? p.productId ?? ''),
                name: String(p.productName ?? p.name ?? 'Sản phẩm'),
                price: Number(p.price ?? 0),
                barcode: p.barcode ? String(p.barcode) : undefined,
                imageUrl: p.imageUrl ? String(p.imageUrl) : (p.productImageURL ? String(p.productImageURL) : undefined),
                  // base unit + units from product response (base first)
                  units: ([
                    { unitName: String(p.unitName ?? 'Cái'), price: Number((p.promotionPrice ?? p.price ?? 0)), quantityInBaseUnit: 1, isBaseUnit: true },
                    ...((Array.isArray(p.units) ? p.units : []).map((u: any) => ({
                      unitName: String(u.unitName ?? u.name ?? 'Cái'),
                      price: Number((u.promotionPrice ?? u.price ?? p.promotionPrice ?? p.price ?? 0)),
                      quantityInBaseUnit: Number(u.conversionFactor ?? u.quantityInBaseUnit ?? 1),
                      isBaseUnit: Number(u.conversionFactor ?? u.quantityInBaseUnit ?? 1) === 1,
                    })).filter((u: any) => u.quantityInBaseUnit !== 1))
                  ]),
                  selectedUnit: String(p.unitName ?? 'Cái'),
                availableQuantity: Number(p.quantity ?? p.availableQuantity ?? 0),
              } as AvailableProduct;
            }
          }
          if (candidate) {
                // Use units from candidate directly (already mapped above or from local list)
                const mappedUnits: any[] = Array.isArray((candidate as any).units) ? (candidate as any).units : [];
                const sorted = mappedUnits.slice().sort((a: any, b: any) => (a.quantityInBaseUnit || 1) - (b.quantityInBaseUnit || 1));
                const base = sorted.find((u: any) => u.isBaseUnit || Number(u.quantityInBaseUnit ?? 1) === 1) || sorted[0] || { unitName: 'Cái', price: candidate.price, quantityInBaseUnit: 1, isBaseUnit: true };
                candidate = { ...candidate, units: sorted.length ? sorted : [base], price: base.price, selectedUnit: base.unitName };

            const productToAdd = candidate as Product;
            addProduct(productToAdd);
          } else {
            // Fallback: show not found alert and ask user to enter product manually
            console.log('📱 Product not found by barcode:', barcode);
            Alert.alert('Không tìm thấy', `Không tìm thấy sản phẩm với mã vạch ${barcode}.\nHãy nhập sản phẩm trong mục Hàng hóa.`);
          }
        } catch (e) {
          console.log('📱 Scan handling error', e);
          Alert.alert('Lỗi', 'Không thể tìm sản phẩm theo mã vạch. Hãy thử lại hoặc nhập sản phẩm.');
        }
      };
      run();
      
      // Clear the scannedProduct and scanTimestamp params to prevent re-processing
      navigation.setParams({ scannedProduct: undefined, scanTimestamp: undefined });
    }
  }, [route.params?.scannedProduct, addProduct, navigation]);

  // Handle new product from AddProductScreen
  useEffect(() => {
    if (route.params?.newProduct) {
      const newProduct = route.params.newProduct;
      // Create a complete product object with default units
      const productToAdd = {
        ...newProduct,
        units: [
          { unitName: 'Cái', price: newProduct.price, quantityInBaseUnit: 1, isBaseUnit: true, availableQuantity: (newProduct as any).availableQuantity }
        ],
        selectedUnit: 'Cái',
        availableQuantity: (newProduct as any).availableQuantity
      };
      addProduct(productToAdd);
      console.log('📱 Added new product from AddProductScreen:', newProduct.name);
      
      // Clear the newProduct param to prevent re-adding on re-render
      navigation.setParams({ newProduct: undefined });
    }
  }, [route.params?.newProduct, addProduct, navigation]);

  const updateQuantity = useCallback((id: string, change: number) => {
    setProducts(prevProducts => {
      if (change > 0) {
        const target = prevProducts.find(p => p.id === id);
        if (target) {
          const findFactor = (units: any[], unitName: string) => (units.find(u => u.unitName === unitName)?.quantityInBaseUnit ?? 1);
          const availableBase = Number(target.availableQuantity ?? 0);
          const committedBase = prevProducts
            .filter(p => p.id === id)
            .reduce((sum, p) => sum + p.quantity * findFactor(p.units as any, p.selectedUnit), 0);
          const unitFactor = findFactor(target.units as any, target.selectedUnit);
          if (availableBase && committedBase + unitFactor > availableBase) {
            Alert.alert('Không đủ hàng', 'Số lượng tồn kho không đủ cho đơn vị đã chọn.');
            return prevProducts;
          }
        }
      }
      return prevProducts
        .map(product => {
          if (product.id === id) {
            const newQuantity = product.quantity + change;
            return newQuantity > 0 ? { ...product, quantity: newQuantity } : null;
          }
          return product;
        })
        .filter(Boolean) as Product[];
    });
  }, []);

  const handleUnitChange = useCallback((id: string, unitName: string) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id !== id) return product;
        const selectedUnit = product.units.find(unit => unit.unitName === unitName);
        if (!selectedUnit) return product;
        return {
          ...product,
          selectedUnit: unitName,
          price: selectedUnit.price,
        };
      })
    );
  }, []);

  const getTotalAmount = useCallback(() => {
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  }, [products]);

  const totalAmount = useMemo(() => getTotalAmount(), [getTotalAmount]);

  const handleScanBarcode = useCallback(() => {
    navigation.navigate('Scanner', { returnScreen: 'Order' });
  }, [navigation]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    // Show dropdown when there's text, hide when empty
    setShowDropdown(text.trim().length > 0);
  }, []);

  const handleSearchFocus = useCallback(() => {
    // Show dropdown if there's already text when focus
    if (searchText.trim().length > 0) {
      setShowDropdown(true);
    }
  }, [searchText]);

  const handleSearchBlur = useCallback(() => {
    // Don't hide dropdown on blur - only hide on tap outside
  }, []);

  const handleTapOutside = useCallback(() => {
    // Close dropdown and blur search input
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current?.blur?.();
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchText('');
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current?.blur?.();
    }
  }, []);


  // Show dropdown based on showDropdown state and has text
  const showAvailableProducts = showDropdown && searchText.trim().length > 0;

  const handleCancel = () => {
    Alert.alert(
      'Hủy đơn',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        { 
          text: 'Có', 
          onPress: () => {
            clearOrderState(); // Use dedicated clear function
            navigation.navigate('MainApp');
          }
        },
      ]
    );
  };

  const handlePay = () => {
    if (products.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng thêm sản phẩm vào đơn hàng');
      return;
    }
    
    // Try to enrich customer details from API before navigating
    const run = async () => {
      let customerPayload: any = undefined;
      const customerId = route.params?.customer?.id ?? null;
      try {
        if (customerId && customerId > 0) {
          const shopId = (await getShopId()) ?? 0;
          const token = await getAuthToken();
          const res = await fetch(`${API_URL}/api/customers/${customerId}?ShopId=${shopId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const data = await res.json().catch(() => ({}));
          const c: any = data?.data || data || {};
          const idNum = Number(c?.customerId ?? c?.id ?? customerId);
          const fullName = String(c?.fullName ?? route.params?.customer?.fullName ?? '');
          const phone = c?.phone ? String(c.phone) : (route.params?.customer?.phone || undefined);
          const email = c?.email ? String(c.email) : (route.params?.customer?.email || undefined);
          customerPayload = { id: idNum, fullName, phone, email };
        }
      } catch {}
      
      navigation.navigate('ConfirmOrder', {
        products: products,
        totalAmount: totalAmount,
        customerId: customerPayload?.id ?? customerId ?? null,
        // Pass full customer info when available so Confirm screen can render ngay lập tức
        ...(customerPayload ? { customer: customerPayload } : {}),
      });
    };
    run();
  };

  const filteredProducts = useMemo(() => {
    if (!searchText || searchText.trim() === '' || isLoadingProducts) {
      return [];
    }
    const searchTerm = searchText.toLowerCase().trim();
    const filtered = allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) || (product.barcode || '').includes(searchTerm)
    );
    return filtered.slice(0, 10);
  }, [searchText, allProducts, isLoadingProducts]);

  const totalFilteredCount = useMemo(() => {
    if (!searchText || searchText.trim() === '' || isLoadingProducts) {
      return 0;
    }
    const searchTerm = searchText.toLowerCase().trim();
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) || (product.barcode || '').includes(searchTerm)
    ).length;
  }, [searchText, allProducts, isLoadingProducts]);

  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => {
    const findFactor = (units: any[], unitName: string) => (units.find(u => u.unitName === unitName)?.quantityInBaseUnit ?? 1);
    const canIncrease = () => {
      const availableBase = Number(item.availableQuantity ?? 0);
      if (!availableBase) return true;
      const committedBase = products
        .filter(p => p.id === item.id)
        .reduce((sum, p) => sum + p.quantity * findFactor(p.units as any, p.selectedUnit), 0);
      const unitFactor = findFactor(item.units as any, item.selectedUnit);
      return committedBase + unitFactor <= availableBase;
    };
    return (
      <ProductItem 
        item={item} 
        onUpdateQuantity={updateQuantity} 
        onUnitChange={handleUnitChange}
        isLast={index === products.length - 1}
        canIncrease={canIncrease}
      />
    );
  }, [updateQuantity, handleUnitChange, products]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 82, // Height of productItem (66px + 16px margin)
    offset: 82 * index,
    index,
  }), []);

  const getAvailableItemLayout = useCallback((data: any, index: number) => ({
    length: 68, // Height of availableProductItem (60px + 8px margin)
    offset: 68 * index,
    index,
  }), []);

  // Key extractor functions
  const keyExtractor = useCallback((item: Product | any) => item.id, []);

  // Memoized product quantities map for better performance
  const productQuantities = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(product => {
      map.set(product.id, product.quantity);
    });
    return map;
  }, [products]);

  // Render function for available products
  const renderAvailableProduct = useCallback(({ item }: { item: any }) => {
    const currentQuantity = productQuantities.get(item.id) || 0;
    
    const handleAddProduct = async () => {
      // Use units provided from products response directly (no extra API call)
      const units = item.units;
      const base = (units as any[])?.find((u: any) => u.isBaseUnit || Number(u.quantityInBaseUnit ?? 1) === 1) || units[0];
      const productToAdd = {
        ...item,
        units,
        price: base.price,
        selectedUnit: base.unitName,
      };
      addProduct(productToAdd);
    };
    const findFactor = (units: any[], unitName: string) => (units.find(u => u.unitName === unitName)?.quantityInBaseUnit ?? 1);
    const canIncrease = (unitName: string) => {
      const availableBase = Number(item.availableQuantity ?? 0);
      if (!availableBase) return true;
      const committedBase = products
        .filter(p => p.id === item.id)
        .reduce((sum, p) => sum + p.quantity * findFactor(p.units as any, p.selectedUnit), 0);
      const unitFactor = findFactor(item.units as any, unitName);
      return committedBase + unitFactor <= availableBase;
    };
    
    return (
      <AvailableProductItem
        item={item}
        currentQuantity={currentQuantity}
        onAddProduct={handleAddProduct}
        onUpdateQuantity={updateQuantity}
        canIncrease={canIncrease}
      />
    );
  }, [productQuantities, addProduct, updateQuantity, products]);




  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <TouchableWithoutFeedback onPress={handleTapOutside}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đơn bán hàng</Text>
            <View style={{ width: 24 }} />
          </View>

      {/* Search */}
      <TouchableWithoutFeedback onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#666" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Tìm sản phẩm hoặc quét mã vạch"
            value={searchText}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            autoFocus={true}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity style={styles.qrButton} onPress={handleScanBarcode}>
            <Icon name="qrcode-scan" size={20} color="#009DA5" />
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* Available Products (when searching) - Moved right below search */}
      {showAvailableProducts && (
        <TouchableWithoutFeedback onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
          <View style={styles.availableProductsSection}>
          <Text style={styles.availableProductsTitle}>
            Sản phẩm có sẵn: {isLoadingProducts ? 'Đang tải...' : `(${filteredProducts.length}${totalFilteredCount > 10 ? `/${totalFilteredCount}` : ''} sản phẩm)`}
          </Text>
          {!isLoadingProducts && totalFilteredCount > 10 && (
            <Text style={styles.limitedResultsText}>
              Hiển thị 10 kết quả đầu tiên. Gõ thêm để thu hẹp tìm kiếm.
            </Text>
          )}

          {isLoadingProducts ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>Đang tải sản phẩm...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={filteredProducts}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={true}
              style={styles.availableProductsList}
              nestedScrollEnabled={true}
              renderItem={renderAvailableProduct}
              getItemLayout={getAvailableItemLayout}
              removeClippedSubviews={true}
              maxToRenderPerBatch={isKeyboardVisible ? 10 : 15}
              updateCellsBatchingPeriod={isKeyboardVisible ? 50 : 16}
              initialNumToRender={isKeyboardVisible ? 8 : 10}
              windowSize={isKeyboardVisible ? 10 : 15}
              keyboardShouldPersistTaps="handled"
              decelerationRate={0.995}
              scrollEventThrottle={isKeyboardVisible ? 16 : 1}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              disableIntervalMomentum={false}
              bounces={true}
              bouncesZoom={false}
              alwaysBounceVertical={true}
              overScrollMode="auto"
              scrollIndicatorInsets={{right: 1}}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>Không tìm thấy sản phẩm "{searchText}"</Text>
            </View>
          )}
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Customer and Order Type - Only show when not searching */}
      {!showAvailableProducts && (
        <View style={styles.customerSection}>
          <TouchableOpacity style={styles.customerRow} onPress={() => navigation.navigate('Customer')}>
            <Text style={styles.label}>Khách hàng:</Text>
            <Text style={styles.label}>{route.params?.customer?.fullName ?? 'Khách lẻ'}</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Product List */}
      <View style={styles.productList}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="cart-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
            <Text style={styles.emptySubtext}>Tìm kiếm sản phẩm hoặc quét mã vạch để thêm vào đơn</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            removeClippedSubviews={false}
            maxToRenderPerBatch={15}
            updateCellsBatchingPeriod={50}
            initialNumToRender={12}
            windowSize={8}
            keyboardShouldPersistTaps="handled"
            decelerationRate={0.992}
            scrollEventThrottle={16}
            contentContainerStyle={styles.productListContent}
          />
        )}
      </View>

      {/* Total and Actions */}
      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={styles.totalAmount}>{totalAmount.toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payButton} onPress={handlePay}>
            <Text style={styles.payButtonText}>Tiếp theo</Text>
          </TouchableOpacity>
        </View>
      </View>

        </View>
      </TouchableWithoutFeedback>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
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
  qrButton: {
    padding: 8,
  },
  customerSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    color: '#000',
  },
  productList: {
    flex: 1,
    marginHorizontal: 16,
  },
  productListContent: {
    paddingBottom: 80, // Extra space at bottom for dropdown visibility
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    minHeight: 82, // Fixed height for better performance
    overflow: 'visible',
  },
  productImage: {
    width: 50,
    height: 50,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    marginRight: 12,
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
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#009DA5',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#009DA5',
    fontWeight: 'bold',
  },
  quantityButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
    opacity: 0.5,
  },
  quantityButtonTextDisabled: {
    color: '#999',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#000',
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
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: '#000',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#009DA5',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  payButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#009DA5',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },


  availableProductsList: {
    maxHeight: 400,
    flex: 0,
    flexGrow: 0,
  },
  availableProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 68, // Fixed height for better performance
  },
  availableProductsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -8, // Move closer to search bar
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxHeight: '60%', // Limit to 60% of screen height
    zIndex: 10,
  },
  availableProductsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  limitedResultsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#009DA5',
  },
  addToCartText: {
    fontSize: 12,
    color: '#009DA5',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  availableProductItemInCart: {
    backgroundColor: '#F0F9FA',
    borderColor: '#009DA5',
    borderWidth: 1,
  },
  inCartIndicator: {
    fontSize: 11,
    color: '#009DA5',
    fontWeight: 'bold',
    marginTop: 2,
  },
  unitContainer: {
    marginTop: 8,
    position: 'relative',
    alignSelf: 'flex-start',
    zIndex: 100,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#009DA5',
    alignSelf: 'flex-start',
  },
  unitText: {
    fontSize: 12,
    color: '#009DA5',
    fontWeight: '500',
    marginRight: 4,
  },
  unitDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: undefined,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 8,
    zIndex: 1000,
    minWidth: 140,
  },
  unitPickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    padding: 20,
  },
  unitPickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: '60%',
  },
  unitPickerOption: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unitPickerOptionSelected: {
    backgroundColor: '#F6FBFC',
  },
  unitPickerText: {
    fontSize: 16,
    color: '#000',
  },
  unitPickerTextSelected: {
    color: '#009DA5',
    fontWeight: 'bold',
  },
  unitPickerPrice: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  unitDropdownLast: {
    top: undefined,
    bottom: 30, // Position above for last item
  },
  unitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unitOptionSelected: {
    backgroundColor: '#F0F9FA',
  },
  unitOptionText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  unitOptionTextSelected: {
    color: '#009DA5',
    fontWeight: 'bold',
  },
  unitOptionPrice: {
    fontSize: 12,
    color: '#666666',
  },
  unitOptionPriceSelected: {
    color: '#009DA5',
    fontWeight: 'bold',
  },
});

export default OrderScreen;
