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
import { Asset, ImageLibraryOptions, CameraOptions, launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import API_URL from '../config/api';
import { getShopId, getAuthToken } from '../services/AuthStore';
import { useInvalidateProducts } from '../services/products';

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
  const invalidateProducts = useInvalidateProducts();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddProduct'>>();
  const [shopId, setShopId] = useState<number>(0);
  const isEditing = Boolean((route.params as any)?.product?.id);
  const editingId = (route.params as any)?.product?.id ? String((route.params as any).product.id) : '';
  
  const [product, setProduct] = useState<NewProduct>({
    // Đừng lấy barcode từ params để tránh reset state khi quét mã và quay lại
    barcode: route.params?.product?.barcode || '',
    name: route.params?.product?.name || '',
    category: route.params?.product?.categoryName || route.params?.product?.category || '',
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
const [additionalUnits, setAdditionalUnits] = useState<Array<{ unitName: string; conversionRate: number; unitPrice?: string }>>(
  (route.params?.product?.units || [])
    .filter((u: any) => !u.isBaseUnit)
    .map((u: any) => ({ unitName: String(u.unitName || u.name || ''), conversionRate: Number(u.quantityInBaseUnit || u.conversionFactor || 0), unitPrice: typeof u.price === 'number' ? String(u.price) : '' }))
);
const [showAdditionalUnits, setShowAdditionalUnits] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [inventoryTotalPrice, setInventoryTotalPrice] = useState('');
  const [invoiceImage, setInvoiceImage] = useState('');
  const [isProductImageUploading, setIsProductImageUploading] = useState(false);
  const [isInvoiceImageUploading, setIsInvoiceImageUploading] = useState(false);

  // Khi nhận barcode từ màn quét, chỉ cập nhật trường barcode, giữ nguyên các trường khác
  useEffect(() => {
    const scanned = route.params?.barcode;
    if (typeof scanned === 'string' && scanned.trim()) {
      setProduct(prev => ({ ...prev, barcode: scanned.trim() }));
    }
  }, [route.params?.barcode]);

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
    Alert.alert(
      'Chọn nguồn ảnh',
      undefined,
      [
        {
          text: 'Chụp ảnh',
          onPress: () => {
            setIsProductImageUploading(true);
            const cameraOptions: CameraOptions = {
              mediaType: 'photo',
              saveToPhotos: true,
              cameraType: 'back',
            };
            launchCamera(cameraOptions, (response) => {
              if (response.didCancel) return;
              if (response.errorCode) {
                Alert.alert('Lỗi', response.errorMessage || 'Không thể mở camera');
                setIsProductImageUploading(false);
                return;
              }
              const asset: Asset | undefined = response.assets && response.assets[0];
              if (asset?.uri) {
                updateProduct('image', asset.uri);
                setIsProductImageUploading(false);
              } else {
                Alert.alert('Lỗi', 'Không lấy được ảnh vừa chụp');
                setIsProductImageUploading(false);
              }
            });
          },
        },
        {
          text: 'Thư viện',
          onPress: () => {
            setIsProductImageUploading(true);
            const options: ImageLibraryOptions = {
              mediaType: 'photo',
              selectionLimit: 1,
              includeBase64: false,
            };
            launchImageLibrary(options, (response) => {
              if (response.didCancel) return;
              if (response.errorCode) {
                Alert.alert('Lỗi', response.errorMessage || 'Không thể mở thư viện ảnh');
                setIsProductImageUploading(false);
                return;
              }
              const asset: Asset | undefined = response.assets && response.assets[0];
              if (asset?.uri) {
                updateProduct('image', asset.uri);
                setIsProductImageUploading(false);
              } else {
                Alert.alert('Lỗi', 'Không lấy được ảnh đã chọn');
                setIsProductImageUploading(false);
              }
            });
          },
        },
        { text: 'Hủy', style: 'cancel', onPress: () => setIsProductImageUploading(false) },
      ]
    );
  }, [updateProduct]);

  const handleAddInvoicePhoto = useCallback(() => {
    Alert.alert(
      'Ảnh hóa đơn nhập',
      undefined,
      [
        {
          text: 'Chụp ảnh',
          onPress: () => {
            setIsInvoiceImageUploading(true);
            const cameraOptions: CameraOptions = {
              mediaType: 'photo',
              saveToPhotos: true,
              cameraType: 'back',
            };
            launchCamera(cameraOptions, (response) => {
              if (response.didCancel) return;
              if (response.errorCode) {
                Alert.alert('Lỗi', response.errorMessage || 'Không thể mở camera');
                setIsInvoiceImageUploading(false);
                return;
              }
              const asset: Asset | undefined = response.assets && response.assets[0];
              if (asset?.uri) {
                setInvoiceImage(asset.uri);
                setIsInvoiceImageUploading(false);
              } else {
                Alert.alert('Lỗi', 'Không lấy được ảnh vừa chụp');
                setIsInvoiceImageUploading(false);
              }
            });
          },
        },
        {
          text: 'Thư viện',
          onPress: () => {
            setIsInvoiceImageUploading(true);
            const options: ImageLibraryOptions = {
              mediaType: 'photo',
              selectionLimit: 1,
              includeBase64: false,
            };
            launchImageLibrary(options, (response) => {
              if (response.didCancel) return;
              if (response.errorCode) {
                Alert.alert('Lỗi', response.errorMessage || 'Không thể mở thư viện ảnh');
                setIsInvoiceImageUploading(false);
                return;
              }
              const asset: Asset | undefined = response.assets && response.assets[0];
              if (asset?.uri) {
                setInvoiceImage(asset.uri);
                setIsInvoiceImageUploading(false);
              } else {
                Alert.alert('Lỗi', 'Không lấy được ảnh đã chọn');
                setIsInvoiceImageUploading(false);
              }
            });
          },
        },
        { text: 'Hủy', style: 'cancel', onPress: () => setIsInvoiceImageUploading(false) },
      ]
    );
  }, []);

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

  // If user enters/scans a barcode that already exists, prefill fields (except quantity and invoice image)
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        if (isEditing) return; // only for create flow
        const bc = (product.barcode || '').trim();
        if (!bc) return;
        if (!shopId) return;
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/api/products?ShopId=${shopId}&Barcode=${encodeURIComponent(bc)}&page=1&pageSize=1`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const found: any = items[0];
        if (!active) return;
        if (!found) {
          // Không đụng vào dữ liệu người dùng đã nhập khi không tìm thấy sản phẩm
          return;
        }
        // Prefill fields, không xoá dữ liệu người dùng đã nhập; chỉ fill khi field đang trống
        setProduct(prev => ({
          ...prev,
          name: prev.name || String(found.productName ?? found.name ?? ''),
          sellPrice: prev.sellPrice || (typeof found.price === 'number' ? String(found.price) : ''),
          discount: prev.discount || (typeof found.discount === 'number' ? String(found.discount) : prev.discount),
          image: prev.image || (found.productImageURL ? String(found.productImageURL) : (found.imageUrl ? String(found.imageUrl) : prev.image)),
        }));
        // Determine base and additional units from product-units API
        try {
          const prodId = Number(found.productId ?? found.id ?? 0);
          if (prodId && shopId) {
            const puRes = await fetch(`${API_URL}/api/product-units?ShopId=${shopId}&ProductId=${prodId}&page=1&pageSize=100`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const puData = await puRes.json().catch(() => ({}));
            const puItems: any[] = Array.isArray(puData?.items) ? puData.items : Array.isArray(puData) ? puData : [];
            if (puItems.length > 0) {
              const base = puItems.find((u: any) => Number(u.conversionFactor ?? 0) === 1) || puItems[0];
              if (!baseUnit && base?.unitName) {
                setBaseUnit(String(base.unitName));
              }
              if (additionalUnits.length === 0) {
                const others = puItems
                  .filter((u: any) => Number(u.conversionFactor ?? 0) !== 1)
                  .map((u: any) => ({ unitName: String(u.unitName ?? ''), conversionRate: Number(u.conversionFactor ?? 0) || 0, unitPrice: typeof u.price === 'number' ? String(u.price) : '' }));
                setAdditionalUnits(others);
              }
            }
          }
        } catch {}
        // If category exists, set by categoryName (không ghi đè nếu đã có)
        const catName: string | undefined = found.categoryName ? String(found.categoryName) : undefined;
        if (catName && !product.category) {
          updateProduct('category', catName);
        }
      } catch {}
    };
    // slight debounce to avoid rapid calls while typing barcode
    const t = setTimeout(run, 300);
    return () => { active = false; clearTimeout(t); };
  }, [product.barcode, shopId, isEditing, baseUnit, product.category, updateProduct]);

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

  // Auto-calc import cost per unit from quantity and total price
  useEffect(() => {
    try {
      const qty = parseInt(product.quantity || '0', 10) || 0;
      const total = parseInt((inventoryTotalPrice || '').replace(/[^\d]/g, '')) || 0;
      if (qty > 0 && total > 0) {
        const unit = Math.round(total / qty);
        setProduct(prev => ({ ...prev, importPrice: unit.toLocaleString('vi-VN') }));
      } else {
        setProduct(prev => ({ ...prev, importPrice: '' }));
      }
    } catch {}
  }, [product.quantity, inventoryTotalPrice]);


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
    if (isProductImageUploading || isInvoiceImageUploading) {
      Alert.alert('Vui lòng chờ', 'Ảnh đang tải lên, vui lòng đợi hoàn tất trước khi lưu');
      return;
    }
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
    const quantity = isEditing ? 0 : (parseInt(product.quantity || '0', 10) || 0);
    const totalImport = isEditing ? 0 : (parseInt((inventoryTotalPrice || '').replace(/[^\d]/g, '')) || 0);
    const unitImportPrice = isEditing ? 0 : (quantity > 0 ? Math.round(totalImport / quantity) : 0);
    
    if (isNaN(sellPrice) || sellPrice <= 0) {
      Alert.alert('Lỗi', 'Giá bán phải là số dương');
      return;
    }

    if (!isEditing && quantity <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng nhập (> 0)');
      return;
    }

    if (!isEditing && totalImport <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập tổng tiền nhập hàng');
      return;
    }

    if (!isEditing && unitImportPrice > sellPrice) {
      Alert.alert('Cảnh báo', 'Giá nhập cao hơn giá bán. Bạn có chắc chắn muốn tiếp tục?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Tiếp tục', onPress: () => saveProduct(sellPrice, unitImportPrice, totalImport) }
      ]);
      return;
    }

    saveProduct(sellPrice, unitImportPrice, totalImport);
  }, [product, navigation, inventoryTotalPrice, isProductImageUploading, isInvoiceImageUploading]);

  const saveProduct = useCallback(async (sellPrice: number, unitImportPrice: number, totalImportPrice: number) => {
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
            price: (() => {
              const explicit = parseInt(String(u.unitPrice || '').replace(/[^\d]/g, ''));
              if (!isNaN(explicit) && explicit > 0) return explicit;
              return Math.round(sellPrice * (u.conversionRate || 1));
            })(),
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
      // Units as JSON array (server parses stringified JSON) - updated field name per API change
      form.append('UnitsJson', JSON.stringify(unitsPayload));
      if (!isEditing) {
        // InventoryTransaction fields only when creating
        form.append('InventoryTransaction.Quantity', String(parsedQuantity));
        form.append('InventoryTransaction.Price', String(totalImportPrice));
      }

      // Attach product image file if available (optional)
      const hasLocalImage = (product.image || '').trim() && !/^https?:\/\//i.test(product.image.trim());
      if ((product.image || '').trim() && (!isEditing || hasLocalImage)) {
        const uri = product.image.trim();
        const name = uri.split('/').pop() || 'image.jpg';
        const ext = (name.split('.').pop() || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'application/octet-stream';
        // Image for product (updated API field name)
        form.append('ProductImageFile', {
          uri,
          name,
          type,
        } as any);
      }

      // Attach invoice image file for inventory transaction if provided (updated API field name)
      if (!isEditing && (invoiceImage || '').trim()) {
        const uri = invoiceImage.trim();
        const name = uri.split('/').pop() || 'invoice.jpg';
        const ext = (name.split('.').pop() || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'application/octet-stream';
        form.append('InventoryTransaction.InventoryTransImageFile', {
          uri,
          name,
          type,
        } as any);
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
          importPrice: unitImportPrice,
          baseUnit,
          additionalUnitsCount: additionalUnits.length,
          hasImage: Boolean(product.image),
          inventoryTotalPrice: totalImportPrice,
          hasInvoiceImage: Boolean(invoiceImage),
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
        isEditing ? 'Đã cập nhật sản phẩm!' : 'Sản phẩm đã nhập thêm thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              try { invalidateProducts(); } catch {}
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
  }, [product, baseUnit, additionalUnits, navigation, isEditing, editingId, categories, shopId, invoiceImage]);

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
        <Text style={styles.headerTitle}>{isEditing ? 'Sửa sản phẩm' : 'Nhập sản phẩm'}</Text>
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
            {!isEditing && (
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.label}>Tổng tiền nhập hàng<Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={inventoryTotalPrice}
                  onChangeText={(text) => setInventoryTotalPrice(formatPrice(text))}
                  placeholder="Nhập tổng tiền"
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={styles.label}>Giá bán <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={product.sellPrice}
                onChangeText={(text) => handlePriceChange('sellPrice', text)}
                placeholder="Nhập giá bán"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Computed Import Price */}
          {!isEditing && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Giá vốn/đơn vị (tự tính)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#EFEFEF' }]}
                value={product.importPrice}
                editable={false}
                placeholder="Tự tính từ Số lượng và Tổng tiền"
              />
            </View>
          )}

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
                <TextInput
                  style={styles.input}
                  placeholder="Giá bán của đơn vị"
                  value={unit.unitPrice || ''}
                  onChangeText={(text) => {
                    const numeric = text.replace(/[^\d]/g, '');
                    const newUnits = [...additionalUnits];
                    newUnits[index].unitPrice = numeric;
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
          {!isEditing && (
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
          )}

          {/* Invoice Image */}
          {!isEditing && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Ảnh hóa đơn nhập</Text>
              {invoiceImage ? (
                <View style={styles.invoiceImageWrapper}>
                  <TouchableOpacity activeOpacity={0.8} onPress={handleAddInvoicePhoto}>
                    <Image source={{ uri: invoiceImage }} style={styles.invoiceImage} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.invoiceDeleteButton}
                    onPress={() => setInvoiceImage('')}
                    accessibilityLabel="Xóa ảnh hóa đơn"
                  >
                    <Icon name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addButton} onPress={handleAddInvoicePhoto}>
                  <Text style={styles.addButtonText}>Chọn/Chụp ảnh hóa đơn</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, (isSaving || isProductImageUploading || isInvoiceImageUploading) && { opacity: 0.7 }]} onPress={handleSaveProduct} disabled={isSaving || isProductImageUploading || isInvoiceImageUploading}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{(isProductImageUploading || isInvoiceImageUploading) ? 'Đang tải ảnh...' : 'Lưu sản phẩm'}</Text>
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
  invoiceImageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  invoiceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  invoiceDeleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
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
