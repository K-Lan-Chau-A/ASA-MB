import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset, ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getShopId, getAuthToken } from '../services/AuthStore';

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

type Category = {
  categoryId: number;
  categoryName: string;
};

const units = [
  'Cái',
  'Lon',
  'Chai',
  'Gói',
  'Hộp, ...',
];

const AddProductScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddProduct'>>();
  const [shopId, setShopId] = useState<number>(0);
  const isEditing = Boolean((route.params as any)?.product?.id);
  const editingId = (route.params as any)?.product?.id ? String((route.params as any).product.id) : '';
  
  const [product, setProduct] = useState<NewProduct>({
    barcode: route.params?.product?.barcode || route.params?.barcode || '',
    name: route.params?.product?.name || '',
    category: route.params?.product?.category || '',
    importPrice: route.params?.product?.cost != null && !isNaN(Number(route.params?.product?.cost))
      ? Number(route.params?.product?.cost).toLocaleString('vi-VN')
      : '',
    sellPrice: route.params?.product?.price ? String(route.params?.product?.price) : '',
    unit: route.params?.product?.selectedUnit || '',
    quantity: route.params?.product?.quantity ? String(route.params?.product?.quantity) : '',
    discount: '0',
    image: route.params?.product?.imageUrl || '',
    description: '',
  });

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [baseUnit, setBaseUnit] = useState(route.params?.product?.units?.find?.((u: any)=>u.isBaseUnit)?.unitName || '');
const [additionalUnits, setAdditionalUnits] = useState<Array<{ unitName: string; conversionRate: number }>>(
  (route.params?.product?.units || [])
    .filter((u: any) => !u.isBaseUnit)
    .map((u: any) => ({ unitName: String(u.unitName || u.name || ''), conversionRate: Number(u.quantityInBaseUnit || u.conversionFactor || 0) }))
);
const [showAdditionalUnits, setShowAdditionalUnits] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

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
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: false,
    };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Lỗi', response.errorMessage || 'Không thể mở thư viện ảnh');
        return;
      }
      const asset: Asset | undefined = response.assets && response.assets[0];
      if (asset?.uri) {
        updateProduct('image', asset.uri);
      } else {
        Alert.alert('Lỗi', 'Không lấy được ảnh đã chọn');
      }
    });
  }, [updateProduct]);

  // Load shopId and fetch categories
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingCategories(true);
      setCategoryError(null);
      try {
        const loadedShopId = (await getShopId()) ?? 0;
        setShopId(loadedShopId);
        const token = await getAuthToken();
        // Try with capitalized ShopId like other endpoints
        let res = await fetch(`${API_URL}/api/categories?ShopId=${loadedShopId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        let data = await res.json();
        let arr: any[] | null = null;
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray(data?.items)) arr = data.items;
        // If empty or null, fallback to lowercase shopId param for compatibility
        if (!arr || arr.length === 0) {
          res = await fetch(`${API_URL}/api/categories?shopId=${loadedShopId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          data = await res.json();
          if (Array.isArray(data)) arr = data; else if (Array.isArray(data?.items)) arr = data.items; else arr = [];
        }
        setCategories(
          (arr || [])
            .filter((c: any) => typeof c?.categoryId === 'number' && typeof c?.categoryName === 'string')
            .map((c: any) => ({ categoryId: c.categoryId, categoryName: c.categoryName }))
        );
      } catch (e) {
        setCategoryError('Không tải được danh mục');
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchAll();
  }, []);

  // Fetch cost when editing if not provided
  useEffect(() => {
    const loadCost = async () => {
      try {
        if (!(route.params as any)?.product?.id) return;
        const pid = String((route.params as any).product.id);
        if (!shopId) return;
        if ((product.importPrice || '').trim() !== '') return;
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}&ProductId=${pid}&page=1&pageSize=1`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => null);
        const items: any[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        const found: any = items[0] || null;
        const cost = Number(found?.cost ?? 0);
        if (!isNaN(cost) && cost > 0) {
          setProduct(prev => ({ ...prev, importPrice: cost.toLocaleString('vi-VN') }));
        }
      } catch {}
    };
    loadCost();
  }, [route.params, shopId, product.importPrice]);


  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm hàng');
      return;
    }
    try {
      setIsCreatingCategory(true);
      const token = await getAuthToken();
      const payload = { categoryName: newCategoryName.trim(), description: newCategoryDesc.trim(), shopId: shopId };
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Tạo nhóm hàng thất bại';
        Alert.alert('Lỗi', msg);
        return;
      }
      // Append to list and select it
      const created: Category = {
        categoryId: data?.categoryId ?? (Math.max(0, ...categories.map(c => c.categoryId)) + 1),
        categoryName: data?.categoryName ?? newCategoryName.trim(),
      };
      setCategories(prev => [...prev, created]);
      updateProduct('category', created.categoryName);
      setShowCreateCategoryModal(false);
      setShowCategoryDropdown(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tạo nhóm hàng. Vui lòng thử lại.');
    } finally {
      setIsCreatingCategory(false);
    }
  }, [newCategoryName, newCategoryDesc, shopId, categories, updateProduct]);

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

    if (!baseUnit.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn đơn vị gốc');
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

  const saveProduct = useCallback(async (sellPrice: number, importPrice: number) => {
    try {
      setIsSaving(true);
      // Build payload per API contract (multipart/form-data)
      const matchedCategory = categories.find((c) => c.categoryName === product.category);
      const categoryId = matchedCategory ? matchedCategory.categoryId : 0;

      const parsedDiscount = Math.max(0, Math.min(100, parseInt(product.discount || '0', 10) || 0));
      const parsedQuantity = parseInt(product.quantity || '0', 10) || 0;

      const baseUnitName = (baseUnit || 'Cái').trim();
      const unitsPayload = [
        {
          name: baseUnitName,
          conversionFactor: 1,
          price: sellPrice,
          isBaseUnit: true,
        },
        ...additionalUnits
          .filter(u => (u.unitName || '').trim() !== '' && (u.conversionRate || 0) > 0)
          .map(u => ({
            name: u.unitName.trim(),
            conversionFactor: u.conversionRate,
            price: Math.round(sellPrice * (u.conversionRate || 1)),
            isBaseUnit: false,
          })),
      ];

      // Create multipart form
      const form = new FormData();
      form.append('ShopId', String(shopId));
      form.append('ProductName', product.name.trim());
      form.append('Barcode', product.barcode.trim());
      form.append('CategoryId', String(categoryId));
      form.append('Price', String(sellPrice));
      form.append('Discount', String(parsedDiscount));
      form.append('Status', String(1));
      // Units as JSON array (server parses stringified JSON)
      form.append('Units', JSON.stringify(unitsPayload));
      if (!isEditing) {
        // InventoryTransaction fields only when creating
        form.append('InventoryTransaction.Quantity', String(parsedQuantity));
        form.append('InventoryTransaction.Price', String(importPrice));
      }

      // Attach product image file if available (optional)
      const hasLocalImage = (product.image || '').trim() && !/^https?:\/\//i.test(product.image.trim());
      if ((product.image || '').trim() && (!isEditing || hasLocalImage)) {
        const uri = product.image.trim();
        const name = uri.split('/').pop() || 'image.jpg';
        const ext = (name.split('.').pop() || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'application/octet-stream';
        // Image for product
        form.append('ImageFile', {
          uri,
          name,
          type,
        } as any);
        if (!isEditing) {
          form.append('InventoryTransaction.ImageFile', {
            uri,
            name: `inventory_${name}`,
            type,
          } as any);
        }
      }

      const token = await getAuthToken();
      const url = isEditing ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';
      try {
        console.log('[ProductSave] isEditing:', isEditing, 'editingId:', editingId);
        console.log('[ProductSave] url:', url, 'method:', method);
        console.log('[ProductSave] summary:', {
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          sellPrice,
          importPrice,
          baseUnit,
          additionalUnitsCount: additionalUnits.length,
          hasImage: Boolean(product.image),
        } as any);
      } catch {}
      const res = await fetch(url, {
        method: method as any,
        headers: {
          // Let fetch set proper multipart boundary automatically
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        try { console.log('[ProductSave] HTTP', res.status, res.statusText, result); } catch {}
        const msg = result?.message || (isEditing ? 'Không thể cập nhật sản phẩm' : 'Không thể tạo sản phẩm');
        Alert.alert('Lỗi', msg);
        return;
      }

      try { console.log('[ProductSave] success:', result); } catch {}

      Alert.alert(
        'Thành công',
        isEditing ? 'Đã cập nhật sản phẩm!' : 'Sản phẩm đã được thêm thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }, [product, baseUnit, additionalUnits, navigation, isEditing, editingId, categories, shopId]);

  const handleCancel = useCallback(() => {
    // Simply go back without adding any product
    console.log('📱 AddProduct cancelled, going back without adding product');
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoBox}
            onPress={handleAddPhoto}
          >
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : (
              <>
                <Icon name="camera-plus-outline" size={24} color="#009DA5" />
                <Text style={styles.photoLabel}>Thêm ảnh</Text>
              </>
            )}
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
                {loadingCategories && (
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: '#666' }}>Đang tải nhóm hàng...</Text>
                  </View>
                )}
                {!loadingCategories && categories.map((category) => (
                  <TouchableOpacity
                    key={category.categoryId}
                    style={[
                      styles.dropdownItem,
                      product.category === category.categoryName && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      updateProduct('category', category.categoryName);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      product.category === category.categoryName && styles.dropdownItemTextSelected
                    ]}>
                      {category.categoryName}
                    </Text>
                  </TouchableOpacity>
                ))}
                {!!categoryError && (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: '#E53935' }}>{categoryError}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.dropdownItem, { alignItems: 'center' }]}
                  onPress={() => setShowCreateCategoryModal(true)}
                >
                  <Text style={[styles.dropdownItemText, { color: '#009DA5', fontWeight: 'bold' }]}>+ Tạo nhóm hàng mới</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Create Category Modal */}
          <Modal
            visible={showCreateCategoryModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCreateCategoryModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainerSmall}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tạo nhóm hàng</Text>
                  <TouchableOpacity onPress={() => setShowCreateCategoryModal(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={{ width: '100%' }}>
                  <Text style={styles.label}>Tên nhóm hàng</Text>
                  <TextInput
                    style={styles.input}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="Ví dụ: Đồ uống"
                  />
                  <Text style={[styles.label, { marginTop: 12 }]}>Mô tả (tùy chọn)</Text>
                  <TextInput
                    style={styles.input}
                    value={newCategoryDesc}
                    onChangeText={setNewCategoryDesc}
                    placeholder="Mô tả ngắn"
                  />
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: '#009DA5', marginTop: 16, opacity: isCreatingCategory ? 0.7 : 1 }]} onPress={handleCreateCategory} disabled={isCreatingCategory}>
                    {isCreatingCategory ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tạo nhóm hàng</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

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
              <TextInput
                style={styles.input}
                value={baseUnit}
                onChangeText={setBaseUnit}
                placeholder={`Ví dụ: ${units.join(', ')}`}
              />
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
        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSaveProduct} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu sản phẩm</Text>
          )}
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
