import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { useFavoritos } from './hooks/useFavoritos'; // Importar el hook compartido
import { useCart } from './hooks/useCart'; // Importar el hook de carrito
import { useFocusEffect } from '@react-navigation/native';


const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 45) / 2; // Dos columnas con padding
const API_BASE_URL = 'https://ohanatienda.ddns.net';
const DEFAULT_IMAGE = require('@/assets/images/camiseta1.jpg');

// Interfaz para los Toasts personalizados
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

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

// Componente mejorado para imágenes con fallback
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
  const [isLoading, setIsLoading] = useState(true);
  
  const isRemoteSource = source && typeof source === 'object' && source.uri;
  const sourceUri = isRemoteSource ? source.uri : null;
  const useDirectFallback = isRemoteSource && ImageCache.hasFailed(sourceUri);
  
  // Si la imagen ya está marcada como fallida, usamos directamente la imagen por defecto
  if (useDirectFallback) {
    return (
      <View style={style}>
        <Image 
          source={fallbackSource} 
          style={{width: '100%', height: '100%'}} 
          resizeMode="cover" 
        />
      </View>
    );
  }
  
  return (
    <View style={style}>
      {/* Imagen real que intentamos cargar */}
      {isRemoteSource && !hasError && (
        <Image 
          source={source}
          style={{position: 'absolute', width: '100%', height: '100%'}}
          resizeMode={resizeMode}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
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
      
      {/* Imagen de fondo o fallback */}
      {(hasError || isLoading || !isRemoteSource) && (
        <Image
          source={fallbackSource}
          style={{width: '100%', height: '100%', opacity: !hasError && isLoading ? 0.4 : 1}}
          resizeMode="cover"
        />
      )}
      
      {/* Indicador de carga */}
      {isLoading && !hasError && (
        <ActivityIndicator 
          style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}}
          size="small" 
          color="#000"
        />
      )}
    </View>
  );
};

interface FavoriteItem {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
  categoria?: {
    id: number;
    nombre_cat: string;
  },
  talla?: string
}

