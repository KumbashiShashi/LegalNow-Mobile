import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { theme } from '../../../styles/theme';
import { router } from 'expo-router';

// Fetch hub profile
const fetchHubProfile = async () => {
  const { data } = await apiClient.get('/hubs/me');
  return data;
};

export default function LOneHubDashboardScreen() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: hub, isLoading } = useQuery({ queryKey: ['hub-profile'], queryFn: fetchHubProfile, retry: false });

  const devSubscribeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/hubs/me/subscription/dev-subscribe');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hub-profile'] });
      Alert.alert('Subscription Activated', data.message || 'DEV Hub subscription activated successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Hub subscription failed.');
    }
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const live = hub?.verificationStatus === 'verified' && hub?.subscription?.status === 'active' && !hub?.isSuspended;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LegalNow Hub</Text>
          <Text style={styles.welcomeText}>{hub?.shopName || 'Your Hub'}</Text>
          <Text style={styles.subtitle}>Host citizen-advocate meetings and earn payouts.</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: live ? '#E6FCE6' : '#FEF7E0' }]}>
          <Text style={[styles.badgeText, { color: live ? '#137333' : '#B06000' }]}>
            {live ? 'Live' : 'Not live yet'}
          </Text>
        </View>
      </View>

      {hub?.isSuspended && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Your hub is suspended: {hub.verificationNote}</Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>₹{hub?.earnings?.accrued?.toLocaleString('en-IN') || 0}</Text>
          <Text style={styles.statLabel}>Payout earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#B06000' }]}>₹{hub?.earnings?.due?.toLocaleString('en-IN') || 0}</Text>
          <Text style={styles.statLabel}>Due to you</Text>
        </View>
      </View>

      {/* Subscription Card */}
      <View style={[styles.statsCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary }}>Hub Subscription</Text>
        <Text style={{ fontSize: 13, color: theme.colors.muted }}>
          Status: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{hub?.subscription?.status || 'Inactive'}</Text>
        </Text>
        {hub?.env === 'DEV' && (
          <TouchableOpacity
            style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', borderWidth: 1, padding: 10, borderRadius: 8, marginTop: 8, width: '100%', alignItems: 'center' }}
            onPress={() => devSubscribeMutation.mutate()}
            disabled={devSubscribeMutation.isPending}
          >
            <Text style={{ color: '#B45309', fontWeight: 'bold' }}>
              {devSubscribeMutation.isPending ? 'Activating...' : '⚡ DEV: Activate Free Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(roles)/(lonehub)/profile')}>
          <Ionicons name="settings-outline" size={24} color="#0066CC" />
          <Text style={styles.actionText}>Hub Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FAD2CF' }]} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#D93025" />
          <Text style={[styles.actionText, { color: '#D93025' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Workspace Note */}
      <View style={styles.emptyState}>
        <Ionicons name="business-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>Meeting Participation</Text>
        <Text style={styles.emptySubtitle}>You will be asked to verify OTPs when citizens and advocates arrive at your Hub.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 32 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, paddingRight: 8 },
  errorBanner: { backgroundColor: '#FAD2CF', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBannerText: { color: '#D93025', fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0066CC', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  actionButton: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginTop: 8 },
  emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 12, marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
});
