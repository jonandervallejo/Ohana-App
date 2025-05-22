export type ColorScheme = 'light' | 'dark';

// Define all the colors used in the app
const tintColorLight = '#000';
const tintColorDark = '#fff';

const Colors = {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    card: '#fff',
    border: '#eee',
    button: '#000',
    buttonText: '#fff',
    secondaryBackground: '#f8f8f8',
    secondaryText: '#666',
    placeholder: '#999',
    subtle: '#f5f5f5',
    error: '#ff3b30',
    success: '#4CAF50',
    warning: '#FF9500',
    info: '#007AFF',
    shadow: '#000',
    inputBackground: '#f9f9f9',
    inputBorder: '#ddd',
    modalBackground: 'rgba(0,0,0,0.5)',
  },
  dark: {
    text: '#fff',
    background: '#121212',
    tint: tintColorDark,
    tabIconDefault: '#666',
    tabIconSelected: tintColorDark,
    card: '#1e1e1e',
    border: '#333',
    button: '#fff',
    buttonText: '#000',
    secondaryBackground: '#232526',
    secondaryText: '#aaa',
    placeholder: '#666',
    subtle: '#2a2a2a',
    error: '#ff453a',
    success: '#32d74b',
    warning: '#ffd60a',
    info: '#0a84ff',
    shadow: '#000',
    inputBackground: '#2c2c2c',
    inputBorder: '#444',
    modalBackground: 'rgba(0,0,0,0.7)',
  },
};

export default Colors;

// Helper functions to access colors based on scheme
export function getColors(scheme: ColorScheme) {
  return Colors[scheme];
}