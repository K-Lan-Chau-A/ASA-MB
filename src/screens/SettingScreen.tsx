import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  Modal,
  FlatList,
  Image
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getUsername } from '../services/AuthStore';
import vietQrBankData from '../constants/vietQrBank.json';
import donViHanhChinhData from '../constants/donViHanhChinh34TinhThanh.json';

// Types
interface ShopData {
  shopId: number;
  shopName: string;
  address: string;
  shopToken: string | null;
  createdAt: string;
  status: number;
  qrcodeUrl: string;
  sepayApiKey: string | null;
  currentRequest: number;
  currentAccount: number;
  bankName: string | null;
  bankCode: string | null;
  bankNum: string | null;
  createdAdminUsername: string | null;
  createdAdminPassword: string | null;
}

interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
}

interface Province {
  code: string;
  name: string;
  slug: string;
  type: string;
  isCentral: boolean;
  fullName: string;
  wards: Ward[];
}

interface Ward {
  code: string;
  name: string;
  fullName: string;
  slug: string;
  type: string;
}

const SettingScreen = () => {
  const navigation = useNavigation();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [shopName, setShopName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeImageError, setQrCodeImageError] = useState(false);
  const [isUploadingQrCode, setIsUploadingQrCode] = useState(false);
  
  // Modal states
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  
  // Data
  const banks: Bank[] = vietQrBankData.data;
  const provinces: Province[] = donViHanhChinhData;

  // Parse address to extract components
  const parseAddress = useCallback((address: string) => {
    if (!address) return { houseNumber: '', province: null, ward: null };
    
    // Try to extract house number (first part before comma)
    const parts = address.split(',');
    const houseNumber = parts[0]?.trim() || '';
    
    // Find province and ward from the address
    let foundProvince: Province | null = null;
    let foundWard: Ward | null = null;
    
    for (const province of provinces) {
      if (address.includes(province.name)) {
        foundProvince = province;
        // Look for ward in this province
        for (const ward of province.wards) {
          if (address.includes(ward.name)) {
            foundWard = ward;
            break;
          }
        }
        break;
      }
    }
    
    return { houseNumber, province: foundProvince, ward: foundWard };
  }, [provinces]);

  // Load shop data
  const loadShopData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      const shopId = await getShopId();
      
      if (!token || !shopId) {
        Alert.alert('Lỗi', 'Không thể lấy thông tin đăng nhập');
        return;
      }

      const response = await fetch(`${API_URL}/api/shops?ShopId=${shopId}&page=1&pageSize=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin cửa hàng');
      }

      const result = await response.json();
      const shop = result.items?.[0];
      
      if (shop) {
        setShopData(shop);
        // Don't auto-fill form fields here - only when user clicks edit
        console.log('Shop data loaded:', shop);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin cửa hàng');
    } finally {
      setIsLoading(false);
    }
  }, [banks, parseAddress]);

  // Save shop data
  const saveShopData = useCallback(async () => {
    if (!shopData) return;
    
    try {
      setIsSaving(true);
      const token = await getAuthToken();
      const username = await getUsername();
      
      if (!token) {
        Alert.alert('Lỗi', 'Không thể lấy thông tin đăng nhập');
        return;
      }

      // Build address
      let address = houseNumber;
      if (selectedWard) {
        address += `, ${selectedWard.name}`;
      }
      if (selectedProvince) {
        address += `, ${selectedProvince.name}`;
      }

      // Send all required fields according to API format
      const updateData = {
        shopId: shopData.shopId,
        shopName: shopName || shopData.shopName || "",
        address: address || shopData.address || "",
        shopToken: shopData.shopToken || "",
        createdAt: shopData.createdAt,
        status: shopData.status,
        qrcodeUrl: qrCodeUrl || shopData.qrcodeUrl || null,
        sepayApiKey: shopData.sepayApiKey || null,
        currentRequest: shopData.currentRequest,
        currentAccount: shopData.currentAccount,
        bankName: selectedBank?.name || shopData.bankName || null,
        bankCode: selectedBank?.code || shopData.bankCode || null,
        bankNum: bankAccountNumber || shopData.bankNum || null,
        // Add username field from AuthStore
        username: username || shopData.createdAdminUsername || null,
      };

      console.log('Sending full update data:', updateData);
      console.log('API URL:', `${API_URL}/api/shops/${shopData.shopId}`);
      console.log('Username from AuthStore:', username);

      const response = await fetch(`${API_URL}/api/shops/${shopData.shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Không thể cập nhật thông tin cửa hàng: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);

      Alert.alert('Thành công', 'Đã cập nhật thông tin cửa hàng!', [
        {
          text: 'OK',
          onPress: () => {
            setIsEditing(false);
            loadShopData(); // Reload data
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving shop data:', error);
      Alert.alert('Lỗi', `Không thể cập nhật thông tin cửa hàng: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }, [shopData, shopName, houseNumber, selectedProvince, selectedWard, selectedBank, bankAccountNumber, qrCodeUrl, loadShopData]);

  // Auto-fill form data when entering edit mode
  const handleEditPress = useCallback(() => {
    if (!shopData) return;
    
    // Auto-fill all fields with current data
    setShopName(shopData.shopName || '');
    
    // Parse address and fill components
    const { houseNumber: parsedHouseNumber, province, ward } = parseAddress(shopData.address || '');
    setHouseNumber(parsedHouseNumber);
    setSelectedProvince(province);
    setSelectedWard(ward);
    
    // Fill bank info
    if (shopData.bankCode) {
      const bank = banks.find(b => b.code === shopData.bankCode);
      if (bank) {
        setSelectedBank(bank);
      }
    }
    setBankAccountNumber(shopData.bankNum || '');
    setQrCodeUrl(shopData.qrcodeUrl || '');
    setQrCodeImageError(false);
    
    setIsEditing(true);
  }, [shopData, banks, parseAddress]);

  // Upload QR code to Cloudinary
  const uploadQrCodeToCloudinary = useCallback(async (imageUri: string) => {
    try {
      setIsUploadingQrCode(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'qr-code.jpg',
      } as any);
      // Try ASAqrCode preset first, then fallback to others
      const presetsToTry = ['ASAqrCode', 'ml_default', 'unsigned', 'public', 'qr_codes'];
      let uploadSuccess = false;
      let uploadedUrl = '';
      
      for (const preset of presetsToTry) {
        try {
          const testFormData = new FormData();
          testFormData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'qr-code.jpg',
          } as any);
          testFormData.append('upload_preset', preset);
          testFormData.append('folder', 'qr-codes');

          console.log(`Trying upload preset: ${preset}`);

          const response = await fetch('https://api.cloudinary.com/v1_1/dxwyyesrw/image/upload', {
            method: 'POST',
            body: testFormData,
          });

          if (response.ok) {
            const result = await response.json();
            uploadedUrl = result.secure_url;
            uploadSuccess = true;
            console.log(`Upload successful with preset: ${preset}`);
            break;
          } else {
            const errorText = await response.text();
            console.log(`Preset ${preset} failed:`, response.status, errorText);
          }
        } catch (error) {
          console.log(`Preset ${preset} error:`, error);
        }
      }
      
      if (!uploadSuccess) {
        throw new Error('All upload presets failed. Please check your Cloudinary settings.');
      }
      
      return uploadedUrl;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    } finally {
      setIsUploadingQrCode(false);
    }
  }, []);

  // Handle QR code image picker
  const handleQrCodeImagePicker = useCallback(() => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          try {
            const uploadedUrl = await uploadQrCodeToCloudinary(imageUri);
            setQrCodeUrl(uploadedUrl);
            setQrCodeImageError(false);
            Alert.alert('Thành công', 'Đã tải QR code lên thành công!');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
          }
        }
      }
    });
  }, [uploadQrCodeToCloudinary]);

  useEffect(() => {
    loadShopData();
  }, [loadShopData]);

  const renderProvinceItem = ({ item }: { item: Province }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedProvince(item);
        setSelectedWard(null); // Reset ward when province changes
        setShowProvinceModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderWardItem = ({ item }: { item: Ward }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedWard(item);
        setShowWardModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderBankItem = ({ item }: { item: Bank }) => (
    <TouchableOpacity
      style={styles.bankItem}
      onPress={() => {
        setSelectedBank(item);
        setShowBankModal(false);
      }}
    >
      <Image 
        source={{ uri: item.logo }} 
        style={styles.bankLogo}
        resizeMode="contain"
      />
      <View style={styles.bankInfo}>
        <Text style={styles.bankName}>{item.shortName}</Text>
        <Text style={styles.bankCode}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Icon name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cài đặt</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <TouchableOpacity
          onPress={() => isEditing ? saveShopData() : handleEditPress()}
          disabled={isSaving}
          style={{ padding: 4 }}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? (isSaving ? 'Đang lưu...' : 'Lưu') : 'Sửa'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên cửa hàng</Text>
            <TextInput
              style={styles.input}
              value={isEditing ? shopName : (shopData?.shopName || '')}
              onChangeText={setShopName}
              editable={isEditing}
              placeholder="Nhập tên cửa hàng"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ</Text>
            
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Số nhà</Text>
                  <TextInput
                    style={styles.input}
                    value={houseNumber}
                    onChangeText={setHouseNumber}
                    editable={isEditing}
                    placeholder="Nhập số nhà"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Tỉnh/Thành phố</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dropdown]}
                    onPress={() => isEditing && setShowProvinceModal(true)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.dropdownText, !selectedProvince && styles.placeholderText]}>
                      {selectedProvince ? selectedProvince.name : 'Chọn tỉnh/thành phố'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Phường/Xã</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dropdown]}
                    onPress={() => isEditing && setShowWardModal(true)}
                    disabled={!isEditing || !selectedProvince}
                  >
                    <Text style={[styles.dropdownText, !selectedWard && styles.placeholderText]}>
                      {selectedWard ? selectedWard.name : 'Chọn phường/xã'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.addressDisplay}>
                <Text style={styles.addressText}>{shopData?.address || 'Chưa có địa chỉ'}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thông tin ngân hàng</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.subLabel}>Ngân hàng</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdown]}
                onPress={() => isEditing && setShowBankModal(true)}
                disabled={!isEditing}
              >
                <View style={styles.bankSelector}>
                  {isEditing ? (
                    selectedBank ? (
                      <>
                        <Image 
                          source={{ uri: selectedBank.logo }} 
                          style={styles.bankLogoSmall}
                          resizeMode="contain"
                        />
                        <Text style={styles.dropdownText}>{selectedBank.shortName}</Text>
                      </>
                    ) : (
                      <Text style={[styles.dropdownText, styles.placeholderText]}>Chọn ngân hàng</Text>
                    )
                  ) : (
                    shopData?.bankName ? (
                      <Text style={styles.dropdownText}>{shopData.bankName}</Text>
                    ) : (
                      <Text style={[styles.dropdownText, styles.placeholderText]}>Chưa chọn ngân hàng</Text>
                    )
                  )}
                </View>
                <Icon name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.subLabel}>Số tài khoản</Text>
              <TextInput
                style={styles.input}
                value={isEditing ? bankAccountNumber : (shopData?.bankNum || '')}
                onChangeText={setBankAccountNumber}
                editable={isEditing}
                placeholder="Nhập số tài khoản"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>QR Code</Text>
            
            {isEditing ? (
              <View style={styles.qrCodeEditContainer}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleQrCodeImagePicker}
                disabled={isUploadingQrCode}
              >
                <Icon name="camera" size={20} color="#009DA5" />
                <Text style={styles.uploadButtonText}>
                  {isUploadingQrCode ? 'Đang tải...' : 'Tải QR Code lên'}
                </Text>
              </TouchableOpacity>
                
                {qrCodeUrl && (
                  <View style={styles.qrCodePreview}>
                    <Text style={styles.subLabel}>Xem trước:</Text>
                    <Image 
                      source={{ uri: qrCodeUrl }} 
                      style={styles.qrCodeImageSmall}
                      resizeMode="contain"
                      onError={() => setQrCodeImageError(true)}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.qrCodeDisplayContainer}>
                {shopData?.qrcodeUrl && !qrCodeImageError ? (
                  <Image 
                    source={{ uri: shopData.qrcodeUrl }} 
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                    onError={() => setQrCodeImageError(true)}
                  />
                ) : (
                  <View style={styles.qrCodePlaceholder}>
                    <Icon name="qrcode" size={48} color="#CCC" />
                    <Text style={styles.qrCodePlaceholderText}>
                      {shopData?.qrcodeUrl ? 'Không thể hiển thị QR Code' : 'Chưa có QR Code'}
                    </Text>
                    {shopData?.qrcodeUrl && (
                      <Text style={styles.qrCodeUrlText} numberOfLines={2}>
                        {shopData.qrcodeUrl}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thông tin khác</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>{shopData?.status === 1 ? 'Hoạt động' : 'Tạm dừng'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày tạo:</Text>
              <Text style={styles.infoValue}>
                {shopData?.createdAt ? new Date(shopData.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Province Modal */}
      <Modal visible={showProvinceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn tỉnh/thành phố</Text>
              <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={provinces}
              renderItem={renderProvinceItem}
              keyExtractor={(item) => item.code}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Ward Modal */}
      <Modal visible={showWardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phường/xã</Text>
              <TouchableOpacity onPress={() => setShowWardModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedProvince?.wards || []}
              renderItem={renderWardItem}
              keyExtractor={(item) => item.code}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Bank Modal */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={banks}
              renderItem={renderBankItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalList}
            />
          </View>
      </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  editButtonText: {
    fontSize: 16,
    color: '#009DA5',
    fontWeight: '600',
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  bankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankLogoSmall: {
    width: 30,
    height: 11,
    marginRight: 8,
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bankLogo: {
    width: 60,
    height: 22,
    marginRight: 12,
    borderRadius: 4,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  bankCode: {
    fontSize: 14,
    color: '#666',
  },
  addressDisplay: {
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  qrCodeEditContainer: {
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#009DA5',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#009DA5',
    fontWeight: '500',
  },
  qrCodePreview: {
    marginTop: 16,
    alignItems: 'center',
  },
  qrCodeImageSmall: {
    width: 100,
    height: 100,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  qrCodeDisplayContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  qrCodePlaceholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  qrCodeUrlText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SettingScreen;

