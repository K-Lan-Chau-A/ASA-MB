import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationIcon = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('Notification');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Icon name="bell-outline" size={24} color="#000000" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8,
  },
});

export default NotificationIcon;
