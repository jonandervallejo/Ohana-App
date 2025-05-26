import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useCart } from '../hooks/useCart';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Default image for fallback
const DEFAULT_IMAGE = require('@/assets/images/camiseta1.jpg');
const API_BASE_URL = 'https://ohanatienda.ddns.net';

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

// Función para obtener colores según el tema
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#ffffff',
  card: isDark ? '#1e1e1e' : '#ffffff',
  text: isDark ? '#ffffff' : '#000000',
  secondaryText: isDark ? '#b0b0b0' : '#666666',
  border: isDark ? '#2c2c2c' : '#eeeeee',
  itemBackground: isDark ? '#1e1e1e' : '#f8f8f8',
  input: isDark ? '#2c2c2c' : '#ffffff',
  inputBorder: isDark ? '#444444' : '#cccccc',
  button: isDark ? '#2c2c2c' : '#000000',
  buttonText: isDark ? '#ffffff' : '#ffffff',
  separator: isDark ? '#2c2c2c' : '#ddd',
  icon: isDark ? '#cccccc' : '#ccc',
  quantityButton: isDark ? '#333333' : '#f0f0f0',
  removeButton: isDark ? '#ff5252' : '#ff4444',
  disabledButton: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)',
  headerText: isDark ? '#ffffff' : '#000000',
  imagePlaceholder: isDark ? '#2c2c2c' : '#e0e0e0',
  success: isDark ? '#4ddb64' : '#4CAF50',
});

