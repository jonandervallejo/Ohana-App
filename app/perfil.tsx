import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  ActivityIndicator,
  Alert,
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
// Endpoint específico para clientes
const CLIENT_LOGIN_ENDPOINT = '/api/tienda/login';

// Esquema de validación
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Correo electrónico inválido')
    .required('El correo electrónico es requerido'),
  password: Yup.string()
    .required('La contraseña es requerida'),
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

export default function LoginFormScreen() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
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
    
    try {
      const loginData = {
        email: values.email,
        password: values.password,
        client_app: true // Indicar que es una app de cliente
      };
      
      console.log("Enviando datos de login:", JSON.stringify(loginData));
      
      // Usar el endpoint específico para clientes
      const response = await axios.post(`${API_BASE_URL}${CLIENT_LOGIN_ENDPOINT}`, loginData, {
        headers: {
          'X-App-Type': 'client', // Header adicional para identificación
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Respuesta completa del servidor:", JSON.stringify(response.data));
      
      // ARREGLADO: Verificamos correctamente la respuesta exitosa
      // Ahora también detectamos "Login exitoso" o si hay un token en la respuesta
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
          
          setIsLoading(false);
          showToast('Inicio de sesión exitoso. ¡Bienvenido a OHANA!', 'success');
          
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 2000);
        } else {
          throw new Error('No se recibió un token válido del servidor');
        }
      } else {
        throw new Error('Credenciales inválidas');
      }
      
    } catch (error: any) {
      console.error("Error detallado en login:", error);
      setIsLoading(false);
      
      let errorMessage = 'Error en el inicio de sesión. Por favor, inténtalo de nuevo.';
      
      if (error.response) {
        console.log("Respuesta de error del servidor:", error.response.data);
        
        if (error.response.status === 401) {
          errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
        } else if (error.response.status === 403) {
          // Manejar específicamente el error 403 (Acceso prohibido)
          errorMessage = error.response.data.message || 'No tienes acceso a este sistema.';
          
          // Mostrar una alerta más detallada para guiar al usuario
          Alert.alert(
            "Acceso no permitido",
            "Esta aplicación es para clientes. Si eres empleado o administrador, por favor utiliza la aplicación correspondiente.",
            [{ text: "Entendido", style: "default" }]
          );
        } else if (error.response.status === 422) {
          errorMessage = 'Por favor, verifica que los datos sean correctos.';
        } else {
          errorMessage = `Error en el servidor: ${error.response.status}. Por favor, inténtalo más tarde.`;
        }
      } else if (error.request) {
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
              transform: [{ translateY: slideAnim }],
              opacity: slideAnim.interpolate({
                inputRange: [-100, 0],
                outputRange: [0, 1],
              }),
            }
          ]}
        >
          {loginError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorMessage}>{loginError}</Text>
            </View>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View>
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

                <TouchableOpacity 
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={() => handleSubmit()}
                  disabled={isLoading}
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
                      console.log("Navegando a registro desde login");
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