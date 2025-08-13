import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';

interface NewProduct {
  barcode: string;
  name: string;
  brand: string;
  importPrice: string;
  sellPrice: string;
  unit: string;
  quantity: string;
  discount: string;
  image: string;
}

const AddProductScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddProduct'>>();
  
  const [product, setProduct] = useState<NewProduct>({
    barcode: route.params?.barcode || '',
    name: '',
    brand: '',
    importPrice: '',
    sellPrice: '',
    unit: '',
    quantity: '',
    discount: '0',
    image: '',
  });

  const updateProduct = useCallback((field: keyof NewProduct, value: string) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  }, []);

  const formatPrice = useCallback((value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') return '';
    return parseInt(numericValue).toLocaleString('vi-VN');
  }, []);

  const handlePriceChange = useCallback((field: 'importPrice' | 'sellPrice', value: string) => {
    const formattedValue = formatPrice(value);
    updateProduct(field, formattedValue);
  }, [formatPrice, updateProduct]);

  const handleAddPhoto = useCallback(() => {
    // TODO: Implement image picker
    Alert.alert('Thông báo', 'Tính năng thêm ảnh sẽ được triển khai sau');
  }, []);

  const handleSaveProduct = useCallback(() => {
    // Validate required fields
    if (!product.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    
    if (!product.sellPrice.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá bán');
      return;
    }

    // Validate price format
    const sellPrice = parseInt(product.sellPrice.replace(/[^\d]/g, ''));
    const importPrice = parseInt(product.importPrice.replace(/[^\d]/g, '')) || 0;
    
    if (isNaN(sellPrice) || sellPrice <= 0) {
      Alert.alert('Lỗi', 'Giá bán phải là số dương');
      return;
    }

    if (importPrice > sellPrice) {
      Alert.alert('Cảnh báo', 'Giá nhập cao hơn giá bán. Bạn có chắc chắn muốn tiếp tục?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Tiếp tục', onPress: () => saveProduct(sellPrice, importPrice) }
      ]);
      return;
    }

    saveProduct(sellPrice, importPrice);
  }, [product, navigation]);

  const saveProduct = useCallback((sellPrice: number, importPrice: number) => {
    // TODO: Save product to database
    console.log('Saving product:', { ...product, sellPrice, importPrice });
    
    Alert.alert(
      'Thành công', 
      'Sản phẩm đã được thêm thành công!',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to order screen and add the new product
            navigation.navigate('Order', {
              newProduct: {
                id: Date.now().toString(),
                name: product.name,
                price: sellPrice,
                barcode: product.barcode,
              }
            });
          }
        }
      ]
    );
  }, [product, navigation]);

  const handleCancel = useCallback(() => {
    // Simply go back without adding any product
    console.log('📱 AddProduct cancelled, going back without adding product');
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm sản phẩm</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoBox}
            onPress={handleAddPhoto}
          >
            <Icon name="camera-plus-outline" size={24} color="#009DA5" />
            <Text style={styles.photoLabel}>Thêm ảnh</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Barcode */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Mã vạch</Text>
            <TextInput
              style={styles.input}
              value={product.barcode}
              onChangeText={(text) => updateProduct('barcode', text)}
              placeholder="Nhập mã vạch"
              editable={!route.params?.barcode} // Disable if barcode came from scanner
            />
          </View>

          {/* Product Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, styles.required]}>Tên sản phẩm *</Text>
            <TextInput
              style={styles.input}
              value={product.name}
              onChangeText={(text) => updateProduct('name', text)}
              placeholder="Nhập tên sản phẩm"
            />
          </View>

          {/* Brand */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nhóm hàng</Text>
            <TouchableOpacity style={styles.dropdownInput}>
              <Text style={styles.dropdownPlaceholder}>Chọn nhóm hàng</Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Prices Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.label, styles.required]}>Nhập giá vốn *</Text>
              <TextInput
                style={styles.input}
                value={product.importPrice}
                onChangeText={(text) => handlePriceChange('importPrice', text)}
                placeholder="Nhập giá (VND)"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.label, styles.required]}>Nhập giá bán *</Text>
              <TextInput
                style={styles.input}
                value={product.sellPrice}
                onChangeText={(text) => handlePriceChange('sellPrice', text)}
                placeholder="Nhập giá (VND)"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Single Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.oneThirdWidth]}>
              <Text style={styles.label}>Số lượng</Text>
              <TextInput
                style={styles.input}
                value={product.quantity}
                onChangeText={(text) => updateProduct('quantity', text)}
                placeholder="Nhập số lượng"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.oneThirdWidth]}>
              <Text style={styles.label}>Đơn vị</Text>
              <TouchableOpacity style={styles.dropdownInput}>
                <Text style={styles.dropdownPlaceholder}>Đơn vị</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldContainer, styles.oneThirdWidth]}>
              <Text style={styles.label}>Giảm giá</Text>
              <TouchableOpacity style={styles.dropdownInput}>
                <Text style={styles.dropdownPlaceholder}>0%</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct}>
          <Text style={styles.saveButtonText}>Lưu sản phẩm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  content: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  photoBox: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#009DA5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 12,
    color: '#009DA5',
    marginTop: 4,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  required: {
    color: '#000',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dropdownInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  oneThirdWidth: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#009DA5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default AddProductScreen;
