import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
  Notification: undefined;
  Scanner: undefined;
};
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Chuyển đến màn hình chính với bottom navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
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