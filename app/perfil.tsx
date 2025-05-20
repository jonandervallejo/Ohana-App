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
import { useFavoritos } from './hooks/useFavoritos';
import { FontAwesome5 } from '@expo/vector-icons';

// URL base para la API
const API_BASE_URL = 'https://ohanatienda.ddns.net';
// Endpoint específico para clientes
const CLIENT_LOGIN_ENDPOINT = '/api/tienda/login';

// Esquema de validación mejorado
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('El formato del correo electrónico no es válido')
    .required('El correo electrónico es obligatorio')
    .trim(),
  password: Yup.string()
    .required('La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const { width } = Dimensions.get('window');

// Componente Toast mejorado
const Toast: React.FC<{ 
  visible: boolean; 
  message: string; 
  type?: 'success' | 'error' | 'warning' | 'info'
}> = ({ visible, message, type = 'success' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;
  
  // Colores según el tipo de toast
  const colors = {
    success: '#4CAF50',
    error: '#d32f2f',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  // Icono según el tipo
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };

  return (
    <Animated.View 
      style={[
        styles.toast,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors[type]
        }
      ]}
    >
      <View style={styles.toastContent}>
        <FontAwesome5 name={icons[type]} size={20} color="white" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export default function LoginFormScreen() {
  const router = useRouter();
  const { cambiarUsuario } = useFavoritos();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Referencias a los inputs para manejar el foco
  const passwordInputRef = useRef<TextInput>(null);

  // Animación de entrada
  const startAnimation = () => {
    slideAnim.setValue(-100);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Animación de error (shake)
  const startShakeAnimation = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  // Función para mostrar el toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    setTimeout(() => {
      setToastVisible(false);
    }, duration);
  };

  useFocusEffect(
    React.useCallback(() => {
      startAnimation();
      setLoginError(null);
      return () => {
        slideAnim.setValue(-100);
      };
    }, [])
  );

  const handleSubmit = async (values: { email: string; password: string }) => {
    Keyboard.dismiss();
    setIsLoading(true);
    setLoginError(null);
    
    // Incrementar contador de intentos
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    
    try {
      const loginData = {
        email: values.email.trim(),
        password: values.password,
        client_app: true // Indicar que es una app de cliente
      };
      
      console.log("Enviando datos de login:", JSON.stringify({...loginData, password: '******'}));
      
      // Usar el endpoint específico para clientes
      const response = await axios.post(`${API_BASE_URL}${CLIENT_LOGIN_ENDPOINT}`, loginData, {
        headers: {
          'X-App-Type': 'client', // Header adicional para identificación
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      });
      
      console.log("Respuesta recibida del servidor");
      
      // Verificamos correctamente la respuesta exitosa
      if (
        response.data.success || 
        response.data.status === 'success' || 
        response.data.message?.includes('exitoso') ||
        response.data.message?.includes('success') ||
        response.data.token
      ) {
        // Extraemos el token de la respuesta
        const token = response.data.token;
        
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          
          // Guardamos los datos del usuario
          const userData = response.data.user || { email: values.email };
          
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          // Cambiar usuario en favoritos
          await cambiarUsuario(userData.email);
          
          setIsLoading(false);
          showToast(`¡Bienvenido${userData.nombre ? ', ' + userData.nombre : ''}!`, 'success');
          
          // Resetear contador de intentos
          setAttemptCount(0);
          
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 2000);
        } else {
          throw new Error('No se recibió un token válido del servidor');
        }
      } else {
        throw new Error('Respuesta del servidor no válida');
      }
      
    } catch (error: any) {
      // Solo registramos el código de estado sin mostrar el error completo
      if (error.response) {
        console.log(`Login - Código de respuesta: ${error.response.status}`);
      } else if (error.request) {
        console.log("Login - No se recibió respuesta del servidor");
      } else {
        console.log("Login - Error al configurar la solicitud");
      }
      
      setIsLoading(false);
      
      let errorMessage = 'Error en el inicio de sesión. Por favor, inténtalo de nuevo.';
      
      if (error.response) {
        // SIMPLIFICACIÓN: Usar el mismo mensaje para todos los errores de credenciales
        if (error.response.status === 401 || error.response.status === 403 || error.response.status === 404) {
          errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
          startShakeAnimation(); // Animación visual para feedback
        } else if (error.response.status === 422) {
          // Error de validación
          errorMessage = 'Por favor, verifica que los datos introducidos sean correctos.';
        } else {
          errorMessage = `Error en el servidor. Por favor, inténtalo más tarde.`;
        }
      } else if (error.request) {
        // La solicitud fue realizada pero no se recibió respuesta
        errorMessage = 'No se pudo conectar con el servidor. Comprueba tu conexión a internet.';
      }
      
      setLoginError(errorMessage);
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
          Inicia sesión para continuar
        </Text>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              transform: [
                { translateY: slideAnim },
                { translateX: shakeAnim }
              ],
              opacity: slideAnim.interpolate({
                inputRange: [-100, 0],
                outputRange: [0, 1],
              }),
            }
          ]}
        >
          {loginError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <FontAwesome5 name="exclamation-circle" size={16} color="#d32f2f" />
                <Text style={styles.errorTitle}>Error de inicio de sesión</Text>
              </View>
              <Text style={styles.errorMessage}>{loginError}</Text>
            </View>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldTouched }) => (
              <View>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="envelope" size={16} color="#999" style={styles.inputIcon} />
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
                    returnKeyType="next"
                    autoCorrect={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </View>
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                <View style={styles.inputContainer}>
                  <FontAwesome5 name="lock" size={16} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
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
                    returnKeyType="done"
                    onSubmitEditing={() => handleSubmit()}
                  />
                </View>
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                <TouchableOpacity 
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={() => handleSubmit()}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Iniciar Sesión</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <TouchableOpacity 
                    onPress={() => {
                      router.replace('/registro');
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.separatorText}>¿No tienes cuenta? Regístrate</Text>
                  </TouchableOpacity>
                  <View style={styles.separatorLine} />
                </View>
              </View>
            )}
          </Formik>
        </Animated.View>
      </ScrollView>

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
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', 
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginBottom: 15,
    marginLeft: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  errorTitle: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: 13,
    marginLeft: 24,
  },
  button: {
    width: '100%',
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 14,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
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
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 1000,
    minWidth: 200,
    maxWidth: width * 0.85,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
});