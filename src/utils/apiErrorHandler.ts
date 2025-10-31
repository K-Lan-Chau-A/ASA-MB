import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

/**
 * Check if response is 403 and navigate to ForbiddenScreen if so
 * @param response - The fetch Response object
 * @param navigation - Navigation object from useNavigation hook
 * @param replace - If true, replace current screen instead of pushing (default: false)
 * @returns true if 403 was handled (navigation occurred), false otherwise
 */
export const handle403Error = (
  response: Response,
  navigation: NavigationProp<RootStackParamList>,
  replace: boolean = false
): boolean => {
  if (response.status === 403) {
    try {
      if (replace) {
        // Replace current screen with ForbiddenScreen
        (navigation as any).replace('ForbiddenScreen');
      } else {
        (navigation as any).navigate('ForbiddenScreen');
      }
      return true;
    } catch (error) {
      console.error('Error navigating to ForbiddenScreen:', error);
    }
  }
  return false;
};

/**
 * Wrapper for fetch that automatically handles 403 errors
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param navigation - Navigation object
 * @returns Promise<Response> or null if 403 was handled
 */
export const fetchWith403Handler = async (
  url: string,
  options: RequestInit = {},
  navigation: NavigationProp<RootStackParamList>
): Promise<Response | null> => {
  const response = await fetch(url, options);
  if (handle403Error(response, navigation)) {
    return null; // 403 was handled, return null to indicate no response
  }
  return response;
};

