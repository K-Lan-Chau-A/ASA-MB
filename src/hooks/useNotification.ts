import {PermissionsAndroid} from 'react-native';
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';

const requestUserPermission = async () => {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Notification permission granted');
            } else {
                console.log('Notification permission denied');
            }
}

const getToken = async () => {
    try {
        const fcmToken = await messaging().getToken();
        console.log('FCM Token:', fcmToken);
    } catch (err) {
        console.warn(err);
    }
}

export const useNotification = () => {
    useEffect(() => {
        requestUserPermission();
    }, []);
}
