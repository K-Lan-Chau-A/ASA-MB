import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ScannerScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.back;
  const [isEmulator, setIsEmulator] = useState(false);

  useEffect(() => {
    checkEmulator();
    checkPermission();
  }, []);

  const checkEmulator = async () => {
    // Kiểm tra xem có phải là emulator không
    if (Platform.OS === 'android' && !device) {
      setIsEmulator(true);
    }
  };

  const checkPermission = async () => {
    const cameraPermission = await Camera.requestCameraPermission();
    setHasPermission(cameraPermission === 'authorized');
    
    if (cameraPermission !== 'authorized' && !isEmulator) {
      Alert.alert(
        'Quyền truy cập camera',
        'Ứng dụng cần quyền truy cập camera để quét mã',
        [{ 
          text: 'OK',
          onPress: () => {
            // Không làm gì cả, để người dùng tiếp tục sử dụng màn hình test
          }
        }]
      );
    }
  };

  const handleBarCodeScanned = (code: string) => {
    Alert.alert(
      'Kết quả quét mã',
      `Mã đã quét: ${code}`,
      [
        {
          text: 'Quét lại',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Màn hình test cho emulator
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
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleBarCodeScanned('TEST_BARCODE_1')}
          >
            <Text style={styles.testButtonText}>Test Barcode #1</Text>
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

  // Luôn hiển thị giao diện test trên emulator
  if (Platform.OS === 'android' && !device) {
    return <EmulatorTestScreen />;
  }

  if (!device || !hasPermission) {
    return <EmulatorTestScreen />;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        enableZoomGesture
        photo={false}
        video={false}
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
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  testButtons: {
    width: '100%',
    gap: 15,
  },
  testButton: {
    backgroundColor: '#009DA5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ScannerScreen;