import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { useFavoritos } from './hooks/useFavoritos';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface UserData {
  id?: number;
  nombre?: string;
  email?: string;
  direccion?: string;
  telefono?: string;
  rol?: string;
  created_at?: string;
}

// Componente para el Modal de Cierre de Sesión
const LogoutModal = ({
  visible,
  onClose,
  onConfirm,
  userData
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userData: UserData | null;
}) => {
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(modalScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Nombre a mostrar en el modal
  const displayName = userData?.nombre || userData?.email || 'tu cuenta';

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: modalOpacityAnim,
              transform: [{ scale: modalScaleAnim }],
            },
          ]}
        >
          {/* Botón X para cerrar el modal */}
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={onClose}
          >
            <FontAwesome5 name="times" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.modalIconContainer}>
            <View style={styles.modalIconCircle}>
              <FontAwesome5 name="sign-out-alt" size={30} color="#FF3B30" />
            </View>
          </View>

          <Text style={styles.modalTitle}>Cerrar Sesión</Text>

          <Text style={styles.modalMessage}>
            ¿Estás seguro que deseas cerrar sesión?
          </Text>

          {/* Botón único centrado */}
          <TouchableOpacity
            style={styles.modalConfirmButton}
            onPress={onConfirm}
          >
            <Text style={styles.modalConfirmButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const UserProfileScreen = () => {
  const router = useRouter();
  const { cambiarUsuario } = useFavoritos();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Estado para controlar la visibilidad del modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const getUserData = async () => {
      try {
        setLoading(true);
        const userDataStr = await AsyncStorage.getItem('userData');
        const token = await AsyncStorage.getItem('userToken');

        if (!token || !userDataStr) {
          setError('No has iniciado sesión');
          router.replace('/perfil');
          return;
        }

        const parsedUserData = JSON.parse(userDataStr);
        setUserData(parsedUserData);
        
        // Animar la aparición del contenido
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }).start();
      } catch (error) {
        console.error('Error al cargar datos de usuario:', error);
        setError('Error al cargar tus datos');
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  const handleLogout = async () => {
  try {
    setLogoutLoading(true);
    
    // Obtener el email actual antes de limpiar los datos
    const userDataStr = await AsyncStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const email = userData?.email || null;
    
    // CAMBIAR ESTAS LÍNEAS: Eliminar solo los datos de sesión
    // await AsyncStorage.clear(); <-- ELIMINAR ESTA LÍNEA
    
    // Eliminar solo el token y los datos de usuario
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    // Puedes eliminar cualquier otro dato de sesión aquí
    
    // Cambiar a favoritos anónimos pero mantener los actuales favoritos
    await cambiarUsuario('anonymous');
    
    setTimeout(() => {
      setLogoutLoading(false);
      router.push('/perfil');
    }, 500);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    setLogoutLoading(false);
  }
};

  // Formatear fecha para mostrarla con formato más amigable
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={['#f8f8f8', '#ffffff']}
        style={styles.gradientBackground}
      >
        {/* Header minimalista */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <View style={{width: 40}} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.replace('/perfil')}
            >
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Animated.View 
              style={[
                styles.profileContent,
                { opacity: fadeAnim }
              ]}
            >
              {/* Avatar y nombre de usuario */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <FontAwesome5 name="user" size={40} color="#000" />
                  </View>
                  <View style={styles.activeIndicator} />
                </View>
                <Text style={styles.userName}>{userData?.nombre || 'Usuario'}</Text>
                <Text style={styles.userRole}>
                  {userData?.rol === 'admin' ? 'Administrador' : 'Cliente'}
                </Text>
              </View>
              
              {/* Información del usuario */}
              <View style={styles.infoContainer}>
                <Text style={styles.sectionTitle}>Información Personal</Text>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome5 name="envelope" size={16} color="#000" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Correo electrónico</Text>
                      <Text style={styles.infoValue}>{userData?.email || 'No disponible'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.separator} />
                  
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome5 name="phone" size={16} color="#000" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Teléfono</Text>
                      <Text style={styles.infoValue}>{userData?.telefono || 'No disponible'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.separator} />
                  
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome5 name="map-marker-alt" size={16} color="#000" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Dirección</Text>
                      <Text style={styles.infoValue}>{userData?.direccion || 'No disponible'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.separator} />
                  
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome5 name="calendar" size={16} color="#000" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Miembro desde</Text>
                      <Text style={styles.infoValue}>{formatDate(userData?.created_at)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Acciones de usuario */}
              <View style={styles.actionsContainer}>
                <Text style={styles.sectionTitle}>Mi Cuenta</Text>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/favoritos')}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconContainer}>
                    <FontAwesome5 name="heart" size={20} color="#000" />
                  </View>
                  <Text style={styles.actionButtonText}>Favoritos</Text>
                  <FontAwesome5 name="chevron-right" size={16} color="#999" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/editar-perfil')}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconContainer}>
                    <FontAwesome5 name="user-edit" size={20} color="#000" />
                  </View>
                  <Text style={styles.actionButtonText}>Editar Perfil</Text>
                  <FontAwesome5 name="chevron-right" size={16} color="#999" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/favoritos')}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIconContainer}>
                    <FontAwesome5 name="shopping-bag" size={20} color="#000" />
                  </View>
                  <Text style={styles.actionButtonText}>Historial de Pedidos</Text>
                  <FontAwesome5 name="chevron-right" size={16} color="#999" />
                </TouchableOpacity>
              </View>
              
              {/* Botón de cerrar sesión - MODIFICADO para abrir el modal */}
              <View style={styles.logoutContainer}>
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={() => setShowLogoutModal(true)}
                  disabled={logoutLoading}
                  activeOpacity={0.8}
                >
                  {logoutLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome5 name="sign-out-alt" size={20} color="#fff" />
                      <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Modal de cierre de sesión */}
              <LogoutModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                userData={userData}
              />
              
              {/* Versión de la app */}
              <View style={styles.versionContainer}>
                <Text style={styles.versionText}>Ohana App v1.0.0</Text>
              </View>
            </Animated.View>
          </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  backButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
    paddingHorizontal: 5,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
        borderWidth: 1,
        borderColor: '#eee',
      },
    }),
    padding: 5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginLeft: 65,
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee',
      },
    }),
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  logoutContainer: {
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoutButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
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
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    color: '#999',
    fontSize: 14,
  },
  
  // Estilos para el modal de cierre de sesión
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    position: 'relative',
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingTop: 25,
    paddingBottom: 20,
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
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalIconContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Color rojo para cerrar sesión
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
    marginBottom: 30,
    paddingHorizontal: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalHighlight: {
    fontWeight: '700',
    color: '#000',
  },
  modalConfirmButton: {
    width: '70%', // Ancho reducido para centrarlo
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30', // Color rojo para cerrar sesión
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfileScreen;