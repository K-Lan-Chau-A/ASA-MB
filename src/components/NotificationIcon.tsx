import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUnreadNotifications } from '../services/NotificationsStore';

const NotificationIcon = () => {
  const navigation = useNavigation<any>();
  const unread = useUnreadNotifications();

  const handlePress = () => {
    navigation.navigate('Notification');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View>
        <Icon name="bell-outline" size={24} color="#000000" />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#F44336',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon;
