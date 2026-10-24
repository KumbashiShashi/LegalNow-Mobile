import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';

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

// Fetch upcoming appointments
const fetchAppointments = async () => {
  const { data } = await apiClient.get('/appointments');
  return Array.isArray(data) ? data : [];
};

// Fetch assigned client matters
const fetchAssignedCases = async () => {
  const { data } = await apiClient.get('/problems');
  return Array.isArray(data) ? data : [];
};

export default function AdvocateWorkspaceScreen() {
  const { data: stats, isLoading: loadingStats } = useQuery({ queryKey: ['advocate-stats'], queryFn: fetchStats });
  const { data: profile, isLoading: loadingProfile } = useQuery({ queryKey: ['advocate-profile'], queryFn: fetchProfile, retry: false });
  const { data: appointments = [], isLoading: loadingApps } = useQuery({ queryKey: ['advocate-appointments'], queryFn: fetchAppointments });
  const { data: cases = [], isLoading: loadingCases } = useQuery({ queryKey: ['advocate-cases'], queryFn: fetchAssignedCases });

  if (loadingStats || loadingProfile || loadingApps || loadingCases) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const upcomingConsultations = appointments
    .filter((a: any) => ['requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(a.status))
    .slice(0, 3);

  const activeCases = cases
    .filter((c: any) => ['assigned', 'in_progress', 'open'].includes(c.status))
    .slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Advocate workspace</Text>
          <Text style={styles.welcomeText}>Welcome back, {(profile?.name || 'Advocate').split(' ')[0]}.</Text>
          <Text style={styles.subtitle}>Answer appointment requests and manage your consultations.</Text>
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
          <Text style={styles.actionText}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(roles)/(advocate)/profile')}>
          <Ionicons name="person-outline" size={24} color="#B06000" />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== 1. UPCOMING CONSULTATIONS SCHEDULER ==================== */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Consultation Schedule</Text>
          <Text style={styles.sectionSubtitle}>Upcoming hearings and citizen meetings</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(roles)/(advocate)/appointments')}>
          <Text style={styles.seeAllText}>All Meetings →</Text>
        </TouchableOpacity>
      </View>

      {upcomingConsultations.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="calendar-clear-outline" size={32} color="#9AA0A6" />
          <Text style={styles.emptyCardTitle}>No Upcoming Consultations</Text>
          <Text style={styles.emptyCardSubtitle}>New appointment requests will show here for instant response.</Text>
        </Card>
      ) : (
        upcomingConsultations.map((app: any) => (
          <Card key={app.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCustomerName}>{app.citizenName || 'Citizen Client'}</Text>
                <Text style={styles.itemMeta}>
                  {new Date(app.startTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })} • {app.durationMinutes || 45} mins
                </Text>
              </View>
              <Badge status={app.status} />
            </View>

            <View style={styles.locationBadgeRow}>
              <Ionicons
                name={app.locationType === 'lone_hub' ? 'business' : app.locationType === 'advocate_office' ? 'briefcase' : 'home'}
                size={14}
                color={theme.colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.locationBadgeText}>
                {app.locationType === 'lone_hub'
                  ? `LegalNow Hub (${app.hubName || 'Nearby Center'})`
                  : app.locationType === 'advocate_office'
                  ? "Advocate's Office"
                  : "Citizen's Premises"}
              </Text>
            </View>

            {app.myHubMeetingOtp && (
              <View style={styles.hubOtpContainer}>
                <Text style={styles.hubOtpLabel}>Hub Check-In Code:</Text>
                <Text style={styles.hubOtpCode}>{app.myHubMeetingOtp}</Text>
              </View>
            )}

            <View style={styles.itemActionRow}>
              <TouchableOpacity
                style={styles.manageMeetingBtn}
                onPress={() => router.push('/(roles)/(advocate)/appointments')}
              >
                <Text style={styles.manageMeetingBtnText}>Manage & Propose Location</Text>
                <Ionicons name="arrow-forward" size={14} color="#0066CC" />
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}

      {/* ==================== 2. ASSIGNED MATTERS & CASE WORKSPACE ==================== */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Assigned Legal Matters</Text>
          <Text style={styles.sectionSubtitle}>Active client files and encrypted communications</Text>
        </View>
      </View>

      {activeCases.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={32} color="#9AA0A6" />
          <Text style={styles.emptyCardTitle}>No Assigned Cases</Text>
          <Text style={styles.emptyCardSubtitle}>Accepted legal problems from clients will be tracked here.</Text>
        </Card>
      ) : (
        activeCases.map((c: any) => (
          <Card key={c.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCustomerName}>{c.title}</Text>
                <Text style={styles.itemMeta}>
                  {c.category || 'Legal Dispute'} • Registered {new Date(c.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Badge status={c.status} />
            </View>

            <Text style={styles.caseExcerpt} numberOfLines={2}>
              {c.description}
            </Text>

            <View style={styles.itemActionRow}>
              <TouchableOpacity
                style={styles.openCaseBtn}
                onPress={() => router.push(`/case/${c.id}`)}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.openCaseBtnText}>Open Case & Chat</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 40 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { fontSize: 12, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, paddingRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0066CC', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  actionButton: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginTop: 6 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
  sectionSubtitle: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#0066CC' },
  emptyCard: { padding: 24, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16 },
  emptyCardTitle: { fontSize: 15, fontWeight: '600', color: '#3C4043', marginTop: 8 },
  emptyCardSubtitle: { fontSize: 12, color: '#70757A', textAlign: 'center', marginTop: 4 },
  itemCard: { marginBottom: 12, padding: 14, backgroundColor: '#FFF', borderRadius: 12 },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemCustomerName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  itemMeta: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  locationBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: '#E8F0FE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  locationBadgeText: { fontSize: 11, fontWeight: '600', color: '#1A73E8' },
  hubOtpContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F4EA', padding: 8, borderRadius: 6, marginTop: 8 },
  hubOtpLabel: { fontSize: 12, fontWeight: '600', color: '#137333', marginRight: 6 },
  hubOtpCode: { fontSize: 14, fontWeight: 'bold', color: '#137333', letterSpacing: 2 },
  itemActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F3F4', paddingTop: 10 },
  manageMeetingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageMeetingBtnText: { fontSize: 13, fontWeight: '600', color: '#0066CC' },
  caseExcerpt: { fontSize: 12, color: '#5F6368', marginTop: 4, lineHeight: 18 },
  openCaseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0066CC', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  openCaseBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
