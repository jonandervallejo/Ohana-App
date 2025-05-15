import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { Platform, View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/HapticTab';
import { useCart } from '@/app/hooks/useCart';

export default function TabLayout() {
  const { cartItems } = useCart();
  
  //para animacion de escala de íconos
  const scaleAnims = {
    home: useRef(new Animated.Value(1)).current,
    shop: useRef(new Animated.Value(1)).current,
    cart: useRef(new Animated.Value(1)).current,
    bell: useRef(new Animated.Value(1)).current,
    user: useRef(new Animated.Value(1)).current
  };
  
  const cartItemCount = cartItems.reduce((total, item) => total + item.cantidad, 0);
  
  const primaryColor = '#101010';    
  const secondaryColor = '#9E9E9E';  
  const surfaceColor = '#FFFFFF';    
  
  //funcion para animar el icono activo en la barra inferior
  const animateIcon = (iconKey: keyof typeof scaleAnims) => {
    Object.keys(scaleAnims).forEach(key => {
      Animated.spring(scaleAnims[key as keyof typeof scaleAnims], {
        toValue: 1,
        useNativeDriver: true,
        friction: 6
      }).start();
    });
    
    //se anima el icono con rebote elegante
    Animated.sequence([
      Animated.timing(scaleAnims[iconKey], {
        toValue: 0.8,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnims[iconKey], {
        toValue: 1.1,  // crece un 10%
        friction: 7,
        tension: 70,
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
          marginTop: 8,
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

      {/*<Tabs.Screen
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
      />*/}
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
    width: 42, 
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconFocused: {
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#CAAB8F20',
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