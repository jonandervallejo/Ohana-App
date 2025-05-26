import { useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing user preference
const THEME_PREFERENCE_KEY = 'THEME_PREFERENCE'; 

// Type definitions
type ColorSchemeType = 'light' | 'dark';
type ThemePreference = 'system' | ColorSchemeType;

interface ColorSchemeHook {
  colorScheme: ColorSchemeType;
  themePreference: ThemePreference;
  toggleColorScheme: () => void;
  setThemePreference: (preference: ThemePreference) => void;
}

const useColorSchemeImplementation = (): ColorSchemeHook => {
  const systemColorScheme = useNativeColorScheme() as ColorSchemeType;
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(systemColorScheme || 'light');

  // Load saved theme preference
  useEffect(() => {
    (async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedPreference) {
          setThemePreferenceState(savedPreference as ThemePreference);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    })();
  }, []);

  // Update color scheme when system theme or preference changes
  useEffect(() => {
    if (themePreference === 'system') {
      setColorScheme(systemColorScheme || 'light');
    } else {
      setColorScheme(themePreference);
    }
  }, [systemColorScheme, themePreference]);

  // Save theme preference
  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Toggle between light and dark
  const toggleColorScheme = () => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setThemePreference(newTheme);
  };

  return {
    colorScheme,
    themePreference,
    toggleColorScheme,
    setThemePreference,
  };
};

// Export both as default export (for router) and named export (for convenience)
export { useColorSchemeImplementation as useColorScheme };
export default useColorSchemeImplementation;