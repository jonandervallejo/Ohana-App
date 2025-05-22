import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

// Theme persistence key
export const THEME_PREFERENCE_KEY = 'theme_preference';

// Type for our theme
export type ColorScheme = 'light' | 'dark';

/**
 * Custom hook for managing color scheme with persistence
 */
export function useColorScheme(): {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
} {
  // Get device preference as initial value
  const deviceColorScheme = useDeviceColorScheme() as ColorScheme || 'light';
  
  // State to hold our theme preference
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

  // Initialize from storage
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (storedTheme) {
          // If we have a stored preference, use it
          setColorSchemeState(storedTheme as ColorScheme);
        } else {
          // Otherwise default to device preference
          setColorSchemeState(deviceColorScheme);
        }
      } catch (error) {
        console.error("Error loading theme preference:", error);
        // Default to light theme on error
        setColorSchemeState('light');
      }
    };

    loadStoredTheme();
  }, [deviceColorScheme]);

  // Function to set color scheme with persistence
  const setColorScheme = async (newScheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newScheme);
      setColorSchemeState(newScheme);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  // Function to toggle between light and dark
  const toggleColorScheme = async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    await setColorScheme(newScheme);
  };

  return { colorScheme, setColorScheme, toggleColorScheme };
}