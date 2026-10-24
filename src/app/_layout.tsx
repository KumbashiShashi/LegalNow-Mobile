import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSecurityStore } from '../store/useSecurityStore';
import { OfflineBanner } from '../components/shared/OfflineBanner';
import { BiometricLockOverlay } from '../components/shared/BiometricLockOverlay';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Initialize React Query client with offline resilience and optimistic caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection retention
      retry: (failureCount, error: any) => {
        if (error?.response?.status && [401, 403, 404].includes(error.response.status)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, role, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  usePushNotifications();

  useEffect(() => {
    Promise.all([
      checkSession(),
      useSecurityStore.getState().initializeSecurity(),
    ]).then(() => setMounted(true));
  }, [checkSession]);

  useEffect(() => {
    if (!mounted || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated users to their specific role dashboard
      switch (role) {
        case 'citizen':
        case 'business':
          router.replace('/(roles)/(citizen)');
          break;
        case 'professional':
          router.replace('/(roles)/(advocate)');
          break;
        case 'hub':
          router.replace('/(roles)/(lonehub)');
          break;
        case 'service_provider':
          router.replace('/(roles)/(provider)');
          break;
        case 'admin':
          // Admins shouldn't use mobile, fallback to login
          useAuthStore.getState().logout();
          router.replace('/(auth)/login');
          break;
        default:
          router.replace('/(roles)/(citizen)');
      }
    }
  }, [isAuthenticated, isLoading, mounted, segments, role, router]);

  if (isLoading || !mounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <OfflineBanner />
        <BiometricLockOverlay />
        <Slot />
      </View>
    </QueryClientProvider>
  );
}
