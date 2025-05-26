import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
}

const ThemeToggleComponent: React.FC<ThemeToggleProps> = ({ 
  size = 'medium' 
}) => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const containerScale = size === 'small' ? 0.8 : size === 'large' ? 1.2 : 1;
  
  // Animation values
  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  
  // Update animation when theme changes
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isDark ? 1 : 0,
      friction: 5,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [isDark, toggleAnim]);
  
  // Interpolated values for animations
  const translateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22] // Adjust based on container width
  });
  
  const rotation = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  
  const backgroundColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#333'] // Light to dark track
  });
  
  return (
    <View style={{ transform: [{ scale: containerScale }] }}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={toggleColorScheme}
        style={styles.container}
      >
        <Animated.View style={[styles.track, { backgroundColor }]}>
          <Animated.View 
            style={[
              styles.thumb,
              {
                backgroundColor: isDark ? '#FFD60A' : '#FF9500',
                transform: [
                  { translateX },
                  { rotate: rotation }
                ],
              }
            ]}
          >
            <FontAwesome5 
              name={isDark ? "moon" : "sun"} 
              size={12} 
              color={isDark ? "#121212" : "#fff"} 
            />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  }
});

// Export both as default export (for router) and named export (for convenience)
export { ThemeToggleComponent as ThemeToggle };
export default ThemeToggleComponent;