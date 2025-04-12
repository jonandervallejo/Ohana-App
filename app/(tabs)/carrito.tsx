import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';

export default function CarritoScreen() {
  const [isSelected, setSelection] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>Checkout</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>SHIPPING</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>PAYMENT</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>PROMOS</Text>
        </View>

        <View style={styles.itemsContainer}>
          <View style={styles.item}>
            <Image style={styles.image} />
            <View style={styles.itemDetails}>
              <Text style={styles.brand}>Brand</Text>
              <Text style={styles.name}>Product name</Text>
              <Text style={styles.description}>Description</Text>
              <Text style={styles.quantity}>Quantity: 01</Text>
            </View>
            <Text style={styles.price}>$20.00</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.totalText}>Subtotal (X)</Text>
          <Text style={styles.totalPrice}>$20.00</Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.totalText}>Coste de envio</Text>
          <Text style={styles.totalPrice}>Free</Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.totalTextBold}>Total</Text>
          <Text style={styles.totalPriceBold}>$20.00</Text>
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
  label: { fontSize: 12, color: 'gray' },
  link: { fontSize: 16, color: 'black', fontWeight: 'bold' },
  itemsContainer: { padding: 15 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { marginRight: 10 },
  image: { width: 60, height: 60, borderRadius: 10, marginRight: 10, backgroundColor: '#ddd' },
  itemDetails: { flex: 1 },
  brand: { fontSize: 12, color: 'gray' },
  name: { fontSize: 16, fontWeight: 'bold' },
  description: { fontSize: 14, color: 'gray' },
  quantity: { fontSize: 14 },
  price: { fontSize: 16, },
  summary: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#ddd' },
  totalText: { fontSize: 16 },
  totalPrice: { fontSize: 16,  },
  totalTextBold: { fontSize: 18,  },
  totalPriceBold: { fontSize: 18,  },
  button: { backgroundColor: 'black', padding: 15, alignItems: 'center', margin: 20, borderRadius: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});