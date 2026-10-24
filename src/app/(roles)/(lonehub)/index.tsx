import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { theme } from '../../../styles/theme';
import { router } from 'expo-router';
import { Button } from '../../../components/Button';
import { showAlert } from '../../../utils/alert';

// Fetch hub profile
const fetchHubProfile = async () => {
  const { data } = await apiClient.get('/hubs/me');
  return data;
};

const fetchHubPayouts = async () => {
  const { data } = await apiClient.get('/hubs/me/payouts');
  return data;
};

// Fetch meetings scheduled at this hub
const fetchHubMeetings = async () => {
  const [appRes, svcRes] = await Promise.all([
    apiClient.get('/appointments').catch(() => ({ data: [] })),
    apiClient.get('/service-meetings/mine').catch(() => ({ data: [] })),
  ]);

  const combined = [
    ...(Array.isArray(appRes.data) ? appRes.data : []).map((a: any) => ({ kind: 'advocate', ...a })),
    ...(Array.isArray(svcRes.data) ? svcRes.data : []).map((s: any) => ({ kind: 'service-provider', ...s })),
  ];

  return combined.filter((m: any) => m.locationType === 'lone_hub' && ['confirmed', 'awaiting_location'].includes(m.status));
};

export default function LOneHubDashboardScreen() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: hub, isLoading } = useQuery({ queryKey: ['hub-profile'], queryFn: fetchHubProfile, retry: false });
  const { data: payouts } = useQuery({ queryKey: ['hub-payouts'], queryFn: fetchHubPayouts, retry: false });
  const { data: activeMeetings = [] } = useQuery({ queryKey: ['hub-active-meetings'], queryFn: fetchHubMeetings });

  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [citizenOtp, setCitizenOtp] = useState('');
  const [proOtp, setProOtp] = useState('');

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

  const checkInMutation = useMutation({
    mutationFn: async ({ meetingId, kind, payload }: { meetingId: string; kind: string; payload: any }) => {
      const endpoint = kind === 'advocate'
        ? `/appointments/${meetingId}/hub-verify-otps`
        : `/service-meetings/${meetingId}/hub-verify-otps`;
      const { data } = await apiClient.post(endpoint, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-profile'] });
      queryClient.invalidateQueries({ queryKey: ['hub-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['hub-active-meetings'] });
      setCheckInModalVisible(false);
      setSelectedMeeting(null);
      setCitizenOtp('');
      setProOtp('');
      showAlert('Check-In Verified', 'Two-party OTP verification confirmed! Meeting marked completed and payout credited.');
    },
    onError: (err: any) => {
      showAlert('Check-In Error', err.response?.data?.message || 'OTP verification failed. Please check both 6-digit codes.');
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
          <Text style={styles.subtitle}>Host citizen-advocate meetings and earn convenience payouts.</Text>
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

      {/* ==================== QUICK CHECK-IN ACTION CARD ==================== */}
      <TouchableOpacity
        style={styles.checkInCard}
        onPress={() => {
          setSelectedMeeting(activeMeetings[0] || null);
          setCitizenOtp('');
          setProOtp('');
          setCheckInModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.checkInIconWrap}>
          <Ionicons name="shield-checkmark" size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkInTitle}>Meeting Check-In (Verify OTPs)</Text>
          <Text style={styles.checkInSubtitle}>
            {activeMeetings.length > 0
              ? `${activeMeetings.length} meeting(s) awaiting check-in at your Hub`
              : 'Enter citizen + advocate codes when attendees arrive'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#0066CC" />
      </TouchableOpacity>

      {/* Payout Details & Earnings Ledger Card */}
      <View style={[styles.statsCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary }}>Payouts & Earnings Ledger</Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted }}>Earned from verified meetings hosted at your Hub</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPayoutDetails(!showPayoutDetails)} style={{ padding: 4 }}>
            <Ionicons name={showPayoutDetails ? 'chevron-up-circle' : 'chevron-down-circle'} size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {showPayoutDetails && (
          <View style={{ width: '100%', marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginBottom: 6 }}>
              Meeting Earnings Accrued ({payouts?.accrued?.length || 0})
            </Text>
            {(!payouts?.accrued || payouts.accrued.length === 0) ? (
              <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: 12 }}>No completed meetings yet.</Text>
            ) : (
              payouts.accrued.map((a: any) => (
                <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500' }}>{a.subject || 'Meeting hosted'}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.muted }}>{new Date(a.completedAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#137333' }}>+₹{a.amount?.toLocaleString('en-IN')}</Text>
                </View>
              ))
            )}

            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginTop: 14, marginBottom: 6 }}>
              Disbursements from LegalNow ({payouts?.paid?.length || 0})
            </Text>
            {(!payouts?.paid || payouts.paid.length === 0) ? (
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>No payouts disbursed yet.</Text>
            ) : (
              payouts.paid.map((p: any) => (
                <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500' }}>{p.method || 'Bank Transfer'}{p.reference ? ` (${p.reference})` : ''}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.muted }}>{new Date(p.paidAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>₹{p.amount?.toLocaleString('en-IN')}</Text>
                </View>
              ))
            )}
          </View>
        )}
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

      {/* Meetings and settings are already persistent tabs; keep only the non-navigation action here. */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#D93025" />
          <Text style={[styles.actionText, { color: '#D93025' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== HUB CHECK-IN MODAL ==================== */}
      <Modal
        visible={checkInModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={styles.modalHeading}>Verify Meeting OTPs</Text>
                <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
                  Two-party participation verification
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCheckInModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            {activeMeetings.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.text, marginBottom: 6 }}>
                  Select Scheduled Meeting:
                </Text>
                {activeMeetings.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.meetingSelectCard, selectedMeeting?.id === m.id && styles.meetingSelectCardActive]}
                    onPress={() => setSelectedMeeting(m)}
                  >
                    <Ionicons
                      name={selectedMeeting?.id === m.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedMeeting?.id === m.id ? theme.colors.primary : theme.colors.muted}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                        {m.citizenName || m.customerName || 'Citizen'} & {m.professionalName || m.serviceProviderName || 'Advocate/Provider'}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.muted }}>
                        {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.subject || m.title || 'Consultation'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 6, marginBottom: 4 }}>
              1. Citizen 6-Digit Code
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="e.g. 123456"
              placeholderTextColor="#9AA0A6"
              keyboardType="number-pad"
              maxLength={6}
              value={citizenOtp}
              onChangeText={setCitizenOtp}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 12, marginBottom: 4 }}>
              2. Advocate / Provider 6-Digit Code
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="e.g. 654321"
              placeholderTextColor="#9AA0A6"
              keyboardType="number-pad"
              maxLength={6}
              value={proOtp}
              onChangeText={setProOtp}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setCheckInModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Verify Both OTPs"
                onPress={() => {
                  if (!selectedMeeting) {
                    showAlert('Meeting Required', 'Please select an active meeting to verify.');
                    return;
                  }
                  if (citizenOtp.trim().length !== 6 || proOtp.trim().length !== 6) {
                    showAlert('Invalid Codes', 'Please enter complete 6-digit codes for both attendees.');
                    return;
                  }

                  const kind = selectedMeeting.kind || (selectedMeeting.serviceLeadId ? 'service-provider' : 'advocate');
                  const payload = kind === 'advocate'
                    ? { citizenOtp: citizenOtp.trim(), advocateOtp: proOtp.trim() }
                    : { citizenOtp: citizenOtp.trim(), serviceProviderOtp: proOtp.trim() };

                  checkInMutation.mutate({
                    meetingId: selectedMeeting.id,
                    kind,
                    payload,
                  });
                }}
                isLoading={checkInMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 36 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { fontSize: 12, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, paddingRight: 8 },
  errorBanner: { backgroundColor: '#FAD2CF', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBannerText: { color: '#D93025', fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0066CC', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  checkInCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F0FE', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#D2E3FC' },
  checkInIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkInTitle: { fontSize: 15, fontWeight: '700', color: '#1A73E8' },
  checkInSubtitle: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  actionsRow: { marginBottom: 20 },
  actionButton: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  signOutButton: { backgroundColor: '#FAD2CF' },
  actionText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 18 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 14, padding: 20 },
  modalHeading: { fontSize: 18, fontWeight: '700', color: '#202124' },
  meetingSelectCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DADCE0', marginBottom: 6 },
  meetingSelectCardActive: { borderColor: '#0066CC', backgroundColor: '#F0F7FF' },
  otpInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DADCE0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, letterSpacing: 3, textAlign: 'center', color: '#202124' },
});
