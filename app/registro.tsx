import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Dimensions
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base para la API
const API_BASE_URL = 'https://ohanatienda.ddns.net';

// Esquema de validación
const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .required('El nombre es requerido'),
  surname1: Yup.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .required('El primer apellido es requerido'),
  surname2: Yup.string()
    .min(2, 'El segundo apellido debe tener al menos 2 caracteres'),
  email: Yup.string()
    .email('Correo electrónico inválido')
    .required('El correo electrónico es requerido'),
  password: Yup.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es requerida'),
  password_confirmation: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas deben coincidir')
    .required('La confirmación de contraseña es requerida'),
});

const { width } = Dimensions.get('window');

// Componente Toast simple
const Toast: React.FC<{ visible: boolean; message: string; type?: 'success' | 'error' }> = ({ visible, message, type = 'success' }) => {
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
        { opacity: fadeAnim },
        type === 'error' ? { backgroundColor: '#d32f2f' } : { backgroundColor: '#4CAF50' }
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

export default function RegisterFormScreen() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const startAnimation = () => {
    slideAnim.setValue(-100);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Función para mostrar el toast
  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // Ocultar el toast después de la duración especificada
    setTimeout(() => {
      setToastVisible(false);
    }, duration);
  };

  useFocusEffect(
    React.useCallback(() => {
      startAnimation();
      setRegisterError(null); // Limpiar errores anteriores
      return () => {
        // Limpiar la animación al salir de la pantalla
        slideAnim.setValue(-100);
      };
    }, [])
  );

  const handleSubmit = async (values: { 
    name: string; 
    surname1: string; 
    surname2: string; 
    email: string; 
    password: string;
    password_confirmation: string;
  }) => {
    Keyboard.dismiss();
    setIsLoading(true);
    setRegisterError(null);
    
    try {
      // Preparar datos para el registro (ajustados para el backend Laravel)
      const registerData = {
        nombre: values.name,           // Cambiado de name a nombre
        apellido1: values.surname1,
        apellido2: values.surname2 || '',
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation
      };
      
      console.log("Enviando datos de registro:", JSON.stringify(registerData));
      
      // Intentar el endpoint de tienda/registro
      const response = await axios.post(`${API_BASE_URL}/api/tienda/registro`, registerData);
      
      console.log("Respuesta completa del servidor:", JSON.stringify(response.data));
      
      // Si llegamos aquí, la petición fue exitosa
      const token = 
        response.data.token || 
        response.data.access_token || 
        response.data.data?.token || 
        response.data.data?.access_token;
      
      // Guardar token si existe
      if (token) {
        await AsyncStorage.setItem('userToken', token);
        
        // Buscar datos de usuario
        const userData = 
          response.data.user || 
          response.data.usuario || 
          response.data.data?.user || 
          response.data.data?.usuario || 
          { email: values.email };
        
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }
      
      // Mostrar mensaje de éxito
      setIsLoading(false);
      showToast('Registro exitoso. ¡Bienvenido a OHANA!', 'success');
      
      // Redireccionar después de mostrar el mensaje
      setTimeout(() => {
        if (token) {
          // Si tenemos token, ir directamente a la app
          router.replace('/(tabs)');
        } else {
          // Si no hay token, ir a login
          router.replace('/perfil');
        }
      }, 2000);
      
    } catch (error: any) {
      console.warn("Error en registro:", error.message);
      
      // Intentar con endpoint general si el específico falla
      if (error.response) {
        console.log("Código de estado:", error.response.status);
        console.log("Datos de respuesta:", JSON.stringify(error.response.data));
        
        try {
          console.log("Intentando registro con endpoint general...");
          const responseGeneral = await axios.post(`${API_BASE_URL}/api/registro`, {
            nombre: values.name,
            apellido1: values.surname1,
            apellido2: values.surname2 || '',
            email: values.email,
            password: values.password,
            password_confirmation: values.password_confirmation
          });
          
          console.log("Respuesta endpoint general:", JSON.stringify(responseGeneral.data));
          
          // Procesar respuesta del endpoint general
          const token = 
            responseGeneral.data?.token || 
            responseGeneral.data?.access_token || 
            responseGeneral.data?.data?.token || 
            responseGeneral.data?.data?.access_token;
          
          if (token) {
            await AsyncStorage.setItem('userToken', token);
            
            const userData = 
              responseGeneral.data?.user || 
              responseGeneral.data?.usuario || 
              responseGeneral.data?.data?.user || 
              responseGeneral.data?.data?.usuario || 
              { email: values.email };
            
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
          }
          
          // Mostrar toast de éxito
          setIsLoading(false);
          showToast('Registro exitoso. ¡Bienvenido a OHANA!', 'success');
          
          // Redireccionar
          setTimeout(() => {
            if (token) {
              router.replace('/(tabs)');
            } else {
              router.replace('/perfil');
            }
          }, 2000);
          return;
        } catch (generalError: any) {
          console.error("Error en registro con endpoint general:", generalError.message);
          if (generalError.response) {
            console.log("Estado:", generalError.response.status);
            console.log("Datos:", JSON.stringify(generalError.response.data));
          }
          
          console.error("Ambos endpoints fallaron para registro");
        }
      }
      
      // Si llegamos aquí, ambos endpoints fallaron o hubo un error diferente
      setIsLoading(false);
      
      // Mostrar mensaje de error específico según el tipo de error
      let errorMessage = 'Error en el registro. Por favor, inténtalo de nuevo.';
      
      if (error.response) {
        // El servidor respondió con un código de error
        if (error.response.status === 422) {
          // Error de validación
          const validationErrors = error.response.data?.errors || {};
          if (Object.keys(validationErrors).length > 0) {
            const firstErrorField = Object.keys(validationErrors)[0];
            const firstError = validationErrors[firstErrorField];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          } else {
            errorMessage = 'Error de validación en el formulario';
          }
        } else if (error.response.status === 409) {
          // Conflicto, email ya registrado
          errorMessage = 'El correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.';
        } else {
          errorMessage = `Error en el servidor: ${error.response.status}. Por favor, inténtalo más tarde.`;
        }
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        errorMessage = 'No se pudo conectar con el servidor. Comprueba tu conexión a internet.';
      } else {
        // Error al configurar la petición
        errorMessage = `Error al procesar la solicitud: ${error.message}`;
      }
      
      setRegisterError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>OHANA</Text>

        <Text style={styles.description}>
          Crea tu cuenta para comenzar
        </Text>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              transform: [{ translateY: slideAnim }],
              opacity: slideAnim.interpolate({
                inputRange: [-100, 0],
                outputRange: [0, 1],
              }),
            }
          ]}
        >
          {registerError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorMessage}>{registerError}</Text>
            </View>
          )}

          <Formik
            initialValues={{ 
              name: '', 
              surname1: '', 
              surname2: '', 
              email: '', 
              password: '', 
              password_confirmation: '' 
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View>
                <TextInput
                  style={[
                    styles.input,
                    touched.name && errors.name && styles.inputError
                  ]}
                  placeholder="Nombre"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {touched.name && errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}

                <TextInput
                  style={[
                    styles.input,
                    touched.surname1 && errors.surname1 && styles.inputError
                  ]}
                  placeholder="Primer apellido"
                  value={values.surname1}
                  onChangeText={handleChange('surname1')}
                  onBlur={handleBlur('surname1')}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {touched.surname1 && errors.surname1 && (
                  <Text style={styles.errorText}>{errors.surname1}</Text>
                )}

                <TextInput
                  style={[
                    styles.input,
                    touched.surname2 && errors.surname2 && styles.inputError
                  ]}
                  placeholder="Segundo apellido (opcional)"
                  value={values.surname2}
                  onChangeText={handleChange('surname2')}
                  onBlur={handleBlur('surname2')}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {touched.surname2 && errors.surname2 && (
                  <Text style={styles.errorText}>{errors.surname2}</Text>
                )}

                <TextInput
                  style={[
                    styles.input,
                    touched.email && errors.email && styles.inputError
                  ]}
                  placeholder="Correo electrónico"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                <TextInput
                  style={[
                    styles.input,
                    touched.password && errors.password && styles.inputError
                  ]}
                  placeholder="Contraseña"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                <TextInput
                  style={[
                    styles.input,
                    touched.password_confirmation && errors.password_confirmation && styles.inputError
                  ]}
                  placeholder="Confirmar contraseña"
                  value={values.password_confirmation}
                  onChangeText={handleChange('password_confirmation')}
                  onBlur={handleBlur('password_confirmation')}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {touched.password_confirmation && errors.password_confirmation && (
                  <Text style={styles.errorText}>{errors.password_confirmation}</Text>
                )}

                <TouchableOpacity 
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={() => handleSubmit()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Registrarse</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <TouchableOpacity 
                    onPress={() => {
                      console.log("Navegando a perfil desde registro");
                      router.replace('/perfil');
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.separatorText}>¿Ya tienes cuenta? Inicia sesión</Text>
                  </TouchableOpacity>
                  <View style={styles.separatorLine} />
                </View>
              </View>
            )}
          </Formik>
        </Animated.View>
      </ScrollView>

      {/* Toast para mensajes de éxito/error */}
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    paddingTop: 50,
    paddingBottom: 50,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 40,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', 
  },
  description: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
  },
  inputError: {
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#007bff',
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});