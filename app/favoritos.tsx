import React, { useEffect, useState, useCallback } from 'react';
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
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { useFavoritos } from './hooks/useFavoritos'; // Importar el hook compartido

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://ohanatienda.ddns.net:8000';
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

// Componente para imágenes con fallback
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

interface FavoriteItem {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
  categoria?: {
    id: number;
    nombre_cat: string;
  }
}

const FavoritosScreen = () => {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Usar el hook de favoritos compartido
  const { favoritos, loading: favoritosLoading, toggleFavorito, recargarFavoritos } = useFavoritos();
  
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [favoritos, fadeAnim]);

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
    return () => {
      ImageCache.reset();
    };
  }, []);

  // Función para eliminar un favorito usando el hook compartido
  const handleRemoveFavorite = async (productId: number) => {
    Alert.alert(
      "Eliminar de favoritos",
      "¿Estás seguro que deseas eliminar este producto de tus favoritos?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Marcar este favorito como "eliminando"
              setRemovingIds(prev => new Set(prev).add(productId));
              
              // Usar el hook para eliminar el favorito
              await toggleFavorito(productId);
              
              // Actualizar la lista en pantalla inmediatamente para mejor UX
              setFavorites(currentFavorites => 
                currentFavorites.filter(fav => fav.id !== productId)
              );
            } catch (error) {
              console.error('Error al eliminar favorito:', error);
              Alert.alert(
                "Error",
                "No se pudo eliminar el producto de favoritos. Inténtalo de nuevo."
              );
            } finally {
              // Quitar el ID de la lista de "eliminando"
              setRemovingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
              });
            }
          }
        }
      ]
    );
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
        <FontAwesome5 name="heart-broken" size={50} color="#ccc" />
        <Text style={styles.emptyText}>No tienes productos favoritos</Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/(tabs)/tienda')}
        >
          <Text style={styles.exploreButtonText}>Explorar productos</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Renderizar una tarjeta de producto favorito
  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => {
    return (
      <Animated.View>
        <TouchableOpacity 
          style={styles.favoriteItem}
          onPress={() => handleProductPress(item.id)}
          activeOpacity={0.7}
        >
          <SafeImage
            source={{ uri: normalizeImageUrl(item.imagen) }}
            style={styles.productImage}
            imageKey={`favorite-${item.id}`}
          />
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.productPrice}>
              {formatPrice(item.precio)}
            </Text>
            {item.categoria && (
              <Text style={styles.productCategory} numberOfLines={1}>
                {item.categoria.nombre_cat}
              </Text>
            )}
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.descripcion}
            </Text>
          </View>
          
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
              <FontAwesome5 name="trash-alt" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={['#f0f7ff', '#ffffff']}
        style={styles.gradientBackground}
      >
        {/* Header personalizado */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Favoritos</Text>
          <View style={styles.headerRight} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando tus favoritos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/tienda')}
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
              contentContainerStyle={[
                styles.listContainer,
                favorites.length === 0 && styles.emptyListContainer
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              refreshing={refreshing}
              onRefresh={() => {
                recargarFavoritos();
                fetchFavorites(true);
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
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
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
    width: 100,
    height: 100,
  },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 6,
  },
  productCategory: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#f0f7ff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removingButton: {
    backgroundColor: '#ff6b66',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
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
    paddingBottom: 50,
  },
  errorText: {
    marginTop: 20,
    marginBottom: 30,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default FavoritosScreen;
