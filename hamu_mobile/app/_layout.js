import { Slot, SplashScreen, usePathname, useRouter } from 'expo-router';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useEffect, createContext, useContext, useRef, useState, useMemo } from 'react';
import { Text, View, ActivityIndicator, Button, Platform, LogBox } from 'react-native';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Re-import the original AuthProvider for components using the original useAuth hook
import { AuthProvider, useAuth } from '../services/AuthContext';
// Import offline services
import { syncService } from '../services/SyncService';
import { cacheService } from '../services/CacheService';
import { networkService } from '../services/NetworkService';
import api from '../services/api';
import OfflineBanner from '../components/OfflineBanner';
import NetworkBanner from '../components/NetworkBanner';

// Global error handler - catches unhandled errors and logs them
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL_ERROR]', isFatal ? 'FATAL:' : 'ERROR:', error);
    console.error('[GLOBAL_ERROR] Stack:', error?.stack);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Handle unhandled promise rejections
if (typeof global.HermesInternal !== 'undefined') {
  // Hermes engine
  global.HermesInternal?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      console.error('[UNHANDLED_PROMISE]', id, rejection);
    },
  });
}

// Enhanced ocean blue theme
const oceanBlueTheme = {
  dark: false,
  colors: {
    primary: '#0077B6', // Dark Ocean Blue
    secondary: '#48CAE4', // Light Ocean Blue
    background: '#FFFFFF',
    card: '#F8F9FA',
    text: '#333333',
    border: '#CAF0F8',
    notification: '#0096C7',
    accent: '#00B4D8',
    statusBar: '#0077B6',
  },
  // Add font configuration
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    light: { fontFamily: 'System', fontWeight: '300' },
    thin: { fontFamily: 'System', fontWeight: '100' },
  },
};

// Create Paper theme that matches our app colors
const paperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: oceanBlueTheme.colors.primary,
    accent: oceanBlueTheme.colors.accent,
    background: oceanBlueTheme.colors.background,
    surface: oceanBlueTheme.colors.card,
    text: oceanBlueTheme.colors.text,
  },
};

// Create a stable auth context that won't cause infinite loops
const StableAuthContext = createContext(null);

// Implementation of a fixed auth provider that doesn't re-render infinitely
function StableAuthProvider({ children }) {
  // Use ref for data that shouldn't trigger re-renders
  const authStateRef = useRef({
    user: null,
    isAuthenticated: false
  });

  // Use state only for loading indicators
  const [state, setState] = useState({
    loading: false,
    initialized: true
  });

  // Create stable login/logout functions
  const authActions = useMemo(() => ({
    login: () => {
      authStateRef.current.isAuthenticated = true;
      authStateRef.current.user = { id: '1', name: 'User' };
      // Force a single re-render
      setState(prev => ({ ...prev, timestamp: Date.now() }));
    },
    logout: () => {
      authStateRef.current.isAuthenticated = false;
      authStateRef.current.user = null;
      // Force a single re-render
      setState(prev => ({ ...prev, timestamp: Date.now() }));
    }
  }), []);

  // Create stable context value that doesn't change on every render
  const contextValue = useMemo(() => ({
    ...state,
    ...authStateRef.current,
    ...authActions
  }), [state, authActions]);

  return (
    <StableAuthContext.Provider value={contextValue}>
      {children}
    </StableAuthContext.Provider>
  );
}

// Custom hook to use our stable auth context
function useStableAuth() {
  const context = useContext(StableAuthContext);
  if (!context) {
    throw new Error('useStableAuth must be used within a StableAuthProvider');
  }
  return context;
}

// Navigation wrapper with improved UI handling and redirect prevention
function RootLayoutNav() {
  const { isAuthenticated, loading, initialized, login, logout, user } = useStableAuth();
  // Get real user from AuthContext for preloading
  const { user: authUser } = useAuth();
  const pathname = usePathname();
  const isLoginScreen = pathname === '/login';
  const router = useRouter();

  // Use ref to track redirects and prevent loops
  const redirectAttemptRef = useRef(0);
  // Track if we've already preloaded data
  const hasPreloadedRef = useRef(false);

  // Preload all data for offline use when user is authenticated
  useEffect(() => {
    // Trigger preload when authUser (from real AuthContext) is available
    if (authUser && !hasPreloadedRef.current) {
      hasPreloadedRef.current = true;
      console.log('[RootLayoutNav] Starting data preload for offline use...', authUser.names);
      api.preloadAllData(authUser).then(result => {
        console.log('[RootLayoutNav] Preload complete:', result);
      }).catch(error => {
        console.warn('[RootLayoutNav] Preload failed (will use lazy loading):', error.message);
      });
    }
    // Reset preload flag when user logs out
    if (!authUser) {
      hasPreloadedRef.current = false;
    }
  }, [authUser]);

  // Handle authentication redirects safely to avoid loops
  useEffect(() => {
    // If we've already attempted a redirect in the current session, don't try again
    if (redirectAttemptRef.current > 0) {
      return;
    }

    // Only handle redirects when fully initialized
    if (!initialized || loading) {
      return;
    }

    // Simple redirect logic - only attempt once per mount
    if (isAuthenticated && isLoginScreen) {
      redirectAttemptRef.current += 1;
      router.replace('/');
    } else if (!isAuthenticated && !isLoginScreen && pathname !== '/register') {
      redirectAttemptRef.current += 1;
      router.replace('/login');
    }
  }, [isAuthenticated, isLoginScreen, initialized, loading, pathname, router]);

  // Show loading indicator while authentication is being checked
  if (loading || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: oceanBlueTheme.colors.background }}>
        <ActivityIndicator size="large" color={oceanBlueTheme.colors.primary} />
        <Text style={{ marginTop: 20, color: oceanBlueTheme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: oceanBlueTheme.colors.background }}>
      <StatusBar
        backgroundColor={oceanBlueTheme.colors.statusBar}
        barStyle="light-content"
      />

      {/* Network Connectivity Banner - shows when offline */}
      {!!authUser && <NetworkBanner />}

      {/* Offline Sync Banner - shows pending items */}
      {!!authUser && <OfflineBanner />}

      {/* Content area */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}

// Simple layout component with navigation support
export default function RootLayout() {
  // Add font loading back
  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        console.log('Error hiding splash screen');
      });
    }
  }, [fontsLoaded, fontError]);

  // Initialize offline services on app mount
  useEffect(() => {
    console.log('[RootLayout] Initializing offline services');
    syncService.initialize();
    cacheService.initialize();
    networkService.initialize();
    // Initialize offline queue - reset any stuck syncing items
    const { offlineQueue } = require('../services/OfflineQueue');
    offlineQueue.initialize();

    // Cleanup on unmount
    return () => {
      syncService.cleanup();
      networkService.cleanup();
    };
  }, []);

  // Loading view for fonts
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: oceanBlueTheme.colors.background }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  // Include both auth providers - original one for compatibility, and our stable one
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StableAuthProvider>
          <PaperProvider theme={paperTheme}>
            <ThemeProvider value={oceanBlueTheme}>
              <StatusBar style="light" backgroundColor="#0077B6" />
              <RootLayoutNav />
            </ThemeProvider>
          </PaperProvider>
        </StableAuthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}