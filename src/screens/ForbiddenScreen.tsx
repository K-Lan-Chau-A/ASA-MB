import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ForbiddenScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.content}>
        <Icon name="shield-lock-outline" size={64} color="#E53935" />
        <Text style={styles.title}>Bạn không có quyền truy cập</Text>
        <Text style={styles.subtitle}>Vui lòng liên hệ quản trị viên để được cấp quyền.</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnPrimaryText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 8, textAlign: 'center' },
  actions: { marginTop: 20, flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnPrimaryText: { color: '#FFF', fontWeight: '700' },
});

export default ForbiddenScreen;


