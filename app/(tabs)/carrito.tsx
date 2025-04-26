import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput } from 'react-native';

export default function CarritoScreen() {
  const [shipping, setShipping] = useState('');
  const [payment, setPayment] = useState('');
  const [promos, setPromos] = useState('');

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>Checkout</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>SHIPPING</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter shipping info"
            value={shipping}
            onChangeText={setShipping}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>PAYMENT</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter payment method"
            value={payment}
            onChangeText={setPayment}
          />
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Place order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { fontSize: 24, fontWeight: 'bold', marginLeft: 20, marginTop: 50 },
  section: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  label: { fontSize: 12, color: 'gray', marginBottom: 5 },
  input: { 
    height: 40, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 10,
    marginTop: 5,
    fontSize: 14,
  },
  itemsContainer: { padding: 15 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  image: { width: 60, height: 60, borderRadius: 10, marginRight: 10, backgroundColor: '#ddd' },
  itemDetails: { flex: 1 },
  brand: { fontSize: 12, color: 'gray' },
  name: { fontSize: 16, fontWeight: 'bold' },
  description: { fontSize: 14, color: 'gray' },
  quantity: { fontSize: 14 },
  price: { fontSize: 16 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#ddd' },
  totalText: { fontSize: 16 },
  totalPrice: { fontSize: 16 },
  totalTextBold: { fontSize: 18 },
  totalPriceBold: { fontSize: 18 },
  button: { backgroundColor: 'black', padding: 15, alignItems: 'center', margin: 20, borderRadius: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
