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
  TextInput,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useColorScheme } from './hooks/useColorScheme';

// URL base para la API
const API_BASE_URL = 'https://ohanatienda.ddns.net';

// Obtener el ancho de la pantalla para el toast
const { width } = Dimensions.get('window');

// Función para obtener colores según el tema
const getColors = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#ffffff',
  secondaryBackground: isDark ? '#1e1e1e' : '#f8f8f8',
  text: isDark ? '#ffffff' : '#000000',
  secondaryText: isDark ? '#b0b0b0' : '#666666',
  border: isDark ? '#2c2c2c' : '#eeeeee',
  card: isDark ? '#1e1e1e' : '#ffffff',
  subtle: isDark ? '#2c2c2c' : '#f5f5f5',
  button: isDark ? '#2c2c2c' : '#000000',
  buttonText: isDark ? '#ffffff' : '#ffffff',
  inputBackground: isDark ? '#2c2c2c' : '#ffffff',
  inputBorder: isDark ? '#383838' : '#dddddd',
  inputText: isDark ? '#ffffff' : '#333333',
  placeholder: isDark ? '#808080' : '#999999',
  error: isDark ? '#ff6b6b' : '#ff3b30',
  modalBackground: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
  success: isDark ? '#4ddb64' : '#4CAF50',
  footerText: isDark ? '#808080' : '#888888',
  hintText: isDark ? '#808080' : '#888888',
  cardBg: isDark ? '#1e1e1e' : '#ffffff',
  passwordSection: isDark ? '#1a1a1a' : '#f9f9f9',
  sectionBorder: isDark ? '#3a3a3a' : '#000000',
  cancelBg: isDark ? '#2c2c2c' : '#ffffff',
  cancelText: isDark ? '#ffffff' : '#333333'
});

// Interfaz para los Toasts personalizados
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

