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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';

interface NewProduct {
  barcode: string;
  name: string;
  category: string;
  importPrice: string;
  sellPrice: string;
  unit: string;
  quantity: string;
  discount: string;
  image: string;
  description?: string;
}

const categories = [
  'Đồ uống',
  'Thực phẩm',
  'Bánh kẹo',
  'Khác'
];

const units = [
  'Cái',
  'Chai',
  'Gói',
  'Hộp',
  'Thùng',
  'Kg',
  'Gram',
  'Lít',
  'Ml',
  'Ly',
  'Túi',
  'Khác'
];

const AddProductScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddProduct'>>();
  
  const [product, setProduct] = useState<NewProduct>({
    barcode: route.params?.barcode || '',
    name: '',
    category: '',
    importPrice: '',
    sellPrice: '',
    unit: '',
    quantity: '',
    discount: '0',
    image: '',
    description: '',
  });

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [baseUnit, setBaseUnit] = useState('');
const [additionalUnits, setAdditionalUnits] = useState<Array<{ unitName: string; conversionRate: number }>>([]);
const [showUnitModal, setShowUnitModal] = useState(false);
const [showAdditionalUnits, setShowAdditionalUnits] = useState(false);

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

  const handleScanBarcode = useCallback(() => {
    // Điều hướng tới màn hình quét mã, giống OrderScreen
    navigation.navigate('Scanner');
  }, [navigation]);

  const handleSaveProduct = useCallback(() => {
    // Validate required fields
    if (!product.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    
    if (!product.category.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn nhóm hàng');
      return;
    }
    
    if (!product.sellPrice.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá bán');
      return;
    }

    if (!product.unit.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn đơn vị');
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
            // Navigate back to ProductsScreen
            navigation.goBack();
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
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={product.barcode}
                onChangeText={(text) => updateProduct('barcode', text)}
                placeholder="Nhập mã vạch"
                editable={!route.params?.barcode}
              />
              <TouchableOpacity style={styles.qrButton} onPress={handleScanBarcode}>
                <Icon name="qrcode-scan" size={22} color="#009DA5" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Tên sản phẩm <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={product.name}
              onChangeText={(text) => updateProduct('name', text)}
              placeholder="Nhập tên sản phẩm"
            />
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nhóm hàng <Text style={styles.requiredStar}>*</Text></Text>
            <TouchableOpacity 
              style={styles.dropdownInput}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={[
                styles.dropdownText,
                !product.category && styles.dropdownPlaceholder
              ]}>
                {product.category || 'Chọn nhóm hàng'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            {showCategoryDropdown && (
              <View style={styles.dropdown}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.dropdownItem,
                      product.category === category && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      updateProduct('category', category);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      product.category === category && styles.dropdownItemTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Prices Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Nhập giá vốn <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={product.importPrice}
                onChangeText={(text) => handlePriceChange('importPrice', text)}
                placeholder="Nhập giá (VND)"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Nhập giá bán <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={product.sellPrice}
                onChangeText={(text) => handlePriceChange('sellPrice', text)}
                placeholder="Nhập giá (VND)"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Base Unit and Additional Units */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Đơn vị gốc <Text style={styles.requiredStar}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dropdownInput}
                onPress={() => setShowUnitModal(true)}
              >
                <Text style={[
                  styles.dropdownText,
                  !baseUnit && styles.dropdownPlaceholder
                ]}>
                  {baseUnit || 'Chọn đơn vị gốc'}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              
              <Modal
                visible={showUnitModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUnitModal(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainerSmall}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Chọn đơn vị gốc</Text>
                      <TouchableOpacity onPress={() => setShowUnitModal(false)} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                      {units.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.dropdownItem,
                            baseUnit === unit && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setBaseUnit(unit);
                            setShowUnitModal(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            baseUnit === unit && styles.dropdownItemTextSelected
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </View>
          </View>

          {/* Additional Units */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Thêm đơn vị</Text>
            {additionalUnits.map((unit, index) => (
              <View key={index} style={styles.unitRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Tên đơn vị"
                  value={unit.unitName}
                  onChangeText={(text) => {
                    const newUnits = [...additionalUnits];
                    newUnits[index].unitName = text;
                    setAdditionalUnits(newUnits);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tỉ lệ chuyển đổi"
                  value={unit.conversionRate.toString()}
                  onChangeText={(text) => {
                    const newUnits = [...additionalUnits];
                    newUnits[index].conversionRate = parseFloat(text) || 0;
                    setAdditionalUnits(newUnits);
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    const newUnits = additionalUnits.filter((_, i) => i !== index);
                    setAdditionalUnits(newUnits);
                  }}
                >
                  <Icon name="close" size={20} color="#FF0000" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAdditionalUnits([...additionalUnits, { unitName: '', conversionRate: 0 }])}
            >
              <Text style={styles.addButtonText}>Thêm đơn vị mới</Text>
            </TouchableOpacity>
          </View>

          {/* Quantity and Discount */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Số lượng <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={product.quantity}
                onChangeText={(text) => updateProduct('quantity', text)}
                placeholder="Số lượng"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Giảm giá</Text>
              <TextInput
                style={styles.input}
                value={product.discount}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  if (value >= 0 && value <= 100) {
                    updateProduct('discount', value.toString());
                  }
                }}
                placeholder="0"
                keyboardType="numeric"
              />
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
  requiredStar: {
    color: '#E53935',
    fontWeight: 'bold',
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
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F0F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
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
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F9FA',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#009DA5',
    fontWeight: 'bold',
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
  unitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
    alignItems: 'center',
  },
  modalContainerSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '80%',
    maxHeight: '60%',
    padding: 16,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContent: {
    width: '100%',
  },
  addButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#009DA5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 30,
  },
  deleteButton: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -5,
    right: -70,
  },
});

export default AddProductScreen;
