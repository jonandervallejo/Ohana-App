import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from './hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

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

// Función para obtener URL de imagen por ID de producto (solución alternativa)
const getProductImageByConvention = (productId: number): string => {
  return `${API_BASE_URL}/storage/uploads/productos/${productId}.jpg`;
};

// Función para extraer y convertir un precio de cualquier formato a número
const extractPrice = (price: any): number => {
  if (price === undefined || price === null) return 0;
  
  try {
    // Si ya es número, simplemente validarlo
    if (typeof price === 'number') {
      return isNaN(price) ? 0 : price;
    }
    
    // Si es string, intentar extraer el valor numérico
    if (typeof price === 'string') {
      // Quitar símbolos de moneda, espacios y otras cosas que no sean números, puntos o comas
      const cleanPrice = price.replace(/[^\d.,]/g, '');
      if (!cleanPrice) return 0;
      
      // Manejar formato europeo: sustituir puntos de miles y cambiar coma por punto para decimales
      let normalizedPrice = cleanPrice;
      if (cleanPrice.includes(',')) {
        // Formato europeo: 1.234,56 -> 1234.56
        normalizedPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
      }
      
      const numValue = parseFloat(normalizedPrice);
      return isNaN(numValue) ? 0 : numValue;
    }
    
    return 0; // Tipo no reconocido
  } catch (e) {
    console.error('Error extrayendo precio:', e);
    return 0;
  }
};

// Función para formatear precios
const formatPrice = (price: string | number | undefined | null) => {
  const numPrice = extractPrice(price);
  
  // Formateo consistente con formato español
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2 
  }).format(numPrice);
};

// Función para calcular total del pedido
const getOrderTotal = (order: Order): number => {
  if (!order) return 0;
  
  try {
    // Si no hay productos, intentar usar el total del pedido si existe
    if (!order.productos || !Array.isArray(order.productos) || order.productos.length === 0) {
      return extractPrice(order.total);
    }
    
    // Calcular el total sumando cada producto × su cantidad
    let total = 0;
    
    for (const product of order.productos) {
      if (!product) continue;
      
      // Obtener el precio del producto
      const productPrice = extractPrice(product.precio);
      
      // Obtener la cantidad (asegurar que sea al menos 1)
      const quantity = product.cantidad && product.cantidad > 0 ? product.cantidad : 1;
      
      // Sumar al total
      total += productPrice * quantity;
    }
    
    // Si el total calculado es 0 pero hay un total en el pedido, usar ese
    if (total === 0 && order.total) {
      const orderTotalValue = extractPrice(order.total);
      if (orderTotalValue > 0) {
        return orderTotalValue;
      }
    }
    
    return total;
  } catch (e) {
    console.error('Error calculando total del pedido:', e);
    // Último intento: usar el total del pedido si existe
    if (order.total) {
      return extractPrice(order.total);
    }
    return 0;
  }
};

// Función para obtener colores según el tema - COLORES MEJORADOS
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#f9f9f9',
  card: isDark ? '#242424' : '#ffffff',
  text: isDark ? '#ffffff' : '#333333',
  secondaryText: isDark ? '#b0b0b0' : '#757575',
  border: isDark ? '#2c2c2c' : '#eeeeee',
  separator: isDark ? '#2c2c2c' : '#f0f0f0',
  headerBg: isDark ? '#121212' : '#ffffff',
  badge: {
    pendiente: {
      bg: isDark ? 'rgba(255,152,0,0.15)' : '#fff8e1',
      text: isDark ? '#ffb74d' : '#ff9800'
    },
    completado: {
      bg: isDark ? 'rgba(76,175,80,0.15)' : '#e8f5e9',
      text: isDark ? '#81c784' : '#4caf50'
    },
    cancelado: {
      bg: isDark ? 'rgba(244,67,54,0.15)' : '#ffebee',
      text: isDark ? '#ef9a9a' : '#f44336'
    }
  },
  orderStatus: {
    pendiente: '#ff9800',    // Naranja
    completado: '#4caf50',   // Verde
    cancelado: '#f44336'     // Rojo
  },
  button: isDark ? '#333333' : '#ffffff',
  buttonText: isDark ? '#ffffff' : '#333333',
  accent: isDark ? '#bb86fc' : '#6200ee',
  modalBackground: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
  placeholderText: isDark ? '#555555' : '#cccccc',
  shadow: isDark ? '#000000' : '#000000',
  error: isDark ? '#cf6679' : '#f44336',
  icon: isDark ? '#b0b0b0' : '#757575',
  imagePlaceholder: isDark ? '#2c2c2c' : '#f4f4f4',
  loadingIndicator: isDark ? '#ffffff' : '#000000',
  cardGradient: isDark ? ['rgba(40,40,40,0.95)', 'rgba(28,28,28,0.98)'] : ['#ffffff', '#f8f9fa'],
  totalBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
});

