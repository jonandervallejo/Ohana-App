import React, { useRef, useState } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';

const API_BASE_URL = 'https://ohanatienda.ddns.net';

// Esquema de validación para el email
const ResetSchema = Yup.object().shape({
  email: Yup.string()
    .email('Correo electrónico inválido')
    .required('El correo electrónico es requerido'),
});

export default function RecuperarPassword() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useFocusEffect(
    React.useCallback(() => {
      slideAnim.setValue(-100);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      
      return () => {
        slideAnim.setValue(-100);
      };
    }, [])
  );

  const handleSubmit = async (values: { email: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    // URL completa para depuración
    const url = `${API_BASE_URL}/api/password/email`;
    console.log('⬆️ Enviando solicitud a:', url);
    console.log('📨 Datos de la solicitud:', { email: values.email });
    
    try {
      const response = await axios.post(url, {
        email: values.email,
      });
      
      console.log('✅ Respuesta completa:', response);
      console.log('📊 Estado HTTP:', response.status);
      console.log('📄 Datos recibidos:', response.data);
      
      setIsLoading(false);
      
      // Aceptar tanto success como message como indicadores de éxito
      if (response.data && (response.data.success || response.data.message)) {
        setResetSuccess(true);
      } else {
        console.warn('⚠️ Respuesta exitosa pero sin datos esperados:', response.data);
        setErrorMessage('Error al solicitar restablecimiento de contraseña');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('❌ Error completo:', error);
      
      // Analizar con detalle el tipo de error
      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        console.error('🔴 Datos de la respuesta de error:', error.response.data);
        console.error('🔴 Estado HTTP:', error.response.status);
        console.error('🔴 Cabeceras:', error.response.headers);
        
        switch (error.response.status) {
          case 400:
            setErrorMessage('Solicitud incorrecta: ' + (error.response.data?.message || 'Verifica los datos enviados'));
            break;
          case 401:
            setErrorMessage('No autorizado: ' + (error.response.data?.message || 'Autenticación requerida'));
            break;
          case 404:
            setErrorMessage('Error 404: Ruta no encontrada. URL: ' + url);
            break;
          case 422:
            // Errores de validación
            if (error.response.data?.errors?.email) {
              setErrorMessage(error.response.data.errors.email[0]);
            } else if (error.response.data?.message) {
              setErrorMessage(error.response.data.message);
            } else {
              setErrorMessage('El correo electrónico introducido no es válido o no está registrado');
            }
            break;
          case 429:
            setErrorMessage('Demasiadas solicitudes. Por favor, inténtalo más tarde');
            break;
          case 500:
            setErrorMessage('Error interno del servidor: ' + (error.response.data?.message || 'Contacta con soporte'));
            break;
          case 503:
            setErrorMessage('Servicio no disponible. Inténtalo más tarde');
            break;
          default:
            setErrorMessage(`Error ${error.response.status}: ${error.response.data?.message || 'Error en el servidor'}`);
        }
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        console.error('🟠 Error: No se recibió respuesta');
        console.error('🟠 Detalles de la solicitud:', error.request);
        setErrorMessage(`No se pudo conectar con el servidor (${API_BASE_URL}). Comprueba tu conexión o verifica que el servidor esté activo.`);
      } else {
        // Error al configurar la solicitud
        console.error('🟡 Error al configurar la solicitud:', error.message);
        setErrorMessage(`Error al procesar la solicitud: ${error.message}`);
      }
      
      // Información adicional
      if (error.code) {
        console.error('📛 Código de error:', error.code);
      }
      if (error.stack) {
        console.error('📚 Stack trace:', error.stack);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Recuperar contraseña</Text>
        
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
              <Text style={styles.successTitle}>Correo enviado</Text>
              <Text style={styles.successText}>
                Hemos enviado un enlace de recuperación a tu correo electrónico.
                Al hacer clic en él, se abrirá esta aplicación directamente en la 
                pantalla para crear una nueva contraseña.
              </Text>
              <Text style={styles.noteText}>
                Si no recibes el correo en unos minutos, revisa tu carpeta 
                de spam o solicita un nuevo enlace.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/perfil')}
              >
                <Text style={styles.buttonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Introduce tu dirección de correo electrónico y te enviaremos un
                enlace para restablecer tu contraseña directamente en esta aplicación.
              </Text>

              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorMessage}>{errorMessage}</Text>
                </View>
              )}

              <Formik
                initialValues={{ email: '' }}
                validationSchema={ResetSchema}
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
                    <TextInput
                      style={[
                        styles.input,
                        touched.email && errors.email && styles.inputError,
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

                    <TouchableOpacity
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.buttonText}>Enviar enlace de recuperación</Text>
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
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
    marginBottom: 25,
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
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
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
    marginBottom: 15,
  },
  noteText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 30,
  },
});