// Componente independiente para el elemento favorito
// Así los hooks se usan correctamente dentro de un componente funcional
const FavoriteItemCard = ({
  item,
  index,
  handleProductPress,
  handleRemoveFavorite,
  removingIds,
  formatPrice,
  handleAddToCart
}: {
  item: FavoriteItem;
  index: number;
  handleProductPress: (id: number) => void;
  handleRemoveFavorite: (id: number) => void;
  removingIds: Set<number>;
  formatPrice: (price: string) => string;
  handleAddToCart: (item: FavoriteItem) => void;
}) => {
  const itemAnimDelay = index * 100;
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemTranslateAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 400,
        delay: itemAnimDelay,
        useNativeDriver: true
      }),
      Animated.timing(itemTranslateAnim, {
        toValue: 0,
        duration: 400,
        delay: itemAnimDelay,
        useNativeDriver: true
      })
    ]).start();
  }, [itemFadeAnim, itemTranslateAnim, itemAnimDelay]);
  
  return (
    <Animated.View 
      style={[
        styles.favoriteItemContainer,
        {
          opacity: itemFadeAnim,
          transform: [{ translateY: itemTranslateAnim }]
        }
      ]}
    >
      <View style={styles.favoriteCard}>
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => handleProductPress(item.id)}
        >
          <SafeImage
            source={{ uri: normalizeImageUrl(item.imagen) }}
            style={styles.productImage}
            imageKey={`favorite-${item.id}`}
            resizeMode="cover"
          />
          
          {/* Badge de categoría flotante */}
          {item.categoria && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.categoria.nombre_cat}
              </Text>
            </View>
          )}
          
          {/* Botón de eliminar */}
          <TouchableOpacity
            style={[
              styles.removeButton,
              removingIds.has(item.id) && styles.removingButton
            ]}
            onPress={() => handleRemoveFavorite(item.id)}
            disabled={removingIds.has(item.id)}
          >
            {removingIds.has(item.id) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={styles.productPrice}>
            {formatPrice(item.precio)}
          </Text>
          
          <View style={styles.productActions}>
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => handleProductPress(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetailsText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color="#000" />
            </TouchableOpacity>
            
            {/* Botón de añadir al carrito */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="cart-outline" size={18} color="#fff" />
              <Text style={styles.addToCartText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const FavoritosScreen = () => {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const fadeAnim = useState(new Animated.Value(0))[0];

  
  // Estados para el toast personalizado
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastAnimation = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<NodeJS.Timeout | number | null>(null);
  
  // Estado para modal de confirmación
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    productId: 0,
    productName: ''
  });
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Usar el hook de favoritos compartido
  const { favoritos, loading: favoritosLoading, toggleFavorito, recargarFavoritos } = useFavoritos();
  
  // Usar el hook del carrito
  const { addToCart, refreshLoginStatus } = useCart();
  
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
  
  // Función para añadir al carrito desde favoritos
  const handleAddToCart = async (product: FavoriteItem) => {
    try {
      // Actualizar el estado de inicio de sesión antes de intentar añadir al carrito
      await refreshLoginStatus();
      
      // Cantidad por defecto para añadir desde la vista de favoritos
      const quantity = 1;
      
      const success = await addToCart({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        talla: product.talla || '', // Usar string vacío si no hay talla
        cantidad: quantity
      });
  
      if (!success) {
        showToast('Inicia sesión para añadir productos', 'warning', 'person');
        setTimeout(() => {
          router.push('/perfil');
        }, 2000);
        return;
      }
      
      // Mensaje de éxito con toast personalizado
      showToast(`Producto añadido al carrito`, 'success', 'cart');
    } catch (error) {
      console.error('Error al añadir al carrito:', error);
      showToast('Error al añadir al carrito', 'error', 'close-circle');
    }
  };
  
  // Función para mostrar el modal de confirmación
  const showConfirmationModal = (productId: number, productName: string) => {
    setConfirmModal({
      visible: true,
      productId,
      productName
    });
    
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Función para ocultar el modal de confirmación
  const hideConfirmationModal = () => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setConfirmModal({...confirmModal, visible: false});
    });
  };
  
  // Función actualizada para obtener favoritos usando el hook
  const fetchFavorites = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Si no hay favoritos
      if (!favoritos.length) {
        setFavorites([]);
        setError(null);
        
        // Animar aunque esté vacío
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Usar la API para obtener detalles de los productos
      const productsResponse = await axios.post(
        `${API_BASE_URL}/api/productos/por-ids`, 
        { ids: favoritos },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (productsResponse.data && productsResponse.data.data) {
        setFavorites(productsResponse.data.data);
        setError(null);
        
        // Animar la aparición del contenido
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      } else {
        setFavorites([]);
        setError('No se pudieron obtener los detalles de los productos');
      }
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      setFavorites([]);
      setError('Error al cargar tus favoritos');
      showToast('Error al cargar tus favoritos', 'error', 'alert-circle');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [favoritos, fadeAnim, showToast]);

  // Cargar favoritos cuando cambie la lista en el hook
  useEffect(() => {
    if (!favoritosLoading) {
      fetchFavorites();
    }
  }, [fetchFavorites, favoritos, favoritosLoading]);
  
  // Recargar favoritos al volver a esta pantalla
  useFocusEffect(
    useCallback(() => {
      // Al enfocar esta pantalla, recargar favoritos desde el hook
      recargarFavoritos();
      
      return () => {
        // Limpiar al abandonar la pantalla
      };
    }, [recargarFavoritos])
  );
  
  useEffect(() => {
    // Limpiar la caché de imágenes al desmontar
    return () => {
      ImageCache.reset();
      
      // Limpiar timeout de toast
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  // Función para eliminar un favorito usando el hook compartido
  const handleRemoveFavorite = async (productId: number) => {
    // Mostrar el modal de confirmación en lugar del Alert
    const product = favorites.find(fav => fav.id === productId);
    if (product) {
      showConfirmationModal(productId, product.nombre);
    }
  };
  
  // Función para confirmar la eliminación del favorito
  const confirmRemoveFavorite = async (productId: number) => {
    try {
      // Ocultar el modal primero
      hideConfirmationModal();
      
      // Marcar este favorito como "eliminando"
      setRemovingIds(prev => new Set(prev).add(productId));
      
      // Usar el hook para eliminar el favorito
      await toggleFavorito(productId);
      
      // Actualizar la lista en pantalla inmediatamente para mejor UX
      setFavorites(currentFavorites => 
        currentFavorites.filter(fav => fav.id !== productId)
      );

      // Mostrar confirmación con toast en vez de Alert
      showToast('Producto eliminado de favoritos', 'success', 'heart-outline');
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
      showToast('No se pudo eliminar el producto', 'error', 'alert-circle');
    } finally {
      // Quitar el ID de la lista de "eliminando"
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleProductPress = (productId: number) => {
    router.push({
      pathname: '/detalles',
      params: { id: productId.toString() }
    });
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

  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.07)']}
          style={styles.emptyGradient}
        >
          <FontAwesome5 name="heart-broken" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Sin favoritos</Text>
          <Text style={styles.emptyText}>
            No tienes productos guardados en favoritos todavía
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => {
              router.push('/(tabs)/tienda');
              showToast('Exploremos algunos productos', 'info', 'search');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.exploreButtonText}>Explorar productos</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  // Componente Toast personalizado
  const renderToast = () => {
    if (!toast) return null;
    
    const translateY = toastAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });
    
    // Determinar color de fondo según tipo
    let backgroundColor = '#4CAF50'; // success - verde
    let iconName: any = toast.icon || 'checkmark-circle';
    
    if (toast.type === 'error') {
      backgroundColor = '#F44336'; // rojo
      iconName = toast.icon || 'close-circle';
    } else if (toast.type === 'warning') {
      backgroundColor = '#FF9800'; // naranja
      iconName = toast.icon || 'warning';
    } else if (toast.type === 'info') {
      backgroundColor = '#2196F3'; // azul
      iconName = toast.icon || 'information-circle';
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

  // Renderizar el modal de confirmación personalizado
  const renderConfirmationModal = () => {
    return (
      <Modal
        transparent={true}
        visible={confirmModal.visible}
        onRequestClose={hideConfirmationModal}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={hideConfirmationModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    opacity: modalOpacityAnim,
                    transform: [{ scale: modalScaleAnim }]
                  }
                ]}
              >
                <View style={styles.modalIconContainer}>
                  <View style={styles.modalIconCircle}>
                    <FontAwesome5 name="heart-broken" size={30} color="#ff3b30" />
                  </View>
                </View>
                
                <Text style={styles.modalTitle}>Eliminar de favoritos</Text>
                
                <Text style={styles.modalMessage}>
                  ¿Estás seguro que deseas eliminar{"\n"}
                  <Text style={styles.modalProductName}>{confirmModal.productName}</Text>{"\n"}
                  de tus favoritos?
                </Text>
                
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={hideConfirmationModal}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={() => confirmRemoveFavorite(confirmModal.productId)}
                  >
                    <Text style={styles.modalConfirmButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Ahora usamos el componente FavoriteItemCard en lugar de la función inline
  const renderFavoriteItem = ({ item, index }: { item: FavoriteItem, index: number }) => (
    <FavoriteItemCard
      item={item}
      index={index}
      handleProductPress={handleProductPress}
      handleRemoveFavorite={handleRemoveFavorite}
      removingIds={removingIds}
      formatPrice={formatPrice}
      handleAddToCart={handleAddToCart}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={['#f8f8f8', '#ffffff']}
        style={styles.gradientBackground}
      >
        {/* Renderizar el toast personalizado */}
        {renderToast()}
        
        {/* Renderizar el modal de confirmación */}
        {renderConfirmationModal()}
        
        {/* Header personalizado */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Mis Favoritos</Text>
            <MaterialCommunityIcons name="heart-multiple" size={18} color="#FF3B30" style={styles.headerIcon} />
          </View>
          <View style={{width: 40}} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Cargando tus favoritos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => {
                router.push('/(tabs)/tienda');
                showToast('Vamos a explorar la tienda', 'info', 'search');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.exploreButtonText}>Explorar productos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFavoriteItem}
              numColumns={2}
              contentContainerStyle={[
                styles.listContainer,
                favorites.length === 0 && styles.emptyListContainer
              ]}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.columnWrapper}
              ListEmptyComponent={renderEmptyState}
              refreshing={refreshing}
              onRefresh={() => {
                recargarFavoritos();
                fetchFavorites(true);
                if (favoritos.length === 0) {
                  showToast('Lista de favoritos actualizada', 'info', 'refresh');
                }
              }}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    marginLeft: 8,
  },
  backButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
},
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 12,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  favoriteItemContainer: {
    width: CARD_WIDTH,
    marginBottom: 20,
  },
  favoriteCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.16,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    maxWidth: CARD_WIDTH - 70,
  },
  categoryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  productActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    gap: 8,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 4,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 5,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  removingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    marginTop: 20,
    marginBottom: 30,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    width: width,
    height: 400,
  },
  emptyGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    padding: 30,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para el toast personalizado
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
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
  // Estilos para el modal de confirmación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconContainer: {
    marginBottom: 15,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalProductName: {
    fontWeight: '700',
    color: '#000',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingTop: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: '#f2f2f2',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#ff3b30',
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default FavoritosScreen;