import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Alert } from 'react-native';
import { useCart } from '../hooks/useCart';
import { Ionicons } from '@expo/vector-icons';

export default function CarritoScreen() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [shipping, setShipping] = useState('');
  const [payment, setPayment] = useState('');
  const [promos, setPromos] = useState('');

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
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>Carrito de la compra</Text>
        
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyCartText}>Tu carrito está vacío</Text>
          </View>
        ) : (
          <>
            <View style={styles.itemsContainer}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Image
                    source={{ uri: `http://ohanatienda.ddns.net:8080/${item.imagen}` }}
                    style={styles.image}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.name}>{item.nombre}</Text>
                    <Text style={styles.price}>{formatPrice(item.precio)}</Text>
                    {item.talla && (
                      <Text style={styles.size}>Talla: {item.talla}</Text>
                    )}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(Number(item.id), item.cantidad - 1)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="remove" size={20} color="#000" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.cantidad}</Text>
                      <TouchableOpacity
                        onPress={() => handleIncreaseQuantity(item)}
                        style={[
                          styles.quantityButton, 
                          item.cantidad >= 5 ? {opacity: 0.5} : {}
                        ]}
                        disabled={item.cantidad >= 5}
                      >
                        <Ionicons 
                          name="add" 
                          size={20} 
                          color={item.cantidad >= 5 ? "#999" : "#000"} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.summary}>
              <Text style={styles.totalText}>Subtotal</Text>
              <Text style={styles.totalPrice}>{formatPrice(calculateTotal().toString())}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.label}>Dirección de envío</Text>
              <TextInput
                style={styles.input}
                placeholder="Introduce tu dirección de envío"
                value={shipping}
                onChangeText={setShipping}
              />
            </View>
            
            <View style={styles.section}>
              <Text style={styles.label}>Método de pago</Text>
              <TextInput
                style={styles.input}
                placeholder="Introduce tu método de pago"
                value={payment}
                onChangeText={setPayment}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Código promocional</Text>
              <TextInput
                style={styles.input}
                placeholder="Introduce tu código promocional"
                value={promos}
                onChangeText={setPromos}
              />
            </View>
          </>
        )}
      </ScrollView>
      
      {cartItems.length > 0 && (
        <View style={styles.bottomContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalTextBold}>Total</Text>
            <Text style={styles.totalPriceBold}>{formatPrice(calculateTotal().toString())}</Text>
          </View>
          <TouchableOpacity 
            style={styles.button}
            disabled={!shipping || !payment}
          >
            <Text style={styles.buttonText}>Hacer pedido</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'white' 
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
    color: '#666',
    marginTop: 10,
  },
  itemsContainer: { 
    padding: 15 
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
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
    color: '#666',
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
    backgroundColor: '#f0f0f0',
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
    borderTopColor: '#ddd',
    backgroundColor: '#f8f8f8'
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
    borderBottomColor: '#ddd' 
  },
  label: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 8 
  },
  input: { 
    height: 40, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 10,
    fontSize: 14,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: 'white',
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
    backgroundColor: 'black', 
    padding: 15, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});