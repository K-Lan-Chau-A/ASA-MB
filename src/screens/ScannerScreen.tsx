import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const ScannerScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<string>('not-determined');
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const devices = useCameraDevices();
  const device = devices.back;

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    if (device) {
      setIsLoadingDevice(false);
    }
  }, [device]);

  const checkCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const result = await request(PERMISSIONS.ANDROID.CAMERA);
      setHasPermission(result);
    } else {
      const result = await request(PERMISSIONS.IOS.CAMERA);
      setHasPermission(result);
    }
  };

  const requestCameraPermission = async () => {
    await checkCameraPermission();
  };

  const handleBarCodeScanned = (code: string) => {
    Alert.alert(
      'Kết quả quét mã',
      `Mã đã quét: ${code}`,
      [
        { text: 'Quét lại', style: 'cancel' },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]
    );
  };

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
            onPress={() => handleBarCodeScanned('TEST_QR_CODE_1')}
          >
            <Text style={styles.testButtonText}>Test QR Code #1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('TEST_QR_CODE_2')}
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

  // Camera thật
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        enableZoomGesture
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.bottomContent}>
        <Text style={styles.instructions}>
          Đặt mã vạch vào trong khung để quét
        </Text>
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
});

export default ScannerScreen;
