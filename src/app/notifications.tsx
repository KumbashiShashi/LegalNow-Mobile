import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/axiosClient';
import { theme } from '../styles/theme';
import { Card } from '../components/Card';

const fetchNotifications = async () => {
  const { data } = await apiClient.get('/marketplace/notifications');
  return Array.isArray(data) ? data : [];
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/marketplace/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/marketplace/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerRight: () => unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
              <Text style={styles.headerAction}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card
              style={[styles.card, !item.isRead ? styles.unreadCard : {}]}
              onPress={() => {
                if (!item.isRead) markReadMutation.mutate(item.id);
                if (item.link) {
                  let path = item.link;
                  if (path.startsWith('/cases/')) {
                    path = path.replace('/cases/', '/case/');
                  }
                  try {
                    router.push(path as any);
                  } catch {
                    // Ignore unrecognized route
                  }
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.dot, !item.isRead && styles.unreadDot]} />
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>You are all caught up</Text>
              <Text style={styles.emptyText}>Case updates, messages, and payments will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerAction: { color: theme.colors.primary, fontSize: 14, fontWeight: '600', marginRight: 16 },
  listContent: { padding: theme.spacing.md },
  card: { padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', marginRight: 8 },
  unreadDot: { backgroundColor: theme.colors.primary },
  title: { ...theme.typography.h3, flex: 1 },
  body: { ...theme.typography.body, color: theme.colors.text, marginBottom: 8 },
  time: { ...theme.typography.small, color: theme.colors.muted },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { ...theme.typography.h3, marginTop: 12 },
  emptyText: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
});
