import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '../../store/useNetworkStore';
import { apiClient } from '../../api/axiosClient';

export function OfflineBanner() {
  const { isOffline, setOffline } = useNetworkStore();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  if (!isOffline) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await apiClient.get('/auth/login-config');
      setOffline(false);
      queryClient.refetchQueries();
    } catch {
      // Still offline
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={16} color="#FFF" style={styles.icon} />
      <Text style={styles.text} numberOfLines={1}>
        Connection offline. Showing cached data.
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={handleRetry}
        disabled={retrying}
      >
        {retrying ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.retryText}>Retry</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D93025',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 9999,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    flex: 1,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    marginLeft: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

