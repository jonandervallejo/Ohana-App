import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, ActivityIndicator,
Modal, Pressable, Alert, TextInput, NativeSyntheticEvent, NativeScrollEvent, FlatList, Keyboard, ImageBackground, Animated, Platform,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';

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

interface SearchResult extends Product {
  imagen_url?: string;
}

const { width } = Dimensions.get('window');

// ********************************ELIMINAR TODO LO QUE SE SAQUE DESDE LOCAL************************************
const DEFAULT_IMAGE = require('@/assets/images/camiseta1.jpg');
const CATEGORY_IMAGES = {
  bolso: require('@/assets/images/bolso.jpg'),
  falda: require('@/assets/images/falda.jpg'),
  jersey: require('@/assets/images/camisa1.jpg'),
  camiseta: require('@/assets/images/camiseta1.jpg'),
  pantalon: require('@/assets/images/pantalon1.jpg'),
  vestido: require('@/assets/images/falda1.jpg'),
  abrigo: require('@/assets/images/camisa1.jpg'),
  zapato: require('@/assets/images/accesorio1.jpg'),
  accesorio: require('@/assets/images/accesorio.jpg'),
  chaqueta: require('@/assets/images/chaqueta.jpg')
};

//dominio para llamadas a la API
const API_BASE_URL = 'https://ohanatienda.ddns.net';

// Sistema global de caché de imágenes mejorado
const ImageCache = {
  failedImages: new Set<string>(),
  validImages: new Set<string>(), // Añadido para almacenar URLs válidas
  markAsFailed: (url: string) => {
    // Evitar añadir URLs vacías o undefined
    if (url && url.trim() !== '') {
      ImageCache.failedImages.add(url);
    }
  },
  markAsValid: (url: string) => {
    if (url && url.trim() !== '') {
      ImageCache.validImages.add(url);
    }
  },
  hasFailed: (url: string) => {
    return !url || url.trim() === '' || ImageCache.failedImages.has(url);
  },
  isValid: (url: string) => {
    return url && url.trim() !== '' && ImageCache.validImages.has(url);
  },
  reset: () => {
    ImageCache.failedImages.clear();
    ImageCache.validImages.clear();
  }
};

// Función mejorada para normalizar URLs de imágenes
const normalizeImageUrl = (imageUrl: string): string => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  
  try {
    imageUrl = imageUrl.trim();
 
    // Si la URL ya incluye la base completa, úsala como está
    if (imageUrl.startsWith('https')) {
      //console.log('entra al if***************')
      return imageUrl;
    }

    return `${API_BASE_URL}${imageUrl}`; 
    
  } catch (error) {  
    console.error('Error normalizando URL:', error, 'URL original:', imageUrl);
    return '';
  }
};
 
// Componente optimizado para renderizar imágenes con fallback
const SafeImage = ({ 
  source, 
  fallbackSource = DEFAULT_IMAGE,
  style,
  resizeMode = "cover",
  onError,
  imageKey
}: { 
  source: any, 
  fallbackSource?: any,
  style: any,
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center",
  onError?: () => void,
  imageKey?: string | number
}) => {
  const [hasError, setHasError] = useState(false);
  
  // Si la fuente es una URL y ya sabemos que falla, mostrar directamente el fallback
  const isRemoteSource = source && typeof source === 'object' && source.uri;
  const sourceUri = isRemoteSource ? source.uri : null;
  const useDirectFallback = isRemoteSource && ImageCache.hasFailed(sourceUri);
  
  if (useDirectFallback) {
    return <Image source={fallbackSource} style={style} resizeMode={resizeMode} />;
  }
  
  return (
    <ImageBackground
      source={fallbackSource}
      style={style}
      resizeMode={resizeMode}
    >
      {!hasError && isRemoteSource && (
        <Image 
          source={source}
          style={[style, { position: 'absolute', top: 0, left: 0 }]}
          resizeMode={resizeMode}
          onError={() => {
            setHasError(true);
            if (sourceUri) {
              ImageCache.markAsFailed(sourceUri);
            }
            if (onError) onError();
          }}
          onLoad={() => {
            if (sourceUri) {
              ImageCache.markAsValid(sourceUri);
            }
          }}
        />
      )}
    </ImageBackground>
  );
};

