import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/axiosClient';

export function usePushNotifications() {
  const { isAuthenticated, role } = useAuthStore();
  const tokenRegisteredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || tokenRegisteredRef.current) return;

    // Lightweight registry hook to sync device push token when available
    async function registerDeviceToken() {
      try {
        // Dynamic check for native notification support
        const Notifications = await import('expo-notifications').catch(() => null);
        if (!Notifications) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        const pushToken = tokenData?.data;

        if (pushToken) {
          // Attempt token registration with backend if available
          await apiClient.post('/marketplace/push-token', {
            token: pushToken,
            platform: Platform.OS,
          }).catch(() => {
            // Backend logs notifications table directly; token registry is non-blocking
          });
          tokenRegisteredRef.current = true;
        }
      } catch {
        // Non-blocking in dev / simulator without Google Play services
      }
    }

    registerDeviceToken();
  }, [isAuthenticated, role]);
}

export function handleNotificationRoute(data: { link?: string; caseId?: string; appointmentId?: string; invoiceId?: string }) {
  if (data.caseId) {
    router.push(`/case/${data.caseId}`);
  } else if (data.appointmentId) {
    const currentRole = useAuthStore.getState().role;
    if (currentRole === 'professional') router.push('/(roles)/(advocate)/appointments');
    else if (currentRole === 'hub') router.push('/(roles)/(lonehub)/meetings');
    else if (currentRole === 'service_provider') router.push('/(roles)/(provider)/appointments');
    else router.push('/(roles)/(citizen)/appointments');
  } else if (data.invoiceId) {
    router.push(`/invoices/${data.invoiceId}`);
  } else if (data.link) {
    router.push(data.link as any);
  }
}

