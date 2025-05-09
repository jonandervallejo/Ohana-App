import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

// URL base para la API
const API_BASE_URL = 'http://ohanatienda.ddns.net:8000';

// Obtener el ancho de la pantalla para el toast
const { width } = Dimensions.get('window');

// Componente Toast simple
const Toast: React.FC<{ visible: boolean; message: string }> = ({ visible, message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.toast,
        { opacity: fadeAnim }
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// Esquema de validación
const ProfileSchema = Yup.object().shape({
  nombre: Yup.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .required('El nombre es requerido'),
  telefono: Yup.string()
    .nullable()
    .matches(/^[0-9]*$/, 'Solo se permiten números'),
  direccion: Yup.string()
    .nullable(),
  email: Yup.string()
    .email('Correo electrónico inválido')
    .required('El correo electrónico es requerido'),
});

interface UserData {
  id?: number;
  nombre?: string;
  email?: string;
  direccion?: string;
  telefono?: string;
  rol?: string;
  created_at?: string;
  apellido1?: string;
  apellido2?: string;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Función para mostrar el toast
  const showToast = (message: string, duration = 2000) => {
    setToastMessage(message);
    setToastVisible(true);
    
    // Ocultar el toast después de la duración especificada
    setTimeout(() => {
      setToastVisible(false);
    }, duration);
  };

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
      } catch (error) {
        console.error('Error al cargar datos de usuario:', error);
        setError('Error al cargar tus datos');
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  const handleSubmit = async (values: UserData) => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'Sesión expirada. Por favor, inicia sesión de nuevo.');
        router.replace('/perfil');
        return;
      }
  
      if (!userData?.id) {
        throw new Error('ID de usuario no encontrado');
      }
  
      // Preparar datos a actualizar
      const updateData = {
        nombre: values.nombre,
        apellido1: userData.apellido1 || '',
        apellido2: userData.apellido2 || '',
        email: values.email,
        telefono: values.telefono || null,
        direccion: values.direccion || null
      };
  
      // Usar el endpoint específico para apps móviles (POST en lugar de PUT)
      const response = await axios.post(
        `${API_BASE_URL}/api/tienda/update-perfil`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('Respuesta actualización:', response.data);
      
      // Actualizar datos en AsyncStorage
      const updatedUserData = {...userData, ...values};
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      // Mostrar toast de éxito en vez de Alert
      setSubmitting(false);
      showToast('¡Perfil actualizado con éxito!');
      
      // Redirigir después de mostrar el toast
      setTimeout(() => {
        router.back();
      }, 1500);
  
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      
      let errorMessage = 'Error al actualizar tu perfil. Inténtalo de nuevo.';
      
      if (error.response) {
        if (error.response.status === 422) {
          // Error de validación
          const validationErrors = error.response.data?.errors || {};
          if (Object.keys(validationErrors).length > 0) {
            const firstErrorField = Object.keys(validationErrors)[0];
            const firstError = validationErrors[firstErrorField];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        } else if (error.response.status === 401) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          router.replace('/perfil');
        } else {
          errorMessage = `Error en el servidor: ${error.response.status}`;
        }
      }
      
      Alert.alert('Error', errorMessage);
      setSubmitting(false);
    }
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
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={styles.headerRight} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando tus datos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.replace('/perfil')}
            >
              <Text style={styles.loginButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{flex: 1}}
          >
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 40}}
            >
              <View style={styles.formContainer}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <FontAwesome5 name="user" size={40} color="#007AFF" />
                    </View>
                  </View>
                  <Text style={styles.subtitle}>
                    Actualiza tu información personal
                  </Text>
                </View>

                <Formik
                  initialValues={{
                    nombre: userData?.nombre || '',
                    email: userData?.email || '',
                    telefono: userData?.telefono || '',
                    direccion: userData?.direccion || '',
                  }}
                  validationSchema={ProfileSchema}
                  onSubmit={handleSubmit}
                >
                  {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre</Text>
                        <TextInput
                          style={[
                            styles.input,
                            touched.nombre && errors.nombre && styles.inputError
                          ]}
                          value={values.nombre}
                          onChangeText={handleChange('nombre')}
                          onBlur={handleBlur('nombre')}
                          placeholder="Ingresa tu nombre"
                          editable={!submitting}
                        />
                        {touched.nombre && errors.nombre && (
                          <Text style={styles.errorText}>{errors.nombre}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Correo electrónico</Text>
                        <TextInput
                          style={[
                            styles.input,
                            touched.email && errors.email && styles.inputError
                          ]}
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          placeholder="Ingresa tu correo electrónico"
                          keyboardType="email-address"
                          editable={!submitting}
                          autoCapitalize="none"
                        />
                        {touched.email && errors.email && (
                          <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput
                          style={[
                            styles.input,
                            touched.telefono && errors.telefono && styles.inputError
                          ]}
                          value={values.telefono}
                          onChangeText={handleChange('telefono')}
                          onBlur={handleBlur('telefono')}
                          placeholder="Ingresa tu número de teléfono"
                          keyboardType="phone-pad"
                          editable={!submitting}
                        />
                        {touched.telefono && errors.telefono && (
                          <Text style={styles.errorText}>{errors.telefono}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Dirección</Text>
                        <TextInput
                          style={[
                            styles.input,
                            touched.direccion && errors.direccion && styles.inputError,
                            styles.textArea
                          ]}
                          value={values.direccion}
                          onChangeText={handleChange('direccion')}
                          onBlur={handleBlur('direccion')}
                          placeholder="Ingresa tu dirección"
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          editable={!submitting}
                        />
                        {touched.direccion && errors.direccion && (
                          <Text style={styles.errorText}>{errors.direccion}</Text>
                        )}
                      </View>

                      <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                          style={[styles.cancelButton]}
                          onPress={() => router.back()}
                          disabled={submitting}
                        >
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.saveButton, submitting && styles.buttonDisabled]}
                          onPress={() => handleSubmit()}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Formik>

                {userData?.created_at && (
                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                      Cuenta creada el {formatDate(userData.created_at)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
      
      {/* Toast para mensajes de éxito */}
      <Toast 
        visible={toastVisible}
        message={toastMessage}
      />
    </SafeAreaView>
  );
};

// Formatear fecha
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
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
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cce5ff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#b3d1ff',
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
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
  // Estilos para el toast (igual que en perfil.tsx)
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 100, // Valores aumentados para que aparezca más abajo
    alignSelf: 'center',
    backgroundColor: '#4CAF50', // Color verde para éxito
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
    maxWidth: width * 0.8,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EditProfileScreen;