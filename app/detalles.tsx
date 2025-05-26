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
import { useColorScheme } from './hooks/useColorScheme'; // Import color scheme hook

interface ProductImage {
  id: string | number;
  url?: string;
  ruta?: string;
  orden?: number;
}

// Añadimos la interfaz StockItem para manejar los stocks
interface StockItem {
  id: number;
  id_producto: number;
  talla: string;
  color: string;
  stock: number;
  created_at?: string;
  updated_at?: string;
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
  stocks: StockItem[]; // Añadimos los stocks al modelo de producto
}

interface SearchResult extends Product {
  imagen_url?: string;
}

// Interface for custom Toasts
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

// Add color theme function
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#FFFFFF',
  cardBackground: isDark ? '#1e1e1e' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#000000',
  secondaryText: isDark ? '#B0B0B0' : '#666666',
  border: isDark ? '#2c2c2c' : '#EEEEEE',
  inputBackground: isDark ? '#333333' : '#F7F7F7',
  primaryButton: isDark ? '#FFFFFF' : '#000000',
  primaryButtonText: isDark ? '#000000' : '#FFFFFF',
  searchBackground: isDark ? '#333333' : '#f7f7f7',
  cardBorder: isDark ? '#333333' : '#F2F2F2',
  headerBackground: isDark ? '#121212' : '#FFFFFF',
  bottomPanelBackground: isDark ? '#1A1A1A' : '#FFFFFF',
  iconColor: isDark ? '#FFFFFF' : '#000000',
  quantityBorder: isDark ? '#555555' : '#E5E5E5',
  searchPlaceholder: isDark ? '#999999' : '#999999',
  resultItemBorder: isDark ? '#333333' : '#f0f0f0',
  resultBackground: isDark ? '#242424' : 'white',
  viewAllBackground: isDark ? '#242424' : '#fafafa',
  statusBarStyle: isDark ? 'light' : 'dark',
  ratingStarColor: isDark ? '#FFCC33' : '#000000'
});

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://ohanatienda.ddns.net';
const DEFAULT_IMAGE = require('@/assets/images/camiseta1.jpg');

