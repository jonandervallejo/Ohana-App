import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const { width } = Dimensions.get('window');

const Carrusel = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get('http://ohanatienda.ddns.net:8000/api/productos/imagenes'); // Cambia <tu-servidor> por la URL de tu backend
        setImages(response.data); // Asegúrate de que la respuesta sea un array de objetos con URLs de imágenes
        setLoading(false);
      } catch (error) {
        console.error('Error fetching images:', error);
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <ScrollView 
      horizontal 
      pagingEnabled 
      showsHorizontalScrollIndicator={false} 
      style={styles.carruselContainer}
    >
      {images.map((image, index) => (
          <Image 
              //source={{ uri: image.imagen }} s
              style={styles.carruselImage} 
              resizeMode="cover" 
          />
      ))}
    </ScrollView>
  );
};

const HomeScreen = () => {
  const categories = [
    { name: 'Accesorios', image: require('@/assets/images/accesorio1.jpg') },
    { name: 'Faldas', image: require('@/assets/images/falda1.jpg') },
    { name: 'Jerseys', image: require('@/assets/images/camisa1.jpg') },
    { name: 'Camisetas', image: require('@/assets/images/camiseta2.jpg') }
  ];

  const products = [
    { 
      name: 'Camiseta Azul', 
      price: 19.99, 
      image: require('@/assets/images/camiseta1.jpg'),
      brand: 'Ohana'
    },
    { 
      name: 'Camiseta Verde', 
      price: 19.99, 
      image: require('@/assets/images/camiseta2.jpg'),
      brand: 'Ohana'
    },
    { 
      name: 'Camiseta Leopardo', 
      price: 19.99, 
      image: require('@/assets/images/camiseta3.jpg'),
      brand: 'Ohana'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabecera */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Tienda</Text>
        <Image 
          source={require('@/assets/images/ohanalogo.jpg')} 
          style={styles.headerBanner}
          borderRadius={25}
        />
        <TouchableOpacity style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={30} color="black" />
        </TouchableOpacity>
      </View>

      {/* Carrusel */}
      <Carrusel />

      {/* Barra de búsqueda */}
      {/*<View style={styles.searchContainer}>
        <Text style={styles.searchPlaceholder}>🔍 Search</Text>
      </View>*/}

      {/* Sección de Categorías */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <Text style={styles.seeAll}>Ver todo</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category, index) => (
            <TouchableOpacity key={index} style={styles.categoryItem}>
              <Image 
                source={category.image} 
                style={styles.categoryImage} 
                resizeMode="cover"
              />
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sección de Camisetas */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <Text style={styles.seeAll}>Ver todo </Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsContainer}
        >
          {products.map((product, index) => (
            <TouchableOpacity key={index} style={styles.productItem}>
              <Image 
                source={product.image} 
                style={styles.productImage} 
                resizeMode="cover"
              />
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  //estilos de la cabecera***********************
  header: {
    fontSize: 24,
    fontWeight: 'bold',     
    marginTop: 20, 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  iconContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerText: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  headerBanner: {
    flex: 1,
    width: 80,
    height: 40,
  },

  //estilos del carrusel***********************
  carruselContainer: {
    height: 100, // Altura del carrusel
    marginBottom: 20,
  },
  imageContainer: {
    width: width, //cada imagen ocupa todo el ancho de la pantalla
    justifyContent: 'center',
    alignItems: 'center',
  },
  carruselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },

  //estilos de la barra de busqueda***********************
  /*searchContainer: {
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15
  },
  searchPlaceholder: {
    color: '#888',
    fontSize: 16
  },*/

  sectionContainer: {
    marginBottom: 15
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  seeAll: {
    color: '#888',
    fontSize: 14
  },
  categoriesContainer: {
    paddingHorizontal: 10
  },
  categoryItem: {
    marginHorizontal: 5,
    alignItems: 'center'
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  categoryName: {
    marginTop: 5,
    fontSize: 12
  },
  productsContainer: {
    paddingHorizontal: 10
  },
  productItem: {
    marginHorizontal: 5,
    width: 150
  },
  productImage: {
    width: 150,
    height: 200,
    borderRadius: 10
  },
  productName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '500'
  },
  productPrice: {
    fontSize: 14,
    color: '#888'
  },

});

export default HomeScreen;