// Order interfaces
interface OrderProduct {
  id: number;
  nombre: string;
  precio: string | number;
  cantidad: number;
  talla: string;
  color: string;
  imagen?: string;
}

interface Order {
  id: number;
  id_usuario: number;
  estado: 'pendiente' | 'completado' | 'cancelado';
  created_at: string;
  updated_at?: string;
  productos?: OrderProduct[];
  total: number | string | null | undefined;
  direccion_envio?: string;
  metodo_pago?: string;
}

// Order Status Badge Component - DISEÑO MEJORADO
const StatusBadge: React.FC<{ status: string, colors: any, size?: 'small' | 'medium' }> = ({ status, colors, size = 'medium' }) => {
  // Map status to badge style
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return {
          text: 'Pendiente',
          bg: colors.badge.pendiente.bg,
          color: colors.badge.pendiente.text,
          icon: 'time-outline' as keyof typeof Ionicons.glyphMap
        };
      case 'completado':
        return {
          text: 'Completado',
          bg: colors.badge.completado.bg,
          color: colors.badge.completado.text,
          icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap
        };
      case 'cancelado':
        return {
          text: 'Cancelado',
          bg: colors.badge.cancelado.bg,
          color: colors.badge.cancelado.text,
          icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap
        };
      default:
        return {
          text: status,
          bg: colors.separator,
          color: colors.secondaryText,
          icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap
        };
    }
  };

  const config = getStatusConfig();
  const isSmall = size === 'small';

  return (
    <View 
      style={[
        styles.statusBadge, 
        { backgroundColor: config.bg },
        isSmall ? styles.statusBadgeSmall : {},
        {
          shadowColor: config.color,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isSmall ? 0.1 : 0.2,
          shadowRadius: 3,
          elevation: 2
        }
      ]}
    >
      <Ionicons 
        name={config.icon} 
        size={isSmall ? 12 : 16} 
        color={config.color} 
        style={styles.statusIcon} 
      />
      <Text 
        style={[
          styles.statusText, 
          { color: config.color },
          isSmall ? styles.statusTextSmall : {},
          { fontWeight: '600' }
        ]}
      >
        {config.text}
      </Text>
    </View>
  );
};

// Función para formatear fechas con manejo de errores
const formatDate = (dateString: string) => {
  try {
    if (!dateString) return 'Fecha no disponible';
    
    // Normalizar la fecha para manejar diferentes formatos
    let date;
    
    // Intentar parsear como ISO string
    date = new Date(dateString);
    
    // Si no es válida, intentar como timestamp
    if (isNaN(date.getTime()) && !isNaN(Number(dateString))) {
      date = new Date(Number(dateString));
    }
    
    // Si sigue sin ser válida
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida:', dateString);
      return 'Fecha no disponible';
    }
    
    // Usar Intl para formato consistente y completo en español
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Fecha no disponible';
  }
};

