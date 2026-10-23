import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';

// Fetch advocate dashboard stats
const fetchStats = async () => {
  const { data } = await apiClient.get('/marketplace/advocate/dashboard');
  return data;
};

// Fetch profile context
const fetchProfile = async () => {
  const { data } = await apiClient.get('/marketplace/advocate/profile');
  return data;
};

export default function AdvocateWorkspaceScreen() {
  const { data: stats, isLoading: loadingStats } = useQuery({ queryKey: ['advocate-stats'], queryFn: fetchStats });
  const { data: profile, isLoading: loadingProfile } = useQuery({ queryKey: ['advocate-profile'], queryFn: fetchProfile, retry: false });

  if (loadingStats || loadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Advocate workspace</Text>
          <Text style={styles.welcomeText}>Welcome back, {(profile?.name || 'Advocate').split(' ')[0]}.</Text>
          <Text style={styles.subtitle}>Answer appointment requests and manage your meetings.</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: profile?.verificationStatus === 'verified' ? '#E6FCE6' : '#FEF7E0' }]}>
          <Text style={[styles.badgeText, { color: profile?.verificationStatus === 'verified' ? '#137333' : '#B06000' }]}>
            {profile?.verificationStatus ? `Verification ${profile.verificationStatus}` : 'Pending Verification'}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.requestsToAnswer ?? 0}</Text>
          <Text style={styles.statLabel}>Requests to answer</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.upcomingAppointments ?? 0}</Text>
          <Text style={styles.statLabel}>Upcoming meetings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#137333' }]}>{stats?.completedMeetings ?? 0}</Text>
          <Text style={styles.statLabel}>Completed meetings</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(roles)/(advocate)/appointments')}>
          <Ionicons name="calendar-outline" size={24} color="#0066CC" />
          <Text style={styles.actionText}>Manage Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(roles)/(advocate)/profile')}>
          <Ionicons name="person-outline" size={24} color="#B06000" />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Workspace Note */}
      <View style={styles.emptyState}>
        <Ionicons name="briefcase-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>Workspace Ready</Text>
        <Text style={styles.emptySubtitle}>All assigned cases and appointment requests will appear in your Meetings tab.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(roles)/(advocate)/appointments')}>
          <Text style={styles.primaryButtonText}>View Meetings</Text>
        </TouchableOpacity>
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
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
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
  primaryButton: { backgroundColor: '#0066CC', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
