import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
}

// Sample products for selection (normally would come from API)
const availableProducts = [
  { id: '1', name: 'Coca Cola', price: 15000, barcode: '1234567890123' },
  { id: '2', name: 'Pepsi Cola', price: 14000, barcode: '2345678901234' },
  { id: '3', name: 'Nước suối Aquafina', price: 8000, barcode: '3456789012345' },
  { id: '4', name: 'Bánh mì thịt nướng', price: 25000, barcode: '4567890123456' },
  { id: '5', name: 'Cà phê đen', price: 18000, barcode: '5678901234567' },
  { id: '6', name: 'Trà sữa trân châu', price: 35000, barcode: '6789012345678' },
  { id: '7', name: 'Bánh bao nhân thịt', price: 12000, barcode: '7890123456789' },
  { id: '8', name: 'Nước cam ép', price: 22000, barcode: '8901234567890' },
];

const OrderScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Order'>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const addProduct = (product: Omit<Product, 'quantity'>) => {
    const existingIndex = products.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Increase quantity if product already exists
      const updatedProducts = [...products];
      updatedProducts[existingIndex].quantity += 1;
      setProducts(updatedProducts);
    } else {
      // Add new product
      setProducts([...products, { ...product, quantity: 1 }]);
    }
    // Don't clear search or hide dropdown, so user can continue adding products
  };

  // Handle scanned product from route params
  useEffect(() => {
    if (route.params?.scannedProduct) {
      const { barcode, type } = route.params.scannedProduct;
      // Find product by barcode and add to order
      const foundProduct = availableProducts.find(p => p.barcode === barcode);
      if (foundProduct) {
        addProduct(foundProduct);
        Alert.alert('Thành công', `Đã thêm sản phẩm: ${foundProduct.name}`);
      } else {
        Alert.alert('Không tìm thấy', `Không tìm thấy sản phẩm với mã: ${barcode}`);
      }
    }
  }, [route.params?.scannedProduct]);

  const updateQuantity = (id: string, change: number) => {
    setProducts(products.map(product => {
      if (product.id === id) {
        const newQuantity = product.quantity + change;
        return newQuantity > 0 ? { ...product, quantity: newQuantity } : null;
      }
      return product;
    }).filter(Boolean) as Product[]);
  };

  const getTotalAmount = () => {
    return products.reduce((total, product) => total + (product.price * product.quantity), 0);
  };

  const handleScanBarcode = () => {
    navigation.navigate('Scanner');
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    // Show dropdown when there's text, hide when empty
    setShowDropdown(text.trim().length > 0);
  };

  const handleSearchFocus = () => {
    // Show dropdown if there's already text when focus
    if (searchText.trim().length > 0) {
      setShowDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    // Don't hide dropdown on blur - only hide on tap outside
  };

  const handleTapOutside = () => {
    // Close dropdown and blur search input
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

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
            setProducts([]);
            navigation.goBack();
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
    
    Alert.alert(
      'Thanh toán',
      `Tổng cộng: ${getTotalAmount().toLocaleString('vi-VN')}đ\n\nXác nhận thanh toán?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Thanh toán', 
          onPress: () => {
            Alert.alert('Thành công', 'Thanh toán thành công!');
            setProducts([]);
            navigation.goBack();
          }
        },
      ]
    );
  };

  const filteredProducts = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return [];
    }

    const filtered = availableProducts.filter(product => {
      const productName = product.name.toLowerCase();
      const searchTerm = searchText.toLowerCase().trim();
      return productName.includes(searchTerm);
    });

    // Limit results to prevent too many items when searching single characters
    return filtered.slice(0, 10); // Maximum 10 results
  }, [searchText]);

  const totalFilteredCount = useMemo(() => {
    if (!searchText || searchText.trim() === '') {
      return 0;
    }

    return availableProducts.filter(product => {
      const productName = product.name.toLowerCase();
      const searchTerm = searchText.toLowerCase().trim();
      return productName.includes(searchTerm);
    }).length;
  }, [searchText]);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <View style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, -1)}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );



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

      {/* Customer and Order Type */}
      <View style={styles.customerSection}>
        <View style={styles.customerRow}>
          <Text style={styles.label}>Khách hàng:</Text>
          <Text style={styles.label}>Khách lẻ</Text>
          <Icon name="chevron-right" size={20} color="#666" />
        </View>
      </View>



      {/* Available Products (when searching) */}
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
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={true}
              style={styles.availableProductsList}
              nestedScrollEnabled={true}
              renderItem={({ item }) => {
                // Check if this product is already in the cart
                const existingProduct = products.find(p => p.id === item.id);
                const currentQuantity = existingProduct ? existingProduct.quantity : 0;

                return (
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
                          onPress={() => updateQuantity(item.id, -1)}
                        >
                          <Text style={styles.quantityButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{currentQuantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, 1)}
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Show add button if not in cart yet
                      <TouchableOpacity
                        style={styles.addToCartButton}
                        onPress={() => addProduct(item)}
                      >
                        <Icon name="plus" size={16} color="#009DA5" />
                        <Text style={styles.addToCartText}>Thêm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>Không tìm thấy sản phẩm "{searchText}"</Text>
            </View>
          )}
          </View>
        </TouchableWithoutFeedback>
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
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Total and Actions */}
      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={styles.totalAmount}>{getTotalAmount().toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payButton} onPress={handlePay}>
            <Text style={styles.payButtonText}>Thanh toán</Text>
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
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
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
    maxHeight: 300,
    flex: 0,
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
    minHeight: 60,
  },
  availableProductsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -8, // Move closer to search bar
    marginBottom: 16,
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
});

export default OrderScreen;
