import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const ScannerScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<string>('not-determined');
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  
  // Sử dụng useCameraDevice thay vì useCameraDevices
  const device = useCameraDevice('back');

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
    
    // Xác định loại mã dựa trên type
    const getCodeTypeDisplay = (type: string) => {
      switch (type) {
        case 'qr': return '🔲 QR Code';
        case 'ean-13': return '📊 EAN-13';
        case 'ean-8': return '📊 EAN-8';
        case 'code-128': return '📋 Code-128';
        case 'code-39': return '📋 Code-39';
        case 'code-93': return '📋 Code-93';
        case 'upc-a': return '🏷️ UPC-A';
        case 'upc-e': return '🏷️ UPC-E';
        case 'codabar': return '📝 Codabar';
        default: return '📱 Barcode';
      }
    };

    const codeTypeDisplay = codeType ? getCodeTypeDisplay(codeType) : '📱 Barcode';
    
    Alert.alert(
      'Kết quả quét mã',
      `${codeTypeDisplay}\n\nMã: ${code}\n\nLoại: ${codeType || 'Unknown'}`,
      [
        { 
          text: 'Quét lại', 
          style: 'cancel',
          onPress: () => {
            setIsScanning(true);
          }
        },
        { 
          text: 'Sao chép', 
          onPress: () => {
            console.log('📱 Copied code:', code);
            // Có thể thêm Clipboard.setString(code) nếu cần
            setIsScanning(true);
          }
        },
        { 
          text: 'Đóng', 
          onPress: () => navigation.goBack() 
        },
      ]
    );
  }, [navigation]);

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
            onPress={() => handleBarCodeScanned('TEST_QR_CODE_1', 'qr')}
          >
            <Text style={styles.testButtonText}>Test QR Code #1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('TEST_QR_CODE_2', 'ean-13')}
          >
            <Text style={styles.testButtonText}>Test QR Code #2</Text>
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
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        enableZoomGesture
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          {isScanning && (
            <View style={styles.scanningIndicator}>
              <Text style={styles.scanningText}>📱 Đang quét...</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.bottomContent}>
        <Text style={styles.instructions}>
          Đặt mã vạch hoặc QR code vào trong khung để quét
          {'\n'}Hỗ trợ: QR, EAN-13/8, Code-128/39/93, UPC-A/E, Codabar
        </Text>
        {!isScanning && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => setIsScanning(true)}
          >
            <Text style={styles.rescanButtonText}>Quét lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#009DA5',
    backgroundColor: 'transparent',
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
});

export default ScannerScreen;