// Componente Toast mejorado con soporte para tema
const Toast: React.FC<{ 
  visible: boolean; 
  message: string; 
  type?: 'success' | 'error' | 'warning' | 'info'; 
  icon?: string;
  isDarkMode: boolean;
}> = ({ 
  visible, 
  message, 
  type = 'success',
  icon,
  isDarkMode
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const colors = getColors(isDarkMode);
  
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

  // Determinar colores según tipo
  let accentColor: string;
  let iconName: React.ComponentProps<typeof Ionicons>['name'];
  let backgroundColor = isDarkMode ? '#1e1e1e' : '#FFFFFF';
  let iconBackgroundColor = '';

  switch(type) {
    case 'success':
      accentColor = '#4CAF50';
      iconName = (icon as React.ComponentProps<typeof Ionicons>['name']) || 'checkmark-circle';
      iconBackgroundColor = isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)';
      break;
    case 'error':
      accentColor = '#FF3B30';
      iconName = (icon as React.ComponentProps<typeof Ionicons>['name']) || 'close-circle';
      iconBackgroundColor = isDarkMode ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.15)';
      break;
    case 'warning':
      accentColor = '#FF9500';
      iconName = (icon as React.ComponentProps<typeof Ionicons>['name']) || 'warning';
      iconBackgroundColor = isDarkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.15)';
      break;
    case 'info':
    default:
      accentColor = '#007AFF';
      iconName = (icon as React.ComponentProps<typeof Ionicons>['name']) || 'information-circle';
      iconBackgroundColor = isDarkMode ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)';
      break;
  }

  return (
    <Animated.View 
      style={[
        styles.toast,
        { 
          opacity: fadeAnim,
          backgroundColor: backgroundColor
        }
      ]}
    >
      <View style={[styles.toastAccent, { backgroundColor: accentColor }]} />
      <View style={styles.toastContent}>
        <View style={[styles.toastIconContainer, { backgroundColor: iconBackgroundColor }]}>
          <Ionicons name={iconName} size={20} color={accentColor} />
        </View>
        <Text style={[styles.toastText, { color: colors.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// Esquema de validación modificado
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
  currentPassword: Yup.string()
    .required('Necesitas ingresar tu contraseña actual para confirmar los cambios'),
  newPassword: Yup.string()
    .test('min-length', 'La contraseña debe tener al menos 6 caracteres', function(value) {
      // Solo validar longitud si hay valor
      return !value || value.length === 0 || value.length >= 6;
    }),
  confirmPassword: Yup.string()
    .test('passwords-match', 'Las contraseñas deben coincidir', function(value) {
      // Solo verificar coincidencia si hay una nueva contraseña
      return !this.parent.newPassword || value === this.parent.newPassword;
    })
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

interface ProfileFormValues extends UserData {
  currentPassword: string;
  newPassword?: string;
  confirmPassword?: string;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = getColors(isDarkMode);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el toast mejorado
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeout = useRef<NodeJS.Timeout | number | null>(null);
  
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
  // Estados para mostrar/ocultar contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Animación para la sección de contraseña
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showPasswordSection ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showPasswordSection]);

  // Función para mostrar el toast mejorado
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', icon?: string) => {
    // Limpiar cualquier timeout existente
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    
    // Establecer el nuevo mensaje
    setToast({ message, type, icon });
    setToastVisible(true);
    
    // Configurar el timeout para ocultar el toast
    toastTimeout.current = setTimeout(() => {
      setToastVisible(false);
    }, 2500);
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
    
    // Limpiar timeout al desmontar
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showToast('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error', 'alert-circle');
        router.replace('/perfil');
        return;
      }
  
      if (!userData?.id) {
        throw new Error('ID de usuario no encontrado');
      }
  
      // Preparar datos a actualizar
      const updateData: any = {
        nombre: values.nombre,
        apellido1: userData.apellido1 || '',
        apellido2: userData.apellido2 || '',
        email: values.email,
        telefono: values.telefono || null,
        direccion: values.direccion || null,
        current_password: values.currentPassword // Siempre incluir contraseña actual
      };
      
      // Verificar si se está cambiando la contraseña
      const isChangingPassword = 
        values.newPassword && 
        values.newPassword.trim() !== '' && 
        values.confirmPassword && 
        values.confirmPassword === values.newPassword;
      
      // Agregar nueva contraseña si se está cambiando
      if (isChangingPassword) {
        updateData.password = values.newPassword;
        updateData.password_confirmation = values.confirmPassword;
      }
  
      // Usar el endpoint para actualizar perfil
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
      const updatedUserData = {
        ...userData, 
        nombre: values.nombre,
        email: values.email,
        telefono: values.telefono,
        direccion: values.direccion
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      // Mostrar toast de éxito
      setSubmitting(false);
      showToast(
        isChangingPassword 
          ? '¡Perfil y contraseña actualizados con éxito!' 
          : '¡Perfil actualizado con éxito!', 
        'success',
        'checkmark-circle'
      );
      
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
            
            // Si es un error de contraseña actual incorrecta
            if (firstErrorField === 'current_password' || firstErrorField === 'password') {
              errorMessage = 'La contraseña actual es incorrecta';
            }
          }
        } else if (error.response.status === 401) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
          AsyncStorage.removeItem('userToken');
          AsyncStorage.removeItem('userData');
          router.replace('/perfil');
        } else {
          errorMessage = `Error en el servidor: ${error.response.status}`;
        }
      }
      
      showToast(errorMessage, 'error', 'alert-circle');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <LinearGradient
        colors={[colors.secondaryBackground, colors.background]}
        style={styles.gradientBackground}
      >
        {/* Header personalizado */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Perfil</Text>
          <View style={{width: 40}} />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Cargando tus datos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={50} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.secondaryText }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.button }]}
              onPress={() => router.replace('/perfil')}
            >
              <Text style={[styles.loginButtonText, { color: colors.buttonText }]}>Volver</Text>
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
                    <View style={[styles.avatar, { 
                      backgroundColor: colors.subtle,
                      borderColor: colors.border 
                    }]}>
                      <FontAwesome5 name="user" size={40} color={colors.text} />
                    </View>
                  </View>
                  <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                    Actualiza tu información personal
                  </Text>
                </View>

                <Formik
                  initialValues={{
                    nombre: userData?.nombre || '',
                    email: userData?.email || '',
                    telefono: userData?.telefono || '',
                    direccion: userData?.direccion || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  }}
                  validationSchema={ProfileSchema}
                  onSubmit={handleSubmit}
                >
                  {({ handleChange, handleBlur, handleSubmit, values, errors, touched, resetForm }) => (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Nombre</Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: colors.inputBackground,
                              borderColor: touched.nombre && errors.nombre ? colors.error : colors.inputBorder,
                              color: colors.inputText
                            }
                          ]}
                          value={values.nombre}
                          onChangeText={handleChange('nombre')}
                          onBlur={handleBlur('nombre')}
                          placeholder="Ingresa tu nombre"
                          placeholderTextColor={colors.placeholder}
                          editable={!submitting}
                        />
                        {touched.nombre && errors.nombre && (
                          <Text style={styles.errorText}>{errors.nombre}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Correo electrónico</Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: colors.inputBackground,
                              borderColor: touched.email && errors.email ? colors.error : colors.inputBorder,
                              color: colors.inputText
                            }
                          ]}
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          placeholder="Ingresa tu correo electrónico"
                          placeholderTextColor={colors.placeholder}
                          keyboardType="email-address"
                          editable={!submitting}
                          autoCapitalize="none"
                        />
                        {touched.email && errors.email && (
                          <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Teléfono</Text>
                        <TextInput
                          style={[
                            styles.input,
                            { 
                              backgroundColor: colors.inputBackground,
                              borderColor: touched.telefono && errors.telefono ? colors.error : colors.inputBorder,
                              color: colors.inputText
                            }
                          ]}
                          value={values.telefono}
                          onChangeText={handleChange('telefono')}
                          onBlur={handleBlur('telefono')}
                          placeholder="Ingresa tu número de teléfono"
                          placeholderTextColor={colors.placeholder}
                          keyboardType="phone-pad"
                          editable={!submitting}
                        />
                        {touched.telefono && errors.telefono && (
                          <Text style={styles.errorText}>{errors.telefono}</Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Dirección</Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.textArea,
                            { 
                              backgroundColor: colors.inputBackground,
                              borderColor: touched.direccion && errors.direccion ? colors.error : colors.inputBorder,
                              color: colors.inputText
                            }
                          ]}
                          value={values.direccion}
                          onChangeText={handleChange('direccion')}
                          onBlur={handleBlur('direccion')}
                          placeholder="Ingresa tu dirección"
                          placeholderTextColor={colors.placeholder}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          editable={!submitting}
                        />
                        {touched.direccion && errors.direccion && (
                          <Text style={styles.errorText}>{errors.direccion}</Text>
                        )}
                      </View>
                      
                      {/* Campo de contraseña actual (fuera de sección de seguridad) */}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Contraseña actual</Text>
                        <Text style={[styles.passwordInfo, { color: colors.secondaryText }]}>
                          Necesaria para confirmar cualquier cambio en tu perfil
                        </Text>
                        <View style={[
                          styles.passwordInputContainer,
                          { 
                            backgroundColor: colors.inputBackground,
                            borderColor: touched.currentPassword && errors.currentPassword ? colors.error : colors.inputBorder
                          }
                        ]}>
                          <TextInput
                            style={[
                              styles.passwordInput,
                              { color: colors.inputText }
                            ]}
                            value={values.currentPassword}
                            onChangeText={handleChange('currentPassword')}
                            onBlur={handleBlur('currentPassword')}
                            placeholder="Ingresa tu contraseña actual"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry={!showCurrentPassword}
                            editable={!submitting}
                          />
                          <TouchableOpacity 
                            style={styles.eyeIcon}
                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            <Ionicons 
                              name={showCurrentPassword ? "eye-off" : "eye"} 
                              size={22} 
                              color={colors.secondaryText} 
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.currentPassword && errors.currentPassword && (
                          <Text style={styles.errorText}>{errors.currentPassword}</Text>
                        )}
                      </View>
                      
                      {/* Sección de cambio de contraseña (opcional) */}
                      <View style={styles.securitySection}>
                        <TouchableOpacity
                          style={[
                            styles.passwordToggleContainer,
                            { 
                              backgroundColor: colors.subtle,
                              borderColor: colors.border 
                            }
                          ]}
                          onPress={() => {
                            // Si estamos cerrando la sección, limpiar los campos
                            if (showPasswordSection) {
                              handleChange('newPassword')('');
                              handleChange('confirmPassword')('');
                            }
                            setShowPasswordSection(!showPasswordSection);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.passwordToggleLeft}>
                            <FontAwesome5 name="lock" size={18} color={colors.text} style={styles.passwordIcon} />
                            <Text style={[styles.passwordToggleText, { color: colors.text }]}>
                              {showPasswordSection ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña (opcional)'}
                            </Text>
                          </View>
                          <Ionicons 
                            name={showPasswordSection ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={colors.text} 
                          />
                        </TouchableOpacity>
                        
                        {showPasswordSection && (
                          <Animated.View 
                            style={[
                              styles.passwordSection,
                              {
                                maxHeight: slideAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 300]
                                }),
                                opacity: slideAnim,
                                backgroundColor: colors.passwordSection,
                                borderLeftColor: colors.sectionBorder
                              }
                            ]}
                          >
                            <View style={styles.passwordHeaderSection}>
                              <FontAwesome5 name="shield-alt" size={16} color={colors.text} />
                              <Text style={[styles.passwordSectionTitle, { color: colors.text }]}>Nueva contraseña</Text>
                            </View>
                            
                            <Text style={[styles.passwordInfo, { color: colors.secondaryText }]}>
                              Si deseas cambiar tu contraseña, rellena los siguientes campos.
                            </Text>
                            
                            <View style={styles.inputGroup}>
                              <Text style={[styles.inputLabel, { color: colors.text }]}>Nueva contraseña</Text>
                              <View style={[
                                styles.passwordInputContainer,
                                { 
                                  backgroundColor: colors.inputBackground,
                                  borderColor: touched.newPassword && errors.newPassword ? colors.error : colors.inputBorder
                                }
                              ]}>
                                <TextInput
                                  style={[
                                    styles.passwordInput,
                                    { color: colors.inputText }
                                  ]}
                                  value={values.newPassword}
                                  onChangeText={handleChange('newPassword')}
                                  onBlur={handleBlur('newPassword')}
                                  placeholder="Ingresa tu nueva contraseña"
                                  placeholderTextColor={colors.placeholder}
                                  secureTextEntry={!showNewPassword}
                                  editable={!submitting}
                                />
                                <TouchableOpacity 
                                  style={styles.eyeIcon}
                                  onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                  <Ionicons 
                                    name={showNewPassword ? "eye-off" : "eye"} 
                                    size={22} 
                                    color={colors.secondaryText} 
                                  />
                                </TouchableOpacity>
                              </View>
                              {touched.newPassword && errors.newPassword && (
                                <Text style={styles.errorText}>{errors.newPassword}</Text>
                              )}
                              <Text style={[styles.passwordHint, { color: colors.hintText }]}>
                                La contraseña debe tener al menos 6 caracteres
                              </Text>
                            </View>

                            <View style={styles.inputGroup}>
                              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmar contraseña</Text>
                              <View style={[
                                styles.passwordInputContainer,
                                { 
                                  backgroundColor: colors.inputBackground,
                                  borderColor: touched.confirmPassword && errors.confirmPassword ? colors.error : colors.inputBorder
                                }
                              ]}>
                                <TextInput
                                  style={[
                                    styles.passwordInput,
                                    { color: colors.inputText }
                                  ]}
                                  value={values.confirmPassword}
                                  onChangeText={handleChange('confirmPassword')}
                                  onBlur={handleBlur('confirmPassword')}
                                  placeholder="Confirma tu nueva contraseña"
                                  placeholderTextColor={colors.placeholder}
                                  secureTextEntry={!showConfirmPassword}
                                  editable={!submitting}
                                />
                                <TouchableOpacity 
                                  style={styles.eyeIcon}
                                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  <Ionicons 
                                    name={showConfirmPassword ? "eye-off" : "eye"} 
                                    size={22} 
                                    color={colors.secondaryText} 
                                  />
                                </TouchableOpacity>
                              </View>
                              {touched.confirmPassword && errors.confirmPassword && (
                                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                              )}
                            </View>
                          </Animated.View>
                        )}
                      </View>

                      <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                          style={[
                            styles.cancelButton,
                            { 
                              backgroundColor: colors.cancelBg,
                              borderColor: colors.border
                            }
                          ]}
                          onPress={() => router.back()}
                          disabled={submitting}
                        >
                          <Text style={[
                            styles.cancelButtonText,
                            { color: colors.cancelText }
                          ]}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.saveButton,
                            submitting && styles.buttonDisabled
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
                    <Text style={[styles.footerText, { color: colors.footerText }]}>
                      Cuenta creada el {formatDate(userData.created_at)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
      
      {/* Toast mejorado para mensajes */}
      <Toast 
        visible={toastVisible}
        message={toast?.message || ''}
        type={toast?.type || 'success'}
        icon={toast?.icon}
        isDarkMode={isDarkMode}
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
    paddingVertical: 10,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
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
    borderRadius: 12,
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
  // Estilos para la sección de contraseña
  securitySection: {
    marginTop: 10,
    marginBottom: 15,
  },
  passwordToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  passwordToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordIcon: {
    marginRight: 10,
  },
  passwordToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  passwordSection: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee',
      },
    }),
  },
  passwordHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passwordSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  passwordInfo: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  passwordHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cancelButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
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
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#999',
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
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
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
  // Estilos para el toast mejorado
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  toastAccent: {
    width: 4,
    height: '100%',
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toastIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default EditProfileScreen;