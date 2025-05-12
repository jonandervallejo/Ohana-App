import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Keyboard
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoritos } from '../hooks/useFavoritos';

type Gender = 'hombre' | 'mujer' | null;

interface Product {
  id: number;
  nombre: string;
  precio: string;
  imagen: string;
  talla?: string;
  tipo?: string;
  categoria?: Category;
  id_categoria?: number;
}

interface Category {
  id: number;
  nombre_cat: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 45) / 2;
const API_BASE_URL = 'http://ohanatienda.ddns.net:8000';

export default function TiendaScreen() {
  const params = useLocalSearchParams();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [selectedFilters, setSelectedFilters] = useState({
    priceRange: { min: '', max: '' },
    sizes: [] as string[],
    categories: [] as string[],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingAllProducts, setIsLoadingAllProducts] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [paramsProcessed, setParamsProcessed] = useState(false);
  
  // Usar el hook de favoritos
  const { favoritos, loading: loadingFavoritos, esFavorito, toggleFavorito } = useFavoritos();

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Verificar estado de sesión
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  // Función para manejar favoritos que usa el hook personalizado
  const handleToggleFavorite = async (productId: number) => {
    try {
      if (!isLoggedIn) {
        Alert.alert(
          '⭐ Favoritos',
          'Para guardar tus productos favoritos necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?',
          [
            { 
              text: 'Más tarde', 
              style: 'cancel'
            },
            { 
              text: 'Iniciar sesión', 
              style: 'default',
              onPress: () => router.push('/perfil')
            },
          ],
          { cancelable: true }
        );
        return;
      }
  
      // Si está logueado, toggle favorito directamente
      await toggleFavorito(productId);
      
      // Mostrar feedback al usuario
      const isFav = await esFavorito(productId);
      Alert.alert(
        isFav ? "✅ Añadido a favoritos" : "❌ Eliminado de favoritos",
        isFav ? "El producto ha sido añadido a tus favoritos" : "El producto ha sido eliminado de tus favoritos",
        [{ text: "Entendido" }]
      );
    } catch (error) {
      console.error('Error al gestionar favorito:', error);
      Alert.alert(
        "❌ Error",
        "No se pudo actualizar el favorito. Por favor, inténtalo de nuevo.",
        [{ text: "Entendido" }]
      );
    }
  };

  // Resetear estado cuando se sale de la página
  useFocusEffect(
    React.useCallback(() => {
      // Reset de estados
      setSelectedGender(null);
      setShowFilters(false);
      setProducts([]);
      setLoading(true);
      setSearchQuery('');
      setAllProducts([]);
      setFilteredProducts([]);
      setDisplayedProducts([]);
      setSelectedFilters({
        priceRange: { min: '', max: '' },
        sizes: [],
        categories: [],
      });
      setExpandedFilter(null);
      setParamsProcessed(false);
      
      return () => {
        // Limpiar al salir de la pantalla
      };
    }, [])
  );

  useEffect(() => {
    // Cargar el estado de login al iniciar
    checkLoginStatus();
    // Cargar las categorías al iniciar
    fetchCategories();
  }, []);

  // Procesar parámetros de URL una sola vez
  useEffect(() => {
    if (paramsProcessed) return;
    
    try {
      if (params.categoryId) {
        // Convertir explícitamente a número con verificación
        const categoryId = typeof params.categoryId === 'string' 
          ? Number(params.categoryId) 
          : Array.isArray(params.categoryId) 
            ? Number(params.categoryId[0]) 
            : null;
        
        if (categoryId && !isNaN(categoryId)) {
          setSelectedCategoryId(categoryId);
        }
      }
      
      if (params.categoryName) {
        // Asegurarse de que categoryName es string
        const categoryName = typeof params.categoryName === 'string' 
          ? params.categoryName 
          : Array.isArray(params.categoryName)
            ? params.categoryName[0]
            : '';
        
        if (categoryName) {
          setSelectedCategoryName(categoryName);
          
          // Actualizar filtros sólo si tenemos un nombre válido
          setSelectedFilters(prev => ({
            ...prev,
            categories: [categoryName]
          }));
          
          // Expandir la sección de categorías
          setExpandedFilter('Categoría');
        }
      }
    } catch (error) {
      // Manejar cualquier error silenciosamente
      console.error('Error processing URL parameters:', error);
    } finally {
      // Marcar como procesado en todos los casos
      setParamsProcessed(true);
    }
  }, [params, paramsProcessed]);

  // Cargar productos básica - para paginación inicial
  const fetchProducts = async (page: number = 1) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/productos?page=${page}`);
      if (response.data && response.data.data) {
        const newProducts = response.data.data;
        if (page === 1) {
          setDisplayedProducts(newProducts);
        } else {
          setDisplayedProducts(prev => [...prev, ...newProducts]);
        }
        
        setHasMoreProducts(newProducts.length === 6);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = () => {
    if (!loading && hasMoreProducts) {
      setLoading(true);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  const handleGenderSelect = (gender: Gender) => {
    setSelectedGender(gender);
    setCurrentPage(1);
    setHasMoreProducts(true);
    setDisplayedProducts([]);
    setFilteredProducts([]);
    setAllProducts([]);
    setSearchQuery('');
  };

  const handleAddToCart = (product: Product) => {
    if (!isLoggedIn) {
      Alert.alert(
        '🛒 Carrito',
        'Para añadir productos a tu carrito necesitas iniciar sesión. ¿Deseas iniciar sesión ahora?',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }
    
    Alert.alert(
      "✅ Producto añadido",
      `El producto "${product.nombre}" ha sido añadido al carrito.`,
      [
        { 
          text: "Seguir comprando",
          style: "cancel"
        },
        { 
          text: "Ir al carrito",
          style: "default",
          onPress: () => router.push('/(tabs)/carrito')
        }
      ]
    );
  };

  // Función optimizada para cargar todos los productos
  const loadAllProducts = useCallback(async () => {
    if (!selectedGender) return;

    setIsLoadingAllProducts(true);
    setLoading(true);
    
    try {
      // Cargar productos del género seleccionado
      const genderResponse = await axios.get(`${API_BASE_URL}/api/productos/genero/${selectedGender}`);
      
      // Cargar productos unisex
      const unisexResponse = await axios.get(`${API_BASE_URL}/api/productos/genero/unisex`);
      
      // Combinar resultados
      let allProductsData: Product[] = [];
      let hasMorePages = false;
      
      if (genderResponse.data && genderResponse.data.data) {
        allProductsData = [...genderResponse.data.data];
        hasMorePages = genderResponse.data.next_page_url !== null;
      }
      
      if (unisexResponse.data && unisexResponse.data.data) {
        const existingIds = new Set(allProductsData.map(p => p.id));
        
        const uniqueUnisexProducts = unisexResponse.data.data.filter(
          (p: Product) => !existingIds.has(p.id)
        );
        
        allProductsData = [...allProductsData, ...uniqueUnisexProducts];
        hasMorePages = hasMorePages || unisexResponse.data.next_page_url !== null;
      }
      
      setAllProducts(allProductsData);
      setFilteredProducts(allProductsData); 
      setDisplayedProducts(allProductsData);
      setHasMoreProducts(hasMorePages && allProductsData.length >= 6);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
      setFilteredProducts([]);
      setDisplayedProducts([]);
    } finally {
      setIsLoadingAllProducts(false);
      setLoading(false);
      setIsChangingCategory(false);
    }
  }, [selectedGender]);

  // Cargar productos cuando se selecciona el género
  useEffect(() => {
    if (selectedGender) {
      loadAllProducts();
    }
  }, [selectedGender, loadAllProducts]);

  // Aplicar filtros cuando los productos están cargados y hay categoría seleccionada
  useEffect(() => {
    if (allProducts.length > 0 && !isChangingCategory) {
      applyFilters();
    }
  }, [allProducts, selectedCategoryId, isChangingCategory]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Aplicar filtros inmediatamente cuando se escribe
    if (text.trim() === '') {
      applyFilters();
    } else {
      const filtered = allProducts.filter(product => 
        product.nombre.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setDisplayedProducts(filtered);
    }
  };

  // Manejar la tecla de retorno
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    if (searchQuery.trim() !== '') {
      applyFilters();
    }
  };

  const applyFilters = useCallback(() => {
    if (!allProducts.length || isChangingCategory) return;
    
    let filtered = [...allProducts];

    // Aplicar filtros de categorías (ahora permite múltiples)
    if (selectedFilters.categories.length > 0) {
      filtered = filtered.filter(product => {
        // Si hay un ID específico seleccionado, priorizar ese
        if (selectedCategoryId !== null && product.id_categoria === selectedCategoryId) {
          return true;
        }
        
        // Para las demás categorías seleccionadas, filtrar por nombre
        return product.categoria && 
               selectedFilters.categories.includes(product.categoria.nombre_cat);
      });
    }

    // Filtro de búsqueda
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product => 
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro de precio
    if (selectedFilters.priceRange.min !== '' || selectedFilters.priceRange.max !== '') {
      const minPrice = selectedFilters.priceRange.min ? parseFloat(selectedFilters.priceRange.min) : 0;
      const maxPrice = selectedFilters.priceRange.max ? parseFloat(selectedFilters.priceRange.max) : Infinity;
      
      filtered = filtered.filter(product => {
        const price = parseFloat(product.precio);
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Filtro de tallas
    if (selectedFilters.sizes.length > 0) {
      filtered = filtered.filter(product => 
        product.talla && selectedFilters.sizes.includes(product.talla)
      );
    }

    // Actualizar productos filtrados
    setFilteredProducts(filtered);
    setDisplayedProducts(filtered);
  }, [allProducts, searchQuery, selectedFilters, selectedCategoryId, isChangingCategory]);

  // Aplicar filtros cuando cambian las condiciones
  useEffect(() => {
    if (allProducts.length > 0 && !isChangingCategory) {
      applyFilters();
    }
  }, [searchQuery, selectedFilters, applyFilters, isChangingCategory]);

  // Handlers de filtros optimizados
  const toggleSize = (size: string) => {
    setIsChangingCategory(true);
    
    setSelectedFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
    
    setIsChangingCategory(false);
  };

  // Toggle Category mejorado para permitir múltiples selecciones
  const toggleCategory = (category: string) => {
    setIsChangingCategory(true);
    
    // Encontrar el objeto de categoría correspondiente
    const categoryObj = categories.find(c => c.nombre_cat === category);
    
    setSelectedFilters(prev => {
      // Si la categoría ya está seleccionada, solo la quitamos
      if (prev.categories.includes(category)) {
        // Si es la categoría principal, también limpiamos ese estado
        if (selectedCategoryName === category) {
          setSelectedCategoryName(null);
          setSelectedCategoryId(null);
        }
        
        return {
          ...prev,
          categories: prev.categories.filter(c => c !== category)
        };
      } 
      // Añadir la nueva categoría (permitiendo múltiples)
      else {
        // Si es la primera categoría seleccionada, establecerla como principal también
        if (prev.categories.length === 0 && categoryObj) {
          setSelectedCategoryId(categoryObj.id);
          setSelectedCategoryName(category);
        }
        
        return {
          ...prev,
          categories: [...prev.categories, category]
        };
      }
    });
    
    setIsChangingCategory(false);
  };

  const clearFilters = () => {
    setIsChangingCategory(true);
    
    setSelectedFilters({
      priceRange: { min: '', max: '' },
      sizes: [],
      categories: [],
    });
    setSearchQuery('');
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    
    // Resetear a todos los productos
    setFilteredProducts(allProducts);
    setDisplayedProducts(allProducts);
    
    setIsChangingCategory(false);
  };

  const handlePriceChange = (field: 'min' | 'max', value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      priceRange: { ...prev.priceRange, [field]: value }
    }));
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categorias`);
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const toggleFilter = (filterName: string) => {
    setExpandedFilter(expandedFilter === filterName ? null : filterName);
  };

  // Componentes de UI
  const renderFilterSection = (title: string, content: React.ReactNode) => (
    <View style={styles.filterSection}>
      <TouchableOpacity 
        style={styles.filterHeader}
        onPress={() => toggleFilter(title)}
      >
        <View style={styles.filterTitleContainer}>
          <Text style={styles.filterTitle}>{title}</Text>
          {title === 'Categoría' && selectedFilters.categories.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedFilters.categories.length}</Text>
            </View>
          )}
        </View>
        <FontAwesome5 
          name={expandedFilter === title ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#333" 
        />
      </TouchableOpacity>
      {expandedFilter === title && content}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {renderFilterSection(
        'Precio',
        <View style={styles.priceRangeContainer}>
          <View style={styles.priceInputContainer}>
            <Text style={styles.priceLabel}>Mín</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={selectedFilters.priceRange.min}
              onChangeText={(text) => handlePriceChange('min', text)}
            />
          </View>
          <View style={styles.priceSeparator} />
          <View style={styles.priceInputContainer}>
            <Text style={styles.priceLabel}>Máx</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="100"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={selectedFilters.priceRange.max}
              onChangeText={(text) => handlePriceChange('max', text)}
            />
          </View>
        </View>
      )}

      {renderFilterSection(
        'Talla',
        <View style={styles.chipsContainer}>
          {availableSizes.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.chip,
                selectedFilters.sizes.includes(size) && styles.chipSelected
              ]}
              onPress={() => toggleSize(size)}
            >
              <Text style={[
                styles.chipText,
                selectedFilters.sizes.includes(size) && styles.chipTextSelected
              ]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {renderFilterSection(
        'Categoría',
        loadingCategories ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <View style={styles.chipsContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  selectedFilters.categories.includes(category.nombre_cat) && styles.chipSelected,
                  selectedFilters.categories.includes(category.nombre_cat) && styles.activeCategory
                ]}
                onPress={() => toggleCategory(category.nombre_cat)}
              >
                {selectedFilters.categories.includes(category.nombre_cat) && (
                  <View style={styles.categoryIndicator}>
                    <FontAwesome5 name="check" size={10} color="#fff" />
                  </View>
                )}
                <Text style={[
                  styles.chipText,
                  selectedFilters.categories.includes(category.nombre_cat) && styles.chipTextSelected
                ]}>
                  {category.nombre_cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      )}

      <View style={styles.filterButtonsContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, styles.clearFiltersButton]}
          onPress={clearFilters}
        >
          <Text style={styles.clearFiltersText}>Limpiar Filtros</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderizado del producto con verificación asíncrona de favorito
  const renderProduct = ({ item }: { item: Product }) => {
    // Ya tenemos el estado de favoritos en el hook, por lo que no necesitamos consultar cada vez
    const isFavorite = favoritos.includes(item.id);

    return (
      <View style={styles.productCard}>
        <TouchableOpacity 
          style={styles.productImageContainer}
          onPress={() => {
            router.push({
              pathname: '/detalles',
              params: { id: item.id.toString() }
            });
          }}
        >
          <Image 
            source={{ uri: `${API_BASE_URL}/${item.imagen}` }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ff0000" : "#fff"} 
            />
          </TouchableOpacity>
        </TouchableOpacity>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
          <Text style={styles.productPrice}>{item.precio} €</Text>
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={() => handleAddToCart(item)}
          >
            <FontAwesome5 name="shopping-cart" size={16} color="#fff" />
            <Text style={styles.addToCartText}>Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMoreProducts) return null;
    
    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={styles.loadMoreButton}
          onPress={loadMoreProducts}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <FontAwesome5 name="chevron-down" size={16} color="#fff" />
              <Text style={styles.loadMoreText}>Ver más productos</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setSelectedGender(null)}
      >
        <FontAwesome5 name="arrow-left" size={18} color="#333" />
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>
        {selectedCategoryName 
          ? `${selectedCategoryName} ${selectedGender === 'hombre' ? 'Hombre' : 'Mujer'}` 
          : selectedGender === 'hombre' ? 'Colección Hombre' : 'Colección Mujer'}
      </Text>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <FontAwesome5 name="filter" size={20} color="#333" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8f8f8']}
        style={styles.gradientBackground}
      >
        {!selectedGender ? (
          <View style={styles.genderSelection}>
            <Text style={styles.title}>
              {selectedCategoryName 
                ? `Selecciona género para ${selectedCategoryName}` 
                : 'Selecciona tu género'}
            </Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity 
                style={styles.genderButton}
                onPress={() => handleGenderSelect('hombre')}
              >
                <FontAwesome5 name="male" size={40} color="#333" />
                <Text style={styles.genderText}>Hombre</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.genderButton}
                onPress={() => handleGenderSelect('mujer')}
              >
                <FontAwesome5 name="female" size={40} color="#333" />
                <Text style={styles.genderText}>Mujer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.productsContainer}>
            {renderHeader()}

            <View style={styles.searchBarContainer}>
              <FontAwesome5 name="search" size={16} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar productos..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                blurOnSubmit={false}
              />
              {isLoadingAllProducts ? (
                <ActivityIndicator size="small" color="#666" style={styles.searchLoading} />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                  }}
                >
                  <FontAwesome5 name="times" size={16} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>

            {showFilters && renderFilters()}

            {(loading && filteredProducts.length === 0) || loadingFavoritos ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.productsList}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.columnWrapper}
                ListFooterComponent={searchQuery ? null : renderFooter}
                onEndReached={searchQuery ? null : loadMoreProducts}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  !loading ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No se encontraron productos</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

// Mantenemos el mismo objeto de estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
  },
  genderSelection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
    textAlign: 'center'
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  genderButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    width: '45%',
  },
  genderText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  productsContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  filtersContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterSection: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  filterBadge: {
    backgroundColor: '#007bff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 8,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  priceSeparator: {
    width: 20,
    height: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  activeCategory: {
    borderWidth: 2,
    borderColor: '#007bff', 
    ...Platform.select({
      ios: {
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
    transform: [{scale: 1.05}],
  },
  categoryIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#007bff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  clearFiltersButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  productsList: {
    padding: 15,
    minHeight: 300,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 1.2,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
    height: 40,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 25,
    width: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 15,
    height: 45,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 14,
    color: '#333',
  },
  clearSearchButton: {
    padding: 5,
  },
  searchLoading: {
    marginRight: 10,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});