// Nuevo componente UserAvatar con indicador de autenticación elegante
const UserAvatar = ({ 
  isAuthenticated, 
  userData, 
  onPress 
}: { 
  isAuthenticated: boolean, 
  userData: { nombre?: string, email?: string } | null,
  onPress: () => void 
}) => {
  // Animación para el efecto de brillo
  const shineAnim = useRef(new Animated.Value(0)).current;
  
  // Animación al autenticar
  useEffect(() => {
    if (isAuthenticated) {
      // Crear efecto de brillo al autenticar
      Animated.loop(
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
      
      // Detener la animación después de unos segundos
      const timer = setTimeout(() => {
        shineAnim.stopAnimation();
        shineAnim.setValue(0);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Función para obtener nombre corto del usuario
  const getShortName = () => {
    if (!userData || !userData.nombre) return '';
    
    // Dividir el nombre y obtener la primera palabra (primer nombre)
    const firstName = userData.nombre.split(' ')[0];
    
    // Si es demasiado largo, acortarlo
    return firstName.length > 8 ? firstName.substring(0, 8) + '...' : firstName;
  };
  
  return (
    <TouchableOpacity 
      style={[styles.userAvatarContainer, isAuthenticated && styles.userAvatarAuthenticated]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Efecto de brillo cuando está autenticado */}
      {isAuthenticated && (
        <Animated.View 
          style={[
            styles.avatarShineEffect,
            {
              opacity: shineAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.6, 0],
              }),
              transform: [{
                translateX: shineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 70],
                }),
              }],
            }
          ]}
        />
      )}
      
      {/* Icono o indicador de usuario */}
      <View style={styles.userAvatarIconContainer}>
        <FontAwesome5 
          name="user" 
          size={isAuthenticated ? 16 : 18} 
          color={isAuthenticated ? "#333" : "#666"} 
          solid={isAuthenticated}
        />
      </View>
      
      {/* Nombre del usuario o texto "Mi Cuenta" */}
      {isAuthenticated ? (
        <Text style={styles.userAvatarText}>
          {getShortName()}
        </Text>
      ) : (
        <Text style={styles.userAvatarText}>Mi Cuenta</Text>
      )}
      
      {/* Indicador de estado de autenticación */}
      {isAuthenticated && (
        <View style={styles.authIndicator} />
      )}
    </TouchableOpacity>
  );
};

