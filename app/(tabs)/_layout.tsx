import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useCart } from '@/app/hooks/useCart';

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 5;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { cartItems } = useCart();
  
  // Para animación de escala de íconos
  const scaleAnims = {
    home: useRef(new Animated.Value(1)).current,
    shop: useRef(new Animated.Value(1)).current,
    cart: useRef(new Animated.Value(1)).current,
    bell: useRef(new Animated.Value(1)).current,
    user: useRef(new Animated.Value(1)).current
  };
  
  // Calcular el número total de productos en el carrito
  const cartItemCount = cartItems.reduce((total, item) => total + item.cantidad, 0);
  
  // Paleta de colores elegantes y modernos
  const primaryColor = '#101010';     // Texto e iconos activos (negro profundo)
  const secondaryColor = '#9E9E9E';   // Iconos inactivos (gris medio)
  const accentColor = '#CAAB8F';      // Color acento (dorado champagne)
  const surfaceColor = '#FFFFFF';     // Fondo blanco puro
  const activeBackground = '#FAF7F4'; // Beige muy sutil para selección
  const badgeColor = '#E06C75';       // Rojo suave para badge
  
  // Función para animar el ícono activo con efecto de rebote elegante
  const animateIcon = (iconKey: keyof typeof scaleAnims) => {
    // Primero reseteamos todos los iconos
    Object.keys(scaleAnims).forEach(key => {
      Animated.spring(scaleAnims[key as keyof typeof scaleAnims], {
        toValue: 1,
        useNativeDriver: true,
        friction: 6
      }).start();
    });
    
    // Luego animamos el icono seleccionado con un rebote elegante
    Animated.sequence([
      Animated.timing(scaleAnims[iconKey], {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnims[iconKey], {
        toValue: 1.1,  // Más sutil, solo crece un 10%
        friction: 7,   // Mayor fricción para movimiento más sofisticado
        tension: 70,   // Tensión ajustada para animación más elegante
        useNativeDriver: true
      }),
    ]).start();
  };
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: secondaryColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 12,
          backgroundColor: surfaceColor,
          borderTopWidth: 1,
          borderTopColor: '#F5F5F5',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
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
          marginTop: 8, // Aumentado el margen para evitar cualquier superposición
          letterSpacing: 0.2,
        },
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
                focused && styles.iconFocused,
                {transform: [{scale: scaleAnims.home}]}
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "home" : "home-outline"} 
                  size={24} 
                  color={focused ? primaryColor : secondaryColor} 
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
                focused && styles.iconFocused,
                {transform: [{scale: scaleAnims.shop}]}
              ]}>
                <MaterialCommunityIcons 
                  name="hanger" 
                  size={24} 
                  color={focused ? primaryColor : secondaryColor} 
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
                focused && styles.iconFocused,
                {transform: [{scale: scaleAnims.cart}]}
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "shopping" : "shopping-outline"} 
                  size={24} 
                  color={focused ? primaryColor : secondaryColor} 
                />
                {cartItemCount > 0 && (
                  <View style={styles.badge}>
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
      
      <Tabs.Screen
        name="notificaciones"
        listeners={{
          tabPress: () => animateIcon('bell')
        }}
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Animated.View style={[
                styles.iconBackground, 
                focused && styles.iconFocused,
                {transform: [{scale: scaleAnims.bell}]}
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "bell-ring" : "bell-outline"} 
                  size={24} 
                  color={focused ? primaryColor : secondaryColor} 
                />
              </Animated.View>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="registro"
        listeners={{
          tabPress: () => animateIcon('user')
        }}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <Animated.View style={[
                styles.iconBackground, 
                focused && styles.iconFocused,
                {transform: [{scale: scaleAnims.user}]}
              ]}>
                <MaterialCommunityIcons 
                  name={focused ? "account" : "account-outline"} 
                  size={24} 
                  color={focused ? primaryColor : secondaryColor} 
                />
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
    width: 48,
    height: 48,
  },
  iconBackground: {
    width: 42,  // Ligeramente más grande para mayor presencia
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconFocused: {
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#CAAB8F20', // Borde muy sutil con transparencia
    ...Platform.select({
      ios: {
        shadowColor: '#CAAB8F',
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
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});