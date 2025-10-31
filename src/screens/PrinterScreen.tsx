import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRINTER_IP_KEY = 'printer:ip';

const PrinterScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [printerIp, setPrinterIp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load printer IP from AsyncStorage on mount
  useEffect(() => {
    const loadPrinterIp = async () => {
      try {
        setIsLoading(true);
        const savedIp = await AsyncStorage.getItem(PRINTER_IP_KEY);
        if (savedIp) {
          setPrinterIp(savedIp);
        }
      } catch (error) {
        console.error('Error loading printer IP:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPrinterIp();
  }, []);

  // Validate IP address format (basic validation)
  const isValidIp = (ip: string): boolean => {
    if (!ip.trim()) return true; // Allow empty IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  // Save printer IP to AsyncStorage
  const handleSave = useCallback(async () => {
    const trimmedIp = printerIp.trim();
    
    // Validate IP format if not empty
    if (trimmedIp && !isValidIp(trimmedIp)) {
      Alert.alert('Lỗi', 'Địa chỉ IP không hợp lệ. Vui lòng nhập địa chỉ IP đúng định dạng (ví dụ: 192.168.1.100)');
      return;
    }

    try {
      setIsSaving(true);
      if (trimmedIp) {
        await AsyncStorage.setItem(PRINTER_IP_KEY, trimmedIp);
        Alert.alert('Thành công', 'Đã lưu địa chỉ IP máy in', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await AsyncStorage.removeItem(PRINTER_IP_KEY);
        Alert.alert('Thành công', 'Đã xóa địa chỉ IP máy in', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving printer IP:', error);
      Alert.alert('Lỗi', 'Không thể lưu địa chỉ IP. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }, [printerIp, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt máy in</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009DA5" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.inputSection}>
            <Text style={styles.label}>Địa chỉ IP máy in</Text>
            <Text style={styles.hint}>Nhập địa chỉ IP của máy in (ví dụ: 192.168.1.100)</Text>
            <View style={styles.inputContainer}>
              <Icon name="printer" size={20} color="#009DA5" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="192.168.1.100"
                value={printerIp}
                onChangeText={setPrinterIp}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
              {printerIp.length > 0 && (
                <TouchableOpacity onPress={() => setPrinterIp('')} style={styles.clearButton}>
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Icon name="information" size={20} color="#666" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Để trống nếu bạn không sử dụng máy in mạng. Bạn có thể thay đổi địa chỉ IP này bất cứ lúc nào.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="content-save" size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Lưu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 4,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009DA5',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PrinterScreen;

