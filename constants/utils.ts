import { Platform, ToastAndroid } from 'react-native';

// Web alternative (optional)
export const showToast = (message: string, time: number) => {
  if (Platform.OS === 'android') {
    showToast(message, time);
  } else if (Platform.OS === 'web') {
    // For Web, use alert or a library like react-hot-toast
    alert(message);
  } else {
    // For iOS or others
    console.log(message);
  }
};
