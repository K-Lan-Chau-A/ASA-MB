import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { RootStackParamList } from '../types/navigation';
import { navigateIfAuthorized } from '../utils/navigationGuard';
import API_URL from '../config/api';

const ScannerScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Scanner'>>();
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<string>('not-determined');
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  
  // Animation cho scan line
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  
  // Sử dụng useCameraDevice thay vì useCameraDevices
  const device = useCameraDevice('back');

  // Animation functions
  const startScanLineAnimation = useCallback(() => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [scanLineAnim]);

  const stopScanLineAnimation = useCallback(() => {
    scanLineAnim.stopAnimation();
  }, [scanLineAnim]);

  // Code scanner để quét barcode/QR code
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'codabar', 'upc-a', 'upc-e'],
    onCodeScanned: (codes) => {
      if (!isScanning) return;
      
      if (codes.length > 0) {
        setIsScanning(false);
        const scannedCode = codes[0];
        console.log('📱 Scanned code:', scannedCode.value, 'Type:', scannedCode.type);
        
        // Quét tất cả loại mã, không hardcode
        handleBarCodeScanned(scannedCode.value || 'Unknown', scannedCode.type);
      }
    }
  });

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    // Kiểm tra xem device đã sẵn sàng chưa
    console.log('📸 Camera device:', device ? 'Available' : 'Not available');
    if (device !== undefined) {
      setIsLoadingDevice(false);
    }
  }, [device]);

  // Animation cho scan line
  useEffect(() => {
    if (isScanning) {
      startScanLineAnimation();
    } else {
      stopScanLineAnimation();
    }
  }, [isScanning, startScanLineAnimation, stopScanLineAnimation]);

  const checkCameraPermission = async () => {
    try {
      console.log('📸 Checking camera permission...');
      
      if (Platform.OS === 'android') {
        const result = await request(PERMISSIONS.ANDROID.CAMERA);
        console.log('📸 Android camera permission result:', result);
        setHasPermission(result);
      } else {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        console.log('📸 iOS camera permission result:', result);
        setHasPermission(result);
      }
    } catch (error) {
      console.error('📸 Error checking camera permission:', error);
      setHasPermission('denied');
    }
  };

  const requestCameraPermission = async () => {
    await checkCameraPermission();
  };

  const handleBarCodeScanned = useCallback((code: string, codeType?: string) => {
    console.log('📱 Barcode scanned:', code, 'Type:', codeType);
    
    const returnScreen = route.params?.returnScreen;
    
    if (returnScreen === 'AddProduct') {
      // Navigate back to AddProduct screen with barcode
      console.log('📱 Returning to AddProduct with barcode:', code);
      navigateIfAuthorized(navigation, 'AddProduct', { buildUrl: (sid) => `${API_URL}/api/categories?ShopId=${sid}&page=1&pageSize=1` }, { barcode: code });
    } else if (returnScreen === 'Products') {
      // Navigate back to Products screen with barcode
      console.log('📱 Returning to Products screen with barcode:', code);
      // Store barcode in global state for ProductsScreen to pick up
      (global as any).__scannedBarcodeForProducts = code;
      navigation.goBack();
    } else {
      // Default: Go back to OrderScreen với mã đã quét (includes Order and undefined cases)
      console.log('📱 Automatically adding product to order:', code);
      
      // Sử dụng navigate với merge: true để preserve existing params
      navigation.navigate('Order', { 
        scannedProduct: { barcode: code, type: codeType },
        // Thêm timestamp để đảm bảo useEffect trigger
        scanTimestamp: Date.now()
      });
    }
  }, [navigation, route.params?.returnScreen]);

  const EmulatorTestScreen = () => (
    <View style={styles.container}>
      <View style={styles.emulatorContent}>
        <Text style={styles.emulatorText}>
          Bạn đang chạy trên Emulator{'\n'}
          Đây là giao diện test
        </Text>
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('1234567890123', 'ean-13')}
          >
            <Text style={styles.testButtonText}>Test Coca Cola (Có sẵn)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('9999999999999', 'ean-13')}
          >
            <Text style={styles.testButtonText}>Test Sản phẩm mới (Chưa có)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('8993175535878', 'ean-13')}
          >
            <Text style={styles.testButtonText}>Test Nabati (Có sẵn)</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // Nếu đang chờ load device hoặc xin quyền
  if (isLoadingDevice) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  // Nếu chạy trên emulator hoặc không có device (PC không có camera)
  if (Platform.OS === 'android' && !device) {
    return <EmulatorTestScreen />;
  }

  // Nếu không có quyền camera
  if (hasPermission !== RESULTS.GRANTED) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Chưa được cấp quyền camera</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Cấp quyền camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Nếu device chưa sẵn sàng
  if (!device) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Camera không khả dụng</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera thật
  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        enableZoomGesture
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          {/* Corner indicators */}
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
          
          {isScanning && (
            <Animated.View 
              style={[
                styles.scanLine,
                {
                  top: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={[styles.bottomContent, { bottom: (insets.bottom || 0) + 24 }] }>
        <Text style={styles.instructions}>
          Căn chỉnh mã vạch vào giữa khung quét
        </Text>
        {!isScanning && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => {
              setIsScanning(true);
              startScanLineAnimation();
            }}
          >
            <Text style={styles.rescanButtonText}>Quét lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  loading: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 300,
    height: 150,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  emulatorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emulatorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  testButtons: { width: '100%', gap: 15 },
  testButton: {
    backgroundColor: '#009DA5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  permissionButton: {
    backgroundColor: '#009DA5',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanningIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  scanningText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  rescanButton: {
    backgroundColor: '#009DA5',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#009DA5',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#009DA5',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#009DA5',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#009DA5',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#009DA5',
    shadowColor: '#009DA5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default ScannerScreen;
