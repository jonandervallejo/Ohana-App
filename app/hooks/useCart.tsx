import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface CartItem {
  id: number;
  nombre: string;
  precio: string;
  imagen: string;
  cantidad: number;
  talla?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: CartItem) => Promise<boolean>;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  loading: boolean;
  isLoggedIn: boolean;
  refreshLoginStatus: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const isUserLoggedIn = !!token;
      setIsLoggedIn(isUserLoggedIn);
      
      if (isUserLoggedIn && userData) {
        const parsedUserData = JSON.parse(userData);
        setUserId(parsedUserData.id.toString());
      } else {
        setUserId(null);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
      setUserId(null);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Verificar el estado de inicio de sesión al montar el componente
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Escuchar cambios en el estado de inicio de sesión
  useEffect(() => {
    const checkLoginInterval = setInterval(checkLoginStatus, 1000);
    return () => clearInterval(checkLoginInterval);
  }, []);

  const loadCart = async () => {
    if (!userId) return;
    
    try {
      const savedCart = await AsyncStorage.getItem(`cart_${userId}`);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar el carrito cuando cambia el userId
  useEffect(() => {
    if (userId) {
      loadCart();
    }
  }, [userId]);

  const saveCart = async (items: CartItem[]) => {
    if (!userId) return;
    
    try {
      await AsyncStorage.setItem(`cart_${userId}`, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = async (product: CartItem): Promise<boolean> => {
    if (!isLoggedIn) {
      return false;
    }

    // Asegurar que cantidad sea válida
    if (!product.cantidad || product.cantidad < 1) {
      product.cantidad = 1;
    } else if (product.cantidad > 5) {
      product.cantidad = 5;
    }

    setCartItems(prevItems => {
      // Buscar si el producto ya existe (comparando también la talla)
      const existingItemIndex = prevItems.findIndex(
        item => item.id === product.id && item.talla === product.talla
      );
      
      let newItems;
      
      if (existingItemIndex !== -1) {
        // Si el producto ya existe, sumar la cantidad nueva a la existente
        newItems = [...prevItems];
        const newQuantity = newItems[existingItemIndex].cantidad + product.cantidad;
        
        // Limitar a un máximo de 5 unidades
        if (newQuantity > 5) {
          Alert.alert(
            "Cantidad máxima",
            "Solo puedes añadir hasta 5 unidades de un mismo producto"
          );
          newItems[existingItemIndex].cantidad = 5;
        } else {
          newItems[existingItemIndex].cantidad = newQuantity;
        }
      } else {
        // Si no existe, añadirlo con la cantidad especificada
        newItems = [...prevItems, { ...product }];
      }
      
      saveCart(newItems);
      return newItems;
    });

    return true;
  };

  const removeFromCart = (productId: number) => {
    if (!isLoggedIn) return;

    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== productId);
      saveCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (!isLoggedIn) return;
    
    // Si la cantidad es menor que 1, eliminar el producto
    if (quantity < 1) {
      return removeFromCart(productId);
    }
    
    // Limitar a un máximo de 5 unidades
    if (quantity > 5) {
      Alert.alert(
        "Cantidad máxima",
        "Solo puedes añadir hasta 5 unidades de un mismo producto"
      );
      quantity = 5;
    }
    
    setCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === productId
          ? { ...item, cantidad: quantity }
          : item
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    if (!isLoggedIn) return;
    
    setCartItems([]);
    saveCart([]);
  };

  const refreshLoginStatus = async () => {
    await checkLoginStatus();
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      loading,
      isLoggedIn,
      refreshLoginStatus
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Exportar un componente vacío para cumplir con los requisitos de Expo Router
export default function CartProviderDefault() {
  return null;
}