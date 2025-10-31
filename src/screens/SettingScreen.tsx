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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { handle403Error } from '../utils/apiErrorHandler';
import { getAuthToken, getShopId, getUsername, getUserId } from '../services/AuthStore';
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
  
  // Modal states
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
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
      if (handle403Error(response, navigation)) return;
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
        qrcodeUrl: shopData.qrcodeUrl || null,
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
      if (handle403Error(response, navigation)) return;
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
  }, [shopData, shopName, houseNumber, selectedProvince, selectedWard, selectedBank, bankAccountNumber, loadShopData]);

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
    
    setIsEditing(true);
  }, [shopData, banks, parseAddress]);

  // Handle change password
  const handleChangePassword = useCallback(async () => {
    // Validate inputs
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setIsChangingPassword(true);
      const token = await getAuthToken();
      const userId = await getUserId();

      if (!token || !userId) {
        Alert.alert('Lỗi', 'Không thể lấy thông tin đăng nhập');
        return;
      }

      const response = await fetch(`${API_URL}/api/authentication/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userId,
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      if (handle403Error(response, navigation)) return;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Không thể đổi mật khẩu';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        Alert.alert('Lỗi', errorMessage);
        return;
      }

      // Success
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công!', [
        {
          text: 'OK',
          onPress: () => {
            setShowChangePasswordModal(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Lỗi', `Đã xảy ra lỗi khi đổi mật khẩu: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsChangingPassword(false);
    }
  }, [oldPassword, newPassword, confirmPassword, navigation]);


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
            <Text style={styles.label}>Thông tin khác</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>{shopData?.status === 1 ? 'Hoạt động' : 'Tạm dừng'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày khởi tạo:</Text>
              <Text style={styles.infoValue}>
                {shopData?.createdAt ? new Date(shopData.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bảo mật</Text>
            
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => setShowChangePasswordModal(true)}
            >
              <Icon name="lock-reset" size={20} color="#009DA5" />
              <Text style={styles.changePasswordButtonText}>Đổi mật khẩu</Text>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
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

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.modalScrollContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Mật khẩu hiện tại</Text>
                  <TextInput
                    style={styles.input}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Nhập mật khẩu hiện tại"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Mật khẩu mới</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.subLabel}>Xác nhận mật khẩu mới</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Nhập lại mật khẩu mới"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  <Text style={styles.saveButtonText}>
                    {isChangingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  changePasswordButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalScrollContent: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#009DA5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingScreen;

