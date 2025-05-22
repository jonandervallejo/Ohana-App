import { Tabs } from 'expo-router';
import React, { useRef, useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/HapticTab';
import { useCart } from '@/app/hooks/useCart';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/app/hooks/useColorScheme';
import { useFocusEffect } from '@react-navigation/native';

// Función para obtener colores según el tema
const getColors = (isDark: boolean) => ({
  primary: isDark ? '#FFFFFF' : '#101010',
  secondary: isDark ? '#888888' : '#9E9E9E',
  surface: isDark ? '#121212' : '#FFFFFF',
  tabBarBorder: isDark ? '#2c2c2c' : '#F5F5F5',
  iconBackground: isDark ? '#1e1e1e' : '#FAF7F4',
  iconBorder: isDark ? '#333333' : '#CAAB8F20',
  iconShadow: isDark ? '#000000' : '#CAAB8F',
  badge: '#E06C75',
  badgeBorder: isDark ? '#121212' : '#FFFFFF',
  badgeText: '#FFFFFF',
});

export default function TabLayout() {
  const { cartItems } = useCart();
  const insets = useSafeAreaInsets();

  // Usar el hook de colorScheme con estado local para asegurar actualizaciones
  const { colorScheme } = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const [colors, setColors] = useState(getColors(colorScheme === 'dark'));
  
  // Actualizar colores cuando cambia el tema
  useEffect(() => {
    setIsDarkMode(colorScheme === 'dark');
    setColors(getColors(colorScheme === 'dark'));
  }, [colorScheme]);
  
  // Para animación de escala de iconos
  const scaleAnims = {
    home: useRef(new Animated.Value(1)).current,
    shop: useRef(new Animated.Value(1)).current,
    cart: useRef(new Animated.Value(1)).current,
    bell: useRef(new Animated.Value(1)).current,
    user: useRef(new Animated.Value(1)).current
  };
  
  const cartItemCount = cartItems.reduce((total, item) => total + item.cantidad, 0);
  
  // Función para animar el icono activo
  const animateIcon = (iconKey: keyof typeof scaleAnims) => {
    Object.keys(scaleAnims).forEach(key => {
      Animated.spring(scaleAnims[key as keyof typeof scaleAnims], {
        toValue: 1,
        useNativeDriver: true,
        friction: 6
      }).start();
    });
    
    Animated.sequence([
      Animated.timing(scaleAnims[iconKey], {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnims[iconKey], {
        toValue: 1.1,
        friction: 7,
        tension: 70,
        useNativeDriver: true
      }),
    ]).start();
  };
  
  // Cálculo de espacios seguros para la TabBar
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);
  const tabBarHeight = 55; // Altura base de la TabBar sin padding
  const totalTabBarHeight = tabBarHeight + bottomInset;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: totalTabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 10,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          ...Platform.select({
            ios: {
              shadowColor: isDarkMode ? '#000' : '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.06,
              shadowRadius: 5,
            },
            android: {
              elevation: 6,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
          fontWeight: '500',
          marginTop: 4,
          marginBottom: 2,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => animateIcon('home')
        }}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Animated.View style={[
                styles.iconBackground, 
                focused && [
                  styles.iconFocused,
                  { 
                    backgroundColor: colors.iconBackground,
                    borderColor: colors.iconBorder 
                  }
                ],
                { transform: [{scale: scaleAnims.home}] }
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "home" : "home-outline"} 
                  size={24} 
                  color={focused ? colors.primary : colors.secondary} 
                />
              </Animated.View>
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="tienda"
        listeners={{
          tabPress: () => animateIcon('shop')
        }}
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Animated.View style={[
                styles.iconBackground, 
                focused && [
                  styles.iconFocused,
                  { 
                    backgroundColor: colors.iconBackground,
                    borderColor: colors.iconBorder 
                  }
                ],
                { transform: [{scale: scaleAnims.shop}] }
              ]}>
                <MaterialCommunityIcons 
                  name="hanger" 
                  size={24} 
                  color={focused ? colors.primary : colors.secondary} 
                />
              </Animated.View>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="carrito"
        listeners={{
          tabPress: () => animateIcon('cart')
        }}
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Animated.View style={[
                styles.iconBackground, 
                focused && [
                  styles.iconFocused,
                  { 
                    backgroundColor: colors.iconBackground,
                    borderColor: colors.iconBorder 
                  }
                ],
                { transform: [{scale: scaleAnims.cart}] }
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "shopping" : "shopping-outline"} 
                  size={24} 
                  color={focused ? colors.primary : colors.secondary} 
                />
                {cartItemCount > 0 && (
                  <View style={[styles.badge, { borderColor: colors.badgeBorder }]}>
                    <Text style={styles.badgeText}>
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 42,
    height: 42,
  },
  iconBackground: {
    width: 38, 
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconFocused: {
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E06C75',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
    borderWidth: 1.5,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});