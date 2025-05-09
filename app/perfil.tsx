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
import { useTheme } from '../theme'; // Importar el hook de tema

// URL base para la API
const API_BASE_URL = 'http://ohanatienda.ddns.net:8000';

// Obtener el ancho de la pantalla para el toast
const { width } = Dimensions.get('window');

// Componente Toast con soporte para tema
const Toast: React.FC<{ visible: boolean; message: string }> = ({ visible, message }) => {
  const { theme } = useTheme();
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
        { 
          opacity: fadeAnim,
          backgroundColor: theme.toastBg,
        }
      ]}
    >
      <Text style={[styles.toastText, { color: theme.toastText }]}>
        {message}
      </Text>
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
  const { theme, isDark, toggleTheme } = useTheme(); // Usar el tema
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={theme.gradientBg as [string, string, ...string[]]}
        style={styles.gradientBackground}
      >
        {/* Header personalizado */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Editar Perfil
          </Text>
          
          {/* Botón para cambiar tema */}
          <TouchableOpacity 
            style={styles.themeToggle}
            onPress={toggleTheme}
          >
            <Ionicons 
              name={isDark ? "sunny-outline" : "moon-outline"} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.loadingIndicator} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Cargando tus datos...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: theme.primary }]}
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
                    <View 
                      style={[
                        styles.avatar, 
                        { 
                          backgroundColor: theme.avatarBg,
                          borderColor: theme.avatarBorder 
                        }
                      ]}
                    >
                      <FontAwesome5 name="user" size={40} color={theme.primary} />
                    </View>
                  </View>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
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
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                          Nombre
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: theme.inputBg,
                              borderColor: touched.nombre && errors.nombre ? theme.error : theme.border,
                              color: theme.inputText,
                            }
                          ]}
                          value={values.nombre}
                          onChangeText={handleChange('nombre')}
                          onBlur={handleBlur('nombre')}
                          placeholder="Ingresa tu nombre"
                          placeholderTextColor={theme.textLight}
                          editable={!submitting}
                        />
                        {touched.nombre && errors.nombre && (
                          <Text style={[styles.errorText, { color: theme.error }]}>
                            {errors.nombre}
                          </Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                          Correo electrónico
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: theme.inputBg,
                              borderColor: touched.email && errors.email ? theme.error : theme.border,
                              color: theme.inputText,
                            }
                          ]}
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          placeholder="Ingresa tu correo electrónico"
                          placeholderTextColor={theme.textLight}
                          keyboardType="email-address"
                          editable={!submitting}
                          autoCapitalize="none"
                        />
                        {touched.email && errors.email && (
                          <Text style={[styles.errorText, { color: theme.error }]}>
                            {errors.email}
                          </Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                          Teléfono
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: theme.inputBg,
                              borderColor: touched.telefono && errors.telefono ? theme.error : theme.border,
                              color: theme.inputText,
                            }
                          ]}
                          value={values.telefono}
                          onChangeText={handleChange('telefono')}
                          onBlur={handleBlur('telefono')}
                          placeholder="Ingresa tu número de teléfono"
                          placeholderTextColor={theme.textLight}
                          keyboardType="phone-pad"
                          editable={!submitting}
                        />
                        {touched.telefono && errors.telefono && (
                          <Text style={[styles.errorText, { color: theme.error }]}>
                            {errors.telefono}
                          </Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                          Dirección
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.textArea,
                            { 
                              backgroundColor: theme.inputBg,
                              borderColor: touched.direccion && errors.direccion ? theme.error : theme.border,
                              color: theme.inputText,
                            }
                          ]}
                          value={values.direccion}
                          onChangeText={handleChange('direccion')}
                          onBlur={handleBlur('direccion')}
                          placeholder="Ingresa tu dirección"
                          placeholderTextColor={theme.textLight}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          editable={!submitting}
                        />
                        {touched.direccion && errors.direccion && (
                          <Text style={[styles.errorText, { color: theme.error }]}>
                            {errors.direccion}
                          </Text>
                        )}
                      </View>

                      <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                          style={[
                            styles.cancelButton,
                            {
                              backgroundColor: theme.inputBg,
                              borderColor: theme.border
                            }
                          ]}
                          onPress={() => router.back()}
                          disabled={submitting}
                        >
                          <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.saveButton, 
                            {
                              backgroundColor: submitting ? theme.disabled : theme.primary
                            }
                          ]}
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
                    <Text style={[styles.footerText, { color: theme.textLight }]}>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  saveButton: {
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
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  loginButton: {
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
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 100,
    alignSelf: 'center',
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
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EditProfileScreen;