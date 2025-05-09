import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';

const notificaciones = [
  {
    id: '1',
    usuario: 'Usuario Ejemplo',
    mensaje: 'Nuevo Pedido',
    tiempo: '1d',
    detalle: 'Bufanda',
    leido: false,
    fotoPerfil: 'https://randomuser.me/api/portraits/men/1.jpg',
    fotoProducto: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=200&q=80',
  },
];

const NotificacionItem = ({ item }: { item: typeof notificaciones[0] }) => (
  <View style={styles.itemContainer}>
    <View style={styles.leftSection}>
      <View>
        <Image source={{ uri: item.fotoPerfil }} style={styles.avatar} />
        {!item.leido && <View style={styles.dot} />}
      </View>
      <View style={{ marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.mensaje}>{item.mensaje}</Text>
          <Text style={styles.tiempo}> {item.tiempo}</Text>
        </View>
        <Text style={styles.detalle}>{item.detalle}</Text>
      </View>
    </View>
    <Image source={{ uri: item.fotoProducto }} style={styles.productoImg} />
  </View>
);

export default function Notificaciones() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Activity</Text>
      <FlatList
        data={notificaciones}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <NotificacionItem item={item} />}
        contentContainerStyle={{ paddingTop: 10 }}
      />
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Image source={require('../../assets/images/home.jpg')} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Image source={require('../../assets/images/cart.jpg')} style={styles.tabIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Image source={require('../../assets/images/bell.jpg')} style={styles.tabIcon} />
          <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF2D55',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mensaje: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  tiempo: {
    color: '#888',
    fontSize: 12,
    marginLeft: 5,
  },
  detalle: {
    color: '#888',
    fontSize: 13,
  },
  productoImg: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    right: 18,
    top: 5,
    backgroundColor: '#FF2D55',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
