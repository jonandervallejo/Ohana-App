import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Alert,
  FlatList,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, AntDesign, MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProductImage {
  id: string | number;
  url?: string;
  ruta?: string;
  orden?: number;
}

interface Product {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
  imagenes: any[];
  talla: string;
  tipo: string;
  categoria: {
    id: number;
    nombre_cat: string;
    descripcion: string;
  };
}

const { width, height } = Dimensions.get('window');

const ProductDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList | null>(null);
  const router = useRouter();

  // Verificar si el usuario está logueado
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  // Obtener detalles del producto
  useEffect(() => {
    checkLoginStatus();
    
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`http://ohanatienda.ddns.net:8000/api/productos/${id}`);
        console.log("Respuesta del API:", JSON.stringify(response.data));
        setProduct(response.data);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setError('No se pudo cargar la información del producto');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  // Preparar imágenes para el carrusel
  const getAllImages = () => {
    if (!product) return [];

    // Imagen principal siempre al inicio
    const mainImageUrl = `http://ohanatienda.ddns.net:8000/${product.imagen}`;
    const mainImage = { 
      id: 'main',
      url: mainImageUrl
    };
    
    // Si hay imágenes adicionales, agregarlas
    let additionalImages: ProductImage[] = [];
    
    if (product.imagenes && Array.isArray(product.imagenes) && product.imagenes.length > 0) {
      additionalImages = product.imagenes.map((img: any, index: number) => {
        // Comprobamos si la imagen tiene el formato del backend (con campo 'ruta')
        if (img && img.ruta) {
          return {
            id: img.id || `carousel-${img.orden || index}`,
            url: `http://ohanatienda.ddns.net:8000/${img.ruta}`
          };
        } 
        // Si ya tiene el formato del frontend (con campo 'url')
        else if (img && img.url) {
          return {
            id: img.id || `carousel-${index}`,
            url: img.url.startsWith('http') ? img.url : `http://ohanatienda.ddns.net:8000/${img.url}`
          };
        }
        // Si es solo un string (url directa)
        else if (typeof img === 'string') {
          return {
            id: `img-${Math.random().toString(36).substr(2, 9)}`,
            url: img.startsWith('http') ? img : `http://ohanatienda.ddns.net:8000/${img}`
          };
        }
        return null;
      }).filter(img => img !== null);
    }
    
    // Para el carrusel necesitamos al menos varias imágenes
    let carouselImages;
    
    if (additionalImages.length > 0) {
      carouselImages = [mainImage, ...additionalImages];
    } else {
      // Si no hay imágenes adicionales, duplicar la principal
      carouselImages = [
        mainImage,
        { id: 'duplicate-1', url: mainImageUrl },
        { id: 'duplicate-2', url: mainImageUrl }
      ];
    }
    
    return carouselImages;
  };

  const handleThumbnailPress = (index: number) => {
    setActiveIndex(index);
    carouselRef.current?.scrollToOffset({offset: index * width, animated: true});
  };

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(2)} €`;
  };

  const handleShare = async () => {
    if (!product) return;
    
    try {
      await Share.share({
        message: `¡Mira este producto en Ohana! ${product.nombre} - ${formatPrice(product.precio)}`,
        title: product.nombre,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      Alert.alert(
        '🛒 Carrito',
        'Inicia sesión para añadir productos a tu carrito y acceder a todas las funcionalidades de la tienda.',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/(tabs)/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }
    
    Alert.alert(
      "Añadido al carrito",
      `${quantity} ${quantity > 1 ? 'unidades' : 'unidad'} de ${product?.nombre} ${quantity > 1 ? 'han sido añadidas' : 'ha sido añadida'} al carrito.`,
      [{ text: "OK" }]
    );
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      Alert.alert(
        '💳 Compra',
        'Inicia sesión para comprar productos y acceder a todas las funcionalidades de la tienda.',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/(tabs)/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }
    
    Alert.alert(
      "Proceder al pago",
      `Continuar con la compra de ${quantity} ${quantity > 1 ? 'unidades' : 'unidad'} de ${product?.nombre}`,
      [{ text: "Continuar" }]
    );
  };

  const handleToggleFavorite = () => {
    if (!isLoggedIn) {
      Alert.alert(
        '⭐ Favoritos',
        'Inicia sesión para guardar tus productos favoritos y acceder a todas las funcionalidades de la tienda.',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/(tabs)/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }
    
    setIsFavorite(!isFavorite);
    
    if (!isFavorite) {
      Alert.alert(
        "Añadido a favoritos",
        `${product?.nombre} se ha añadido a tus favoritos`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Eliminado de favoritos",
        `${product?.nombre} se ha eliminado de tus favoritos`,
        [{ text: "OK" }]
      );
    }
  };

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Header estilo boutique */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonContainer} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color="#4F4539" />
          </TouchableOpacity>
          
          <View style={styles.headerRightButtons}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleToggleFavorite}
            >
              <AntDesign 
                name={isFavorite ? "heart" : "hearto"} 
                size={22} 
                color={isFavorite ? "#C8644C" : "#4F4539"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="#4F4539" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A4907C" />
            <Text style={styles.loadingText}>Cargando producto...</Text>
          </View>
        ) : error || !product ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={50} color="#A4907C" />
            <Text style={styles.errorText}>{error || 'No se encontró el producto'}</Text>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Carrusel de imágenes elegante */}
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={carouselRef}
                  data={getAllImages()}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  onMomentumScrollEnd={(event) => {
                    const slideIndex = Math.floor(
                      event.nativeEvent.contentOffset.x / width + 0.5
                    );
                    setActiveIndex(slideIndex);
                  }}
                  renderItem={({ item, index }) => (
                    <View style={styles.imageSlide}>
                      <View style={index === 0 ? styles.coverImageWrapper : styles.imageWrapper}>
                        <Image 
                          source={{ uri: item.url }}
                          style={styles.productImage}
                          resizeMode="contain"
                          accessible={true}
                          accessibilityLabel={`Imagen de ${product.nombre}`}
                          accessibilityRole="image"
                        />
                      </View>
                    </View>
                  )}
                />
                
                {/* Indicadores del carrusel */}
                <View style={styles.paginationContainer}>
                  {getAllImages().map((_, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.paginationDot,
                        activeIndex === index && styles.paginationDotActive
                      ]}
                      onPress={() => handleThumbnailPress(index)}
                      accessible={true}
                      accessibilityLabel={`Ver imagen ${index + 1} de ${getAllImages().length}`}
                      accessibilityRole="button"
                    />
                  ))}
                </View>
              </View>

              {/* Información del producto con diseño elegante */}
              <View style={styles.productInfoSection}>
                {/* Nombre y precio con diseño de boutique */}
                <Text style={styles.categoryLabel}>{product.categoria.nombre_cat}</Text>
                <Text style={styles.productName}>{product.nombre}</Text>
                <Text style={styles.productPrice}>{formatPrice(product.precio)}</Text>
                
                {/* Línea decorativa */}
                <View style={styles.divider} />
                
                {/* Características principales */}
                <View style={styles.featuresContainer}>
                  {product.talla && (
                    <View style={styles.featureItem}>
                      <Text style={styles.featureLabel}>TALLA</Text>
                      <Text style={styles.featureValue}>{product.talla}</Text>
                    </View>
                  )}
                  
                  {product.tipo && (
                    <View style={styles.featureItem}>
                      <Text style={styles.featureLabel}>TIPO</Text>
                      <Text style={styles.featureValue}>{product.tipo}</Text>
                    </View>
                  )}
                </View>
                
                {/* Selector de cantidad elegante */}
                <View style={styles.quantitySection}>
                  <Text style={styles.sectionTitle}>Cantidad</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity 
                      style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                      onPress={decreaseQuantity}
                      disabled={quantity === 1}
                      accessible={true}
                      accessibilityLabel="Disminuir cantidad"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: quantity === 1 }}
                    >
                      <Text style={[styles.quantityButtonText, quantity === 1 && styles.quantityButtonTextDisabled]}>−</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityValueText}>{quantity}</Text>
                    
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={increaseQuantity}
                      accessible={true}
                      accessibilityLabel="Aumentar cantidad"
                      accessibilityRole="button"
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Línea decorativa */}
                <View style={styles.divider} />
                
                {/* Descripción del producto */}
                <View style={styles.descriptionContainer}>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.descriptionText}>
                    {product.descripcion || "No hay descripción disponible para este producto."}
                  </Text>
                </View>
                
                {/* Información de envío elegante */}
                <View style={styles.shippingInfoContainer}>
                  <View style={styles.shippingInfoItem}>
                    <MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#A4907C" />
                    <View style={styles.shippingInfoText}>
                      <Text style={styles.shippingInfoTitle}>Envío gratuito</Text>
                      <Text style={styles.shippingInfoDescription}>En pedidos superiores a 50€</Text>
                    </View>
                  </View>
                  
                  <View style={styles.shippingInfoItemLast}>
                    <MaterialIcons name="replay" size={22} color="#A4907C" />
                    <View style={styles.shippingInfoText}>
                      <Text style={styles.shippingInfoTitle}>Devoluciones gratuitas</Text>
                      <Text style={styles.shippingInfoDescription}>Durante 30 días</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Espaciador para los botones fijos */}
              <View style={styles.buttonSpacer} />
            </ScrollView>
            
            {/* Botones de acción con diseño elegante */}
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity 
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                accessible={true}
                accessibilityLabel="Añadir al carrito"
                accessibilityRole="button"
              >
                <Ionicons name="cart-outline" size={18} color="#A4907C" style={{marginRight: 8}} />
                <Text style={styles.addToCartText}>AÑADIR AL CARRITO</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.buyNowButton}
                onPress={handleBuyNow}
                accessible={true}
                accessibilityLabel="Comprar ahora"
                accessibilityRole="button"
              >
                <Text style={styles.buyNowText}>COMPRAR AHORA</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFDC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1EFDC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4F4539',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1EFDC',
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    marginBottom: 25,
    fontSize: 14,
    color: '#4F4539',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#A4907C',
    borderRadius: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
    backgroundColor: '#F1EFDC',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(164, 144, 124, 0.2)',
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerRightButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    height: width * 1.1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  imageSlide: {
    width: width,
    height: width * 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    width: width * 0.85,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageWrapper: {
    width: width * 0.95,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9D0C1',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#A4907C',
    width: 18,
    borderRadius: 3,
  },
  productInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#8D8D8D',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#4F4539',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A4907C',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(164, 144, 124, 0.2)',
    marginVertical: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureItem: {
    marginRight: 32,
  },
  featureLabel: {
    fontSize: 10,
    color: '#8D8D8D',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureValue: {
    fontSize: 14,
    color: '#4F4539',
    fontWeight: '500',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F4539',
    letterSpacing: 0.5,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#C8B6A6',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  quantityButtonDisabled: {
    borderColor: '#D9D0C1',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4F4539',
  },
  quantityButtonTextDisabled: {
    color: '#D9D0C1',
  },
  quantityValueText: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#4F4539',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4F4539',
    marginTop: 12,
    letterSpacing: 0.2,
  },
  shippingInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 60,
  },
  shippingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  shippingInfoItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Aumentado a 120px para dar más espacio en blanco
    paddingVertical: 4,
  },
  shippingInfoText: {
    marginLeft: 16,
    flex: 1,
  },
  shippingInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F4539',
    marginBottom: 2,
  },
  shippingInfoDescription: {
    fontSize: 12,
    color: '#8D8D8D',
  },
  buttonSpacer: {
    height: 100,
  },
  actionButtonContainer: {
    flexDirection: 'column',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(164, 144, 124, 0.2)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  addToCartButton: {
    backgroundColor: 'rgba(196, 176, 152, 0.12)',
    borderRadius: 6,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addToCartText: {
    color: '#A4907C',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  buyNowButton: {
    backgroundColor: '#A4907C',
    borderRadius: 6,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  }
});

export default ProductDetail;