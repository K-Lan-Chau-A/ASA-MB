import React, { useState, useEffect } from 'react';
import { useFCMToken } from '../hooks/useFCMToken';
import { fcmService } from '../services/FCMService';
import DeviceInfo from 'react-native-device-info';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isEmulator, setIsEmulator] = useState<boolean | null>(null);
  const { fcmToken, loading } = useFCMToken();

  useEffect(() => {
    const checkDeviceAndInitFCM = async () => {
      try {
        // Check if device is emulator
        const emulatorStatus = await DeviceInfo.isEmulator();
        setIsEmulator(emulatorStatus);
        
        if (emulatorStatus) {
          console.log('🚀 Running on emulator - skipping FCM initialization');
          return;
        }
        
        // Only initialize FCM on real devices
        console.log('🚀 Running on real device - initializing FCM');
        await fcmService.init();
        const token = await fcmService.getFCMToken();
        if (token) {
          console.log('FCM Token initialized:', token);
        }
      } catch (error) {
        console.error('Error checking device or initializing FCM:', error);
      }
    };

    checkDeviceAndInitFCM();
  }, []);

  const handleLogin = async () => {
    console.log('🚀 Login button pressed');
    console.log('🚀 Current fcmToken:', fcmToken);
    console.log('🚀 Loading state:', loading);
    console.log('🚀 Is emulator:', isEmulator);
    
    try {
      // Skip FCM validation if running on emulator
      if (isEmulator === true) {
        console.log('🚀 Running on emulator - skipping FCM token validation');
        // Proceed directly to main app on emulator
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
        return;
      }
      
      // FCM logic only for real devices
      if (isEmulator === false) {
        if (loading) {
          console.log('🚀 Waiting for FCM token...');
          Alert.alert('Thông báo', 'Đang khởi tạo kết nối với máy chủ...');
          return;
        }
        
        // Thử lấy token mới nếu chưa có
        if (!fcmToken) {
          console.log('🚀 No FCM token available, trying to get new one...');
          const newToken = await fcmService.getFCMToken();
          console.log('🚀 New token from service:', newToken);
          
          if (!newToken) {
            console.error('🚀 FCM token not available');
            Alert.alert('Lỗi', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
            return;
          }
        }

        console.log('🚀 Final FCM token for login:', fcmToken);
      }

      // Chuyển đến màn hình chính với bottom navigation
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (error) {
      console.error('🚀 Login error:', error);
      // Hiển thị thông báo lỗi cho người dùng
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/asianUnicorn.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          

          <TextInput
            style={styles.input}
            placeholder="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.eyeIcon}>
              <Text>👁</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rememberContainer}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity style={styles.checkbox} />
              <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Image
            source={require('../assets/images/asianUnicorn.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <View style={styles.hotlineContainer}>
            <Icon name="phone" size={16} color="#666666" />
            <Text style={styles.hotlineText}>Hỗ trợ 1900 2004</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 150,
    height: 150,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  domainContainer: {
    marginBottom: 20,
  },
  domainLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  domainInputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
  },
  domainInput: {
    fontSize: 16,
    color: '#009DA5',
  },
  input: {
    backgroundColor: '#F5F5F5',
    color: '#000000',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#009DA5',
    borderRadius: 4,
    marginRight: 8,
  },
  rememberText: {
    fontSize: 14,
    color: '#666666',
  },
  forgotPasswordText: {
    color: '#009DA5',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#009DA5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerLogo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  hotlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotlineText: {
    fontSize: 14,
    color: '#009DA5',
    fontWeight: 'bold',
  },
});

export default LoginScreen;