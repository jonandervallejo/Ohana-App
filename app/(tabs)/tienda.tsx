import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
  const [favorites, setFavorites] = useState<number[]>([]);
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

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Cargar parámetros de categoría al iniciar
  useEffect(() => {
    if (params.categoryId) {
      setSelectedCategoryId(Number(params.categoryId));
    }
    if (params.categoryName) {
      const categoryName = params.categoryName as string;
      setSelectedCategoryName(categoryName);
      
      // Agregar la categoría a los filtros seleccionados
      setSelectedFilters(prev => ({
        ...prev,
        categories: [categoryName]
      }));
      
      // Si tenemos el filtro de categoría, auto-expandirlo para que sea visible
      setExpandedFilter('Categoría');
    }
  }, [params]);
  

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
      if (token) {
        loadFavorites();
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (productId: number) => {
    if (!isLoggedIn) {
      Alert.alert(
        '⭐ Favoritos',
        'Inicia sesión para guardar tus productos favoritos y acceder a todas las funcionalidades de la tienda.',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/(tabs)/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }

    try {
      let newFavorites;
      if (favorites.includes(productId)) {
        newFavorites = favorites.filter(id => id !== productId);
      } else {
        newFavorites = [...favorites, productId];
      }
      setFavorites(newFavorites);
      await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Resetear estado cuando se sale de la página
  useFocusEffect(
    React.useCallback(() => {
      setSelectedGender(null);
      setShowFilters(false);
      setProducts([]);
      setLoading(true);
      setSearchQuery('');
      setAllProducts([]);
      setFilteredProducts([]);
      setSelectedFilters({
        priceRange: { min: '', max: '' },
        sizes: [],
        categories: [],
      });
      setExpandedFilter(null);
      
      // Conservamos los valores de categoría si vienen como parámetros
      if (params.categoryId) {
        setSelectedCategoryId(Number(params.categoryId));
      }
      if (params.categoryName) {
        const categoryName = params.categoryName as string;
        setSelectedCategoryName(categoryName);
        setSelectedFilters(prev => ({
          ...prev,
          categories: [categoryName]
        }));
      }
    }, [])
  );

  useEffect(() => {
    // Cargar el estado de login al iniciar
    checkLoginStatus();
  }, []);

  const fetchProducts = async (page: number = 1) => {
    try {
      const response = await axios.get(`http://ohanatienda.ddns.net:8000/api/productos?page=${page}`);
      if (response.data && response.data.data) {
        const newProducts = response.data.data;
        if (page === 1) {
          setDisplayedProducts(newProducts);
        } else {
          setDisplayedProducts(prev => [...prev, ...newProducts]);
        }
        
        // Verificar si hay más páginas
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
    
    // Preservar la categoría seleccionada si viene desde home
    if (!selectedCategoryName) {
      setSelectedFilters({
        priceRange: { min: '', max: '' },
        sizes: [],
        categories: [],
      });
    }
    // No need to call loadAllProducts here, the useEffect below will handle it
  };

  const handleAddToCart = (product: Product) => {
    if (!isLoggedIn) {
      Alert.alert(
        '🛒 Carrito',
        'Inicia sesión para añadir productos a tu carrito y acceder a todas las funcionalidades de la tienda.',
        [
          { 
            text: 'Más tarde', 
            style: 'cancel',
            onPress: () => console.log('Cancelar presionado')
          },
          { 
            text: 'Iniciar sesión', 
            style: 'default',
            onPress: () => router.push('/(tabs)/perfil')
          }
        ],
        { cancelable: true }
      );
      return;
    }
    // Aquí irá la lógica para añadir al carrito
    console.log('Añadir al carrito:', product);
  };

  const applyFilters = () => {
    if (!allProducts || isChangingCategory) return;
    
    let filtered = [...allProducts];

    // Aplicar filtro de búsqueda
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product => 
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Aplicar filtro de precio
    if (selectedFilters.priceRange.min !== '' || selectedFilters.priceRange.max !== '') {
      const minPrice = selectedFilters.priceRange.min ? parseFloat(selectedFilters.priceRange.min) : 0;
      const maxPrice = selectedFilters.priceRange.max ? parseFloat(selectedFilters.priceRange.max) : Infinity;
      
      filtered = filtered.filter(product => {
        const price = parseFloat(product.precio);
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Aplicar filtro de tallas
    if (selectedFilters.sizes.length > 0) {
      filtered = filtered.filter(product => 
        product.talla && selectedFilters.sizes.includes(product.talla)
      );
    }

    // Aplicar filtro de categorías
    if (selectedFilters.categories.length > 0) {
      filtered = filtered.filter(product => {
        // Verificar si el producto tiene una categoría y si coincide con alguna de las seleccionadas
        return product.categoria && selectedFilters.categories.includes(product.categoria.nombre_cat);
      });
    }

    // Actualizar solo filteredProducts, displayedProducts se usará para resetear
    setFilteredProducts(filtered);
    setDisplayedProducts(filtered);
  };

  useEffect(() => {
    // Solo aplicar filtros si tenemos productos y no estamos cambiando categoría
    if (allProducts.length > 0 && !isChangingCategory) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedFilters.categories, selectedFilters.sizes, 
      selectedFilters.priceRange.min, selectedFilters.priceRange.max, 
      isChangingCategory]);

  const loadAllProducts = async () => {
    setIsLoadingAllProducts(true);
    try {
      if (!selectedGender) {
        setAllProducts([]);
        setDisplayedProducts([]);
        setFilteredProducts([]);
        return;
      }
  
      // Primer carga de datos del género seleccionado
      const genderResponse = await axios.get(`http://ohanatienda.ddns.net:8000/api/productos/genero/${selectedGender}`);
      
      // Segunda carga para productos unisex
      const unisexResponse = await axios.get(`http://ohanatienda.ddns.net:8000/api/productos/genero/unisex`);
      
      // Combinamos los resultados de ambas llamadas
      let allProductsData: Product[] = [];
      let hasMorePages = false;
      
      // Procesamos los productos del género seleccionado
      if (genderResponse.data && genderResponse.data.data) {
        allProductsData = [...genderResponse.data.data];
        hasMorePages = genderResponse.data.next_page_url !== null;
        
        console.log(`Productos de ${selectedGender}:`, genderResponse.data.data.length);
      }
      
      // Añadimos los productos unisex
      if (unisexResponse.data && unisexResponse.data.data) {
        // Usamos un Set para evitar IDs duplicados
        const existingIds = new Set(allProductsData.map(p => p.id));
        
        // Añadimos solo productos unisex que no estén ya incluidos
        const uniqueUnisexProducts = unisexResponse.data.data.filter(
          (p: Product) => !existingIds.has(p.id)
        );
        
        allProductsData = [...allProductsData, ...uniqueUnisexProducts];
        console.log('Productos unisex añadidos:', uniqueUnisexProducts.length);
        
        // Si cualquiera de las respuestas indica que hay más páginas
        hasMorePages = hasMorePages || unisexResponse.data.next_page_url !== null;
      }
      
      console.log('Total productos combinados:', allProductsData.length);
      
      // Filtrar por categoría si hay una seleccionada
      if (selectedCategoryId !== null) {
        allProductsData = allProductsData.filter(p => p.id_categoria === selectedCategoryId);
        console.log(`Productos filtrados por categoría ${selectedCategoryName}:`, allProductsData.length);
      }
      
      // Actualizar estados
      setAllProducts(allProductsData);
      setFilteredProducts(allProductsData); // Inicialmente mostramos todos los productos
      setHasMoreProducts(hasMorePages && allProductsData.length >= 6);
      
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
      setDisplayedProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoadingAllProducts(false);
      setLoading(false);
      setIsChangingCategory(false);
    }
  };

  useEffect(() => {
    if (selectedGender) {
      setLoading(true);
      loadAllProducts();
    }
  }, [selectedGender]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Dejamos que el efecto de applyFilters se encargue de actualizar los filtros
  };

  const toggleSize = (size: string) => {
    // Marcar que estamos en proceso de cambio para evitar filtrados parciales
    setIsChangingCategory(true);
    
    setSelectedFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
    
    // Restaurar la bandera después de un breve retraso
    setTimeout(() => {
      setIsChangingCategory(false);
    }, 100);
  };

  const toggleCategory = (category: string) => {
    // Marcar que estamos cambiando categoría para evitar filtrados mientras se actualiza
    setIsChangingCategory(true);
    
    // Si es la misma categoría que ya está seleccionada, la quitamos
    if (selectedFilters.categories.includes(category)) {
      setSelectedFilters(prev => ({
        ...prev,
        categories: []
      }));
      setSelectedCategoryId(null);
      setSelectedCategoryName(null);
    } 
    // Si es una categoría nueva, reemplazamos la anterior
    else {
      const categoryObj = categories.find(c => c.nombre_cat === category);
      setSelectedFilters(prev => ({
        ...prev,
        categories: [category] // Solo permitimos una categoría a la vez
      }));
      
      // También actualizamos los estados de categoría
      if (categoryObj) {
        setSelectedCategoryId(categoryObj.id);
        setSelectedCategoryName(category);
      }
    }
    
    // Resetear la bandera después de un breve retraso para permitir que se apliquen los cambios
    setTimeout(() => {
      setIsChangingCategory(false);
    }, 100);
  };

  const clearFilters = () => {
    // Marcar que estamos en proceso de cambio para evitar filtrados parciales
    setIsChangingCategory(true);
    
    setSelectedFilters({
      priceRange: { min: '', max: '' },
      sizes: [],
      categories: [],
    });
    setSearchQuery('');
    
    // Limpiar también el ID y nombre de categoría seleccionada
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    
    // Resetear los productos mostrados a todos los productos disponibles
    setTimeout(() => {
      setFilteredProducts(allProducts);
      setDisplayedProducts(allProducts);
      setIsChangingCategory(false); // Restaurar la bandera después de aplicar los cambios
    }, 100);
  };

  const handlePriceChange = (field: 'min' | 'max', value: string) => {
    // Marcar que estamos en proceso de cambio para evitar filtrados parciales
    setIsChangingCategory(true);
    
    setSelectedFilters(prev => ({
      ...prev,
      priceRange: { ...prev.priceRange, [field]: value }
    }));
    
    // Restaurar la bandera después de un breve retraso
    setTimeout(() => {
      setIsChangingCategory(false);
    }, 100);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://ohanatienda.ddns.net:8000/api/categorias');
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleFilter = (filterName: string) => {
    setExpandedFilter(expandedFilter === filterName ? null : filterName);
  };

  const renderFilterSection = (title: string, content: React.ReactNode) => (
    <View style={styles.filterSection}>
      <TouchableOpacity 
        style={styles.filterHeader}
        onPress={() => toggleFilter(title)}
      >
        <Text style={styles.filterTitle}>{title}</Text>
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
                  <FontAwesome5 name="check" size={12} color="#fff" style={styles.checkIcon} />
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

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity 
        style={styles.productImageContainer}
        onPress={() => {
          // Aquí podrías navegar a la vista de detalle del producto
          console.log('Ver detalle del producto:', item);
        }}
      >
        <Image 
          source={{ uri: `http://ohanatienda.ddns.net:8000/${item.imagen}` }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons 
            name={favorites.includes(item.id) ? "heart" : "heart-outline"} 
            size={24} 
            color={favorites.includes(item.id) ? "#ff0000" : "#fff"} 
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

  // Modificar el título de la página para mostrar la categoría si hay una seleccionada
  const renderHeader = () => (
    <View style={styles.header}>
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
              />
              {isLoadingAllProducts ? (
                <ActivityIndicator size="small" color="#666" style={styles.searchLoading} />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setIsChangingCategory(true);
                    setSearchQuery('');
                    setTimeout(() => {
                      setFilteredProducts(allProducts);
                      setIsChangingCategory(false);
                    }, 100);
                  }}
                >
                  <FontAwesome5 name="times" size={16} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>

            {showFilters && renderFilters()}

            {loading && filteredProducts.length === 0 ? (
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
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  activeCategory: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    transform: [{scale: 1.05}] // Ligeramente más grande
  },
  checkIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  applyFiltersButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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