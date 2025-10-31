import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp, RouteProp, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { clearGlobalOrderState } from './OrderScreen';
import { getShopInfo } from '../services/AuthStore';
import { getPrinterIp, generateReceiptData, printReceipt } from '../utils/printerUtils';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedUnit: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  time: string;
  paymentMethod: string;
  totalAmount: number;
  products: Product[];
  discount: number;
  // Optional customer info
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

const InvoicePreviewScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InvoicePreview'>>();

  const { invoiceData } = route.params;
  // Customer info can come from invoiceData or separate param (fallbacks)
  const customerName = (invoiceData as any)?.customerName || (route.params as any)?.customer?.fullName || 'Khách lẻ';
  const customerPhone = (invoiceData as any)?.customerPhone || (route.params as any)?.customer?.phone || '';
  const customerEmail = (invoiceData as any)?.customerEmail || (route.params as any)?.customer?.email || '';
  const [copyCount, setCopyCount] = useState(1);

  const [shopName, setShopName] = useState<string>('Cửa hàng');
  const [shopAddress, setShopAddress] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getShopInfo().then((info) => {
      if (!mounted) return;
      if (info?.shopName) setShopName(String(info.shopName));
      if (info?.shopAddress) setShopAddress(String(info.shopAddress));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + '₫';
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    const hundreds = ['', 'một trăm', 'hai trăm', 'ba trăm', 'bốn trăm', 'năm trăm', 'sáu trăm', 'bảy trăm', 'tám trăm', 'chín trăm'];

    if (num === 0) return 'không';
    if (num < 10) return ones[num];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (ten === 1) return one === 0 ? 'mười' : `mười ${ones[one]}`;
      return one === 0 ? tens[ten] : `${tens[ten]} ${ones[one]}`;
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      if (remainder === 0) return hundreds[hundred];
      return `${hundreds[hundred]} ${numberToWords(remainder)}`;
    }
    if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      if (remainder === 0) return `${numberToWords(thousand)} nghìn`;
      return `${numberToWords(thousand)} nghìn ${numberToWords(remainder)}`;
    }
    return 'số quá lớn';
  };

  const handlePrint = async () => {
    // Get printer IP
    const printerIp = await getPrinterIp();
    
    if (!printerIp) {
      Alert.alert(
        'Chưa cấu hình máy in',
        'Vui lòng cấu hình địa chỉ IP máy in trong Cài đặt máy in trước khi in.',
        [
          { text: 'OK' }
        ]
      );
      return;
    }
    
    try {
      // Prepare invoice data with shop and customer info
      const invoicePayload = {
        ...invoiceData,
        shopName,
        shopAddress,
        customerName,
        customerPhone,
        customerEmail,
      };
      
      // Generate ESC/POS receipt data
      const receiptData = generateReceiptData(invoicePayload, copyCount);
      
      // Print receipt
      const result = await printReceipt(receiptData, printerIp);
      
      if (result.success) {
        // Clear global order state before navigating to MainApp
        clearGlobalOrderState();
        // Show success alert with button to go home
        Alert.alert(
          'In thành công',
          `Đã gửi lệnh in ${copyCount} bản hóa đơn!`,
          [
            {
              text: 'Về trang chủ',
              onPress: () => {
                // Reset navigation stack and navigate to MainApp (which defaults to TrangChu/HomeScreen tab)
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainApp' }],
                  })
                );
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Lỗi in hóa đơn',
          result.error || 'Không thể in hóa đơn. Vui lòng kiểm tra kết nối máy in.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Print error:', error);
      Alert.alert(
        'Lỗi',
        error?.message || 'Đã xảy ra lỗi khi in hóa đơn. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = () => {
    Alert.alert('Thông báo', 'Chức năng chia sẻ đang được phát triển');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Icon name="share-variant" size={20} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem trước</Text>
        <View style={styles.headerRight}>

          <TouchableOpacity onPress={handlePrint} style={styles.printButton}>
            <Text style={styles.printButtonText}>In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Copy Count */}
      <View style={styles.copyCountContainer}>
        <Text style={styles.copyCountLabel}>Số liên</Text>
        <View style={styles.copyCountControls}>
          <TouchableOpacity
            style={styles.copyCountButton}
            onPress={() => setCopyCount(Math.max(1, copyCount - 1))}
          >
            <Text style={styles.copyCountButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.copyCountValue}>{copyCount}</Text>
          <TouchableOpacity
            style={styles.copyCountButton}
            onPress={() => setCopyCount(copyCount + 1)}
          >
            <Text style={styles.copyCountButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invoice Preview */}
      <ScrollView style={styles.invoiceContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.invoice}>
          {/* Store Information */}
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{shopName || 'Cửa hàng'}</Text>
            <Text style={styles.storeAddress}>{shopAddress ? `Địa chỉ: ${shopAddress}` : 'Địa chỉ: ...'}</Text>
          </View>

          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>HÓA ĐƠN BÁN HÀNG</Text>
            <Text style={styles.invoiceNumber}>SỐ HĐ: {invoiceData.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>
              {invoiceData.time ? `${invoiceData.time} - ` : ''}ngày {invoiceData.date}
            </Text>
          </View>

          {/* Customer Information */}
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Khách hàng: {customerName}</Text>
            <Text style={styles.customerField}>SDT: {customerPhone}</Text>
            <Text style={styles.customerField}>Email: {customerEmail}</Text>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodLabel}>Phương thức thanh toán: {invoiceData.paymentMethod}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Product List Header */}
          <View style={styles.productHeader}>
            <Text style={styles.productHeaderPrice}>Đơn giá</Text>
            <Text style={styles.productHeaderQuantity}>SL</Text>
            <Text style={styles.productHeaderAmount}>Thành tiền</Text>
          </View>

          {/* Product List */}
          {invoiceData.products.map((product, index) => (
            <View key={product.id} style={styles.productItem}>
              <View style={styles.productNameContainer}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{`${formatCurrency(product.price)} / ${product.selectedUnit}`}</Text>
              </View>
              <Text style={styles.productQuantity}>{product.quantity}</Text>
              <Text style={styles.productAmount}>{formatCurrency(product.price * product.quantity)}</Text>
              {index < invoiceData.products.length - 1 && <View style={styles.productDivider} />}
            </View>
          ))}

          {/* Summary Divider */}
          <View style={styles.divider} />

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng tiền hàng:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoiceData.totalAmount + invoiceData.discount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Chiết khấu {invoiceData.discount > 0 ? Math.round((invoiceData.discount / (invoiceData.totalAmount + invoiceData.discount)) * 100) : 0}%:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoiceData.discount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng thanh toán:</Text>
              <Text style={styles.summaryTotal}>{formatCurrency(invoiceData.totalAmount)}</Text>
            </View>
            <Text style={styles.summaryWords}>({numberToWords(invoiceData.totalAmount)} đồng chẵn)</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Cảm ơn và hẹn gặp lại!</Text>
          </View>
        </View>
      </ScrollView>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    padding: 4,
  },
  printButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#009DA5',
    borderRadius: 4,
  },
  printButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  copyCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  copyCountLabel: {
    fontSize: 16,
    color: '#000',
  },
  copyCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copyCountButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  copyCountButtonText: {
    fontSize: 18,
    color: '#009DA5',
    fontWeight: 'bold',
  },
  copyCountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    minWidth: 20,
    textAlign: 'center',
  },
  invoiceContainer: {
    flex: 1,
    padding: 16,
  },
  invoice: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  storeAddress: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  storePhone: {
    fontSize: 14,
    color: '#000',
  },
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14,
    color: '#000',
  },
  customerInfo: {
    marginBottom: 16,
  },
  customerLabel: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  customerField: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  paymentMethodInfo: {
    marginBottom: 16,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 16,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productHeaderPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  productHeaderQuantity: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  productHeaderAmount: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  productItem: {
    marginBottom: 8,
  },
  productNameContainer: {
    flex: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
  },
  productQuantity: {
    position: 'absolute',
    right: 60,
    top: 0,
    fontSize: 14,
    color: '#000',
    width: 40,
    textAlign: 'center',
  },
  productAmount: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 14,
    color: '#000',
    textAlign: 'right',
    minWidth: 60,
  },
  productDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 8,
    borderStyle: 'dotted',
  },
  summary: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#000',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryWords: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#000',
    fontStyle: 'italic',
  },
});

export default InvoicePreviewScreen;
