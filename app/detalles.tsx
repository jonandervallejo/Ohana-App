import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Animated,
  TextInput,
  Keyboard,
  Pressable,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, AntDesign, MaterialIcons, MaterialCommunityIcons, Feather, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoritos } from './hooks/useFavoritos';
import { useCart } from './hooks/useCart';

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

interface SearchResult extends Product {
  imagen_url?: string;
}

// Interfaz para los Toasts personalizados
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

const { width, height } = Dimensions.get('window');

const ProductDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList | null>(null);
  const router = useRouter();
  
  // Estados para la búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  
  // Estados para el toast personalizado
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastAnimation = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<NodeJS.Timeout | number | null>(null);
  
  // Usar el hook de favoritos
  const { favoritos, loading: loadingFavoritos, esFavorito, toggleFavorito, recargarFavoritos } = useFavoritos();
  
  // Usar el hook del carrito y obtener el número de items en el carrito
  const { addToCart, refreshLoginStatus, cartItems } = useCart();
  const cartItemCount = cartItems ? cartItems.reduce((total, item) => total + item.cantidad, 0) : 0;
  
  // Función para mostrar un toast personalizado
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info', icon?: string) => {
    // Limpiar cualquier timeout existente
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    
    // Establecer el nuevo mensaje
    setToast({ message, type, icon });
    
    // Animar la entrada del toast
    Animated.timing(toastAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Configurar el timeout para ocultar el toast
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2000);
  }, [toastAnimation]);
  
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
      // Busca tanto en productos de Hombre como de mujer
      const response = await axios.get(`http://ohanatienda.ddns.net:8000/api/productos/buscar?q=${encodeURIComponent(query)}`);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedResults = response.data.map((product: any) => ({
          ...product,
          imagen_url: `http://ohanatienda.ddns.net:8000/${product.imagen}`
        }));
        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
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
    setShowSearchBar(false);
    
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
    setShowSearchBar(false);
    setSearchQuery('');
  };
  
  // Limpiar el timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);
  
  // Funciones para los iconos del header
  const navigateToSearch = () => {
    setShowSearchBar(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };
  
  const navigateToFavorites = () => {
    if (!isLoggedIn) {
      showToast('Inicia sesión para ver tus favoritos', 'info', 'heart');
      return;
    }
    
    router.push('/favoritos');
  };
  
  const navigateToCart = () => {
    if (!isLoggedIn) {
      showToast('Inicia sesión para ver tu carrito', 'info', 'cart');
      return;
    }
    
    router.push('/(tabs)/carrito');
  };

  // Verificar si el usuario está logueado
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  // Comprobar si el producto es favorito al cargar
  useEffect(() => {
    const checkIsFavorite = async () => {
      if (id && !isNaN(Number(id))) {
        const productId = Number(id);
        const isFav = favoritos.includes(productId);
        console.log(`Producto ${productId} es favorito: ${isFav}`);
        // No necesitamos esperar a AsyncStorage gracias al hook
      }
    };

    if (!loadingFavoritos) {
      checkIsFavorite();
    }
  }, [id, favoritos, loadingFavoritos]);

  // Obtener detalles del producto
  useEffect(() => {
    checkLoginStatus();
    // Recargar favoritos al entrar en la página
    recargarFavoritos();
    
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
  }, [id, recargarFavoritos]);

  // Verificar el estado de inicio de sesión cuando se monta el componente
  useEffect(() => {
    refreshLoginStatus();
  }, []);

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
    const parsedPrice = parseFloat(price);
    return `${parsedPrice.toFixed(2)} €`;
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

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Actualizar el estado de inicio de sesión antes de intentar añadir al carrito
    await refreshLoginStatus();
    
    const success = await addToCart({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagen: product.imagen,
      talla: product.talla,
      cantidad: quantity // Esta es la cantidad seleccionada
    });

    if (!success) {
      showToast('Inicia sesión para añadir productos', 'warning', 'person');
      setTimeout(() => {
        router.push('/perfil');
      }, 2000);
      return;
    }
    
    // Mensaje de éxito con toast personalizado
    showToast(
      `${quantity} ${quantity > 1 ? 'unidades' : 'unidad'} añadidas al carrito`, 
      'success', 
      'cart'
    );
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      showToast('Inicia sesión para realizar compras', 'warning', 'person');
      setTimeout(() => {
        router.push('/perfil');
      }, 2000);
      return;
    }
    
    showToast('¡Preparando tu compra!', 'info', 'card');
    // Aquí iría la lógica para proceder al pago
  };

  // Función actualizada para manejar favoritos con el hook
  const handleToggleFavorite = async () => {
    if (!product) return;
    
    try {
      if (!isLoggedIn) {
        showToast('Inicia sesión para guardar favoritos', 'info', 'heart');
        setTimeout(() => {
          router.push('/perfil');
        }, 2000);
        return;
      }
      
      // Verificar si tenemos un userId antes de intentar modificar favoritos
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('No se pudo identificar al usuario');
      }
      
      const isFavorite = favoritos.includes(product.id);
      
      // Usar el hook para manejar favoritos
      await toggleFavorito(product.id);
      
      // Mensaje de éxito
      if (isFavorite) {
        showToast('Eliminado de favoritos', 'info', 'heart-outline');
      } else {
        showToast('Añadido a favoritos', 'success', 'heart');
      }
      
    } catch (error) {
      console.error('Error al gestionar favorito:', error);
      showToast('No se pudo actualizar el favorito', 'error', 'alert-circle');
    }
  };

  // Limitar la cantidad a un máximo de 5 unidades
  const increaseQuantity = () => {
    if (quantity < 5) {
      setQuantity(prev => prev + 1);
    } else {
      showToast('Máximo 5 unidades por producto', 'warning', 'alert-circle');
    }
  };
  
  const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  // Verificar si el producto actual es favorito
  const productIsFavorite = product ? favoritos.includes(product.id) : false;

  // Componente Toast personalizado
  const renderToast = () => {
    if (!toast) return null;
    
    const translateY = toastAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });
    
    // Determinar color de fondo según tipo
    let backgroundColor = '#4CAF50'; // success - verde

    // Solo permitir iconos válidos de Ionicons
    type IoniconName =
      | 'checkmark-circle'
      | 'close-circle'
      | 'warning'
      | 'information-circle'
      | 'heart'
      | 'heart-outline'
      | 'person'
      | 'cart'
      | 'alert-circle'
      | 'card'
      | 'share-outline';

    let iconName: IoniconName = 'checkmark-circle';

    if (toast.type === 'error') {
      backgroundColor = '#F44336'; // rojo
      iconName = 'close-circle';
    } else if (toast.type === 'warning') {
      backgroundColor = '#FF9800'; // naranja
      iconName = 'warning';
    } else if (toast.type === 'info') {
      backgroundColor = '#2196F3'; // azul
      iconName = 'information-circle';
    }

    // Si toast.icon es uno de los permitidos, úsalo
    const allowedIcons: IoniconName[] = [
      'checkmark-circle',
      'close-circle',
      'warning',
      'information-circle',
      'heart',
      'heart-outline',
      'person',
      'cart',
      'alert-circle',
      'card',
      'share-outline',
    ];
    if (toast.icon && allowedIcons.includes(toast.icon as IoniconName)) {
      iconName = toast.icon as IoniconName;
    }
    
    return (
      <Animated.View 
        style={[
          styles.toast,
          { 
            transform: [{ translateY }],
            backgroundColor 
          }
        ]}
      >
        <View style={styles.toastContent}>
          <Ionicons name={iconName} size={24} color="#fff" />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      </Animated.View>
    );
  };

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
        
        {/* Renderizar el toast personalizado */}
        {renderToast()}
        
        {/* Header minimalista */}
        <View style={styles.header}>
          {showSearchBar ? (
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Buscar en Ohana..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  style={styles.clearButton}
                  hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
                >
                  <Feather name="x" size={18} color="#999" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowSearchBar(false);
                  setSearchQuery('');
                  setShowResults(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.backButtonContainer} 
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              
              <View style={styles.headerRightButtons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToSearch}
                >
                  <Feather name="search" size={20} color="#000" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToFavorites}
                >
                  <Feather 
                    name="heart" 
                    size={20} 
                    color={productIsFavorite ? "#FF3B30" : "#000"} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToCart}
                >
                  <Feather name="shopping-bag" size={20} color="#000" />
                  {isLoggedIn && cartItemCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Resultados de búsqueda con diseño mejorado */}
        {showResults && (
          <View style={styles.searchResultsContainer}>
            {/* Indicador visual para mejorar la UI */}
            <View style={{
              width: 36, 
              height: 4,
              backgroundColor: '#e0e0e0',
              borderRadius: 2,
              alignSelf: 'center',
              marginTop: 8,
              marginBottom: 4
            }} />
            
            {isSearching ? (
              <View style={styles.loadingResults}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Buscando productos...</Text>
              </View>
            ) : searchResults.length === 0 ? (
              <Text style={styles.noResultsText}>
                {searchQuery.trim() !== '' ? 'No encontramos productos que coincidan con tu búsqueda' : ''}
              </Text>
            ) : (
              <FlatList
                data={searchResults.slice(0, 6)} // Mostrar máximo 6 resultados
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.searchResultItem, {marginHorizontal: 4}]}
                    onPress={() => handleProductSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={{ uri: item.imagen_url || `http://ohanatienda.ddns.net:8000/${item.imagen}` }}
                      style={styles.searchResultImage}
                      resizeMode="cover"
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.searchResultPrice}>
                        {formatPrice(item.precio)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#bbb" />
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 8}}
                keyboardShouldPersistTaps="handled"
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
                        setShowSearchBar(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAllText}>
                        Ver todos los resultados ({searchResults.length})
                      </Text>
                      <Feather name="arrow-right" size={14} color="#007AFF" />
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}

        {/* Overlay para cerrar resultados al hacer clic fuera */}
        {showResults && (
          <Pressable
            style={styles.overlay}
            onPress={handlePressOutside}
          />
        )}

        {loading || loadingFavoritos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={styles.loadingText}>Cargando producto...</Text>
          </View>
        ) : error || !product ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={44} color="#000" />
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
              onScrollBeginDrag={() => {
                Keyboard.dismiss();
                setShowResults(false);
              }}
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
                  renderItem={({ item }) => (
                    <View style={styles.imageSlide}>
                      <Image 
                        source={{ uri: item.url }}
                        style={styles.productImage}
                        resizeMode="contain"
                        accessible={true}
                        accessibilityLabel={`Imagen de ${product.nombre}`}
                        accessibilityRole="image"
                      />
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
                    />
                  ))}
                </View>
              </View>

              {/* Información del producto con estilo de moda */}
              <View style={styles.productInfoSection}>
                {/* Categoría */}
                <Text style={styles.categoryLabel}>
                  {product.categoria.nombre_cat} / {product.tipo}
                </Text>
                
                {/* Nombre del producto */}
                <Text style={styles.productName}>{product.nombre}</Text>
                
                {/* Precio */}
                <Text style={styles.productPrice}>{formatPrice(product.precio)}</Text>
                
                {/* Valoraciones */}
                <View style={styles.ratingsRow}>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <FontAwesome 
                        key={star} 
                        name={star <= 4 ? "star" : "star-o"} 
                        size={14} 
                        color="#000"
                        style={{marginRight: 2}} 
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingCount}>432 valoraciones</Text>
                </View>
                
                {/* Selector de cantidad */}
                <View style={styles.quantitySection}>
                  <Text style={styles.sectionLabel}>Cantidad (máx. 5)</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity 
                      style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                      onPress={decreaseQuantity}
                      disabled={quantity === 1}
                    >
                      <Feather name="minus" size={16} color={quantity === 1 ? "#ccc" : "#000"} />
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityValueText}>{quantity}</Text>
                    
                    <TouchableOpacity 
                      style={[styles.quantityButton, quantity === 5 && styles.quantityButtonDisabled]}
                      onPress={increaseQuantity}
                      disabled={quantity === 5}
                    >
                      <Feather name="plus" size={16} color={quantity === 5 ? "#ccc" : "#000"} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Tallas */}
                {product.talla && (
                  <View style={styles.sizeSection}>
                    <Text style={styles.sectionLabel}>Talla</Text>
                    <View style={styles.sizeChip}>
                      <Text style={styles.sizeText}>{product.talla}</Text>
                    </View>
                  </View>
                )}
                
                {/* Disponibilidad */}
                <View style={styles.availabilitySection}>
                  <View style={styles.availabilityIndicator} />
                  <Text style={styles.availabilityText}>Disponible - Entrega en 2-4 días</Text>
                </View>
                
                {/* Descripción */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionLabel}>Detalles del producto</Text>
                  <Text style={styles.descriptionText}>
                    {product.descripcion || "No hay descripción disponible para este producto."}
                  </Text>
                </View>
                
                {/* Detalles adicionales */}
                <View style={styles.additionalInfoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Material:</Text>
                    <Text style={styles.infoValue}>100% Algodón</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Referencia:</Text>
                    <Text style={styles.infoValue}>{product.id}</Text>
                  </View>
                  
                  {product.tipo && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tipo:</Text>
                      <Text style={styles.infoValue}>{product.tipo}</Text>
                    </View>
                  )}
                </View>
                
                {/* Envío */}
                <View style={styles.shippingSection}>
                  <Text style={styles.sectionLabel}>Envío y devoluciones</Text>
                  
                  <View style={styles.shippingInfoRow}>
                    <Feather name="truck" size={16} color="#555" style={{marginRight: 12}} />
                    <View>
                      <Text style={styles.shippingInfoTitle}>Envío gratuito</Text>
                      <Text style={styles.shippingInfoDescription}>En pedidos superiores a 50€</Text>
                    </View>
                  </View>
                  
                  <View style={styles.shippingInfoRow}>
                    <Feather name="refresh-cw" size={16} color="#555" style={{marginRight: 12}} />
                    <View>
                      <Text style={styles.shippingInfoTitle}>Devoluciones gratuitas</Text>
                      <Text style={styles.shippingInfoDescription}>Tienes 30 días para devolver el producto</Text>
                    </View>
                  </View>
                </View>
                
                {/* Espacio para los botones fijos */}
                <View style={{height: 100}} />
              </View>
            </ScrollView>
            
            {/* Panel fijo de compra con estilo de moda */}
            <View style={styles.bottomActionPanel}>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleToggleFavorite}
              >
                <Ionicons 
                  name={productIsFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={productIsFavorite ? "#ff4444" : "#000"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.addToCartButton}
                onPress={handleAddToCart}
              >
                <Text style={styles.addToCartText}>Añadir al carrito</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color="#000" />
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 1001, // Asegurar que el header esté siempre visible
  },
  backButtonContainer: {
    padding: 8,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 10,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Barra de búsqueda mejorada
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 45,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#efefef',
    zIndex: 1002, // Asegurar que la barra esté por encima
  },
  searchIcon: {
    marginRight: 10,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 15,
    color: '#333',
    fontWeight: '400',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 15,
  },
  cancelButton: {
    marginLeft: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // Contenedor de resultados mejorado
  searchResultsContainer: {
    position: 'absolute',
    top: 66, // Ajustado para dar espacio entre el header y los resultados
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 4, // Espacio adicional desde el header
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f2f2f2',
  },
  searchResultsList: {
    padding: 12,
  },

  // Items de resultados mejorados
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 6,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f8f8f8',
  },
  searchResultInfo: {
    flex: 1,
    paddingRight: 10,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 13,
    color: '#111',
    fontWeight: '500',
  },

  // Estados de carga y mensajes mejorados
  loadingResults: {
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    color: '#555',
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '400',
  },
  noResultsText: {
    padding: 24,
    textAlign: 'center',
    color: '#555',
    fontSize: 15,
    fontWeight: '400',
  },

  // Overlay mejorado
  overlay: {
    position: 'absolute',
    top: 70, // Aumentado para dejar visible el header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)', // Reducido para que sea más sutil
    zIndex: 999,
  },

  // Botón "Ver todos" mejorado
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  viewAllText: {
    color: '#007AFF',
    marginRight: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorText: {
    marginVertical: 16,
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 24,
    marginTop: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  carouselContainer: {
    height: width * 1.2,
    backgroundColor: '#FFFFFF',
  },
  imageSlide: {
    width: width,
    height: width * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  productImage: {
    width: '90%',
    height: '90%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#000000',
  },
  productInfoSection: {
    padding: 24,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '500',
  },
  productName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityValueText: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  sizeSection: {
    marginBottom: 24,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sizeText: {
    fontSize: 14,
    color: '#000',
  },
  availabilitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 13,
    color: '#666',
  },
  descriptionSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  additionalInfoSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 24,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  shippingSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 24,
  },
  shippingInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  shippingInfoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  shippingInfoDescription: {
    fontSize: 13,
    color: '#666',
  },
  bottomActionPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  addToCartButton: {
    backgroundColor: '#000',
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    flex: 1,
    marginHorizontal: 12,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  // Estilos para el toast personalizado
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});

export default ProductDetail;