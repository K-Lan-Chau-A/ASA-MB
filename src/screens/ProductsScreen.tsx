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
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface ProductUnit {
  unitName: string;
  price: number;
  quantityInBaseUnit: number;
  isBaseUnit: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  units: ProductUnit[];
  selectedUnit: string;
  category?: string;
  stock?: number;
  lastUpdated?: string;
}

// Sample products database (normally would come from API)
const productsDatabase = [
  { 
    id: '1', 
    name: 'Coca Cola', 
    price: 15000, 
    barcode: '1234567890123',
    category: 'Đồ uống',
    stock: 50,
    lastUpdated: '2024-01-15',
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
    category: 'Đồ uống',
    stock: 45,
    lastUpdated: '2024-01-14',
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
    category: 'Đồ uống',
    stock: 100,
    lastUpdated: '2024-01-16',
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
    category: 'Thực phẩm',
    stock: 20,
    lastUpdated: '2024-01-16',
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
    category: 'Đồ uống',
    stock: 30,
    lastUpdated: '2024-01-15',
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
    category: 'Đồ uống',
    stock: 25,
    lastUpdated: '2024-01-14',
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
    category: 'Thực phẩm',
    stock: 40,
    lastUpdated: '2024-01-16',
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
    category: 'Đồ uống',
    stock: 35,
    lastUpdated: '2024-01-15',
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
    category: 'Bánh kẹo',
    stock: 60,
    lastUpdated: '2024-01-14',
    units: [
      { unitName: 'Gói', price: 8000, quantityInBaseUnit: 1, isBaseUnit: true },
      { unitName: 'Hộp (20 gói)', price: 150000, quantityInBaseUnit: 20, isBaseUnit: false }
    ],
    selectedUnit: 'Gói'
  },
];

// Memoized ProductItem component
const ProductItem = memo(({ item, onEdit, onDelete }: { 
  item: Product; 
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const getStockStatus = (stock?: number) => {
    if (!stock) return { text: 'Không xác định', color: '#999' };
    if (stock <= 5) return { text: `Còn ${stock}`, color: '#FF6B6B' };
    if (stock <= 20) return { text: `Còn ${stock}`, color: '#FFA726' };
    return { text: `Còn ${stock}`, color: '#4CAF50' };
  };

  const stockStatus = getStockStatus(item.stock);

  return (
    <View style={styles.productItem}>
      <View style={styles.productImage}>
        <Icon name="package-variant" size={24} color="#009DA5" />
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productBarcode}>Mã: {item.barcode || 'Chưa có'}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        
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
          style={styles.actionButton}
          onPress={() => setShowActions(!showActions)}
        >
          <Icon name="dots-vertical" size={20} color="#666" />
        </TouchableOpacity>
        
        {showActions && (
          <View style={styles.actionsDropdown}>
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
        )}
      </View>
    </View>
  );
});

const ProductsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>(productsDatabase);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const distinct = Array.from(new Set(
      products.map(p => p.category).filter((c): c is string => !!c)
    ));
    return ['Tất cả', ...distinct];
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'Tất cả') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchTerm = searchText.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode?.includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
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

  const handleEditProduct = useCallback((product: Product) => {
    // TODO: Navigate to edit product screen
    Alert.alert('Thông báo', `Chỉnh sửa sản phẩm: ${product.name}`);
  }, []);

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
                  placeholder="Tìm kiếm sản phẩm, mã vạch..."
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
            <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Thêm</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>

          {/* Product List */}
          <View style={styles.productList}>
            {filteredProducts.length === 0 ? (
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
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
