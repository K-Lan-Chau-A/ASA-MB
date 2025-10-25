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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import API_URL from '../config/api';
import { authStore, setShiftId, saveCredentials, loadCredentials, clearCredentials } from '../services/AuthStore';

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isEmulator, setIsEmulator] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [remember, setRemember] = useState(false);
  const { fcmToken, loading } = useFCMToken();

  useEffect(() => {
    console.log('🚀 LoginScreen mounted, starting initialization...');
    
    const checkDeviceAndInitFCM = async () => {
      try {
        console.log('📱 Checking device type...');
        // Check if device is emulator
        const emulatorStatus = await DeviceInfo.isEmulator();
        console.log('📱 Device check result:', { isEmulator: emulatorStatus });
        setIsEmulator(emulatorStatus);
        
        if (emulatorStatus) {
          console.log('🚀 Running on emulator - skipping FCM initialization');
          return;
        }
        
        // Only initialize FCM on real devices
        console.log('🚀 Running on real device - initializing FCM');
        await fcmService.init();
        console.log('✅ FCM service initialized');
        
        const token = await fcmService.getFCMToken();
        if (token) {
          console.log('✅ FCM Token initialized:', token.substring(0, 30) + '...');
        } else {
          console.log('⚠️ FCM Token is null/undefined');
        }
      } catch (error) {
        console.error('🚨 Error checking device or initializing FCM:', error);
        console.error('🚨 Error details:', {
          name: (error as any)?.name,
          message: (error as any)?.message,
          stack: (error as any)?.stack
        });
      }
    };

    checkDeviceAndInitFCM();
    
    // Auto-redirect if token exists, else try saved creds. Hide form until done.
    (async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const session = await authStore.load();
        if (session?.accessToken) {
          console.log('✅ Found existing session, auto-redirecting to MainApp');
          navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
          return;
        }
        
        console.log('🔍 No session found, checking saved credentials...');
        const creds = await loadCredentials();
        if (creds?.remember && creds.username && creds.password) {
          console.log('✅ Found saved credentials, auto-logging in...');
          setUsername(creds.username || '');
          setPassword(creds.password || '');
          setRemember(true);
          try { 
            await handleLoginInternal(creds.username, creds.password, true); 
            return; 
          } catch (e) {
            console.log('⚠️ Auto-login failed:', e);
          }
        } else {
          console.log('ℹ️ No saved credentials found');
        }
      } finally {
        console.log('🏁 Boot sequence complete, showing login form');
        setBooting(false);
      }
    })();
  }, []);

  const handleLoginInternal = async (u: string, p: string, silent?: boolean) => {
    console.log('🔐 handleLoginInternal START', { 
      username: u, 
      passwordLength: p?.length, 
      silent, 
      isEmulator,
      fcmToken: fcmToken?.substring(0, 20) + '...',
      API_URL 
    });
    
    if (!u || !p) {
      console.log('❌ Missing username or password');
      if (!silent) Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    
    if (!silent) setIsLoading(true);
    
    try {
      console.log('📡 Calling login API...', `${API_URL}/api/authentication/login`);
      const response = await fetch(`${API_URL}/api/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: u, password: p }),
      });
      console.log('📡 API Response received', { status: response.status, ok: response.ok });
      
      const result = await response.json();
      console.log('📡 API Result parsed', { success: result.success, message: result.message });
      if (result.success) {
        if (remember) {
          await saveCredentials({ username: u, password: p, remember: true });
        } else {
          await clearCredentials();
        }
        try {
          if (result?.data?.accessToken) {
            await authStore.save({
              userId: result?.data?.userId ?? 0,
              username: result?.data?.username ?? '',
              status: result?.data?.status ?? 0,
              shopId: result?.data?.shopId ?? 0,
              shiftId: result?.data?.shiftId ?? 0,
              role: result?.data?.role ?? 0,
              avatar: result?.data?.avatar ?? null,
              createdAt: result?.data?.createdAt ?? undefined,
              accessToken: result?.data?.accessToken,
            });
          }
        } catch (e) {}
        try {
          const token = result?.data?.accessToken as string | undefined;
          const shopId = Number(result?.data?.shopId ?? 0);
          if (token && shopId > 0) {
            const url = `${API_URL}/api/shifts?ShopId=${shopId}&page=1&pageSize=100`;
            const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
            const json = await res.json().catch(() => null);
            const list = Array.isArray(json?.items) ? json.items : Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
            const open = (list as any[]).find((it) => (it?.closedDate ?? it?.closeDate) == null);
            const openId = Number(open?.shiftId ?? open?.id ?? 0);
            if (openId > 0) await setShiftId(openId);
          }
        } catch {}
        // Register FCM token after successful login
        try {
          console.log('🔔 Registering FCM token...', { isEmulator, hasFcmToken: !!fcmToken });
          if (!isEmulator) {
            const tokenToSend = fcmToken || (await fcmService.getFCMToken().catch(() => null));
            console.log('🔔 Token to send:', tokenToSend?.substring(0, 20) + '...');
            if (tokenToSend) {
              const derivedUserId = result?.data?.userId ?? 0;
              await fcmService.registerFCMToken(derivedUserId, tokenToSend, null);
              console.log('✅ FCM token registered successfully');
            } else {
              console.log('⚠️ No FCM token to register');
            }
          } else {
            console.log('⏭️ Skipping FCM registration (emulator)');
          }
        } catch (error) {
          console.error('🔥 FCM registration error:', error);
        }
        console.log('✅ Login successful, navigating to MainApp');
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else if (!silent) {
        console.log('❌ Login failed:', result.message);
        const errorMessage = result.message === 'Invalid Username or Password' ? 'Sai tên đăng nhập hoặc mật khẩu' : result.message;
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error) {
      console.error('🚨 LOGIN ERROR CAUGHT:', error);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error name:', (error as any)?.name);
      console.error('🚨 Error message:', (error as any)?.message);
      console.error('🚨 Error stack:', (error as any)?.stack);
      if (!silent) Alert.alert('Lỗi', 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      console.log('🏁 handleLoginInternal END', { silent, isLoading });
      if (!silent) setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    console.log('👆 Login button pressed!', { 
      username, 
      passwordLength: password?.length,
      isEmulator,
      fcmToken: fcmToken?.substring(0, 20) + '...',
      loading 
    });
    
    if (!username || !password) {
      console.log('❌ Validation failed: missing credentials');
      Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    
    console.log('✅ Validation passed, calling handleLoginInternal...');
    await handleLoginInternal(username, password);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {(booting || isLoading) && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: '#FFFFFF' }}>
            <ActivityIndicator size="large" color="#009DA5" />
          </View>
        )}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logoASA.png')}
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
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.rememberContainer}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity style={[styles.checkbox, remember && { backgroundColor: '#009DA5' }]} onPress={() => setRemember((v) => !v)} />
              <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
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
    width: '100%',
  },
  logo: {
    width: '100%',
    height: 200,
    paddingTop: 100,
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