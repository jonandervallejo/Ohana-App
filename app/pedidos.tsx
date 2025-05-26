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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from './hooks/useColorScheme';

const API_BASE_URL = 'https://ohanatienda.ddns.net';

// Function to get colors based on theme
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#ffffff',
  card: isDark ? '#1e1e1e' : '#ffffff',
  text: isDark ? '#ffffff' : '#000000',
  secondaryText: isDark ? '#b0b0b0' : '#666666',
  border: isDark ? '#2c2c2c' : '#eeeeee',
  separator: isDark ? '#2c2c2c' : '#f5f5f5',
  headerBg: isDark ? '#121212' : '#ffffff',
  badge: {
    pendiente: {
      bg: isDark ? '#333333' : '#fff9c4',
      text: isDark ? '#ffd54f' : '#f57f17'
    },
    completado: {
      bg: isDark ? '#1b5e20' : '#e8f5e9',
      text: isDark ? '#81c784' : '#2e7d32'
    },
    cancelado: {
      bg: isDark ? '#330000' : '#ffebee',
      text: isDark ? '#ef9a9a' : '#c62828'
    }
  },
  button: isDark ? '#2c2c2c' : '#ffffff',
  buttonText: isDark ? '#ffffff' : '#000000',
  accent: isDark ? '#bb86fc' : '#6200ee',
  modalBackground: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
  placeholderText: isDark ? '#555555' : '#cccccc',
  shadow: isDark ? '#000000' : '#000000',
  error: isDark ? '#cf6679' : '#b00020',
  icon: isDark ? '#b0b0b0' : '#757575',
});

// Order interfaces
interface OrderProduct {
  id: number;
  nombre: string;
  precio: string;
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
  total: number;
  direccion_envio?: string;
  metodo_pago?: string;
}

// Order Status Badge Component
const StatusBadge: React.FC<{ status: string, colors: any }> = ({ status, colors }) => {
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

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={14} color={config.color} style={styles.statusIcon} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// Order Detail Modal Component
const OrderDetail: React.FC<{
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  colors: ReturnType<typeof getColors>;
  onCancelOrder: (orderId: number) => void;
}> = ({ visible, onClose, order, colors, onCancelOrder }) => {
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(2) + ' €';
  };

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

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
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
              ]
            }
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Detalles del Pedido</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderInfoContainer}>
              <View style={styles.orderInfoRow}>
                <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Número de Pedido</Text>
                <Text style={[styles.orderInfoValue, { color: colors.text }]}>#{order.id}</Text>
              </View>
              
              <View style={styles.orderInfoRow}>
                <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Fecha</Text>
                <Text style={[styles.orderInfoValue, { color: colors.text }]}>{formatDate(order.created_at)}</Text>
              </View>
              
              <View style={styles.orderInfoRow}>
                <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Estado</Text>
                <StatusBadge status={order.estado} colors={colors} />
              </View>

              {order.direccion_envio && (
                <View style={styles.orderInfoRow}>
                  <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Dirección de Envío</Text>
                  <Text style={[styles.orderInfoValue, { color: colors.text }]}>{order.direccion_envio}</Text>
                </View>
              )}

              {order.metodo_pago && (
                <View style={styles.orderInfoRow}>
                  <Text style={[styles.orderInfoLabel, { color: colors.secondaryText }]}>Método de Pago</Text>
                  <Text style={[styles.orderInfoValue, { color: colors.text }]}>{order.metodo_pago}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Productos</Text>
            
            {order.productos && order.productos.length > 0 ? (
              order.productos.map((product, index) => (
                <View 
                  key={`${order.id}-product-${product.id}-${index}`} 
                  style={[
                    styles.productItem, 
                    { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                >
                  {/* We could add product image here if available */}
                  <View style={styles.productDetails}>
                    <Text style={[styles.productName, { color: colors.text }]}>{product.nombre}</Text>
                    <Text style={[styles.productVariant, { color: colors.secondaryText }]}>
                      {`${product.talla}${product.color !== 'default' ? ` • ${product.color}` : ''}`}
                    </Text>
                    <View style={styles.productPriceRow}>
                      <Text style={[styles.productPrice, { color: colors.text }]}>{formatPrice(product.precio)}</Text>
                      <Text style={[styles.productQuantity, { color: colors.secondaryText }]}>
                        x{product.cantidad}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.placeholderText }]}>
                No hay productos disponibles
              </Text>
            )}

            <View style={[styles.totalContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatPrice(order.total)}</Text>
            </View>
            
            {canCancel && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.error }]}
                onPress={handleCancelOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#ffffff" style={styles.buttonIcon} />
                    <Text style={styles.cancelButtonText}>Cancelar Pedido</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Empty State Component
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

  // Fetch orders from API
  const fetchOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (!refreshing) {
        setLoading(true);
      }
      
      setError(null);
      
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('No has iniciado sesión');
        router.push('/perfil');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ventas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data);
      } else {
        setError(data.error || 'Error al cargar los pedidos');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  // Handle refresh action
  const onRefresh = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);
  
  // Handle order item press to show details
  const handleOrderPress = (order: Order) => {
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
  
  // Format date for list items
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };
  
  // Format price
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(2) + ' €';
  };
  
  // Render order item
  const renderOrderItem = ({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        style={[styles.orderItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={[styles.orderIdLabel, { color: colors.secondaryText }]}>Pedido #</Text>
            <Text style={[styles.orderId, { color: colors.text }]}>{item.id}</Text>
          </View>
          <StatusBadge status={item.estado} colors={colors} />
        </View>
        
        <View style={[styles.orderDivider, { backgroundColor: colors.separator }]} />
        
        <View style={styles.orderFooter}>
          <Text style={[styles.orderDate, { color: colors.secondaryText }]}>
            {formatShortDate(item.created_at)}
          </Text>
          <Text style={[styles.orderTotal, { color: colors.text }]}>
            {formatPrice(item.total)}
          </Text>
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
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={24}
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
            style={[styles.retryButton, { backgroundColor: colors.button }]}
            onPress={() => fetchOrders()}
          >
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Reintentar</Text>
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
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={<EmptyOrdersState colors={colors} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  orderItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderDivider: {
    height: 1,
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 14,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
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
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  orderInfoContainer: {
    marginBottom: 24,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 14,
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  productQuantity: {
    fontSize: 14,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    marginBottom: 30,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
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
});

export default PedidosScreen;