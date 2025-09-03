import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';

interface ProductUnit {
  unitName: string;
  price: number;
  quantityInBaseUnit: number; // Số lượng đơn vị chuẩn trong 1 đơn vị này
  isBaseUnit: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number; // Giá của đơn vị hiện tại được chọn
  quantity: number;
  barcode?: string;
  units: ProductUnit[]; // Danh sách các đơn vị có sẵn
  selectedUnit: string; // Tên đơn vị hiện tại được chọn
}

// Sample products for selection (normally would come from API)
const availableProducts = [
  { 
    id: '1', 
    name: 'Coca Cola', 
    price: 15000, 
    barcode: '1234567890123',
    units: [
      { unitName: 'Chai', price: 15000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Lốc (6 chai)', price: 85000, quantityInBaseUnit: 6, isBaseUnit: false },
      { unitName: 'Thùng (24 chai)', price: 330000, quantityInBaseUnit: 24, isBaseUnit: false }
    ],
    selectedUnit: 'Chai'
  },
  { 
    id: '2', 
    name: 'Pepsi Cola', 
    price: 14000, 
    barcode: '2345678901234',
    units: [
      { unitName: 'Chai', price: 14000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Lốc (6 chai)', price: 80000, quantityInBaseUnit: 6, isBaseUnit: false },
      { unitName: 'Thùng (24 chai)', price: 310000, quantityInBaseUnit: 24, isBaseUnit: false }
    ],
    selectedUnit: 'Chai'
  },
  { 
    id: '3', 
    name: 'Nước suối Aquafina', 
    price: 8000, 
    barcode: '8934588063053',
    units: [
      { unitName: 'Chai', price: 8000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Lốc (12 chai)', price: 90000, quantityInBaseUnit: 12, isBaseUnit: false },
      { unitName: 'Thùng (24 chai)', price: 175000, quantityInBaseUnit: 24, isBaseUnit: false }
    ],
    selectedUnit: 'Chai'
  },
  { 
    id: '4', 
    name: 'Bánh mì thịt nướng', 
    price: 25000, 
    barcode: '4567890123456',
    units: [
      { unitName: 'Cái', price: 25000, quantityInBaseUnit: 1, isBaseUnit: true }
    ],
    selectedUnit: 'Cái'
  },
  { 
    id: '5', 
    name: 'Cà phê đen', 
    price: 18000, 
    barcode: '5678901234567',
    units: [
      { unitName: 'Ly', price: 18000, quantityInBaseUnit: 1, isBaseUnit: true }
    ],
    selectedUnit: 'Ly'
  },
  { 
    id: '6', 
    name: 'Trà sữa trân châu', 
    price: 35000, 
    barcode: '6789012345678',
    units: [
      { unitName: 'Ly', price: 35000, quantityInBaseUnit: 1, isBaseUnit: true }
    ],
    selectedUnit: 'Ly'
  },
  { 
    id: '7', 
    name: 'Bánh bao nhân thịt', 
    price: 12000, 
    barcode: '7890123456789',
    units: [
      { unitName: 'Cái', price: 12000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Khay (10 cái)', price: 110000, quantityInBaseUnit: 10, isBaseUnit: false }
    ],
    selectedUnit: 'Cái'
  },
  { 
    id: '8', 
    name: 'Nước cam ép', 
    price: 22000, 
    barcode: '8901234567890',
    units: [
      { unitName: 'Ly', price: 22000, quantityInBaseUnit: 1, isBaseUnit: true }
    ],
    selectedUnit: 'Ly'
  },
  { 
    id: '9', 
    name: 'Nabati', 
    price: 8000, 
    barcode: '8993175535878',
    units: [
      { unitName: 'Gói', price: 8000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Hộp (20 gói)', price: 150000, quantityInBaseUnit: 20, isBaseUnit: false }
    ],
    selectedUnit: 'Gói'
  },
];

// Memoized ProductItem component for better performance
const ProductItem = memo(({ item, onUpdateQuantity, onUnitChange, isLast }: { 
  item: Product; 
  onUpdateQuantity: (id: string, change: number) => void;
  onUnitChange: (id: string, unitName: string) => void;
  isLast?: boolean;
}) => {
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  
  return (
    <View style={styles.productItem}>
      <View style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        
        {/* Unit Selector */}
        {item.units && item.units.length > 1 && (
          <View style={styles.unitContainer}>
            <TouchableOpacity 
              style={styles.unitSelector}
              onPress={() => setShowUnitDropdown(!showUnitDropdown)}
            >
              <Text style={styles.unitText}>{item.selectedUnit}</Text>
              <Icon name={showUnitDropdown ? "chevron-up" : "chevron-down"} size={16} color="#009DA5" />
            </TouchableOpacity>
            
            {showUnitDropdown && (
              <View style={[
                styles.unitDropdown,
                isLast && styles.unitDropdownLast // Position above if last item
              ]}>
                {item.units.map((unit) => (
                  <TouchableOpacity
                    key={unit.unitName}
                    style={[
                      styles.unitOption,
                      unit.unitName === item.selectedUnit && styles.unitOptionSelected
                    ]}
                    onPress={() => {
                      onUnitChange(item.id, unit.unitName);
                      setShowUnitDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      unit.unitName === item.selectedUnit && styles.unitOptionTextSelected
                    ]}>
                      {unit.unitName}
                    </Text>

                  </TouchableOpacity>
                ))}
              </View>
            )}
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
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
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
  onUpdateQuantity 
}: {
  item: Omit<Product, 'quantity'>;
  currentQuantity: number;
  onAddProduct: () => void;
  onUpdateQuantity: (id: string, change: number) => void;
}) => (
  <View style={[
    styles.availableProductItem,
    currentQuantity > 0 && styles.availableProductItemInCart
  ]}>
    <View style={styles.productImage} />
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
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
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
));

// Global state to persist products across navigations
let persistedProducts: Product[] = [];

// Global function to clear order state
export const clearGlobalOrderState = () => {
  console.log('📱 Clearing global order state');
  persistedProducts = [];
};

const OrderScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Order'>>();
  const [products, setProducts] = useState<Product[]>(persistedProducts);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

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
    }, [route.params?.orderCompleted])
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
      
      if (existingIndex >= 0) {
        // Increase quantity if product with same unit already exists
        const updatedProducts = [...prevProducts];
        updatedProducts[existingIndex] = {
          ...updatedProducts[existingIndex],
          quantity: updatedProducts[existingIndex].quantity + 1
        };
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
      // Find product by barcode and add to order
      const foundProduct = availableProducts.find(p => p.barcode === barcode);
      if (foundProduct) {
        // Create a complete product object with units
        const productToAdd = {
          ...foundProduct,
          price: foundProduct.units[0].price, // Use base unit price
          selectedUnit: foundProduct.units[0].unitName // Use base unit
        };
        addProduct(productToAdd);
      } else {
        // Product not found, automatically navigate to create new product
        console.log('📱 Product not found, navigating to AddProduct screen:', barcode);
        navigation.navigate('AddProduct', { barcode });
      }
      
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
          { unitName: 'Cái', price: newProduct.price, quantityInBaseUnit: 1, isBaseUnit: true }
        ],
        selectedUnit: 'Cái'
      };
      addProduct(productToAdd);
      console.log('📱 Added new product from AddProductScreen:', newProduct.name);
      
      // Clear the newProduct param to prevent re-adding on re-render
      navigation.setParams({ newProduct: undefined });
    }
  }, [route.params?.newProduct, addProduct, navigation]);

  const updateQuantity = useCallback((id: string, change: number) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === id) {
          const newQuantity = product.quantity + change;
          return newQuantity > 0 ? { ...product, quantity: newQuantity } : null;
        }
        return product;
      }).filter(Boolean) as Product[]
    );
  }, []);

  const handleUnitChange = useCallback((id: string, unitName: string) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        if (product.id === id) {
          const selectedUnit = product.units.find(unit => unit.unitName === unitName);
          if (selectedUnit) {
            return {
              ...product,
              selectedUnit: unitName,
              price: selectedUnit.price
            };
          }
        }
        return product;
      })
    );
  }, []);

  const getTotalAmount = useCallback(() => {
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  }, [products]);

  const totalAmount = useMemo(() => getTotalAmount(), [getTotalAmount]);

  const handleScanBarcode = useCallback(() => {
    navigation.navigate('Scanner');
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
      searchInputRef.current.blur();
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchText('');
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
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
    
    // Navigate to ConfirmOrderScreen with order data
    navigation.navigate('ConfirmOrder', {
      products: products,
      totalAmount: totalAmount
    });
  };

  const filteredProducts = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return [];
    }

    const searchTerm = searchText.toLowerCase().trim();
    const filtered = availableProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm)
    );

    // Limit results to prevent too many items when searching single characters
    return filtered.slice(0, 10); // Maximum 10 results
  }, [searchText]);

  const totalFilteredCount = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return 0;
    }

    const searchTerm = searchText.toLowerCase().trim();
    return availableProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm)
    ).length;
  }, [searchText]);

  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => (
    <ProductItem 
      item={item} 
      onUpdateQuantity={updateQuantity} 
      onUnitChange={handleUnitChange}
      isLast={index === products.length - 1}
    />
  ), [updateQuantity, handleUnitChange, products.length]);

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
    
    const handleAddProduct = () => {
      // Create product with base unit selected
      const productToAdd = {
        ...item,
        price: item.units[0].price,
        selectedUnit: item.units[0].unitName
      };
      addProduct(productToAdd);
    };
    
    return (
      <AvailableProductItem
        item={item}
        currentQuantity={currentQuantity}
        onAddProduct={handleAddProduct}
        onUpdateQuantity={updateQuantity}
      />
    );
  }, [productQuantities, addProduct, updateQuantity]);



  return (
    <SafeAreaView style={styles.container}>
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
      <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
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
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.availableProductsSection}>
          <Text style={styles.availableProductsTitle}>
            Sản phẩm có sẵn: ({filteredProducts.length}{totalFilteredCount > 10 ? `/${totalFilteredCount}` : ''} sản phẩm)
          </Text>
          {totalFilteredCount > 10 && (
            <Text style={styles.limitedResultsText}>
              Hiển thị 10 kết quả đầu tiên. Gõ thêm để thu hẹp tìm kiếm.
            </Text>
          )}

          {filteredProducts.length > 0 ? (
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
          <View style={styles.customerRow}>
            <Text style={styles.label}>Khách hàng:</Text>
            <Text style={styles.label}>Khách lẻ</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </View>
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
  },
  productImage: {
    width: 50,
    height: 50,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    marginRight: 12,
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
    top: 30,
    left: 0,
    right: 0,
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
    elevation: 5,
    zIndex: 1000,
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
