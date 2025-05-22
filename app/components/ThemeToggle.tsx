import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Animated,
  ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';
import Colors from '../constants/Color';

interface ThemeToggleProps {
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export function ThemeToggle({ style, size = 'medium' }: ThemeToggleProps) {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  
  // Animation values
  const rotateAnim = useRef(new Animated.Value(colorScheme === 'light' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Get sizes based on the size prop
  const getSize = () => {
    switch(size) {
      case 'small': return { button: 36, icon: 16 };
      case 'large': return { button: 56, icon: 28 };
      default: return { button: 44, icon: 22 };
    }
  };
  
  const { button: buttonSize, icon: iconSize } = getSize();
  
  // Update animation when theme changes
  useEffect(() => {
    // First create a small "press" animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Rotate animation
    Animated.timing(rotateAnim, {
      toValue: colorScheme === 'light' ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [colorScheme]);
  
  // Interpolate rotation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={toggleColorScheme} // Conectamos la función toggle aquí
      style={[styles.container, { width: buttonSize, height: buttonSize }, style]}
    >
      <Animated.View 
        style={[
          styles.iconContainer, 
          { 
            backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
            transform: [{ rotate }, { scale: scaleAnim }] 
          }
        ]}
      >
        <View>
          {colorScheme === 'light' ? (
            <Ionicons name="sunny" size={iconSize} color="#FF9500" />
          ) : (
            <Ionicons name="moon" size={iconSize} color="#FFD60A" />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});