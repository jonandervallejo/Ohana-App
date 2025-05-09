import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].background, // color de los íconos activos
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: Colors[colorScheme ?? 'light'].tint, // color de fondo en iOS
          },
          default: {
            backgroundColor: Colors[colorScheme ?? 'light'].tint, // color de fondo en Android u otras plataformas
          },
        }),
      }}>
        
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{
          title: 'Notificaciones',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="tienda"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color }) => <FontAwesome5 name="shopping-bag" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
  
}