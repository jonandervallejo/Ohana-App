import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';

const API_BASE_URL = 'http://ohanatienda.ddns.net:8080';

// Esquema de validación para la nueva contraseña
const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número'
    )
    .required('La contraseña es requerida'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas deben coincidir')
    .required('La confirmación de contraseña es requerida'),
});

export default function NewPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [email, setEmail] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Obtener el email directamente de Expo Router
    const params = useLocalSearchParams();
    if (params.email) {
      setEmail(params.email as string);
    }
    
    // Resto del código...
    if (token) {
      validateToken();
    } else {
      setIsTokenValid(false);
      setValidatingToken(false);
      setErrorMessage('Enlace de restablecimiento inválido');
    }
  
    // Animación de entrada
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  
    return () => {
      slideAnim.setValue(-100);
    };
  }, [token]);

  // Validar que el token sea correcto
  const validateToken = async () => {
    try {
      setValidatingToken(true);
      
      if (!email) {
        console.warn('Email no encontrado en los parámetros');
        setIsTokenValid(false);
        setErrorMessage('Parámetros incompletos: email no encontrado');
        setValidatingToken(false);
        return;
      }
      
      // Opción 1: Si tienes una ruta para verificar el token (recomendado)
      try {
        const response = await axios.get(`${API_BASE_URL}/api/password/verify-token`, {
          params: { token, email }
        });
        
        console.log('Respuesta de verificación de token:', response.data);
        
        if (response.data && response.data.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          setErrorMessage('El enlace de restablecimiento ha caducado o no es válido');
        }
      } catch (verifyError) {
        console.log('La ruta de verificación no existe o falló, asumiendo token válido');
        // Si no hay endpoint de verificación, asumimos que es válido
        // y la validación ocurrirá al intentar cambiar la contraseña
        setIsTokenValid(true);
      }
      
    } catch (error: any) {
      console.error('Error validando token:', error);
      setIsTokenValid(false);
      setErrorMessage('Error al verificar el enlace de restablecimiento');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    // URL y datos para depuración
    const url = `${API_BASE_URL}/api/password/reset`;
    console.log('⬆️ Enviando solicitud a:', url);
    console.log('📨 Datos de la solicitud:', { 
      email,
      token: token?.substring(0, 5) + '...',
      password: '*******',
      password_confirmation: '*******'
    });
    
    try {
      const response = await axios.post(url, {
        email,
        token,
        password: values.password,
        password_confirmation: values.confirmPassword,
      });
      
      console.log('✅ Respuesta completa:', response);
      console.log('📊 Estado HTTP:', response.status);
      console.log('📄 Datos recibidos:', response.data);
      
      // CORRECCIÓN: Aceptar tanto success como message como indicadores de éxito
      if (response.data && (response.data.success || response.data.message)) {
        setResetSuccess(true);
      } else {
        console.warn('⚠️ Respuesta exitosa pero sin datos esperados:', response.data);
        setErrorMessage('Error al restablecer la contraseña');
      }
    } catch (error: any) {
      console.error('❌ Error completo:', error);
      
      // Analizar con detalle el tipo de error
      if (error.response) {
        console.error('🔴 Datos de la respuesta de error:', error.response.data);
        console.error('🔴 Estado HTTP:', error.response.status);
        
        switch (error.response.status) {
          case 400:
            setErrorMessage('Solicitud incorrecta: ' + (error.response.data?.message || 'Verifica los datos'));
            break;
          case 404:
            setErrorMessage('El enlace de restablecimiento ha caducado o no es válido');
            break;
          case 422:
            // Errores de validación detallados
            const validationErrors = error.response.data?.errors;
            if (validationErrors) {
              const errorMessages = [];
              
              if (validationErrors.email) {
                errorMessages.push(`Email: ${validationErrors.email.join(', ')}`);
              }
              if (validationErrors.token) {
                errorMessages.push(`Token: ${validationErrors.token.join(', ')}`);
              }
              if (validationErrors.password) {
                errorMessages.push(`Contraseña: ${validationErrors.password.join(', ')}`);
              }
              
              if (errorMessages.length > 0) {
                setErrorMessage(errorMessages.join('\n'));
              } else {
                setErrorMessage(error.response.data?.message || 'Datos inválidos');
              }
            } else {
              setErrorMessage('Datos inválidos. Asegúrate de que las contraseñas coincidan y cumplan los requisitos');
            }
            break;
          case 500:
            setErrorMessage('Error interno del servidor. Por favor, inténtalo más tarde');
            break;
          default:
            setErrorMessage(`Error ${error.response.status}: ${error.response.data?.message || 'Error en el servidor'}`);
        }
      } else if (error.request) {
        console.error('🟠 Error: No se recibió respuesta');
        setErrorMessage(`No se pudo conectar con el servidor (${API_BASE_URL}). Comprueba tu conexión.`);
      } else {
        console.error('🟡 Error al configurar la solicitud:', error.message);
        setErrorMessage(`Error al procesar la solicitud: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar estado de validación del token
  if (validatingToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff7d7d" />
        <Text style={styles.loadingText}>Verificando enlace de restablecimiento...</Text>
      </View>
    );
  }

  // Si el token no es válido
  if (isTokenValid === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorStateContainer}>
          <FontAwesome5 name="exclamation-circle" size={50} color="#ff7d7d" />
          <Text style={styles.errorStateTitle}>Enlace no válido</Text>
          <Text style={styles.errorStateText}>
            {errorMessage || 'El enlace de restablecimiento ha caducado o no es válido.'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/recuperar-password')}
          >
            <Text style={styles.buttonText}>Solicitar nuevo enlace</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>        
        <Text style={styles.title}>Establece tu nueva contraseña</Text>
        
        <Animated.View
          style={[
            styles.formContainer,
            {
              transform: [{ translateY: slideAnim }],
              opacity: slideAnim.interpolate({
                inputRange: [-100, 0],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          {resetSuccess ? (
            <View style={styles.successContainer}>
              <FontAwesome5 name="check-circle" size={50} color="#4caf50" />
              <Text style={styles.successTitle}>¡Contraseña actualizada!</Text>
              <Text style={styles.successText}>
                Tu contraseña ha sido cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/perfil')}
              >
                <Text style={styles.buttonText}>Ir al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Por favor, introduce tu nueva contraseña. Debe tener al menos 8 caracteres e incluir letras mayúsculas, minúsculas y números.
              </Text>
              
              {email && (
                <Text style={styles.emailNotice}>
                  Restableciendo para: <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              )}

              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorMessage}>{errorMessage}</Text>
                </View>
              )}

              <Formik
                initialValues={{ password: '', confirmPassword: '' }}
                validationSchema={ResetPasswordSchema}
                onSubmit={handleSubmit}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <View>
                    <Text style={styles.inputLabel}>Nueva contraseña</Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.password && errors.password && styles.inputError,
                      ]}
                      placeholder="Introduce tu nueva contraseña"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry
                      editable={!isLoading}
                    />
                    {touched.password && errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}

                    <Text style={styles.inputLabel}>Confirmar contraseña</Text>
                    <TextInput
                      style={[
                        styles.input,
                        touched.confirmPassword && errors.confirmPassword && styles.inputError,
                      ]}
                      placeholder="Confirma tu nueva contraseña"
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      secureTextEntry
                      editable={!isLoading}
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}

                    <TouchableOpacity
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.buttonText}>Cambiar contraseña</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            </>
          )}
        </Animated.View>
      </ScrollView>
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
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  emailNotice: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
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
  button: {
    width: '100%',
    backgroundColor: '#ff7d7d',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ffb8b8',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4caf50',
    marginTop: 15,
    marginBottom: 10,
  },
  successText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#d32f2f',
    marginTop: 15,
    marginBottom: 10,
  },
  errorStateText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
});