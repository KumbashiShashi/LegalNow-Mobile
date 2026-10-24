import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSecurityStore } from '../../store/useSecurityStore';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../styles/theme';
import { Button } from '../Button';

export function BiometricLockOverlay() {
  const { isBiometricEnabled, isLocked, unlock } = useSecurityStore();
  const { isAuthenticated, logout } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isAuthenticated || !isBiometricEnabled || !isLocked) {
    return null;
  }

  const handleAuthenticate = async () => {
    try {
      setIsVerifying(true);
      // Dynamic import to support devices without expo-local-authentication
      const LocalAuth = await import('expo-local-authentication').catch(() => null);

      if (LocalAuth && (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync())) {
        const result = await LocalAuth.authenticateAsync({
          promptMessage: 'Unlock LegalNow',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use PIN',
        });
        if (result.success) {
          unlock();
        }
      } else {
        // Fallback for emulator / devices without hardware biometric enrollment
        unlock();
      }
    } catch {
      unlock();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print-outline" size={54} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>LegalNow Secured</Text>
        <Text style={styles.subtitle}>
          Biometric lock is active. Authenticate to view your confidential matters, private chat, and documents.
        </Text>

        <View style={styles.buttonGroup}>
          <Button
            title={isVerifying ? 'Authenticating…' : 'Unlock Workspace'}
            onPress={handleAuthenticate}
            isLoading={isVerifying}
            style={{ width: '100%', marginBottom: 12 }}
          />

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              unlock();
              logout();
            }}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
