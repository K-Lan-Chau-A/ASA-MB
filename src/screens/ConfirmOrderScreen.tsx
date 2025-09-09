import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { clearGlobalOrderState } from './OrderScreen';
import { Picker } from '@react-native-picker/picker';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  units: Array<{
    unitName: string;
    price: number;
    quantityInBaseUnit: number;
    isBaseUnit: boolean;
  }>;
  selectedUnit: string;
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'nfc_card';

const ConfirmOrderScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ConfirmOrder'>>();
  
  const { products, totalAmount: originalTotal } = route.params;
  
  // Discount states
  const [promoCode, setPromoCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  
  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  
  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [availablePromoCodes] = useState(['GIAM10', 'GIAM50K', 'WELCOME']);

  const calculateDiscount = useCallback(() => {
    if (!discountPercentage) return 0;
    
    const percentage = parseFloat(discountPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) return 0;
    
    return Math.min((originalTotal * percentage) / 100, originalTotal);
  }, [discountPercentage, originalTotal]);

  const finalTotal = originalTotal - appliedDiscount;

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã khuyến mãi');
      return;
    }
    
    // Simulate promo code validation
    const validPromoCodes: { [key: string]: number } = {
      'GIAM10': 10, // 10% discount
      'GIAM50K': 50000, // 50,000đ discount
      'WELCOME': 15, // 15% discount
    };
    
    const discount = validPromoCodes[promoCode.toUpperCase()];
    if (discount) {
      if (promoCode.toUpperCase() === 'GIAM50K') {
        setAppliedDiscount(Math.min(discount, originalTotal));
      } else {
        setAppliedDiscount(Math.min((originalTotal * discount) / 100, originalTotal));
      }
      Alert.alert('Thành công', 'Áp dụng mã khuyến mãi thành công!');
    } else {
      Alert.alert('Lỗi', 'Mã khuyến mãi không hợp lệ');
    }
  };

  const handleApplyCustomDiscount = () => {
    if (!discountPercentage.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập phần trăm giảm giá');
      return;
    }
    
    const percentage = parseFloat(discountPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      Alert.alert('Lỗi', 'Phần trăm giảm giá phải từ 1% đến 100%');
      return;
    }
    
    const discount = calculateDiscount();
    if (discount > 0) {
      setAppliedDiscount(discount);
      Alert.alert('Thành công', `Áp dụng giảm ${percentage}% thành công!`);
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập phần trăm giảm giá hợp lệ');
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(0);
    setPromoCode('');
    setDiscountPercentage('');
    setDiscountReason('');
  };

  const handlePayment = () => {
    if (finalTotal <= 0) {
      Alert.alert('Lỗi', 'Tổng thanh toán phải lớn hơn 0');
      return;
    }
    
    // Show appropriate modal based on payment method
    if (selectedPaymentMethod === 'bank_transfer') {
      setShowQRModal(true);
    } else if (selectedPaymentMethod === 'nfc_card') {
      setShowNFCModal(true);
    } else {
      // Cash payment - direct confirmation
      Alert.alert(
        'Xác nhận thanh toán',
        `Phương thức: ${getPaymentMethodName(selectedPaymentMethod)}\nTổng thanh toán: ${finalTotal.toLocaleString('vi-VN')}đ`,
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Thanh toán', 
            onPress: () => {
              setShowSuccessModal(true);
            }
          },
        ]
      );
    }
  };

  const handleQRPaymentConfirm = () => {
    setShowQRModal(false);
    setShowSuccessModal(true);
  };

  const handleNFCPaymentConfirm = () => {
    setShowNFCModal(false);
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Clear global order state before navigating to MainApp
    clearGlobalOrderState();
    // Navigate to Home screen
    navigation.navigate('MainApp');
  };

  const handlePrintInvoice = () => {
    setShowSuccessModal(false);
    // Navigate to InvoicePreview screen with invoice data
    navigation.navigate('InvoicePreview', {
      invoiceData: {
        ...invoiceData,
        discount: appliedDiscount
      }
    });
  };

  const handleGoHome = () => {
    setShowSuccessModal(false);
    // Clear global order state before navigating to MainApp
    clearGlobalOrderState();
    // Navigate to Home screen
    navigation.navigate('MainApp');
  };

  const getPaymentMethodName = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'nfc_card': return 'Thẻ thành viên NFC';
      default: return '';
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'cash';
      case 'bank_transfer': return 'bank';
      case 'nfc_card': return 'credit-card';
      default: return 'cash';
    }
  };

  // Generate invoice data
  const generateInvoiceData = () => {
    const now = new Date();
    const invoiceNumber = `HD${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
    const date = now.toLocaleDateString('vi-VN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    const time = now.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return {
      invoiceNumber,
      date,
      time,
      paymentMethod: getPaymentMethodName(selectedPaymentMethod),
      totalAmount: finalTotal,
      products: products
    };
  };

  const invoiceData = generateInvoiceData();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            navigation.goBack();
          }}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác nhận đơn hàng</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
          {products.map((product, index) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productUnit}>{product.selectedUnit}</Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productQuantity}>x{product.quantity}</Text>
                <Text style={styles.productPrice}>
                  {(product.price * product.quantity).toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total Amount */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TỔNG TIỀN HÀNG:</Text>
            <Text style={styles.totalAmount}>{originalTotal.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Discount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giảm giá / Khuyến mãi</Text>
          
          {/* Promo Code */}
          <View style={styles.promoSection}>
            <View style={styles.promoHeader}>
              <Icon name="ticket-percent" size={20} color="#009DA5" />
              <Text style={styles.promoTitle}>Mã khuyến mãi</Text>
            </View>
            <View style={styles.discountRow}>
              <Picker
                selectedValue={promoCode}
                style={styles.promoInput}
                onValueChange={(itemValue: string) => setPromoCode(itemValue)}
              >
                <Picker.Item label="Chọn mã khuyến mãi" value="" />
                {availablePromoCodes.map((code) => (
                  <Picker.Item key={code} label={code} value={code} />
                ))}
              </Picker>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyPromoCode}>
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Custom Discount */}
          <View style={styles.customDiscountSection}>
            <View style={styles.promoHeader}>
              <Icon name="percent" size={20} color="#009DA5" />
              <Text style={styles.promoTitle}>Giảm giá theo %</Text>
            </View>
            
            <View style={styles.percentageInputContainer}>
              <View style={styles.percentageInputWrapper}>
                <TextInput
                  style={styles.percentageInput}
                  placeholder="0"
                  value={discountPercentage}
                  onChangeText={setDiscountPercentage}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholderTextColor="#999"
                />
                <Text style={styles.percentageSymbol}>%</Text>
              </View>
              <TextInput
                style={styles.reasonInput}
                placeholder="Lý do giảm giá (tùy chọn)"
                value={discountReason}
                onChangeText={setDiscountReason}
                placeholderTextColor="#999"
              />
            </View>
            
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustomDiscount}>
              <Icon name="check" size={16} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Áp dụng giảm giá</Text>
            </TouchableOpacity>
          </View>

          {/* Applied Discount */}
          {appliedDiscount > 0 && (
            <View style={styles.appliedDiscountContainer}>
              <View style={styles.appliedDiscountHeader}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.appliedDiscountTitle}>Giảm giá đã áp dụng</Text>
              </View>
              <View style={styles.appliedDiscountRow}>
                <Text style={styles.appliedDiscountLabel}>Số tiền giảm:</Text>
                <Text style={styles.appliedDiscountAmount}>-{appliedDiscount.toLocaleString('vi-VN')}đ</Text>
              </View>
              {discountReason && (
                <Text style={styles.discountReasonText}>Lý do: {discountReason}</Text>
              )}
              <TouchableOpacity style={styles.removeDiscountButton} onPress={handleRemoveDiscount}>
                <Icon name="close-circle" size={16} color="#FF6B6B" />
                <Text style={styles.removeDiscountText}>Xóa giảm giá</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Final Total */}
        <View style={styles.finalTotalSection}>
          <View style={styles.finalTotalRow}>
            <Text style={styles.finalTotalLabel}>TỔNG THANH TOÁN:</Text>
            <Text style={styles.finalTotalAmount}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentMethodItem,
              selectedPaymentMethod === 'cash' && styles.paymentMethodItemSelected
            ]}
            onPress={() => setSelectedPaymentMethod('cash')}
          >
            <View style={styles.paymentMethodLeft}>
              <Icon name="cash" size={24} color="#009DA5" />
              <Text style={styles.paymentMethodText}>Tiền mặt</Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedPaymentMethod === 'cash' && styles.radioButtonSelected
            ]}>
              {selectedPaymentMethod === 'cash' && (
                <Icon name="check" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodItem,
              selectedPaymentMethod === 'bank_transfer' && styles.paymentMethodItemSelected
            ]}
            onPress={() => setSelectedPaymentMethod('bank_transfer')}
          >
            <View style={styles.paymentMethodLeft}>
              <Icon name="bank" size={24} color="#009DA5" />
              <Text style={styles.paymentMethodText}>Chuyển khoản</Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedPaymentMethod === 'bank_transfer' && styles.radioButtonSelected
            ]}>
              {selectedPaymentMethod === 'bank_transfer' && (
                <Icon name="check" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodItem,
              selectedPaymentMethod === 'nfc_card' && styles.paymentMethodItemSelected
            ]}
            onPress={() => setSelectedPaymentMethod('nfc_card')}
          >
            <View style={styles.paymentMethodLeft}>
              <Icon name="credit-card" size={24} color="#009DA5" />
              <Text style={styles.paymentMethodText}>Thẻ thành viên NFC</Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedPaymentMethod === 'nfc_card' && styles.radioButtonSelected
            ]}>
              {selectedPaymentMethod === 'nfc_card' && (
                <Icon name="check" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => {
            clearGlobalOrderState();
            navigation.navigate('MainApp');
          }}>
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <Text style={styles.payButtonText}>Đồng ý</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Payment Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quét mã để thanh toán</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              <View style={styles.vietqrHeader}>
                <Text style={styles.vietqrText}>VIETQR</Text>
                <View style={styles.vietqrBadge}>
                  <Text style={styles.vietqrBadgeText}>CHÍNH THỨC</Text>
                </View>
              </View>
              
              <View style={styles.qrCodeWrapper}>
                <View style={styles.qrCodePlaceholder}>
                  <View style={styles.qrCodeGrid}>
                    {Array.from({ length: 25 }, (_, i) => (
                      <View key={i} style={[styles.qrCodeDot, { opacity: Math.random() > 0.3 ? 1 : 0.3 }]} />
                    ))}
                  </View>
                  <View style={styles.qrCodeOverlay}>
                    <View style={styles.qrCodeVContainer}>
                      <Text style={styles.qrCodeV}>V</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.paymentLogos}>
                <View style={styles.logoItem}>
                  <Text style={styles.logoText}>napas 247</Text>
                </View>
                <View style={styles.logoItem}>
                  <Text style={styles.logoText}>VietinBank</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalTotalSection}>
              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Tổng cộng:</Text>
                <Text style={styles.modalTotalAmount}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleQRPaymentConfirm}>
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmButtonText}>Xác nhận thanh toán</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowQRModal(false)}>
                <Text style={styles.modalCancelButtonText}>Hủy bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NFC Payment Modal */}
      <Modal
        visible={showNFCModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNFCModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nfcModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đợi quét NFC</Text>
              <TouchableOpacity onPress={() => setShowNFCModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.nfcContent}>
              <Text style={styles.readyToScanText}>Sẵn sàng quét</Text>
              
              <View style={styles.nfcIconContainer}>
                <View style={styles.nfcOuterRing}>
                  <View style={styles.nfcMiddleRing}>
                    <View style={styles.nfcIconCircle}>
                      <Icon name="cellphone-nfc" size={50} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
                <View style={styles.nfcPulseRing} />
              </View>
              
              <Text style={styles.nfcInstructionText}>Đưa thiết bị gần thẻ NFC để thanh toán</Text>
              <Text style={styles.nfcSubText}>Đảm bảo NFC đã được bật trên thiết bị</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleNFCPaymentConfirm}>
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmButtonText}>Xác nhận thanh toán</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowNFCModal(false)}>
                <Text style={styles.modalCancelButtonText}>Hủy bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Payment Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Icon name="check" size={32} color="#FFFFFF" />
              </View>
            </View>
            
            {/* Success Title */}
            <Text style={styles.successTitle}>Thanh toán thành công</Text>
            
            {/* Invoice Summary */}
            <View style={styles.invoiceSummaryContainer}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Hóa đơn:</Text>
                <Text style={styles.invoiceValue}>{invoiceData.invoiceNumber}</Text>
              </View>
              
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Ngày:</Text>
                <Text style={styles.invoiceValue}>{invoiceData.date}</Text>
              </View>
              
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Thời gian:</Text>
                <Text style={styles.invoiceValue}>{invoiceData.time}</Text>
              </View>
              
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Phương thức thanh toán:</Text>
                <Text style={styles.invoiceValue}>{invoiceData.paymentMethod}</Text>
              </View>
              
              <View style={styles.invoiceDivider} />
              
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Số tiền:</Text>
                <Text style={styles.invoiceAmount}>{invoiceData.totalAmount.toLocaleString('vi-VN')} VNĐ</Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.successModalButtons}>
              <TouchableOpacity style={styles.printButton} onPress={handlePrintInvoice}>
                <Icon name="printer" size={20} color="#666" />
                <Text style={styles.printButtonText}>In hóa đơn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
                <Icon name="home" size={20} color="#666" />
                <Text style={styles.homeButtonText}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  productUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productDetails: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    color: '#009DA5',
    fontWeight: 'bold',
    marginTop: 2,
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#009DA5',
  },
  promoSection: {
    marginBottom: 20,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    backgroundColor: '#FAFAFA',
  },
  applyButton: {
    backgroundColor: '#009DA5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  customDiscountSection: {
    marginTop: 8,
  },
  percentageInputContainer: {
    marginBottom: 16,
  },
  percentageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  percentageInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  percentageSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#009DA5',
    marginLeft: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  appliedDiscountContainer: {
    backgroundColor: '#F8FFF8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedDiscountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appliedDiscountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  appliedDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appliedDiscountLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  appliedDiscountAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  discountReasonText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  removeDiscountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  removeDiscountText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '500',
  },
  finalTotalSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#009DA5',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  finalTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#009DA5',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  paymentMethodItemSelected: {
    backgroundColor: '#F0F9FA',
    borderColor: '#009DA5',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#009DA5',
    borderColor: '#009DA5',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerButtons: {
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    padding: 20,
    alignItems: 'center',
  },
  nfcModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  vietqrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  vietqrText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC143C',
  },
  vietqrBadge: {
    backgroundColor: '#DC143C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vietqrBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  qrCodeWrapper: {
    marginBottom: 16,
  },
  qrCodePlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 120,
    height: 120,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  qrCodeDot: {
    width: 8,
    height: 8,
    backgroundColor: '#000',
    borderRadius: 1,
  },
  qrCodeOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  qrCodeVContainer: {
    backgroundColor: '#DC143C',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  qrCodeV: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentLogos: {
    flexDirection: 'row',
    gap: 24,
  },
  logoItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  logoText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  modalTotalSection: {
    width: '100%',
    marginBottom: 20,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009DA5',
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#009DA5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  
  // NFC Modal Styles
  nfcContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  readyToScanText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#009DA5',
    marginBottom: 30,
  },
  nfcIconContainer: {
    marginBottom: 30,
    position: 'relative',
  },
  nfcOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E8F8F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#009DA5',
  },
  nfcMiddleRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#009DA5',
  },
  nfcIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#009DA5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#009DA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nfcPulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#009DA5',
    opacity: 0.3,
  },
  nfcInstructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  nfcSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Success Modal Styles
  successModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  invoiceSummaryContainer: {
    width: '100%',
    marginBottom: 24,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  invoiceValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
    borderStyle: 'dashed',
  },
  invoiceAmount: {
    fontSize: 16,
    color: '#009DA5',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  successModalButtons: {
    width: '100%',
    gap: 12,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  printButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  homeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default ConfirmOrderScreen;
