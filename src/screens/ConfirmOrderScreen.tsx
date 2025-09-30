import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { clearGlobalOrderState } from './OrderScreen';
import { Picker } from '@react-native-picker/picker';
import API_URL from '../config/api';
import { getAuthToken, getShopId, getShiftId } from '../services/AuthStore';
import Tts from 'react-native-tts';

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
    productUnitId?: number;
    unitId?: number;
  }>;
  selectedUnit: string;
  imageUrl?: string;
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'nfc_card';

const ConfirmOrderScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ConfirmOrder'>>();
  
  const { products, totalAmount: originalTotal } = route.params;
  const selectedCustomerId = (route.params as any)?.customerId ?? (route.params as any)?.customer?.id ?? null;
  const [customerInfo, setCustomerInfo] = useState<{ id: number; fullName?: string; phone?: string; email?: string } | null>((route.params as any)?.customer ?? null);
  
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
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrData, setQrData] = useState<{ url: string; amount: number; orderId: number } | null>(null);
  const qrPollTimer = useRef<NodeJS.Timeout | null>(null);

  type Voucher = { voucherId: number; code: string; type: number; value: number; expired: string };
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);

  useEffect(() => {
    const loadVouchers = async () => {
      try {
        setLoadingVouchers(true);
        const shopId = (await getShopId()) ?? 0;
        const token = await getAuthToken();
        const res = await fetch(`${API_URL}/api/vouchers?ShopId=${shopId}&page=1&pageSize=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const now = new Date();
        const mapped: Voucher[] = items.map((v: any) => ({
          voucherId: Number(v.voucherId ?? v.id ?? 0),
          code: String(v.code ?? ''),
          type: Number(v.type ?? 1),
          value: Number(v.value ?? 0),
          expired: String(v.expired ?? ''),
        })).filter(v => {
          try { return new Date(v.expired) >= now; } catch { return false; }
        });
        setVouchers(mapped);
      } catch {
        setVouchers([]);
      } finally {
        setLoadingVouchers(false);
      }
    };
    loadVouchers();
  }, []);

  // Ensure we have fresh customer info if only ID is provided
  useEffect(() => {
    const run = async () => {
      try {
        if (!customerInfo && selectedCustomerId && selectedCustomerId > 0) {
          const shopId = (await getShopId()) ?? 0;
          const token = await getAuthToken();
          const res = await fetch(`${API_URL}/api/customers/${selectedCustomerId}?ShopId=${shopId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const data = await res.json().catch(() => ({}));
          const c: any = data?.data || data || {};
          const idNum = Number(c?.customerId ?? c?.id ?? selectedCustomerId);
          setCustomerInfo({
            id: idNum,
            fullName: String(c?.fullName ?? ''),
            phone: c?.phone ? String(c.phone) : undefined,
            email: c?.email ? String(c.email) : undefined,
          });
        }
      } catch {}
    };
    run();
  }, [selectedCustomerId, customerInfo]);

  const calculateDiscount = useCallback(() => {
    if (!discountPercentage) return 0;
    
    const percentage = parseFloat(discountPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) return 0;
    
    return Math.min((originalTotal * percentage) / 100, originalTotal);
  }, [discountPercentage, originalTotal]);

  const finalTotal = originalTotal - appliedDiscount;

  const mapPaymentMethodToCode = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return 1;
      case 'bank_transfer':
        return 2;
      case 'nfc_card':
        return 3;
      default:
        return 1;
    }
  };

  const resolveProductUnitId = async (shopId: number, productId: string, selectedUnitName: string, token: string | null): Promise<number> => {
    // First, try to read from provided product units (coming from OrderScreen)
    try {
      const prod = (products as any[]).find((pr: any) => String(pr.id) === String(productId));
      const fromLocal = (prod?.units as any[])?.find((u: any) => String(u.unitName).trim().toLowerCase() === String(selectedUnitName).trim().toLowerCase());
      const localId = Number((fromLocal as any)?.productUnitId ?? 0);
      if (Number.isFinite(localId) && localId > 0) return localId;
    } catch {}
    try {
      const res = await fetch(`${API_URL}/api/product-units?ShopId=${shopId}&ProductId=${productId}&page=1&pageSize=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const found = items.find((u: any) => {
        const name = String(u.unitName ?? u.name ?? '').trim();
        return name.toLowerCase() === String(selectedUnitName).trim().toLowerCase();
      });
      if (found) {
        const id = Number(found?.id ?? found?.productUnitId ?? 0);
        if (Number.isFinite(id) && id > 0) return id;
      }
      // Fallback to base unit (conversionFactor === 1)
      const base = items.find((u: any) => Number(u.conversionFactor ?? 0) === 1) || items[0];
      const baseId = Number(base?.id ?? base?.productUnitId ?? 0);
      return Number.isFinite(baseId) && baseId > 0 ? baseId : 0;
    } catch {
      return 0;
    }
  };

  const submitOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      const shopId = (await getShopId()) ?? 0;
      const shiftId = (await getShiftId()) ?? 0;
      try { console.log('[CreateOrder] shopId', shopId, 'shiftId', shiftId, 'hasToken', Boolean(token)); } catch {}

      const orderDetails = await Promise.all(products.map(async (p) => {
        const productUnitId = await resolveProductUnitId(shopId, p.id, p.selectedUnit, token);
        try {
          console.log('[OrderDetail] productId', p.id, 'selectedUnit', p.selectedUnit, 'productUnitId', productUnitId, 'quantity', p.quantity);
        } catch {}
        return {
          quantity: Number(p.quantity ?? 0),
          productUnitId: Number(productUnitId ?? 0),
          productId: Number(p.id),
        };
      }));

      // Validate productUnitId resolution
      if (orderDetails.some(d => !d.productUnitId || d.productUnitId === 0)) {
        Alert.alert('Lỗi', 'Không xác định được đơn vị bán cho một số sản phẩm (không có đơn vị khả dụng).');
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        paymentMethod: mapPaymentMethodToCode(selectedPaymentMethod),
        // Mark order as successful (1) upon creation; payment flow handled client-side
        status: 1,
        shiftId: shiftId,
        shopId: shopId,
        // Explicitly send final totals to backend for correct aggregation
        totalPrice: Math.max(0, Math.round(finalTotal)),
        amountPaid: Math.max(0, Math.round(finalTotal)),
        // If voucher selected, send voucherId and no direct discount; else send discount amount
        ...(selectedVoucherId ? { voucherId: selectedVoucherId, discount: 0 } : { discount: appliedDiscount > 0 ? Number(appliedDiscount) : 0 }),
        note: (promoCode || discountReason) ? [promoCode ? `Mã: ${promoCode}` : '', discountReason ? `Lý do: ${discountReason}` : ''].filter(Boolean).join(' | ') : null,
        orderDetails,
        ...(selectedCustomerId ? { customerId: Number(selectedCustomerId) } : {}),
      };

      try {
        console.log('[CreateOrder] payload.shopId', payload.shopId, 'paymentMethod', payload.paymentMethod, 'status', payload.status);
        console.log('[CreateOrder] payload.orderDetails', payload.orderDetails);
      } catch {}

      // Only include optional fields if provided
      // customerId and voucherId intentionally omitted unless available in future

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        try { console.log('[CreateOrder] HTTP', res.status, msg); } catch {}
        throw new Error(msg || 'Tạo đơn hàng thất bại');
      }

      // Read created order and proceed to success
      let data: any = null;
      try { data = await res.json(); } catch (e) {
        try { const txt = await res.text(); console.log('[CreateOrder] non-JSON response', txt); } catch {}
      }
      // Handle envelope { success, message, data: {...} }
      const envelope = data && typeof data === 'object' && 'data' in data ? data.data : data;
      if (envelope && typeof envelope.orderId !== 'undefined' && Number(envelope.orderId) > 0) {
        try { console.log('[CreateOrder] created orderId', envelope.orderId); } catch {}
        setCreatedOrder(envelope);
        
        // Show appropriate modal based on payment method
        if (selectedPaymentMethod === 'bank_transfer') {
          // Fetch QR code and show QR modal
          await fetchQRCode(Number(envelope.orderId));
          return; // Don't show success modal yet
        } else if (selectedPaymentMethod === 'nfc_card') {
          // Show NFC modal
          setShowNFCModal(true);
          return; // Don't show success modal yet
        } else {
          // Cash payment - show success modal
          // Verify it appears in list
          try {
            const verifyRes = await fetch(`${API_URL}/api/orders?ShopId=${shopId}&page=1&pageSize=100`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const verifyData = await verifyRes.json();
            const verifyItems: any[] = Array.isArray(verifyData?.items) ? verifyData.items : Array.isArray(verifyData) ? verifyData : [];
            const found = verifyItems.some((o: any) => Number(o.orderId ?? o.id) === Number(envelope.orderId));
            console.log('[CreateOrder] verification in list:', found);
          } catch {}
          setShowSuccessModal(true);
        }
      } else {
        try { console.log('[CreateOrder] response missing orderId', data); } catch {}
        Alert.alert('Lỗi', 'Tạo đơn không trả về orderId. Vui lòng thử lại.');
        setCreatedOrder(null);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể tạo đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập mã khuyến mãi'); return; }
    const v = vouchers.find(v => v.code.toUpperCase() === promoCode.trim().toUpperCase());
    if (!v) { Alert.alert('Lỗi', 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn'); return; }
    applyVoucher(v);
  };

  const applyVoucher = (v: Voucher) => {
    if (!v) return;
    setPromoCode(v.code);
    setSelectedVoucherId(Number(v.voucherId || 0) || null);
    if (v.type === 2) {
      const pct = Number(v.value || 0);
      const discount = Math.min((originalTotal * pct) / 100, originalTotal);
      setAppliedDiscount(discount);
    } else {
      const amt = Number(v.value || 0);
      const discount = Math.min(amt, originalTotal);
      setAppliedDiscount(discount);
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
    setSelectedVoucherId(null);
  };

  const handlePayment = () => {
    if (finalTotal <= 0) {
      Alert.alert('Lỗi', 'Tổng thanh toán phải lớn hơn 0');
      return;
    }
    
    // For all payment methods, create order first, then show appropriate modal
    if (selectedPaymentMethod === 'bank_transfer') {
      // Immediately open QR modal with spinner, then create order and load QR
      setShowQRModal(true);
      setQrData(null);
      submitOrder();
    } else if (selectedPaymentMethod === 'nfc_card') {
      // Create order first, then show NFC modal
      submitOrder();
    } else {
      // Cash payment - direct confirmation
      Alert.alert(
        'Xác nhận thanh toán',
        `Phương thức: ${getPaymentMethodName(selectedPaymentMethod)}\nTổng thanh toán: ${finalTotal.toLocaleString('vi-VN')}đ`,
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Thanh toán', 
            onPress: submitOrder
          },
        ]
      );
    }
  };

  const handleQRPaymentConfirm = async () => {
    if (isSubmitting) return;
    // Deprecated: no manual confirm
  };

  const fetchQRCode = async (orderId: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/sepay/vietqr?orderId=${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data?.success && data?.url) {
        try { console.log('[VietQR] url', data.url, 'amount', data.amount, 'orderId', data.orderId ?? orderId); } catch {}
        setQrData({ url: data.url, amount: data.amount || 0, orderId: data.orderId || orderId });
        setShowQRModal(true);
        try { console.log('[VietQR] modal opened'); } catch {}
        // start polling order status until paid
        startPollOrderPaidStatus(data.orderId || orderId);
      } else {
        throw new Error(data?.message || 'Không thể tạo mã QR');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể tạo mã QR thanh toán');
    }
  };

  const handleNFCPaymentConfirm = async () => {
    if (isSubmitting) return;
    // Deprecated: waiting for NFC confirm logic
  };

  const handleSuccessModalClose = () => {
    // stop polling if any
    if (qrPollTimer.current) {
      clearInterval(qrPollTimer.current);
      qrPollTimer.current = null;
    }
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
        ...(invoiceData as any),
        discount: appliedDiscount,
        customerName: customerInfo?.fullName,
        customerPhone: customerInfo?.phone,
        customerEmail: customerInfo?.email,
      } as any
    });
  };

  const handleGoHome = () => {
    if (qrPollTimer.current) {
      clearInterval(qrPollTimer.current);
      qrPollTimer.current = null;
    }
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

  // Generate invoice data (prefer backend-created order when available)
  const generateInvoiceData = () => {
    if (createdOrder && typeof createdOrder.orderId !== 'undefined') {
      const createdAtStr = String(createdOrder.createdAt ?? createdOrder.datetime ?? new Date().toISOString());
      const dt = new Date(createdAtStr);
      const date = dt.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
      const time = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      // Prefer local finalTotal when có giảm giá, vì backend có thể chưa phản ánh ngay
      const resolvedTotal = appliedDiscount > 0
        ? finalTotal
        : Number(createdOrder.totalPrice ?? finalTotal);
      return {
        invoiceNumber: `#${createdOrder.orderId}`,
        date,
        time,
        paymentMethod: getPaymentMethodName(selectedPaymentMethod),
        totalAmount: resolvedTotal,
        products: products,
      };
    }
    const now = new Date();
    const invoiceNumber = `HD${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
    const date = now.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return {
      invoiceNumber,
      date,
      time,
      paymentMethod: getPaymentMethodName(selectedPaymentMethod),
      totalAmount: finalTotal,
      products: products,
    };
  };

  const invoiceData = generateInvoiceData();

  // Speak when success modal is shown
  useEffect(() => {
    if (showSuccessModal) {
      // Always use latest computed total including discount
      const amountNumber = Number((invoiceData && invoiceData.totalAmount) ? invoiceData.totalAmount : finalTotal) || 0;
      const text = `Thanh toán thành công ${amountNumber.toLocaleString('vi-VN')} đồng`;
      (async () => {
        try {
          try { await Tts.setDefaultLanguage('vi-VN'); } catch {}
          await Tts.stop();
          await Tts.speak(text);
        } catch {}
      })();
    } else {
      try { Tts.stop(); } catch {}
    }
  }, [showSuccessModal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { Tts.stop(); } catch {}
    };
  }, []);

  const startPollOrderPaidStatus = async (orderId: number) => {
    if (!orderId) return;
    // clear any existing poller
    if (qrPollTimer.current) {
      clearInterval(qrPollTimer.current);
      qrPollTimer.current = null;
    }
    const token = await getAuthToken();
    const shopId = (await getShopId()) ?? 0;
    const poll = async () => {
      try {
        console.log('[VietQR][poll] checking orderId', orderId, 'shopId', shopId);
        const res = await fetch(`${API_URL}/api/orders?ShopId=${shopId}&page=1&pageSize=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (!res.ok) {
          console.log('[VietQR][poll] HTTP error', res.status, res.statusText);
          return;
        }
        
        const json = await res.json();
        console.log('[VietQR][poll] response', json);
        const items: any[] = Array.isArray(json?.items) ? json.items : [];
        const order = items.find((o: any) => Number(o.orderId) === Number(orderId));
        console.log('[VietQR][poll] found order', order);
        
        if (order && Number(order.status) === 1) {
          // paid → stop polling and close QR, open success
          console.log('[VietQR][poll] order paid, closing QR modal');
          if (qrPollTimer.current) {
            clearInterval(qrPollTimer.current);
            qrPollTimer.current = null;
          }
          setShowQRModal(false);
          setShowSuccessModal(true);
        }
      } catch (e) {
        console.log('[VietQR][poll] error', e);
      }
    };
    // run immediately once, then interval every 1 second
    await poll();
    qrPollTimer.current = setInterval(poll, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
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

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khách hàng</Text>
          <View style={styles.customerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerInfo?.fullName || 'Khách lẻ'}</Text>
              {!!(customerInfo?.phone || customerInfo?.email) && (
                <View style={styles.customerMetaRow}>
                  {!!customerInfo?.phone && (
                    <View style={styles.customerMetaItem}>
                      <Icon name="phone" size={14} color="#666" />
                      <Text style={styles.customerMetaText}>{customerInfo.phone}</Text>
                    </View>
                  )}
                  {!!customerInfo?.email && (
                    <View style={styles.customerMetaItem}>
                      <Icon name="email" size={14} color="#666" />
                      <Text style={styles.customerMetaText}>{customerInfo.email}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {loadingVouchers ? (
                <View style={{ paddingVertical: 8 }}><ActivityIndicator color="#009DA5" /></View>
              ) : vouchers.length === 0 ? (
                <View style={styles.voucherChipDisabled}><Text style={styles.voucherChipTextDisabled}>Không có voucher khả dụng</Text></View>
              ) : (
                vouchers.map(v => {
                  const active = promoCode.trim().toUpperCase() === v.code.toUpperCase();
                  return (
                    <TouchableOpacity key={v.voucherId} style={[styles.voucherChip, active && styles.voucherChipActive]} onPress={() => applyVoucher(v)}>
                      <Text style={[styles.voucherCode, active && styles.voucherCodeActive]}>{v.code}</Text>
                      <Text style={[styles.voucherValue, active && styles.voucherValueActive]}>{v.type === 2 ? `${v.value}%` : `${Number(v.value).toLocaleString('vi-VN')}đ`}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
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
                placeholder="Lý do giảm giá"
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
          <TouchableOpacity style={[styles.payButton, isSubmitting && { opacity: 0.7 }]} onPress={handlePayment} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>Đồng ý</Text>
            )}
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
              <View style={styles.qrCodeWrapper}>
                {qrData?.url ? (
                  <Image
                    source={{ uri: qrData.url }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.qrCodePlaceholder, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#009DA5" />
                    <Text style={{ marginTop: 12, color: '#666' }}>Đang tạo mã QR...</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.modalTotalSection}>
              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Tổng cộng:</Text>
                <Text style={styles.modalTotalAmount}>{(qrData?.amount || finalTotal).toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
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
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerName: { fontSize: 16, color: '#000', fontWeight: '600' },
  customerMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  customerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerMetaText: { fontSize: 12, color: '#666' },
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
  voucherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  voucherChipActive: { backgroundColor: '#F0F9FA', borderColor: '#009DA5' },
  voucherCode: { fontSize: 12, fontWeight: '700', color: '#999' },
  voucherValue: { fontSize: 12, fontWeight: '700', color: '#999' },
  voucherCodeActive: { color: '#009DA5' },
  voucherValueActive: { color: '#009DA5' },
  voucherChipDisabled: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5' },
  voucherChipTextDisabled: { fontSize: 12, color: '#999' },
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
  qrCodeImage: {
    width: 300,
    height: 300,
    borderRadius: 12,
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