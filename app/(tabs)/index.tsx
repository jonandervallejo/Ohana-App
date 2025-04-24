import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';


interface ImageData {
  id: number;
  nombre: string;
  imagen: string;
  precio?: number;
  precio_formateado?: string;
}

interface Category {
  id: number;
  nombre_cat: string;
  descripcion: string;
  created_at: string | null;
  updated_at: string | null;
  key?: string;
}

interface Product {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
  categoria: {
    id: number;
    nombre_cat: string;
    descripcion: string;
  };
  key?: string; 
}

type CategoryName = 'Accesorios' | 'Faldas' | 'Jerseys' | 'Camisetas' | 'Pantalones' | 'Vestidos' | 'Abrigos' | 'Zapatos';

interface CategoryImages {
  [key: string]: any;
}

type IconName = 'shopping-bag' | 'tshirt' | 'shoe-prints' | 'hoodie' | 'socks' | 'hat-cowboy';

interface CategoryIcons {
  [key: string]: IconName;
}

const { width } = Dimensions.get('window');

const Carrusel = ({ scrollRef }: { scrollRef: React.RefObject<ScrollView> }) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get('http://ohanatienda.ddns.net:8000/api/productos/imagenes');
        const processedImages = response.data.map((img: ImageData) => ({
          ...img,
          imagen: `http://ohanatienda.ddns.net:8000/uploads/productos/${img.imagen.split('/').pop()}`
        }));
        {/*console.log('URLs de imágenes procesadas:', processedImages.map((img: ImageData) => img.imagen)); */}
        setImages(processedImages);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching images:', error);
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  //efecto para que el carrusel cambie de imagen cada 3 segundos
  useEffect(() => {
    if (!loading && images.length > 0) {
      const containerWidth = width - 30; // Ancho real del contenedor
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % images.length;
          scrollRef.current?.scrollTo({
            x: nextIndex * containerWidth,
            animated: true
          });
          return nextIndex;
        });
      }, 4000); //cambiar imagen cada 4 segundos

      return () => clearInterval(timer);
    }
  }, [loading, images.length]);

  return (
    <View style={styles.carruselWrapper}>
      <ScrollView 
        ref={scrollRef}
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false} 
        style={styles.carruselContainer}
        onMomentumScrollEnd={(event) => {
          const containerWidth = width - 30;
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
          setCurrentIndex(newIndex);
        }}
      >
        {images.map((image) => (
          <TouchableOpacity 
            key={image.id} 
            style={styles.imageContainer}
            onPress={() => {
              setSelectedImage(image);
              setModalVisible(true);
            }}
          >
            <Image 
              source={{ uri: image.imagen }}
              style={styles.carruselImage} 
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageTitle}>{image.nombre}</Text>             
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.paginationContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage.imagen }}
                style={styles.enlargedImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.enlargedImageTitle}>{selectedImage?.nombre}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const HomeScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [infiniteCategories, setInfiniteCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [infiniteProducts, setInfiniteProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState<string | null>(null);
  const [lastRotationDate, setLastRotationDate] = useState<string | null>(null);
  const [isAutoScrollingCategories, setIsAutoScrollingCategories] = useState(false);
  const [isAutoScrollingProducts, setIsAutoScrollingProducts] = useState(false);
  
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const productsScrollRef = useRef<ScrollView>(null);
  const carruselScrollRef = useRef<ScrollView>(null);

  // Reset all scrolls when returning to the page
  useFocusEffect(
    React.useCallback(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      
      // Scrolls para los nuevos ScrollViews infinitos
      if (categories.length > 0) {
        // Inicio en la posición central (los elementos originales)
        setTimeout(() => {
          categoriesScrollRef.current?.scrollTo({ 
            x: calculateScrollOffset(categories.length), 
            animated: false 
          });
        }, 100);
      }
      
      if (products.length > 0) {
        setTimeout(() => {
          productsScrollRef.current?.scrollTo({ 
            x: calculateScrollOffset(products.length, 160 + 16), 
            animated: false 
          });
        }, 100);
      }
    }, [categories, products])
  );

  // Imágenes para las categorías
  const categoryImages: CategoryImages = {
    'Bolsos': require('@/assets/images/bolso.jpg'),
    'Faldas': require('@/assets/images/falda.jpg'),
    'Jerseys': require('@/assets/images/camisa1.jpg'),
    'Camisetas': require('@/assets/images/camiseta1.jpg'),
    'Pantalones': require('@/assets/images/pantalon1.jpg'),
    'Vestidos': require('@/assets/images/falda1.jpg'),
    'Abrigos': require('@/assets/images/camisa1.jpg'),
    'Zapatos': require('@/assets/images/accesorio1.jpg'),
    'Accesorios': require('@/assets/images/accesorio.jpg'),
    'Chaquetas': require('@/assets/images/chaqueta.jpg'),
  };

  // Función para calcular el offset de desplazamiento
  const calculateScrollOffset = (itemsCount: number, itemWidth: number = 90 + 16) => {
    return itemsCount * itemWidth;
  };

  // Crear listas infinitas duplicando elementos
  useEffect(() => {
    if (categories.length > 0) {
      // Triplicamos las categorías: una copia al principio, el original, y una copia al final
      const triplicated = [
        ...categories.map(cat => ({ ...cat, key: `pre-${cat.id}` })), 
        ...categories,
        ...categories.map(cat => ({ ...cat, key: `post-${cat.id}` }))
      ];
      setInfiniteCategories(triplicated);
      
      // Iniciar en la posición central después de un breve retraso
      setTimeout(() => {
        categoriesScrollRef.current?.scrollTo({ 
          x: calculateScrollOffset(categories.length), 
          animated: false 
        });
      }, 100);
    }
  }, [categories]);

  useEffect(() => {
    if (products.length > 0) {
      // Triplicamos los productos
      const triplicated = [
        ...products.map(prod => ({ ...prod, key: `pre-${prod.id}` })), 
        ...products,
        ...products.map(prod => ({ ...prod, key: `post-${prod.id}` }))
      ];
      setInfiniteProducts(triplicated);
      
      // Iniciar en la posición central después de un breve retraso
      setTimeout(() => {
        productsScrollRef.current?.scrollTo({ 
          x: calculateScrollOffset(products.length, 160 + 16), 
          animated: false 
        });
      }, 100);
    }
  }, [products]);

  const handleCategoriesScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isAutoScrollingCategories || categories.length === 0) return;

    const contentOffset = event.nativeEvent.contentOffset.x;
    const itemWidth = 90 + 16; // Ancho de categoría + margen
    const originalSetWidth = categories.length * itemWidth;
    
    // Si ha llegado al principio del set duplicado
    if (contentOffset < itemWidth) {
      setIsAutoScrollingCategories(true);
      // Saltar al final del set original
      setTimeout(() => {
        categoriesScrollRef.current?.scrollTo({
          x: originalSetWidth + contentOffset,
          animated: false
        });
        setIsAutoScrollingCategories(false);
      }, 10);
    } 
    // Si ha llegado al final del set duplicado
    else if (contentOffset > originalSetWidth * 2 - itemWidth) {
      setIsAutoScrollingCategories(true);
      // Saltar al inicio del set original
      setTimeout(() => {
        categoriesScrollRef.current?.scrollTo({
          x: contentOffset - originalSetWidth,
          animated: false
        });
        setIsAutoScrollingCategories(false);
      }, 10);
    }
  };

  const handleProductsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isAutoScrollingProducts || products.length === 0) return;

    const contentOffset = event.nativeEvent.contentOffset.x;
    const itemWidth = 160 + 16; // Ancho de producto + margen
    const originalSetWidth = products.length * itemWidth;
    
    // Si ha llegado al principio del set duplicado
    if (contentOffset < itemWidth) {
      setIsAutoScrollingProducts(true);
      // Saltar al final del set original
      setTimeout(() => {
        productsScrollRef.current?.scrollTo({
          x: originalSetWidth + contentOffset,
          animated: false
        });
        setIsAutoScrollingProducts(false);
      }, 10);
    } 
    // Si ha llegado al final del set duplicado
    else if (contentOffset > originalSetWidth * 2 - itemWidth) {
      setIsAutoScrollingProducts(true);
      // Saltar al inicio del set original
      setTimeout(() => {
        productsScrollRef.current?.scrollTo({
          x: contentOffset - originalSetWidth,
          animated: false
        });
        setIsAutoScrollingProducts(false);
      }, 10);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const response = await axios.get('http://ohanatienda.ddns.net:8000/api/categorias');
      console.log('Categories response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Setting categories:', response.data);
        setCategories(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setErrorCategories('Formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setErrorCategories('Error al cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(2)} €`;
  };

  const shouldRotateProducts = () => {
    if (!lastRotationDate) return true;
    const lastDate = new Date(lastRotationDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  };

  const rotateProducts = (allProducts: Product[]) => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const startIndex = dayOfYear % allProducts.length;
    return [
      ...allProducts.slice(startIndex, startIndex + 3),
      ...allProducts.slice(0, Math.max(0, 3 - (allProducts.length - startIndex)))
    ];
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await axios.get('http://ohanatienda.ddns.net:8000/api/productos');
      console.log('Products response:', response.data);
      
      if (response.data && response.data.data) {
        const allProducts = response.data.data;
        if (shouldRotateProducts()) {
          const rotatedProducts = rotateProducts(allProducts);
          console.log('Setting rotated products:', rotatedProducts);
          setProducts(rotatedProducts);
          setLastRotationDate(new Date().toISOString());
        } else {
          // Si no es hora de rotar, mantener los productos actuales
          if (products.length === 0) {
            setProducts(allProducts.slice(0, 3));
          }
        }
      } else {
        console.error('Invalid response format:', response.data);
        setErrorProducts('Formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrorProducts('Error al cargar los productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const handleCategoryPress = (categoryName: string, categoryId: number) => {
    console.log(`Navegando a categoría: ${categoryName} (ID: ${categoryId}) con timestamp: ${Date.now()}`);
    // Navegar a la pantalla de tienda con parámetros de categoría y un timestamp
    router.push({
      pathname: '/(tabs)/tienda',
      params: { 
        categoryId: categoryId,
        categoryName: categoryName,
        timestamp: Date.now() // Añadir timestamp para forzar reset de estados
      }
    });
  };

  const handleProductPress = (product: Product) => {
    Alert.alert(
      "Detalles del Producto",
      `${product.nombre}\n\n${product.descripcion}\n\nPrecio: $${product.precio}`,
      [
        {
          text: "OK",
          onPress: () => console.log("OK Pressed")
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8f8f8', '#ffffff']}
        style={styles.gradientBackground}
      >
        {/* Header fijo */}
        <View style={styles.fixedHeader}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Image 
                source={require('@/assets/images/ohanalogo.jpg')} 
                style={styles.headerLogo}
                borderRadius={25}
              />
            </TouchableOpacity>
            <View style={styles.searchContainer}>
              <FontAwesome5 name="search" size={16} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar productos..."
                placeholderTextColor="#666"
              />
            </View>
            <TouchableOpacity 
              style={styles.userIconContainer}
              onPress={() => router.push('/(tabs)/perfil')}
            >
              <FontAwesome5 name="user-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          ref={mainScrollRef}
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Carrusel */}
          <Carrusel scrollRef={carruselScrollRef} />

          {/* Sección de Categorías */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categorías</Text>
              <TouchableOpacity onPress={() => router.push({
                pathname: '/(tabs)/tienda',
                params: { timestamp: Date.now() } // Añadir timestamp para forzar reset
              })}>
                <Text style={styles.seeAll}>Ver todo</Text>
              </TouchableOpacity>
            </View>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            ) : errorCategories ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorCategories}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setLoadingCategories(true);
                    setErrorCategories(null);
                    fetchCategories();
                  }}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay categorías disponibles</Text>
              </View>
            ) : (
              <ScrollView 
                ref={categoriesScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
                onScroll={handleCategoriesScroll}
                scrollEventThrottle={16}
              >
                {infiniteCategories.map((category, index) => (
                  <TouchableOpacity 
                    key={category.key || `${category.id}-${index}`} 
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(category.nombre_cat, category.id)}
                  >
                    <View style={styles.categoryImageWrapper}>
                      <Image 
                        source={categoryImages[category.nombre_cat] || require('@/assets/images/camiseta1.jpg')} 
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                      <View style={styles.categoryOverlay} />
                    </View>
                    <Text style={styles.categoryName}>{category.nombre_cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Sección de Productos */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Productos Destacados</Text>
              <TouchableOpacity onPress={() => router.push({
                pathname: '/(tabs)/tienda',
                params: { timestamp: Date.now() } // Añadir timestamp para forzar reset
              })}>
                <Text style={styles.seeAll}>Ver todo</Text>
              </TouchableOpacity>
            </View>
            {loadingProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            ) : errorProducts ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorProducts}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setLoadingProducts(true);
                    setErrorProducts(null);
                    fetchProducts();
                  }}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay productos disponibles</Text>
              </View>
            ) : (
              <ScrollView 
                ref={productsScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsContainer}
                onScroll={handleProductsScroll}
                scrollEventThrottle={16}
              >
                {infiniteProducts.map((product, index) => (
                  <TouchableOpacity 
                    key={product.key || `${product.id}-${index}`} 
                    style={styles.productItem}
                    onPress={() => handleProductPress(product)}
                  >
                    <Image 
                      source={{ uri: `http://ohanatienda.ddns.net:8000/${product.imagen}` }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.nombre}</Text>
                      <Text style={styles.productPrice}>{formatPrice(product.precio)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 60,
  },
  headerLogo: {
    width: 80,
    height: 45,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
  },
  // Estilos del carrusel
  carruselWrapper: {
    height: 250,
    marginHorizontal: 15,
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    overflow: 'hidden',
  },
  carruselContainer: {
    height: '100%',
  },
  imageContainer: {
    width: width - 30,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carruselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  // Estilos de secciones
  sectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: '#666',
    fontSize: 14,
  },
  // Estilos de productos
  productsContainer: {
    paddingVertical: 10,
  },
  productItem: {
    marginHorizontal: 8,
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    padding: 5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  // Estilos de carga y errores
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  // Estilos de paginación
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  // Estilos de modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: '80%',
  },
  enlargedImageTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 90,
  },
  categoryImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 40,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});

export default HomeScreen;