const Carrusel = ({ scrollRef }: { scrollRef: React.RefObject<ScrollView> }) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/productos/imagenes`);
        if (response.data && Array.isArray(response.data)) {
          const processedImages = response.data.map((img: ImageData) => {
            // Extraer solo el nombre del archivo de la ruta
            const imageName = img.imagen ? img.imagen.split('/').pop() : '';
            return {
              ...img,
              imagen: normalizeImageUrl(`/uploads/productos/${imageName}`)
            };
          });
          setImages(processedImages);
        } else {
          throw new Error('Formato de respuesta inválido');
        }
      } catch (error) {
        console.error('Error obteniendo imágenes del carrusel:', error);
        // Usar placeholders como fallback
        setImages([
          { id: 1, nombre: 'Producto destacado', imagen: '' },
          { id: 2, nombre: 'Oferta especial', imagen: '' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Manejar errores de carga de imagen
  const handleImageError = (imageId: number) => {
    // Si ya registramos este error, no hacer nada
    if (!imageErrors[imageId]) {
      console.warn(`Error en imagen del carrusel ID: ${imageId}`);
      
      // Marcar esta imagen como errónea
      setImageErrors(prev => ({ ...prev, [imageId]: true }));
    }
  };

  // Efecto para que el carrusel cambie de imagen cada 4 segundos
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
      }, 4000);

      return () => clearInterval(timer);
    }
  }, [loading, images.length]);

  return (
    <View style={styles.carruselWrapper}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Cargando imágenes...</Text>
        </View>
      ) : (
        <>
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
                <SafeImage
                  source={{ uri: image.imagen }}
                  fallbackSource={DEFAULT_IMAGE}
                  style={styles.carruselImage}
                  resizeMode="cover"
                  onError={() => handleImageError(image.id)}
                  imageKey={image.id}
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
        </>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedImage && (
              <SafeImage
                source={{ uri: selectedImage.imagen }}
                fallbackSource={DEFAULT_IMAGE}
                style={styles.enlargedImage}
                resizeMode="contain"
                onError={() => handleImageError(selectedImage.id)}
                imageKey={selectedImage.id}
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
  const [productImageErrors, setProductImageErrors] = useState<{[key: number]: boolean}>({});
  
  // Estados para la búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados para el usuario
  const [userData, setUserData] = useState<{ nombre?: string, email?: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
   
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const productsScrollRef = useRef<ScrollView>(null);
  const carruselScrollRef = useRef<ScrollView>(null);

  // Verificación de autenticación mejorada
  useFocusEffect(
    React.useCallback(() => {
      // Verificar autenticación
      const checkUserAuthentication = async () => {
        try {
          console.log("Verificando autenticación...");
          const token = await AsyncStorage.getItem('userToken');
          const userDataStr = await AsyncStorage.getItem('userData');
          
          if (token && userDataStr) {
            try {
              const userDataObj = JSON.parse(userDataStr);
              console.log("Datos de usuario encontrados:", userDataObj);
              setUserData(userDataObj);
              setIsAuthenticated(true);
            } catch (parseError) {
              console.error("Error al analizar datos de usuario:", parseError);
              setIsAuthenticated(false);
              setUserData(null);
            }
          } else {
            console.log("No se encontró token o datos de usuario");
            setIsAuthenticated(false);
            setUserData(null);
          }
        } catch (error) {
          console.error('Error al verificar autenticación:', error);
          setIsAuthenticated(false);
          setUserData(null);
        }
      };
      
      checkUserAuthentication();
      
      // Limpiar caché de imágenes al volver a la pantalla
      ImageCache.reset();
      setProductImageErrors({});
      
      // Resto del código existente
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      
      if (categories.length > 0) {
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
      
      // Reset search state
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
      
    }, [categories, products])
  );

  // Función para buscar productos
  const searchProducts = async (query: string) => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      // Busca tanto en productos de Hombre como de Mujer
      const response = await axios.get(`${API_BASE_URL}/api/productos/buscar?q=${encodeURIComponent(query)}`);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedResults = response.data.map((product: any) => ({
          ...product,
          imagen_url: normalizeImageUrl(product.imagen)
        }));
        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error buscando productos:', error);
      setSearchResults([]);
      
      // Mostrar mensaje al usuario
      Alert.alert(
        "Error de búsqueda",
        "No se pudo conectar con el servidor. Por favor, intenta más tarde.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Función para manejar la navegación al seleccionar un producto desde búsqueda
  const handleProductSelect = (product: SearchResult) => {
    Keyboard.dismiss();
    setShowResults(false);
    setSearchQuery('');
    
    // Navegar a la página de detalles del producto
    router.push({
      pathname: '/detalles',
      params: { id: product.id.toString() }
    });
  };
  
  // Función para manejar cambios en la búsqueda con debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Debounce para evitar llamadas API excesivas
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchProducts(text);
    }, 300);
  };
  
  // Cerrar resultados al hacer clic fuera
  const handlePressOutside = () => {
    Keyboard.dismiss();
    setShowResults(false);
  };
  
  // Limpiar el timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Función optimizada para obtener imágenes por categoría
  const getCategoryImage = (categoryName: string) => {
    try {
      if (!categoryName) return DEFAULT_IMAGE;
      
      // Convertir a minúsculas para comparación sin distinción de mayúsculas/minúsculas
      const name = categoryName.toLowerCase();
      
      // Buscar coincidencia en las claves del objeto CATEGORY_IMAGES
      for (const key of Object.keys(CATEGORY_IMAGES)) {
        if (name.includes(key)) {
          return CATEGORY_IMAGES[key as keyof typeof CATEGORY_IMAGES];
        }
      }
      
      // Default image si no coincide con ninguna categoría conocida
      return DEFAULT_IMAGE;
    } catch (error) {
      console.error(`Error cargando imagen para categoría '${categoryName}':`, error);
      return DEFAULT_IMAGE;
    }
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
      console.log('Obteniendo categorías...');
      const response = await axios.get(`${API_BASE_URL}/api/categorias`);
      
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.error('Formato de respuesta inválido:', response.data);
        setErrorCategories('Formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      setErrorCategories('Error al cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  const formatPrice = (price: string) => {
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return '0.00 €';
      return `${numPrice.toFixed(2)} €`;
    } catch (e) {
      return '0.00 €';
    }
  };

  const shouldRotateProducts = () => {
    if (!lastRotationDate) return true;
    const lastDate = new Date(lastRotationDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  };

  const rotateProducts = (allProducts: Product[]) => {
    if (!allProducts || allProducts.length === 0) return [];
    
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const startIndex = dayOfYear % Math.max(1, allProducts.length);
    
    return [
      ...allProducts.slice(startIndex, Math.min(startIndex + 3, allProducts.length)),
      ...allProducts.slice(0, Math.max(0, 3 - (allProducts.length - startIndex)))
    ].filter(product => product); // Filtrar undefined/null
  };

  const fetchProducts = async () => {
    try {
      console.log('Obteniendo productos...');
      const response = await axios.get(`${API_BASE_URL}/api/productos`);
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const allProducts = response.data.data;
        if (shouldRotateProducts()) {
          const rotatedProducts = rotateProducts(allProducts);
          setProducts(rotatedProducts);
          setLastRotationDate(new Date().toISOString());
        } else {
          // Si no es hora de rotar, mantener los productos actuales
          if (products.length === 0) {
            setProducts(allProducts.slice(0, Math.min(3, allProducts.length)));
          }
        }
      } else {
        console.error('Formato de respuesta inválido:', response.data);
        setErrorProducts('Formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      setErrorProducts('Error al cargar los productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Manejar errores de carga de imagen para productos
  const handleProductImageError = (productId: number) => {
    if (!productImageErrors[productId]) {
      console.warn(`Error en imagen de producto ID: ${productId}`);
      setProductImageErrors(prev => ({ ...prev, [productId]: true }));
    }
  };

  const handleCategoryPress = (categoryName: string, categoryId: number) => {
    console.log(`Navegando a categoría: ${categoryName} (ID: ${categoryId})`);
    // Navegar a la pantalla de tienda con parámetros de categoría
    router.push({
      pathname: '/(tabs)/tienda',
      params: { 
        categoryId: categoryId,
        categoryName: categoryName,
        timestamp: Date.now() // Añadir timestamp para forzar reset de estados
      }
    });
  };

  // Función para manejar el clic en productos destacados
  const handleProductPress = (product: Product) => {
    // Navegar a la página de detalles del producto
    router.push({
      pathname: '/detalles',
      params: { id: product.id.toString() }
    });
  };

  // Función para manejar la navegación al perfil del usuario de forma segura
  const handleProfileNavigation = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        console.log("Navegando a usuario-perfil");
        router.push('/usuario-perfil');
      } else {
        console.log("Navegando a registro (login)");
        router.push('/registro');
      }
    } catch (error) {
      console.error("Error al verificar autenticación:", error);
      // En caso de error, ir a la pantalla de registro
      router.push('/registro');
    }
  };

  return (
  <SafeAreaView style={styles.safeArea}>
    <Stack.Screen options={{ headerShown: false }} />
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
              placeholder="Buscar productos"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim() !== '') {
                  setShowResults(true);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                }}
                style={styles.clearButton}
              >
                <FontAwesome5 name="times" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Componente UserAvatar */}
          <UserAvatar 
            isAuthenticated={isAuthenticated}
            userData={userData}
            onPress={handleProfileNavigation}
          />
        </View>
        
        {/* Resultados de búsqueda */}
        {showResults && (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <View style={styles.loadingResults}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Buscando...</Text>
              </View>
            ) : searchResults.length === 0 ? (
              <Text style={styles.noResultsText}>
                {searchQuery.trim() !== '' ? 'No se encontraron productos' : ''}
              </Text>
            ) : (
              <FlatList
                data={searchResults.slice(0, 6)} // Mostrar máximo 6 resultados
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const imageUrl = item.imagen_url || normalizeImageUrl(item.imagen);
                  
                  return (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => handleProductSelect(item)}
                    >
                      <SafeImage
                        source={{ uri: imageUrl }}
                        style={styles.searchResultImage}
                        resizeMode="cover"
                        imageKey={`search-${item.id}`}
                      />
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {item.nombre}
                        </Text>
                        <Text style={styles.searchResultPrice}>
                          {formatPrice(item.precio)}
                        </Text>
                      </View>
                      <FontAwesome5 name="chevron-right" size={12} color="#999" />
                    </TouchableOpacity>
                  );
                }}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  searchResults.length > 6 ? (
                    <TouchableOpacity
                      style={styles.viewAllContainer}
                      onPress={() => {
                        router.push({
                          pathname: '/(tabs)/tienda',
                          params: { 
                            searchQuery: searchQuery,
                            timestamp: Date.now()
                          }
                        });
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.viewAllText}>
                        Ver todos los resultados ({searchResults.length})
                      </Text>
                      <FontAwesome5 name="arrow-right" size={12} color="#007AFF" />
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}
      </View>

      {/* Overlay para cerrar resultados al hacer clic fuera */}
      {showResults && (
        <Pressable
          style={styles.overlay}
          onPress={handlePressOutside}
        />
      )}

      <ScrollView 
        ref={mainScrollRef}
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 70 } // Espacio para compensar el header fijo
        ]}
        onScrollBeginDrag={() => {
          Keyboard.dismiss();
          setShowResults(false);
        }}
      >
        {/* Carrusel */}
        <Carrusel scrollRef={carruselScrollRef as React.RefObject<ScrollView>} />

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
                  ImageCache.reset(); // Resetear caché al reintentar
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
                      source={getCategoryImage(category.nombre_cat)} 
                      style={styles.categoryImage}
                      resizeMode="cover"
                    />
                    <View style={styles.categoryOverlay} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.nombre_cat}
                  </Text>
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
                  ImageCache.reset(); // Resetear caché al reintentar
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
                  <SafeImage 
                    source={{ uri: normalizeImageUrl(product.imagen) }}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={() => handleProductImageError(product.id)}
                    imageKey={`product-${product.id}`}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.nombre}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatPrice(product.precio)}
                    </Text>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
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
  clearButton: {
    padding: 5,
  },
  // NUEVOS ESTILOS PARA EL AVATAR DE USUARIO
  userAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  userAvatarAuthenticated: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#cce5ff',
  },
  userAvatarIconContainer: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  authIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  avatarShineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Estilos para los resultados de búsqueda
  searchResultsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 350,
  },
  searchResultsList: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  searchResultPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loadingResults: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 14,
  },
  noResultsText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewAllText: {
    color: '#007AFF',
    marginRight: 5,
    fontSize: 14,
  },
  // Estilos del carrusel
  carruselWrapper: {
    height: 250,
    marginHorizontal: 15,
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f0f0f0',
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