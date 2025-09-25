import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const InventoryTransactionScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom','left','right']}>
      <View style={styles.content}>
        <Text style={styles.text}>Lịch sử kho</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '600', color: '#333' },
});

export default InventoryTransactionScreen;

