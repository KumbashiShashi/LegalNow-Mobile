import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Button } from './Button';

interface ErrorRetryProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorRetry({
  title = 'Could not load data',
  message = 'Please check your internet connection or verify the server status and try again.',
  onRetry,
  isRetrying = false,
  style,
}: ErrorRetryProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Button
        title={isRetrying ? 'Retrying...' : 'Try Again'}
        onPress={onRetry}
        isLoading={isRetrying}
        variant="primary"
        style={styles.retryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCE8E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    ...theme.typography.small,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
    maxWidth: 280,
  },
  retryButton: {
    minWidth: 140,
  },
});

