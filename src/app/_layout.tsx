import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

// Initialize React Query client
const queryClient = new QueryClient();

export default function RootLayout() {
  const { isAuthenticated, isLoading, role, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkSession().then(() => setMounted(true));
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
        <Slot />
      </View>
    </QueryClientProvider>
  );
}
