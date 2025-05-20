import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useFavoritos = () => {
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Función para obtener datos del usuario actual
  const obtenerDatosUsuario = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return null;
      
      const userData = JSON.parse(userDataStr);
      return userData;
    } catch (error) {
      console.error('Error obteniendo datos de usuario:', error);
      return null;
    }
  };
  
  // Obtener identificador único del usuario (email o id)
  const obtenerIdentificadorUsuario = useCallback(async (): Promise<string | null> => {
    try {
      const userData = await obtenerDatosUsuario();
      if (!userData) return null;
      
      // Usar email como identificador principal, id como respaldo
      return userData.email || (userData.id?.toString()) || null;
    } catch (error) {
      console.error('Error obteniendo identificador de usuario:', error);
      return null;
    }
  }, []);

  // Verificar si hay sesión iniciada
  const verificarSesion = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      console.error('Error verificando sesión:', error);
      return false;
    }
  };

  // Cargar favoritos del usuario específico o anónimos
  const cargarFavoritos = useCallback(async (identificadorForzado?: string | null) => {
    setLoading(true);
    
    try {
      let identificador = identificadorForzado;
      let usandoAnonymous = false;
      
      // Si no se forzó un identificador, intentar obtener el actual
      if (identificador === undefined) {
        identificador = await obtenerIdentificadorUsuario();
      }
      
      // Si no hay identificador, usar favoritos anónimos
      if (!identificador) {
        identificador = 'anonymous';
        usandoAnonymous = true;
      }
      
      // Actualizar el usuario actual
      setCurrentUser(identificador);
      
      // Cargar favoritos con clave específica
      const clave = `favoritos_${identificador}`;
      const favoritosGuardados = await AsyncStorage.getItem(clave);
      const favoritosArray = favoritosGuardados ? JSON.parse(favoritosGuardados) : [];
      
      setFavoritos(favoritosArray);
      
      console.log(`Favoritos cargados para ${usandoAnonymous ? 'usuario anónimo' : identificador}:`, favoritosArray);
      
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      setFavoritos([]);
    } finally {
      setLoading(false);
    }
  }, [obtenerIdentificadorUsuario]);

  // Función para recargar favoritos
  const recargarFavoritos = useCallback(() => {
    cargarFavoritos();
  }, [cargarFavoritos]);

  // Verificar si un producto es favorito
  const esFavorito = useCallback((productoId: number) => {
    return favoritos.includes(productoId);
  }, [favoritos]);

  // Función para añadir/quitar favoritos
  const toggleFavorito = useCallback(async (productoId: number) => {
    try {
      // Verificar si hay sesión y obtener identificador
      const sesionIniciada = await verificarSesion();
      const identificador = sesionIniciada 
        ? await obtenerIdentificadorUsuario() 
        : 'anonymous';
      
      if (!identificador) {
        console.error('No se pudo obtener identificador de usuario');
        return false;
      }

      // Clave específica para este usuario
      const clave = `favoritos_${identificador}`;
      
      let nuevosFavoritos: number[];

      if (favoritos.includes(productoId)) {
        // Eliminar de favoritos
        nuevosFavoritos = favoritos.filter(id => id !== productoId);
        console.log(`Eliminando producto ${productoId} de favoritos de ${identificador}`);
      } else {
        // Añadir a favoritos
        nuevosFavoritos = [...favoritos, productoId];
        console.log(`Añadiendo producto ${productoId} a favoritos de ${identificador}`);
      }

      // Guardar en AsyncStorage con la clave específica
      await AsyncStorage.setItem(clave, JSON.stringify(nuevosFavoritos));
      
      // Actualizar estado local
      setFavoritos(nuevosFavoritos);
      
      return !favoritos.includes(productoId); // Retorna true si fue añadido, false si fue eliminado
    } catch (error) {
      console.error('Error al cambiar favorito:', error);
      throw error;
    }
  }, [favoritos, obtenerIdentificadorUsuario]);

  // Función para cambiar de usuario (login o logout)
  const cambiarUsuario = useCallback(async (nuevoIdentificador: string | null) => {
    console.log(`Cambiando usuario de favoritos a: ${nuevoIdentificador || 'anonymous'}`);
    
    // Si hay un cambio real de usuario (diferente al actual)
    if (nuevoIdentificador !== currentUser) {
      try {
        // Si el usuario anterior era anonymous y ahora hay un usuario real
        if (currentUser === 'anonymous' && nuevoIdentificador) {
          // Intentar fusionar favoritos anónimos con los del usuario que inicia sesión
          const favoritosAnonimos = await AsyncStorage.getItem('favoritos_anonymous');
          if (favoritosAnonimos) {
            const favoritosAnonimosArray = JSON.parse(favoritosAnonimos);
            
            // Obtener favoritos actuales del usuario que inicia sesión
            const favoritosUsuario = await AsyncStorage.getItem(`favoritos_${nuevoIdentificador}`);
            const favoritosUsuarioArray = favoritosUsuario ? JSON.parse(favoritosUsuario) : [];
            
            // Fusionar evitando duplicados
            const favoritosCombinados = [...new Set([...favoritosUsuarioArray, ...favoritosAnonimosArray])];
            
            // Guardar la combinación
            if (favoritosCombinados.length > 0) {
              await AsyncStorage.setItem(
                `favoritos_${nuevoIdentificador}`, 
                JSON.stringify(favoritosCombinados)
              );
              console.log('Favoritos anónimos fusionados con usuario:', nuevoIdentificador);
            }
          }
        }
        
        // Cargar favoritos del nuevo usuario
        await cargarFavoritos(nuevoIdentificador || 'anonymous');
        
      } catch (error) {
        console.error('Error al cambiar usuario de favoritos:', error);
      }
    }
  }, [currentUser, cargarFavoritos]);

  // Cargar favoritos al iniciar
  useEffect(() => {
    cargarFavoritos();
  }, [cargarFavoritos]);

  // Exponer las funciones y estados
  return { 
    favoritos, 
    loading, 
    esFavorito, 
    toggleFavorito, 
    recargarFavoritos,
    cambiarUsuario,
    currentUser
  };
};

export default function FavoritosProvider() {
  return null;
}