export default function CarritoScreen() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const [shipping, setShipping] = useState('');
  const [payment, setPayment] = useState('');
  const [promos, setPromos] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  
  // Usar el hook de colorScheme con estado local para asegurar actualizaciones
  const { colorScheme } = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const [colors, setColors] = useState(getColors(colorScheme === 'dark'));
  
  // Actualizar colores cuando cambia el tema
  useEffect(() => {
    setIsDarkMode(colorScheme === 'dark');
    setColors(getColors(colorScheme === 'dark'));
  }, [colorScheme]);
  
  // Cargar datos del usuario cuando se monta el componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.id) {
            setUserId(parseInt(userData.id));
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
      }
    };
    
    loadUserData();
  }, []);
  
  // Asegurar que se actualice también cuando se enfoca la pantalla (cambio entre tabs)
  useFocusEffect(
    React.useCallback(() => {
      setIsDarkMode(colorScheme === 'dark');
      setColors(getColors(colorScheme === 'dark'));
      return () => {
        // Clear image cache when leaving screen
        ImageCache.reset();
      };
    }, [colorScheme])
  );

  const formatPrice = (price: string) => {
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return '0.00 €';
      return `${numPrice.toFixed(2)} €`;
    } catch (e) {
      return '0.00 €';
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.precio);
      return total + (isNaN(price) ? 0 : price * item.cantidad);
    }, 0);
  };
  
  // Función para aumentar la cantidad con límite de 5
  const handleIncreaseQuantity = (item: { id: number; cantidad: number }) => {
    if (item.cantidad >= 5) {
      Alert.alert(
        "Cantidad máxima",
        "Solo puedes añadir hasta 5 unidades de un mismo producto"
      );
      return;
    }
    updateQuantity(Number(item.id), item.cantidad + 1);
  };

  // Función mejorada para obtener el color del producto
  const getProductColor = (productId: number) => {
    // Para los items en el carrito, usar el color que viene con el item
    const cartItem = cartItems.find(item => item.id === productId);
    if (cartItem && cartItem.color && cartItem.color !== 'default') {
      return cartItem.color;
    }
    
    // Tabla de mapeo para casos específicos conocidos
    const colorMap: Record<number, string> = {
      40: "Negro",
      43: "Leopardo",
      // Agregar más mapeos según sea necesario
    };
    
    // Si el producto está en nuestro mapeo, usar ese color
    if (colorMap[productId]) {
      return colorMap[productId];
    }
    
    // Para otros productos sin mapeo específico
    return "Negro"; // Un color seguro que probablemente exista para la mayoría de los productos
  };

  // Función para procesar el pedido - FIXED VERSION
  const handleOrder = async () => {
    if (!userId) {
      Alert.alert(
        "Inicia sesión",
        "Debes iniciar sesión para realizar un pedido",
        [
          { text: "Iniciar sesión", onPress: () => router.push('/perfil') }
        ]
      );
      return;
    }

    if (!shipping || !payment) {
      Alert.alert(
        "Datos incompletos",
        "Por favor completa todos los datos de envío y pago"
      );
      return;
    }

    setOrderLoading(true);

    try {
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert("Error", "Sesión no válida. Por favor inicia sesión nuevamente.");
        setOrderLoading(false);
        router.push('/perfil');
        return;
      }
      
      // Asegurarnos que tenemos productos válidos
      if (!cartItems.length) {
        Alert.alert("Carrito vacío", "No hay productos en el carrito para realizar un pedido.");
        setOrderLoading(false);
        return;
      }
      
      // Preparar datos de la orden según la estructura que espera el backend
      const orderData = {
        id_usuario: userId,
        productos: cartItems.map(item => {
          const itemId = parseInt(String(item.id));
          return {
            id_producto: itemId,
            // tiene que llegar Única sino no lo recibe el backend
            talla: item.talla && item.talla.toLowerCase() === 'única' ? 'Única' : item.talla,
            // Usar el color que viene con el ítem del carrito directamente
            color: item.color && item.color !== 'default' ? item.color : getProductColor(itemId),
            cantidad: item.cantidad
          };
        }),
        direccion_envio: shipping,
        metodo_pago: payment,
        codigo_promo: promos || null
      };
      
      console.log("Enviando pedido:", JSON.stringify(orderData, null, 2));
      
      // Realizar la petición al backend
      const response = await fetch(`${API_BASE_URL}/api/ventas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      // Obtener el texto completo de la respuesta
      const responseText = await response.text();
      console.log("Respuesta completa:", responseText);
      
      // Manejar respuestas de error específicas
      if (responseText.includes("Server Error") || response.status === 500) {
        Alert.alert(
          "Error del servidor",
          "Ha ocurrido un problema con el servidor. Esto puede deberse a que no hay suficiente stock disponible para alguno de los productos seleccionados.",
          [
            { text: "Entendido" }
          ]
        );
        setOrderLoading(false);
        return;
      }
      
      let data;
      try {
        // Intentar parsear la respuesta como JSON
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error al parsear respuesta JSON:", e);
        Alert.alert(
          "Error de formato",
          "La respuesta del servidor no es válida. Por favor contacta al soporte técnico."
        );
        setOrderLoading(false);
        return;
      }
      
      if (response.ok) {
        // Pedido procesado correctamente
        Alert.alert(
          "¡Pedido realizado!",
          `Tu pedido #${data.id} ha sido creado con éxito.`,
          [
            { 
              text: "Ver mis pedidos", 
              onPress: () => {
                clearCart(); // Limpiar el carrito
                router.push('/pedidos'); // Navegar a la página de pedidos
              }
            },
            {
              text: "Seguir comprando",
              onPress: () => {
                clearCart(); // Limpiar el carrito
                router.push('/(tabs)'); // Volver a la tienda
              }
            }
          ]
        );
      } else {
        // Error en la creación del pedido
        let errorMessage = "No se pudo procesar tu pedido.";
        
        // Si es un error de validación (código 422)
        if (response.status === 422 && data.errors) {
          errorMessage = "Errores de validación:\n";
          
          // Formatear errores de validación
          Object.keys(data.errors).forEach(field => {
            const errors = data.errors[field];
            if (Array.isArray(errors)) {
              errors.forEach(error => {
                errorMessage += `- ${error}\n`;
              });
            }
          });
        } else if (data.error) {
          // Si hay un mensaje de error general
          errorMessage = data.error;
        }
        
        Alert.alert(
          "Error en el pedido",
          errorMessage
        );
      }
    } catch (error) {
      console.error("Error al crear el pedido:", error);
      Alert.alert(
        "Error de conexión",
        "No pudimos conectar con el servidor. Por favor verifica tu conexión a internet e inténtalo nuevamente."
      );
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <ScrollView>
        <Text style={[styles.header, { color: colors.headerText }]}>Carrito de la compra</Text>
        
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={64} color={colors.icon} />
            <Text style={[styles.emptyCartText, { color: colors.secondaryText }]}>Tu carrito está vacío</Text>
          </View>
        ) : (
          <>
            <View style={styles.itemsContainer}>
              {cartItems.map((item) => {
                // Usar la función normalizeImageUrl para gestionar la imagen correctamente
                const imageUrl = normalizeImageUrl(item.imagen);
                
                return (
                <View key={item.id} style={[styles.item, { backgroundColor: colors.itemBackground }]}>
                  <View style={[styles.imageContainer, { backgroundColor: colors.imagePlaceholder }]}>
                    <Image
                      source={imageUrl ? { uri: imageUrl } : DEFAULT_IMAGE}
                      style={styles.image}
                      resizeMode="cover"
                      onLoad={() => ImageCache.markAsValid(item.imagen)}
                      onError={() => {
                        console.log("Error cargando imagen:", item.imagen);
                        ImageCache.markAsFailed(item.imagen);
                      }}
                    />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.nombre}</Text>
                    <Text style={[styles.price, { color: colors.text }]}>{formatPrice(item.precio)}</Text>
                    {item.talla && (
                      <Text style={[styles.size, { color: colors.secondaryText }]}>Talla: {item.talla}</Text>
                    )}
                    {/* Mostrar el color seleccionado si existe */}
                    {item.color && item.color !== 'default' && (
                      <Text style={[styles.size, { color: colors.secondaryText }]}>Color: {item.color}</Text>
                    )}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(Number(item.id), item.cantidad - 1)}
                        style={[styles.quantityButton, { backgroundColor: colors.quantityButton }]}
                      >
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.quantity, { color: colors.text }]}>{item.cantidad}</Text>
                      <TouchableOpacity
                        onPress={() => handleIncreaseQuantity(item)}
                        style={[
                          styles.quantityButton, 
                          { backgroundColor: colors.quantityButton },
                          item.cantidad >= 5 && { opacity: 0.5 }
                        ]}
                        disabled={item.cantidad >= 5}
                      >
                        <Ionicons 
                          name="add" 
                          size={20} 
                          color={item.cantidad >= 5 ? colors.secondaryText : colors.text} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={24} color={colors.removeButton} />
                  </TouchableOpacity>
                </View>
              )})}
            </View>

            <View style={[styles.summary, { borderTopColor: colors.separator, backgroundColor: colors.itemBackground }]}>
              <Text style={[styles.totalText, { color: colors.text }]}>Subtotal</Text>
              <Text style={[styles.totalPrice, { color: colors.text }]}>{formatPrice(calculateTotal().toString())}</Text>
            </View>
            
            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Dirección de envío</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu dirección de envío"
                placeholderTextColor={colors.secondaryText}
                value={shipping}
                onChangeText={setShipping}
              />
            </View>
            
            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Método de pago</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu método de pago"
                placeholderTextColor={colors.secondaryText}
                value={payment}
                onChangeText={setPayment}
              />
            </View>

            <View style={[styles.section, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Código promocional</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.input, 
                    borderColor: colors.inputBorder,
                    color: colors.text 
                  }
                ]}
                placeholder="Introduce tu código promocional"
                placeholderTextColor={colors.secondaryText}
                value={promos}
                onChangeText={setPromos}
              />
            </View>
          </>
        )}
      </ScrollView>
      
      {cartItems.length > 0 && (
        <View style={[styles.bottomContainer, { backgroundColor: colors.background, borderTopColor: colors.separator }]}>
          <View style={styles.totalContainer}>
            <Text style={[styles.totalTextBold, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalPriceBold, { color: colors.text }]}>{formatPrice(calculateTotal().toString())}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: orderLoading ? colors.disabledButton : colors.button },
              (!shipping || !payment || orderLoading) && { opacity: 0.6 }
            ]}
            disabled={!shipping || !payment || orderLoading}
            onPress={handleOrder}
          >
            {orderLoading ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>Hacer pedido</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginLeft: 20, 
    marginTop: 50,
    marginBottom: 20 
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    marginTop: 10,
  },
  itemsContainer: { 
    padding: 15 
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    borderRadius: 12,
    padding: 10,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 8,
  },
  itemDetails: { 
    flex: 1, 
    marginLeft: 15 
  },
  name: { 
    fontSize: 16, 
    fontWeight: '500',
    marginBottom: 4 
  },
  price: { 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 4 
  },
  size: {
    fontSize: 14,
    marginBottom: 8
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 10,
  },
  summary: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderTopWidth: 1,
  },
  totalText: { 
    fontSize: 16 
  },
  totalPrice: { 
    fontSize: 16 
  },
  section: { 
    padding: 15, 
    borderBottomWidth: 1,
  },
  label: { 
    fontSize: 14, 
    marginBottom: 8 
  },
  input: { 
    height: 40, 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 10,
    fontSize: 14,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalTextBold: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  totalPriceBold: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  button: { 
    padding: 15, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});