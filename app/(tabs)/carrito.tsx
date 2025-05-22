import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Alert, StatusBar } from 'react-native';
import { useCart } from '../hooks/useCart';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Función para obtener colores según el tema
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#ffffff',
  card: isDark ? '#1e1e1e' : '#ffffff',
  text: isDark ? '#ffffff' : '#000000',
  secondaryText: isDark ? '#b0b0b0' : '#666666',
  border: isDark ? '#2c2c2c' : '#eeeeee',
  itemBackground: isDark ? '#1e1e1e' : '#f8f8f8',
  input: isDark ? '#2c2c2c' : '#ffffff',
  inputBorder: isDark ? '#444444' : '#cccccc',
  button: isDark ? '#2c2c2c' : '#000000',
  buttonText: isDark ? '#ffffff' : '#ffffff',
  separator: isDark ? '#2c2c2c' : '#ddd',
  icon: isDark ? '#cccccc' : '#ccc',
  quantityButton: isDark ? '#333333' : '#f0f0f0',
  removeButton: isDark ? '#ff5252' : '#ff4444',
  disabledButton: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)',
  headerText: isDark ? '#ffffff' : '#000000',
});

export default function CarritoScreen() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [shipping, setShipping] = useState('');
  const [payment, setPayment] = useState('');
  const [promos, setPromos] = useState('');
  
  // Usar el hook de colorScheme con estado local para asegurar actualizaciones
  const { colorScheme } = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const [colors, setColors] = useState(getColors(colorScheme === 'dark'));
  
  // Actualizar colores cuando cambia el tema
  useEffect(() => {
    setIsDarkMode(colorScheme === 'dark');
    setColors(getColors(colorScheme === 'dark'));
  }, [colorScheme]);
  
  // Asegurar que se actualice también cuando se enfoca la pantalla (cambio entre tabs)
  useFocusEffect(
    React.useCallback(() => {
      setIsDarkMode(colorScheme === 'dark');
      setColors(getColors(colorScheme === 'dark'));
      return () => {};
    }, [colorScheme])
  );

  const formatPrice = (price: string) => {
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return '0.00 €';
      return `${numPrice.toFixed(2)} €`;
    } catch (e) {
      return '0.00 €';
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.precio);
      return total + (isNaN(price) ? 0 : price * item.cantidad);
    }, 0);
  };
  
  // Función para aumentar la cantidad con límite de 5
  const handleIncreaseQuantity = (item: { id: number; cantidad: number }) => {
    if (item.cantidad >= 5) {
      Alert.alert(
        "Cantidad máxima",
        "Solo puedes añadir hasta 5 unidades de un mismo producto"
      );
      return;
    }
    updateQuantity(Number(item.id), item.cantidad + 1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <ScrollView>
        <Text style={[styles.header, { color: colors.headerText }]}>Carrito de la compra</Text>
        
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={64} color={colors.icon} />
            <Text style={[styles.emptyCartText, { color: colors.secondaryText }]}>Tu carrito está vacío</Text>
          </View>
        ) : (
          <>
            <View style={styles.itemsContainer}>
              {cartItems.map((item) => (
                <View key={item.id} style={[styles.item, { backgroundColor: colors.itemBackground }]}>
                  <Image
                    source={{ uri: `https://ohanatienda.ddns.net/${item.imagen}` }}
                    style={styles.image}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.nombre}</Text>
                    <Text style={[styles.price, { color: colors.text }]}>{formatPrice(item.precio)}</Text>
                    {item.talla && (
                      <Text style={[styles.size, { color: colors.secondaryText }]}>Talla: {item.talla}</Text>
                    )}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(Number(item.id), item.cantidad - 1)}
                        style={[styles.quantityButton, { backgroundColor: colors.quantityButton }]}
                      >
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.quantity, { color: colors.text }]}>{item.cantidad}</Text>
                      <TouchableOpacity
                        onPress={() => handleIncreaseQuantity(item)}
                        style={[
                          styles.quantityButton, 
                          { backgroundColor: colors.quantityButton },
                          item.cantidad >= 5 && { opacity: 0.5 }
                        ]}
                        disabled={item.cantidad >= 5}
                      >
                        <Ionicons 
                          name="add" 
                          size={20} 
                          color={item.cantidad >= 5 ? colors.secondaryText : colors.text} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={24} color={colors.removeButton} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={[styles.summary, { borderTopColor: colors.separator, backgroundColor: colors.itemBackground }]}>
              <Text style={[styles.totalText, { color: colors.text }]}>Subtotal</Text>
              <Text style={[styles.totalPrice, { color: colors.text }]}>{formatPrice(calculateTotal().toString())}</Text>
            </View>
            
            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Dirección de envío</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu dirección de envío"
                placeholderTextColor={colors.secondaryText}
                value={shipping}
                onChangeText={setShipping}
              />
            </View>
            
            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Método de pago</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu método de pago"
                placeholderTextColor={colors.secondaryText}
                value={payment}
                onChangeText={setPayment}
              />
            </View>

            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Código promocional</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu código promocional"
                placeholderTextColor={colors.secondaryText}
                value={promos}
                onChangeText={setPromos}
              />
            </View>
          </>
        )}
      </ScrollView>
      
      {cartItems.length > 0 && (
        <View style={[styles.bottomContainer, { backgroundColor: colors.background, borderTopColor: colors.separator }]}>
          <View style={styles.totalContainer}>
            <Text style={[styles.totalTextBold, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalPriceBold, { color: colors.text }]}>{formatPrice(calculateTotal().toString())}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: colors.button },
              (!shipping || !payment) && { opacity: 0.6 }
            ]}
            disabled={!shipping || !payment}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>Hacer pedido</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginLeft: 20, 
    marginTop: 50,
    marginBottom: 20 
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    marginTop: 10,
  },
  itemsContainer: { 
    padding: 15 
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    borderRadius: 12,
    padding: 10,
  },
  image: { 
    width: 80, 
    height: 80, 
    borderRadius: 8,
    backgroundColor: '#ddd' 
  },
  itemDetails: { 
    flex: 1, 
    marginLeft: 15 
  },
  name: { 
    fontSize: 16, 
    fontWeight: '500',
    marginBottom: 4 
  },
  price: { 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 4 
  },
  size: {
    fontSize: 14,
    marginBottom: 8
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 10,
  },
  summary: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderTopWidth: 1,
  },
  totalText: { 
    fontSize: 16 
  },
  totalPrice: { 
    fontSize: 16 
  },
  section: { 
    padding: 15, 
    borderBottomWidth: 1,
  },
  label: { 
    fontSize: 14, 
    marginBottom: 8 
  },
  input: { 
    height: 40, 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 10,
    fontSize: 14,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalTextBold: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  totalPriceBold: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  button: { 
    padding: 15, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});