// Sistema global de caché de imágenes
const ImageCache = {
  failedImages: new Set<string>(),
  validImages: new Set<string>(),
  markAsFailed: (url: string) => {
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

// Función para normalizar URLs de imágenes
const normalizeImageUrl = (imageUrl: string): string => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  
  try {
    imageUrl = imageUrl.trim();
    
    if (ImageCache.hasFailed(imageUrl)) return '';
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    
    return `${API_BASE_URL}${path}`;
  } catch (error) {
    console.error('Error normalizando URL:', error, 'URL original:', imageUrl);
    return '';
  }
};

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
  
  // Estado para la selección de color
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  
  // NUEVO: Estado para la selección de talla
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  
  // Get color scheme
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = getColors(isDarkMode);
  
  // States for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  
  // States for custom toast
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastAnimation = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<NodeJS.Timeout | number | null>(null);
  
  // Use favorites hook
  const { favoritos, loading: loadingFavoritos, esFavorito, toggleFavorito, recargarFavoritos } = useFavoritos();
  
  // Use cart hook and get item count
  const { addToCart, refreshLoginStatus, cartItems } = useCart();
  const cartItemCount = cartItems ? cartItems.reduce((total, item) => total + item.cantidad, 0) : 0;
  
  // Function to show custom toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info', icon?: string) => {
    // Clear existing timeout
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    
    // Set new message
    setToast({ message, type, icon });
    
    // Animate toast entry
    Animated.timing(toastAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Set timeout to hide toast
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2000);
  }, [toastAnimation]);
  
  // Función para extraer los colores disponibles del producto
  const extractAvailableColors = useCallback((product: Product | null) => {
    if (!product || !product.stocks || !Array.isArray(product.stocks) || product.stocks.length === 0) {
      return [];
    }
    
    // Filtrar solo stocks con cantidad > 0 y extraer colores únicos
    const uniqueColors = [...new Set(
      product.stocks
        .filter(item => item.stock > 0)
        .map(item => item.color)
    )];
    
    return uniqueColors;
  }, []);
  
  // NUEVO: Función para extraer las tallas disponibles según el color seleccionado
  const extractAvailableSizes = useCallback((product: Product | null, selectedColor: string | null) => {
    if (!product || !product.stocks || !Array.isArray(product.stocks) || product.stocks.length === 0) {
      return [];
    }
    
    // Filtrar por color seleccionado y stock > 0, luego extraer tallas únicas
    const uniqueSizes = [...new Set(
      product.stocks
        .filter(item => 
          item.stock > 0 && 
          (!selectedColor || item.color === selectedColor)
        )
        .map(item => item.talla)
    )];
    
    return uniqueSizes;
  }, []);
  
  // Actualizar los colores cuando el producto cambia
  useEffect(() => {
    if (product) {
      const colors = extractAvailableColors(product);
      setAvailableColors(colors);
      
      // Seleccionar el primer color disponible por defecto
      if (colors.length > 0 && !selectedColor) {
        setSelectedColor(colors[0]);
      }
    }
  }, [product, extractAvailableColors]);
  
  // NUEVO: Actualizar las tallas cuando cambia el color seleccionado
  useEffect(() => {
    if (product && selectedColor) {
      const sizes = extractAvailableSizes(product, selectedColor);
      setAvailableSizes(sizes);
      
      // Resetear la talla seleccionada si la actual ya no está disponible
      if (!sizes.includes(selectedSize || '')) {
        setSelectedSize(sizes.length > 0 ? sizes[0] : null);
      }
    }
  }, [product, selectedColor, extractAvailableSizes, selectedSize]);
  
  // Function to search products
  const searchProducts = async (query: string) => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      // Search in all products
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
      console.error('Error searching products:', error);
      setSearchResults([]);
      
      // Show error message
      Alert.alert(
        "Error de búsqueda",
        "No se pudo conectar con el servidor. Por favor, intenta más tarde.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Handle product selection from search
  const handleProductSelect = (product: SearchResult) => {
    Keyboard.dismiss();
    setShowResults(false);
    setSearchQuery('');
    setShowSearchBar(false);
    
    // Navigate to product details
    router.push({
      pathname: '/detalles',
      params: { id: product.id.toString() }
    });
  };
  
  // Handle search with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchProducts(text);
    }, 300);
  };
  
  // Close results when tapping outside
  const handlePressOutside = () => {
    Keyboard.dismiss();
    setShowResults(false);
    setShowSearchBar(false);
    setSearchQuery('');
  };
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
      ImageCache.reset();
    };
  }, []);
  
  // Header icon functions
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

  // Check if user is logged in
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  // Check if product is favorite when loading
  useEffect(() => {
    const checkIsFavorite = async () => {
      if (id && !isNaN(Number(id))) {
        const productId = Number(id);
        const isFav = favoritos.includes(productId);
        console.log(`Producto ${productId} es favorito: ${isFav}`);
      }
    };

    if (!loadingFavoritos) {
      checkIsFavorite();
    }
  }, [id, favoritos, loadingFavoritos]);

  // Get product details
  useEffect(() => {
    checkLoginStatus();
    recargarFavoritos();
    
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/productos/${id}`);
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

  // Check login status on component mount
  useEffect(() => {
    refreshLoginStatus();
  }, []);

  // Prepare images for carousel
  const getAllImages = () => {
    if (!product) return [];

    // Main image always first
    const mainImageUrl = normalizeImageUrl(product.imagen);
    const mainImage = { 
      id: 'main',
      url: mainImageUrl
    };
    
    // Add additional images if they exist
    let additionalImages: ProductImage[] = [];
    
    if (product.imagenes && Array.isArray(product.imagenes) && product.imagenes.length > 0) {
      additionalImages = product.imagenes.map((img: any, index: number) => {
        // Check if image has backend format (with 'ruta' field)
        if (img && img.ruta) {
          return {
            id: img.id || `carousel-${img.orden || index}`,
            url: normalizeImageUrl(img.ruta)
          };
        } 
        // If it already has frontend format (with 'url' field)
        else if (img && img.url) {
          return {
            id: img.id || `carousel-${index}`,
            url: normalizeImageUrl(img.url)
          };
        }
        // If it's just a string (direct url)
        else if (typeof img === 'string') {
          return {
            id: `img-${Math.random().toString(36).substr(2, 9)}`,
            url: normalizeImageUrl(img)
          };
        }
        return null;
      }).filter(img => img !== null);
    }
    
    // For carousel we need at least several images
    let carouselImages;
    
    if (additionalImages.length > 0) {
      carouselImages = [mainImage, ...additionalImages];
    } else {
      // If no additional images, duplicate the main one
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

  // MODIFICADO: Función para añadir al carrito con el color y talla seleccionados en mayúsculas
const handleAddToCart = async () => {
  if (!product) return;
  
  // Verificar si se ha seleccionado un color
  if (!selectedColor) {
    showToast('Por favor selecciona un color', 'warning', 'alert-circle');
    return;
  }
  
  // Verificar si se ha seleccionado una talla (cuando hay tallas disponibles)
  if (availableSizes.length > 0 && !selectedSize) {
    showToast('Por favor selecciona una talla', 'warning', 'alert-circle');
    return;
  }
  
  // Verificar si hay stock disponible para esta combinación
  // Usar toUpperCase() para la comparación de tallas
  const stockItem = product.stocks?.find(item => 
    item.color === selectedColor && 
    (!availableSizes.length || item.talla.toUpperCase() === selectedSize?.toUpperCase())
  );
  
  if (!stockItem || stockItem.stock < quantity) {
    showToast('Stock insuficiente para esta selección', 'warning', 'alert-circle');
    return;
  }
  
  await refreshLoginStatus();
  
  const success = await addToCart({
    id: product.id,
    nombre: product.nombre,
    precio: product.precio,
    imagen: product.imagen,
    talla: (selectedSize || 'única').toUpperCase(), // IMPORTANTE: Convertir a mayúsculas
    color: selectedColor,
    cantidad: quantity
  });

  if (!success) {
    showToast('Inicia sesión para añadir productos', 'warning', 'person');
    setTimeout(() => {
      router.push('/perfil');
    }, 2000);
    return;
  }
  
  showToast(
    `${quantity} ${quantity > 1 ? 'unidades' : 'unidad'} añadidas al carrito`, 
    'success', 
    'cart'
  );
};

  /// MODIFICADO: También verificar talla en compra directa y enviar en mayúsculas
const handleBuyNow = () => {
  if (!isLoggedIn) {
    showToast('Inicia sesión para realizar compras', 'warning', 'person');
    setTimeout(() => {
      router.push('/perfil');
    }, 2000);
    return;
  }
  
  // Verificar si se ha seleccionado un color
  if (!selectedColor) {
    showToast('Por favor selecciona un color', 'warning', 'alert-circle');
    return;
  }
  
  // Verificar si se ha seleccionado una talla (cuando hay tallas disponibles)
  if (availableSizes.length > 0 && !selectedSize) {
    showToast('Por favor selecciona una talla', 'warning', 'alert-circle');
    return;
  }
  
  // Verificar si hay stock disponible para esta combinación
  // Usar toUpperCase() para la comparación de tallas
  const stockItem = product?.stocks?.find(item => 
    item.color === selectedColor && 
    (!availableSizes.length || item.talla.toUpperCase() === selectedSize?.toUpperCase())
  );
  
  if (!stockItem || stockItem.stock < quantity) {
    showToast('Stock insuficiente para esta selección', 'warning', 'alert-circle');
    return;
  }
  
  showToast('¡Preparando tu compra!', 'info', 'card');
};

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
      
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('No se pudo identificar al usuario');
      }
      
      const isFavorite = favoritos.includes(product.id);
      
      await toggleFavorito(product.id);
      
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

  // Limit quantity to maximum of 5 units
  const increaseQuantity = () => {
    if (quantity < 5) {
      setQuantity(prev => prev + 1);
    } else {
      showToast('Máximo 5 unidades por producto', 'warning', 'alert-circle');
    }
  };
  
  const decreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  // Check if current product is favorite
  const productIsFavorite = product ? favoritos.includes(product.id) : false;

  // Custom Toast component
  const renderToast = () => {
    if (!toast) return null;
    
    const translateY = toastAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });
    
    // Determine background color based on type
    let backgroundColor = '#4CAF50'; // success - green

    // Only allow valid Ionicons names
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
      backgroundColor = '#F44336'; // red
      iconName = 'close-circle';
    } else if (toast.type === 'warning') {
      backgroundColor = '#FF9800'; // orange
      iconName = 'warning';
    } else if (toast.type === 'info') {
      backgroundColor = '#2196F3'; // blue
      iconName = 'information-circle';
    }

    // If toast.icon is one of the allowed ones, use it
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
      
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Use dynamic statusbar style based on theme */}
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        {/* Custom toast */}
        {renderToast()}
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
          {showSearchBar ? (
            <View style={[styles.searchContainer, { 
              backgroundColor: colors.searchBackground,
              borderColor: colors.border 
            }]}>
              <Feather name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar en Ohana..."
                placeholderTextColor={colors.searchPlaceholder}
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
                  <Feather name="x" size={18} color={colors.secondaryText} />
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
                <Ionicons name="chevron-back" size={24} color={colors.iconColor} />
              </TouchableOpacity>
              
              <View style={styles.headerRightButtons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToSearch}
                >
                  <Feather name="search" size={20} color={colors.iconColor} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToFavorites}
                >
                  <Feather 
                    name="heart" 
                    size={20} 
                    color={productIsFavorite ? "#FF3B30" : colors.iconColor} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={navigateToCart}
                >
                  <Feather name="shopping-bag" size={20} color={colors.iconColor} />
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

        {/* Search results */}
        {showResults && (
          <View style={[styles.searchResultsContainer, {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border
          }]}>
            <View style={{
              width: 36, 
              height: 4,
              backgroundColor: isDarkMode ? '#444444' : '#e0e0e0',
              borderRadius: 2,
              alignSelf: 'center',
              marginTop: 8,
              marginBottom: 4
            }} />
            
            {isSearching ? (
              <View style={styles.loadingResults}>
                <ActivityIndicator size="small" color={isDarkMode ? "#4D90FE" : "#007AFF"} />
                <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
                  Buscando productos...
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <Text style={[styles.noResultsText, { color: colors.secondaryText }]}>
                {searchQuery.trim() !== '' ? 'No encontramos productos que coincidan con tu búsqueda' : ''}
              </Text>
            ) : (
              <FlatList
                data={searchResults.slice(0, 6)}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.searchResultItem, 
                      { 
                        marginHorizontal: 4,
                        borderBottomColor: colors.resultItemBorder,
                        backgroundColor: colors.resultBackground
                      }
                    ]}
                    onPress={() => handleProductSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={item.imagen_url ? { uri: item.imagen_url } : DEFAULT_IMAGE}
                      style={styles.searchResultImage}
                      resizeMode="cover"
                      onError={() => {
                        console.log("Error cargando imagen en búsqueda:", item.imagen);
                        ImageCache.markAsFailed(item.imagen);
                      }}
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={[styles.searchResultPrice, { color: colors.secondaryText }]}>
                        {formatPrice(item.precio)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.secondaryText} />
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 8}}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  searchResults.length > 6 ? (
                    <TouchableOpacity
                      style={[styles.viewAllContainer, { backgroundColor: colors.viewAllBackground }]}
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

        {/* Overlay for closing search results */}
        {showResults && (
          <Pressable
            style={styles.overlay}
            onPress={handlePressOutside}
          />
        )}

        {loading || loadingFavoritos ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="small" color={colors.text} />
            <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Cargando producto...</Text>
          </View>
        ) : error || !product ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            <Feather name="alert-circle" size={44} color={colors.text} />
            <Text style={[styles.errorText, { color: colors.secondaryText }]}>
              {error || 'No se encontró el producto'}
            </Text>
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: colors.primaryButton }]} 
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: colors.primaryButtonText }]}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView 
              style={[styles.scrollView, { backgroundColor: colors.background }]}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => {
                Keyboard.dismiss();
                setShowResults(false);
              }}
              contentContainerStyle={{ paddingBottom: 120 }} // Extra space for bottom panel
            >
              {/* Image carousel */}
              <View style={[styles.carouselContainer, { backgroundColor: colors.background }]}>
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
                    <View style={[styles.imageSlide, { backgroundColor: colors.background }]}>
                      <Image 
                        source={item.url ? { uri: item.url } : DEFAULT_IMAGE}
                        style={styles.productImage}
                        resizeMode="contain"
                        accessible={true}
                        accessibilityLabel={`Imagen de ${product.nombre}`}
                        accessibilityRole="image"
                        onError={() => {
                          console.log("Error cargando imagen en carrusel:", item.url);
                          ImageCache.markAsFailed(item.url || '');
                        }}
                      />
                    </View>
                  )}
                />
                
                {/* Carousel indicators */}
                <View style={styles.paginationContainer}>
                  {getAllImages().map((_, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.paginationDot,
                        { backgroundColor: isDarkMode ? '#555555' : '#DDDDDD' },
                        activeIndex === index && { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }
                      ]}
                      onPress={() => handleThumbnailPress(index)}
                    />
                  ))}
                </View>
              </View>

              {/* Product info */}
              <View style={[styles.productInfoSection, { backgroundColor: colors.background }]}>
                {/* Category */}
                <Text style={[styles.categoryLabel, { color: colors.secondaryText }]}>
                  {product.categoria.nombre_cat} / {product.tipo}
                </Text>
                
                {/* Product name */}
                <Text style={[styles.productName, { color: colors.text }]}>
                  {product.nombre}
                </Text>
                
                {/* Price */}
                <Text style={[styles.productPrice, { color: colors.text }]}>
                  {formatPrice(product.precio)}
                </Text>
                
                {/* Ratings */}
                <View style={styles.ratingsRow}>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <FontAwesome 
                        key={star} 
                        name={star <= 4 ? "star" : "star-o"} 
                        size={14} 
                        color={isDarkMode ? "#FFCC33" : "#000"}
                        style={{marginRight: 2}} 
                      />
                    ))}
                  </View>
                  <Text style={[styles.ratingCount, { color: colors.secondaryText }]}>
                    432 valoraciones
                  </Text>
                </View>
                
                {/* Selector de color */}
                {availableColors.length > 0 && (
                  <View style={styles.colorSection}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Color</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.colorChipsContainer}
                    >
                      {availableColors.map(color => (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          style={[
                            styles.colorChip,
                            { borderColor: colors.border },
                            selectedColor === color && { 
                              borderColor: colors.primaryButton,
                              borderWidth: 2
                            }
                          ]}
                        >
                          <Text 
                            style={[
                              styles.colorText, 
                              { color: selectedColor === color ? colors.primaryButton : colors.text }
                            ]}
                          >
                            {color}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* NUEVO: Selector de tallas */}
                {availableSizes.length > 0 && (
                  <View style={styles.sizeSection}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Talla</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.colorChipsContainer}
                    >
                      {availableSizes.map(size => (
                        <TouchableOpacity
                          key={size}
                          onPress={() => setSelectedSize(size)}
                          style={[
                            styles.colorChip,
                            { borderColor: colors.border },
                            selectedSize === size && { 
                              borderColor: colors.primaryButton,
                              borderWidth: 2
                            }
                          ]}
                        >
                          <Text 
                            style={[
                              styles.colorText, 
                              { color: selectedSize === size ? colors.primaryButton : colors.text }
                            ]}
                          >
                            {size.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Quantity selector */}
                <View style={styles.quantitySection}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    Cantidad (máx. 5)
                  </Text>
                  <View style={[
                    styles.quantityControls, 
                    { borderColor: colors.quantityBorder }
                  ]}>
                    <TouchableOpacity 
                      style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                      onPress={decreaseQuantity}
                      disabled={quantity === 1}
                    >
                      <Feather 
                        name="minus" 
                        size={16} 
                        color={quantity === 1 ? 
                          (isDarkMode ? "#666666" : "#ccc") : 
                          colors.text
                        } 
                      />
                    </TouchableOpacity>
                    
                    <Text style={[styles.quantityValueText, { color: colors.text }]}>
                      {quantity}
                    </Text>
                    
                    <TouchableOpacity 
                      style={[styles.quantityButton, quantity === 5 && styles.quantityButtonDisabled]}
                      onPress={increaseQuantity}
                      disabled={quantity === 5}
                    >
                      <Feather 
                        name="plus" 
                        size={16} 
                        color={quantity === 5 ? 
                          (isDarkMode ? "#666666" : "#ccc") : 
                          colors.text
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Availability */}
                <View style={styles.availabilitySection}>
                  <View style={styles.availabilityIndicator} />
                  <Text style={[styles.availabilityText, { color: colors.secondaryText }]}>
                    Disponible - Entrega en 2-4 días
                  </Text>
                </View>
                
                {/* Description */}
                <View style={[
                  styles.descriptionSection, 
                  { borderTopColor: colors.cardBorder }
                ]}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    Detalles del producto
                  </Text>
                  <Text style={[styles.descriptionText, { color: colors.secondaryText }]}>
                    {product.descripcion || "No hay descripción disponible para este producto."}
                  </Text>
                </View>
                
                {/* Additional details */}
                <View style={[
                  styles.additionalInfoSection, 
                  { borderTopColor: colors.cardBorder }
                ]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Material:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>100% Algodón</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Referencia:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{product.id}</Text>
                  </View>
                  
                  {product.tipo && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Tipo:</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{product.tipo}</Text>
                    </View>
                  )}
                </View>
                
                {/* Shipping info */}
                <View style={[
                  styles.shippingSection, 
                  { borderTopColor: colors.cardBorder }
                ]}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    Envío y devoluciones
                  </Text>
                  
                  <View style={styles.shippingInfoRow}>
                    <Feather 
                      name="truck" 
                      size={16} 
                      color={colors.secondaryText} 
                      style={{marginRight: 12}} 
                    />
                    <View>
                      <Text style={[styles.shippingInfoTitle, { color: colors.text }]}>
                        Envío gratuito
                      </Text>
                      <Text style={[styles.shippingInfoDescription, { color: colors.secondaryText }]}>
                        En pedidos superiores a 50€
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.shippingInfoRow}>
                    <Feather 
                      name="refresh-cw" 
                      size={16} 
                      color={colors.secondaryText} 
                      style={{marginRight: 12}} 
                    />
                    <View>
                      <Text style={[styles.shippingInfoTitle, { color: colors.text }]}>
                        Devoluciones gratuitas
                      </Text>
                      <Text style={[styles.shippingInfoDescription, { color: colors.secondaryText }]}>
                        Tienes 30 días para devolver el producto
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            {/* Fixed bottom action panel with SafeAreaView */}
            <SafeAreaView 
              edges={['bottom']} 
              style={[
                styles.bottomActionPanelContainer, 
                { backgroundColor: colors.bottomPanelBackground }
              ]}
            >
              <View style={[
                styles.bottomActionPanel, 
                { 
                  backgroundColor: colors.bottomPanelBackground,
                  borderTopColor: colors.border 
                }
              ]}>
                <TouchableOpacity
                  style={[styles.favoriteButton, { borderColor: colors.border }]}
                  onPress={handleToggleFavorite}
                >
                  <Ionicons 
                    name={productIsFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={productIsFavorite ? "#ff4444" : colors.iconColor} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.addToCartButton, 
                    { 
                      backgroundColor: colors.primaryButton,
                      flex: 1
                    }
                  ]}
                  onPress={handleAddToCart}
                >
                  <Text style={[
                    styles.addToCartText, 
                    { color: colors.primaryButtonText }
                  ]}>
                    Añadir al carrito
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.shareButton, { borderColor: colors.border }]}
                  onPress={handleShare}
                >
                  <Ionicons name="share-outline" size={24} color={colors.iconColor} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1001,
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
  // Enhanced search bar
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    zIndex: 1002,
  },
  searchIcon: {
    marginRight: 10,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 15,
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

  // Enhanced results container
  searchResultsContainer: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 4,
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
  },
  searchResultsList: {
    padding: 12,
  },

  // Enhanced result items
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
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
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Enhanced loading states and messages
  loadingResults: {
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '400',
  },
  noResultsText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '400',
  },

  // Enhanced overlay
  overlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 999,
  },

  // Enhanced "View all" button
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginVertical: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    height: width * 1.2,
  },
  imageSlide: {
    width: width,
    height: width * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginHorizontal: 4,
  },
  productInfoSection: {
    padding: 24,
  },
  categoryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '500',
  },
  productName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
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
    marginLeft: 4,
  },
  
  // Nuevos estilos para la sección de colores
  colorSection: {
    marginBottom: 24,
  },
  colorChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  colorChip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  sizeSection: {
    marginBottom: 24,
  },
  sizeChip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sizeText: {
    fontSize: 14,
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
  },
  descriptionSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    paddingTop: 24,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  additionalInfoSection: {
    marginBottom: 24,
    borderTopWidth: 1,
    paddingTop: 24,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  shippingSection: {
    marginBottom: 24,
    borderTopWidth: 1,
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
    marginBottom: 2,
  },
  shippingInfoDescription: {
    fontSize: 13,
  },
  // New container for bottom panel with SafeAreaView
  bottomActionPanelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    // Add elevation to ensure it sits above other elements
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomActionPanel: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  addToCartButton: {
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    marginHorizontal: 8,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
  // Custom toast styles
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