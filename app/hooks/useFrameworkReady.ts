import { useState, useEffect } from 'react';
import { FontSource, useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface FrameworkReadyOptions {
  fonts?: Record<string, FontSource>;
}

const useFrameworkReadyImplementation = (options: FrameworkReadyOptions = {}) => {
  const [isReady, setIsReady] = useState(false);
  
  // Load fonts if provided in options
  const [fontsLoaded] = useFonts(options.fonts || {});

  // Hide the splash screen once ready
  useEffect(() => {
    const prepare = async () => {
      try {
        // Add any additional asset/resource loading logic here
        // For example, loading images, initializing database, etc.
        
        // When all resources are loaded, we're ready
        const ready = options.fonts ? fontsLoaded : true;
        
        if (ready) {
          // Hide the splash screen
          await SplashScreen.hideAsync();
          // Mark as ready
          setIsReady(true);
        }
      } catch (e) {
        console.warn('Error preparing app:', e);
      }
    };

    prepare();
  }, [fontsLoaded, options.fonts]);

  return isReady;
};

// Export both as default export (for router) and named export (for convenience)
export { useFrameworkReadyImplementation as useFrameworkReady };
export default useFrameworkReadyImplementation;