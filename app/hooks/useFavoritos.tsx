import React,{ useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import axios from 'axios';

export const useFavoritos = () => {
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Función para obtener el ID del usuario actual
  const obtenerIdUsuario = async (): Promise<string | null> => {
    try {
      // Verificar si hay sesión iniciada
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return null;
      
      // Obtener datos del usuario desde AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return null;
      
      const userData = JSON.parse(userDataStr);
      // Usar id o email como identificador único
      return userData.id?.toString() || userData.email || null;
    } catch (error) {
      console.error('Error obteniendo ID de usuario:', error);
      return null;
    }
  };
  
  // Construir la clave para AsyncStorage específica por usuario
  const obtenerClaveStorage = useCallback(async () => {
    const id = await obtenerIdUsuario();
    return id ? `favoritos_${id}` : null;
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

  // Cargar favoritos específicos del usuario actual
  const cargarFavoritos = useCallback(async () => {
    setLoading(true);
    
    try {
      const sesionIniciada = await verificarSesion();
      
      // Si no hay sesión iniciada, limpiar favoritos y terminar
      if (!sesionIniciada) {
        setFavoritos([]);
        setUserId(null);
        setLoading(false);
        return;
      }
      
      // Obtener ID del usuario actual
      const id = await obtenerIdUsuario();
      setUserId(id);
      
      // Sin ID no podemos cargar favoritos específicos
      if (!id) {
        setFavoritos([]);
        setLoading(false);
        return;
      }
      
      // Cargar favoritos con clave específica del usuario
      const clave = `favoritos_${id}`;
      const favoritosGuardados = await AsyncStorage.getItem(clave);
      const favoritosArray = favoritosGuardados ? JSON.parse(favoritosGuardados) : [];
      setFavoritos(favoritosArray);
      
      console.log(`Favoritos cargados para usuario ${id}:`, favoritosArray);
      
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      setFavoritos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para recargar favoritos
  const recargarFavoritos = useCallback(async () => {
    await cargarFavoritos();
  }, [cargarFavoritos]);

  // Verificar si un producto es favorito
  const esFavorito = useCallback((productoId: number) => {
    return favoritos.includes(productoId);
  }, [favoritos]);

  // Función para añadir/quitar favoritos
  const toggleFavorito = useCallback(async (productoId: number) => {
    try {
      // Verificar si hay sesión iniciada y obtener ID
      const id = await obtenerIdUsuario();
      if (!id) {
        throw new Error('No hay sesión iniciada');
      }

      // Clave específica para este usuario
      const clave = `favoritos_${id}`;
      
      let nuevosFavoritos: number[];

      if (favoritos.includes(productoId)) {
        // Eliminar de favoritos
        nuevosFavoritos = favoritos.filter(id => id !== productoId);
        console.log(`Eliminando producto ${productoId} de favoritos del usuario ${id}`);
      } else {
        // Añadir a favoritos
        nuevosFavoritos = [...favoritos, productoId];
        console.log(`Añadiendo producto ${productoId} a favoritos del usuario ${id}`);
      }

      // Guardar en AsyncStorage con la clave específica del usuario
      await AsyncStorage.setItem(clave, JSON.stringify(nuevosFavoritos));
      
      // Actualizar estado local
      setFavoritos(nuevosFavoritos);
      
      return true;
    } catch (error) {
      console.error('Error al cambiar favorito:', error);
      throw error;
    }
  }, [favoritos]);

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
    verificarSesion,
    userId
  };
};