// Order Detail Modal Component - DISEÑO MEJORADO
const OrderDetail: React.FC<{
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  colors: ReturnType<typeof getColors>;
  onCancelOrder: (orderId: number) => void;
}> = ({ visible, onClose, order, colors, onCancelOrder }) => {
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isDarkMode = colors.background === '#121212';
  const [productDetails, setProductDetails] = useState<{[key: number]: any}>({});
  // Estado para almacenar el total calculado con precios correctos
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  // Función para obtener detalles de productos
  const fetchProductDetails = async (productIds: number[]) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      // Crear un objeto para almacenar los detalles
      const details: {[key: number]: any} = {};
      
      // Para cada producto, hacer una petición para obtener sus detalles
      for (const id of productIds) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Extraer precio usando la función centralizada
            const precio = extractPrice(data.precio);
            console.log(`Producto ${id} - API precio:`, data.precio, "Extraído:", precio);
            
            details[id] = {
              imagen: data.imagen || null,
              precio: precio
            };
          }
        } catch (e) {
          console.error(`Error obteniendo detalles para producto ${id}:`, e);
        }
      }
      
      setProductDetails(details);
      
      // Calcular el total correcto una vez que tenemos los precios reales
      if (order?.productos) {
        calculateCorrectTotal(order.productos, details);
      }
    } catch (e) {
      console.error("Error en fetchProductDetails:", e);
    }
  };
  
  // Nueva función para calcular el total con los precios reales
  const calculateCorrectTotal = (productos: OrderProduct[], details: {[key: number]: any}) => {
    let total = 0;
    console.log("Calculando total con precios de API...");
    
    for (const product of productos) {
      if (!product) continue;
      
      // Usar el precio de la API si está disponible
      let productPrice = 0;
      if (details[product.id] && details[product.id].precio) {
        productPrice = details[product.id].precio;
      } else {
        productPrice = extractPrice(product.precio);
      }
      
      const quantity = product.cantidad && product.cantidad > 0 ? product.cantidad : 1;
      
      const lineTotal = productPrice * quantity;
      console.log(`Producto ${product.id}: ${product.nombre} - Precio: ${productPrice} × ${quantity} = ${lineTotal}`);
      total += lineTotal;
    }
    
    console.log("Total calculado con precios reales:", total);
    setCalculatedTotal(total);
  };

  // Cargar detalles al abrir el modal con una orden
  useEffect(() => {
    if (order && visible && order.productos && order.productos.length > 0) {
      // Extraer todos los IDs de productos
      const productIds = order.productos.map(p => p.id);
      fetchProductDetails(productIds);
    }
  }, [order, visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleCancelOrder = () => {
    if (!order) return;
    Alert.alert(
      "Cancelar Pedido",
      "¿Estás seguro que deseas cancelar este pedido? Esta acción no se puede deshacer.",
      [
        { text: "No, mantener pedido", style: "cancel" },
        {
          text: "Sí, cancelar pedido",
          style: "destructive",
          onPress: () => {
            setLoading(true);
            onCancelOrder(order.id);
          }
        }
      ]
    );
  };

  if (!order) return null;
  
  const canCancel = order.estado === 'pendiente';
  
  // Elegir entre el total calculado con precios reales o el fallback
  const displayTotal = formatPrice(calculatedTotal > 0 ? calculatedTotal : getOrderTotal(order));
  
  // Obtener color según el estado para el total
  const getTotalColor = () => {
    switch (order.estado.toLowerCase()) {
      case 'completado':
        return colors.orderStatus.completado;
      case 'cancelado':
        return colors.orderStatus.cancelado;
      case 'pendiente':
      default:
        return colors.orderStatus.pendiente;
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Animated.View 
        style={[
          styles.modalOverlay, 
          { 
            backgroundColor: colors.modalBackground,
            opacity: fadeAnim
          }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }
              ],
              shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 1,
              shadowRadius: 12
            }
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[
                styles.closeButton, 
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Pedido #{order.id}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.modalContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
          >
            {/* Información básica del pedido */}
            <View style={styles.orderInfoContainer}>
              <View style={styles.orderInfoRow}>
                <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Estado</Text>
                <StatusBadge status={order.estado} colors={colors} />
              </View>
              
              {order.direccion_envio && (
                <View style={styles.orderInfoRow}>
                  <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>
                    <Ionicons name="location-outline" size={14} style={{marginRight: 4}} />
                    Dirección
                  </Text>
                  <Text style={[styles.orderInfoValue, { color: colors.text }]} numberOfLines={1}>
                    {order.direccion_envio}
                  </Text>
                </View>
              )}

              {order.metodo_pago && (
                <View style={styles.orderInfoRow}>
                  <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>
                    <Ionicons name="card-outline" size={14} style={{marginRight: 4}} />
                    Método de Pago
                  </Text>
                  <Text style={[styles.orderInfoValue, { color: colors.text }]}>
                    {order.metodo_pago}
                  </Text>
                </View>
              )}
            </View>

            {/* Lista de productos */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="cube-outline" size={18} style={{marginRight: 6}} />
              Productos
            </Text>
            
            {order.productos && order.productos.length > 0 ? (
              order.productos.map((product, index) => {
                // Intentar obtener imagen del producto de múltiples fuentes
                const productDetail = productDetails[product.id];
                const productImage = product.imagen || (productDetail?.imagen);
                
                // Si no hay imagen del producto, usar la URL por convención
                const imageUrl = productImage 
                  ? normalizeImageUrl(productImage) 
                  : getProductImageByConvention(product.id);
                
                // MEJORA: Obtener precio de la forma más fiable posible
                let price = 0;
                
                // Primero intentamos usar el precio de productDetail (que viene de la API)
                if (productDetail && productDetail.precio !== undefined) {
                  price = productDetail.precio; // Ya está convertido a número en fetchProductDetails
                } 
                // Si no está disponible, extraer del producto del pedido
                else {
                  price = extractPrice(product.precio);
                }
                
                return (
                  <View 
                    key={`${order.id}-product-${product.id}-${index}`} 
                    style={[
                      styles.productItem, 
                      { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        marginBottom: 14,
                        ...Platform.select({
                          ios: {
                            shadowColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 1,
                            shadowRadius: 6,
                          },
                          android: {
                            elevation: 4,
                          },
                        }),
                      }
                    ]}
                  >
                    {/* Implementación de imagen mejorada */}
                    <View 
                      style={[
                        styles.productImageContainer, 
                        { backgroundColor: colors.imagePlaceholder }
                      ]}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                        defaultSource={DEFAULT_IMAGE}
                      />
                    </View>
                    
                    <View style={styles.productDetails}>
                      <Text 
                        style={[
                          styles.productName, 
                          { 
                            color: colors.text,
                            fontWeight: '600'
                          }
                        ]} 
                        numberOfLines={2}
                      >
                        {product.nombre}
                      </Text>
                      
                      {/* Precio destacado */}
                      <View style={[
                        styles.priceBadge, 
                        { 
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        }
                      ]}>
                        <Text style={[
                          styles.productPrice, 
                          { 
                            color: colors.text,
                          }
                        ]}>
                          {formatPrice(price)}
                        </Text>
                      </View>
                      
                      {/* Detalles de variantes mejorados */}
                      <View style={styles.productVariantRow}>
                        {product.talla && (
                          <View style={[
                            styles.variantBadge,
                            {backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                          ]}>
                            <Text style={[styles.productVariant, { color: colors.secondaryText }]}>
                              Talla: {product.talla}
                            </Text>
                          </View>
                        )}
                        
                        {product.color && product.color !== 'default' && (
                          <View style={[
                            styles.variantBadge,
                            {backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                          ]}>
                            <Text style={[styles.productVariant, { color: colors.secondaryText }]}>
                              Color: {product.color}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Cantidad con icono */}
                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                        <Ionicons 
                          name="layers-outline" 
                          size={14} 
                          color={colors.secondaryText} 
                          style={{marginRight: 4}}
                        />
                        <Text style={[styles.productQuantity, { color: colors.secondaryText }]}>
                          Cantidad: {product.cantidad}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyProductsContainer}>
                <Ionicons 
                  name="cube-outline" 
                  size={32} 
                  color={colors.placeholderText} 
                  style={{marginBottom: 10}}
                />
                <Text style={[styles.emptyText, { color: colors.placeholderText }]}>
                  No hay productos disponibles
                </Text>
              </View>
            )}

            {/* Sección de total mejorada */}
            <View style={[styles.totalContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>
                Total del Pedido
              </Text>
              <View style={[
                styles.totalValueContainer, 
                { backgroundColor: colors.totalBg }
              ]}>
                <Text 
                  style={[
                    styles.totalValue, 
                    { 
                      color: getTotalColor(),
                    }
                  ]}
                >
                  {displayTotal}
                </Text>
              </View>
            </View>
            
            {/* Botón de cancelar pedido mejorado */}
            {canCancel && (
              <TouchableOpacity
                style={[
                  styles.cancelButton, 
                  { 
                    backgroundColor: colors.error,
                    shadowColor: colors.error,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 6
                  }
                ]}
                onPress={handleCancelOrder}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
                    <Text style={[
                      styles.cancelButtonText,
                      { fontWeight: '700', letterSpacing: 0.5 }
                    ]}>
                      Cancelar Pedido
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Empty State Component Mejorado
const EmptyOrdersState: React.FC<{colors: ReturnType<typeof getColors>}> = ({ colors }) => (
  <View style={styles.emptyStateContainer}>
    <FontAwesome5 name="box-open" size={60} color={colors.placeholderText} />
    <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
      No tienes pedidos
    </Text>
    <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>
      Cuando realices un pedido, aparecerá aquí
    </Text>
  </View>
);

// Main Component
const PedidosScreen = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = getColors(isDarkMode);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Limpiar caché de imágenes al montar el componente
  useEffect(() => {
    ImageCache.reset();
    console.log("Caché de imágenes limpiado al iniciar pedidos");
    
    return () => {
      // Limpieza al desmontar
      ImageCache.reset();
    };
  }, []);

  // Función mejorada para obtener el ID del usuario actual
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      // Primero intentar recuperarlo del almacenamiento de datos completos del usuario
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          console.log("Datos de usuario encontrados en AsyncStorage:", userData);
          if (userData && userData.id) {
            return userData.id.toString();
          }
        } catch (parseError) {
          console.error("Error al analizar datos de usuario:", parseError);
          // Continuar con otros métodos si hay error de parseo
        }
      }
      
      // Segundo intento: buscar solo el ID
      let userId = await AsyncStorage.getItem('userId');
      if (userId) {
        console.log("ID de usuario encontrado en AsyncStorage:", userId);
        return userId;
      }
      
      // Si no hay datos locales, obtenerlo del backend
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return null;
      
      console.log("Obteniendo datos de usuario desde API...");
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log("Datos de usuario encontrados en API:", userData);
        
        if (userData && userData.id) {
          userId = userData.id.toString();
          console.log("ID de usuario obtenido:", userId);
          
          // Guardar datos completos del usuario
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          // También guardar el ID por separado para acceso rápido
          if (userId) {
            await AsyncStorage.setItem('userId', userId);
          }
          
          return userId;
        } else {
          console.error("API respondió correctamente pero no se encontró ID de usuario");
          return null;
        }
      } else {
        console.error("Error en la respuesta de la API:", await response.text());
        return null;
      }
      
    } catch (error) {
      console.error('Error obteniendo ID de usuario:', error);
      return null;
    }
  };

  // Función mejorada para obtener pedidos del usuario actual
  const fetchOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (!refreshing) {
        setLoading(true);
      }
      
      setError(null);
      
      // Obtener token de autenticación
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error("No se encontró token de autenticación");
        setError('No has iniciado sesión');
        router.push('/perfil');
        return;
      }

      // Obtener el ID del usuario actual
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error("No se pudo obtener el ID de usuario");
        setError('No se pudo identificar el usuario');
        return;
      }
      
      console.log(`Obteniendo pedidos para el usuario ID: ${userId}`);
      
      // Usar el endpoint específico para obtener solo las ventas del usuario actual
      const url = `${API_BASE_URL}/api/ventas/usuario/${userId}`;
      console.log("URL de consulta:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log("Código de estado:", response.status);
      const responseText = await response.text();
      
      try {
        // Intentar parsear la respuesta como JSON
        const data = JSON.parse(responseText);
        
        if (response.ok) {
          console.log(`Pedidos recibidos para usuario ${userId}:`, data.length || 0);
          if (data && Array.isArray(data) && data.length > 0) {
            // Preprocesar los datos para asegurar que los precios estén correctos
            const processedOrders = data.map((order: Order) => {
              // Si el pedido tiene productos, verificar que tengan precios válidos
              if (order.productos && Array.isArray(order.productos)) {
                order.productos = order.productos.map(product => {
                  // Asegurar que el precio del producto sea un número
                  if (product.precio === undefined || product.precio === null) {
                    product.precio = 0;
                  }
                  return product;
                });
              }
              return order;
            });
            
            setOrders(processedOrders);
          } else {
            console.log("No se encontraron pedidos para este usuario");
            setOrders([]);
          }
        } else {
          console.error("Error en la respuesta:", data);
          setError(data.error || data.message || 'Error al cargar los pedidos');
        }
      } catch (jsonError) {
        console.error("Error al parsear respuesta JSON:", jsonError);
        console.error("Respuesta recibida:", responseText);
        setError('Error al procesar la respuesta del servidor');
      }
    } catch (err) {
      console.error('Error general al obtener pedidos:', err);
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, refreshing]);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // Handle refresh action
  const onRefresh = useCallback(() => {
    ImageCache.reset(); // Limpiar caché al refrescar
    fetchOrders(true);
  }, [fetchOrders]);
  
  // Handle order item press to show details
  const handleOrderPress = (order: Order) => {
    console.log("Viewing order details:", order.id);
    setSelectedOrder(order);
    setModalVisible(true);
  };
  
  // Handle close modal
  const handleCloseModal = () => {
    setModalVisible(false);
    // Small delay before unsetting the selected order for smooth animation
    setTimeout(() => setSelectedOrder(null), 300);
  };
  
  // Handle cancel order
  const handleCancelOrder = async (orderId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'Sesión expirada. Por favor inicia sesión nuevamente.');
        router.push('/perfil');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ventas/${orderId}/cancelar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Close modal
        setModalVisible(false);
        
        // Update the order status in the local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, estado: 'cancelado' } : order
          )
        );
        
        // Show success message
        setTimeout(() => {
          Alert.alert('Pedido Cancelado', 'Tu pedido ha sido cancelado correctamente.');
        }, 300);
      } else {
        Alert.alert('Error', data.error || 'No se pudo cancelar el pedido');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      Alert.alert('Error', 'Ocurrió un error al cancelar el pedido. Intenta nuevamente.');
    }
  };
    
  // Get status color for order card
  const getOrderStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completado':
        return colors.orderStatus.completado;
      case 'cancelado':
        return colors.orderStatus.cancelado;
      case 'pendiente':
      default:
        return colors.orderStatus.pendiente;
    }
  };
  
  // DISEÑO MEJORADO para las tarjetas de pedido
  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusColor = getOrderStatusColor(item.estado);
    
    // Seleccionar icono según estado
    let statusIcon: keyof typeof Ionicons.glyphMap = 'time-outline';
    if (item.estado === 'completado') {
      statusIcon = 'checkmark-circle';
    } else if (item.estado === 'cancelado') {
      statusIcon = 'close-circle';
    }
    
    // Contar productos
    const productCount = item.productos?.length || 0;
    
    // Extraer fecha para mostrarla en formato corto
    let date = '';
    try {
      if (item.created_at) {
        const createdDate = new Date(item.created_at);
        if (!isNaN(createdDate.getTime())) {
          date = new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          }).format(createdDate);
        }
      }
    } catch (e) {
      console.error('Error al formatear fecha en tarjeta:', e);
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.orderItem, 
          { 
            backgroundColor: colors.card, 
            borderColor: isDarkMode ? 'transparent' : colors.border,
            ...Platform.select({
              ios: {
                shadowColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.15)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 8,
              },
              android: {
                elevation: 5,
              },
            }),
          }
        ]}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.8}
      >
        {/* Banda de estado */}
        <View style={[styles.orderStatusBand, { backgroundColor: statusColor }]} />
        
        <View style={styles.orderContent}>
          {/* Encabezado con ID y estado */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <Text style={[
                styles.orderIdLabel, 
                { 
                  color: colors.text,
                  fontWeight: '700',
                  fontSize: 16
                }
              ]}>
                <Ionicons name="receipt-outline" size={15} style={{marginRight: 6}} color={colors.text} />
                Pedido #{item.id}
              </Text>
              {date && (
                <Text style={[styles.orderDate, { color: colors.secondaryText }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} style={{marginRight: 4}} />
                  {date}
                </Text>
              )}
            </View>
            <StatusBadge status={item.estado} colors={colors} size="small" />
          </View>

          {/* Separador */}
          <View style={[styles.orderDivider, { backgroundColor: colors.separator }]} />
          
          {/* Contenido del pedido */}
          <View style={styles.orderSummary}>
            <View style={styles.orderIconContainer}>
              <View style={[
                styles.orderIconCircle, 
                { 
                  backgroundColor: isDarkMode ? `${statusColor}20` : `${statusColor}15`,
                  borderWidth: 1,
                  borderColor: isDarkMode ? `${statusColor}30` : `${statusColor}25`,
                }
              ]}>
                <Ionicons name={statusIcon} size={22} color={statusColor} />
              </View>
            </View>
            
            <View style={styles.orderInfo}>
              <Text style={[styles.orderProductCount, { color: colors.text }]}>
                {productCount === 1 ? '1 producto' : `${productCount} productos      `}
              </Text>
              
              <Text style={[styles.orderStatusText, { color: statusColor }]}>
                {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
              </Text>

              {/* Flecha indicadora */}
              <View style={[
                styles.orderArrow,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 20
                }
              ]}>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={colors.secondaryText}
                />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.headerBg,
          },
          headerShadowVisible: false,
          headerTitle: 'Mis Pedidos',
          headerTitleStyle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 20,
                  padding: 8,
                  marginLeft: 8
                }
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      {error ? (
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={50} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[
              styles.retryButton, 
              { 
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8
              }
            ]}
            onPress={() => fetchOrders()}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryButtonText, { color: '#ffffff' }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Cargando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            orders.length === 0 ? { flex: 1 } : {}
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
              progressBackgroundColor={isDarkMode ? '#1e1e1e' : '#ffffff'}
            />
          }
          ListEmptyComponent={<EmptyOrdersState colors={colors} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <OrderDetail
        visible={modalVisible}
        onClose={handleCloseModal}
        order={selectedOrder}
        colors={colors}
        onCancelOrder={handleCancelOrder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  // Nuevos estilos para la tarjeta de pedido mejorada
  orderItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  orderStatusBand: {
    height: 6,
    width: '100%',
  },
  orderContent: {
    padding: 18,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  orderIdLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  orderDate: {
    fontSize: 13,
    fontWeight: '400',
  },
  orderDivider: {
    height: 1,
    marginBottom: 16,
  },
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconContainer: {
    marginRight: 16,
  },
  orderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderProductCount: {
    fontSize: 15,
    fontWeight: '500',
  },
  orderStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderArrow: {
    marginLeft: 'auto',
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    height: 44,
  },
  // Estilos de badge de estado mejorados
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextSmall: {
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal styles mejorados
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  orderInfoContainer: {
    marginBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 14,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '70%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 18,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 0,
  },
  productImageContainer: {
    width: 74,
    height: 74,
    marginRight: 14,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 8,
  },
  variantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 13,
  },
  productVariantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  productQuantity: {
    fontSize: 14,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginTop: 10,
    borderTopWidth: 1,
    marginBottom: 30,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyProductsContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 14,
    marginBottom: 20
  }
});

export default PedidosScreen;