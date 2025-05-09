import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define los colores para ambos temas
export const lightTheme = {
  // Colores base
  background: '#ffffff',
  gradientBg: ['#f0f7ff', '#ffffff'],
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#888888',
  
  // Colores de UI
  primary: '#007AFF',
  secondary: '#4CAF50',
  border: '#ddd',
  borderFocus: '#cce5ff',
  inputBg: 'white',
  inputText: '#333333',
  cardBg: '#ffffff',
  cardBorder: '#eee',
  
  // Estados
  error: '#ff3b30',
  success: '#4CAF50',
  warning: '#FFCC00',
  info: '#0A84FF',
  disabled: '#b3d1ff',
  
  // Elementos específicos
  avatarBg: '#e6f2ff',
  avatarBorder: '#cce5ff',
  toastBg: '#4CAF50',
  toastText: '#ffffff',
  loadingIndicator: '#007AFF',
};

export const darkTheme = {
  // Colores base
  background: '#121212',
  gradientBg: ['#1a1a2e', '#121212'],
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
  textLight: '#888888',
  
  // Colores de UI
  primary: '#0A84FF',
  secondary: '#4ecca3',
  border: '#444',
  borderFocus: '#555',
  inputBg: '#2c2c2e',
  inputText: '#f0f0f0',
  cardBg: '#1e1e1e',
  cardBorder: '#333',
  
  // Estados
  error: '#ff453a',
  success: '#32d74b',
  warning: '#ffd60a',
  info: '#64d2ff',
  disabled: '#505050',
  
  // Elementos específicos
  avatarBg: '#2c2c2e',
  avatarBorder: '#0A84FF',
  toastBg: '#32d74b',
  toastText: '#ffffff',
  loadingIndicator: '#0A84FF',
};

// Tipo para nuestro contexto
type ThemeContextType = {
  theme: typeof lightTheme; // El tema actual
  isDark: boolean;         // Indica si está en modo oscuro
  toggleTheme: () => void; // Función para cambiar el tema
};

// Crear el contexto
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

// Props para nuestro proveedor
type ThemeProviderProps = {
  children: React.ReactNode;
};

// Componente proveedor que maneja la lógica del tema
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Obtener preferencia del sistema
  const deviceTheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  // Cargar la preferencia guardada al iniciar
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme) {
          setIsDark(savedTheme === 'dark');
        } else {
          // Si no hay preferencia guardada, usar la del sistema
          setIsDark(deviceTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference', error);
      }
    };
    
    loadThemePreference();
  }, [deviceTheme]);

  // Función para cambiar el tema
  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    try {
      await AsyncStorage.setItem('themeMode', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{
        theme: isDark ? darkTheme : lightTheme,
        isDark,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para acceder al tema
export const useTheme = () => useContext(ThemeContext);