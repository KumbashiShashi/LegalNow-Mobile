import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Button } from '../Button';
import { theme } from '../../styles/theme';
import { router } from 'expo-router';
import { showAlert } from '../../utils/alert';

const fetchAppointments = async (role: string | null) => {
  const loadServiceMeetings = ['citizen', 'business', 'hub', 'service_provider'].includes(role || '');

  const [appRes, svcRes] = await Promise.all([
    apiClient.get('/appointments').catch(() => ({ data: [] })),
    loadServiceMeetings ? apiClient.get('/service-meetings/mine').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
  ]);

  const combined = [
    ...(Array.isArray(appRes.data) ? appRes.data : []).map((a: any) => ({ kind: 'advocate', data: a })),
    ...(Array.isArray(svcRes.data) ? svcRes.data : []).map((s: any) => ({ kind: 'service-provider', data: s }))
  ];

  return combined.sort((a, b) => new Date(b.data.startTime).getTime() - new Date(a.data.startTime).getTime());
};

const PLACE_LABELS: Record<string, string> = {
  advocate_office: "Advocate's office",
  citizen: "Citizen's place",
  lone_hub: 'LegalNow Hub'
};

export function AppointmentsList() {
  const { role } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [panelOpenFor, setPanelOpenFor] = useState<string | null>(null);

  // Panel state forms
  const [otpForm, setOtpForm] = useState({ citizenOtp: '', professionalOtp: '' });
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [proposalPlace, setProposalPlace] = useState('advocate_office');
  const [proposalAddress, setProposalAddress] = useState('');
  const [followupForm, setFollowupForm] = useState({ when: '', reason: '' });

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['appointments', role],
    queryFn: () => fetchAppointments(role),
    refetchInterval: 15000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, endpoint, payload }: { id: string, endpoint: string, payload: any }) => {
      const url = endpoint === '__followup' ? '/appointments/follow-up' : `/appointments/${id}/${endpoint}`;
      const { data } = await apiClient.post(url, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', role] });
      setPanelOpenFor(null);
      showAlert('Success', 'Action completed successfully');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'That did not work.');
    }
  });

  const hubVerifyMutation = useMutation({
    mutationFn: async ({ id, kind, payload }: { id: string, kind: string, payload: any }) => {
      const endpoint = kind === 'advocate' ? `/appointments/${id}/hub-verify-otps` : `/service-meetings/${id}/hub-verify-otps`;
      const { data } = await apiClient.post(endpoint, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', role] });
      setPanelOpenFor(null);
      showAlert('Success', 'Participation verified! Meeting marked completed.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Verification failed.');
    }
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/appointments/${id}/hub-otps/resend`);
      return data;
    },
    onSuccess: () => {
      showAlert('Sent', 'Meeting participation code resent to your phone/email.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not resend OTP.');
    }
  });

  const filteredRows = allRows.filter((row: any) => {
    if (activeTab === 'completed' && row.data.status !== 'completed') return false;
    if (activeTab === 'pending' && row.data.status === 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchStr = `${row.data.subject} ${row.data.advocateName} ${row.data.providerName} ${row.data.status}`.toLowerCase();
      if (!searchStr.includes(q)) return false;
    }
    return true;
  });

  const renderActionPanel = (item: any) => {
    const { data, kind } = item;
    if (!panelOpenFor?.startsWith(data.id)) return null;

    if (role === 'hub' && data.status === 'confirmed' && data.locationType === 'lone_hub') {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Verify Meeting Participation at LOne Hub</Text>
          <Text style={styles.panelDesc}>Both parties must provide their 6-digit OTPs to confirm meeting participation. Charges are levied once both codes are verified.</Text>
          <TextInput
            style={styles.input}
            placeholder="Citizen OTP"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(v) => setOtpForm(f => ({ ...f, citizenOtp: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder={kind === 'advocate' ? "Advocate OTP" : "Provider OTP"}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(v) => setOtpForm(f => ({ ...f, professionalOtp: v }))}
          />
          <Button
            title="Verify OTPs & Confirm Meeting"
            onPress={() => hubVerifyMutation.mutate({
              id: data.id,
              kind,
              payload: { citizenOtp: otpForm.citizenOtp, [kind === 'advocate' ? 'advocateOtp' : 'providerOtp']: otpForm.professionalOtp }
            })}
            isLoading={hubVerifyMutation.isPending}
            disabled={!otpForm.citizenOtp || !otpForm.professionalOtp}
          />
        </View>
      );
    }

    if (panelOpenFor === `${data.id}-followup`) {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Book a Follow-up Meeting</Text>
          <Text style={styles.panelDesc}>No booking fee for the citizen when you book from your side. They accept or reject.</Text>
          <TextInput style={styles.input} placeholder="Reason (e.g. Next hearing preparation)" value={followupForm.reason} onChangeText={r => setFollowupForm(f => ({ ...f, reason: r }))} />
          <TextInput style={styles.input} placeholder="New Date & Time (YYYY-MM-DD HH:mm)" value={followupForm.when} onChangeText={w => setFollowupForm(f => ({ ...f, when: w }))} />
          <Button
            title="Send Follow-up Proposal"
            onPress={() => actionMutation.mutate({
              id: data.id,
              endpoint: '__followup',
              payload: { fromAppointmentId: data.id, startTime: new Date(followupForm.when).toISOString(), durationMinutes: 30, subject: followupForm.reason, location: { type: 'advocate_office' } }
            })}
            isLoading={actionMutation.isPending}
            disabled={!followupForm.when || !followupForm.reason.trim()}
          />
        </View>
      );
    }

    if (panelOpenFor === `${data.id}-reschedule`) {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Reschedule Appointment</Text>
          <Text style={styles.panelDesc}>Enter the new proposed time for the meeting. The citizen will need to review it.</Text>
          <TextInput
            style={styles.input}
            placeholder="New Time (YYYY-MM-DD HH:mm)"
            value={rescheduleTime}
            onChangeText={setRescheduleTime}
          />
          <Button
            title="Save new time"
            onPress={() => actionMutation.mutate({
              id: data.id,
              endpoint: 'reschedule',
              payload: { startTime: new Date(rescheduleTime).toISOString() }
            })}
            isLoading={actionMutation.isPending}
            disabled={!rescheduleTime}
          />
        </View>
      );
    }

    if (panelOpenFor === `${data.id}-place`) {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>{data.canRespond ? 'Accept, but meet somewhere else' : 'Propose a meeting place'}</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioRow} onPress={() => setProposalPlace('advocate_office')}>
              <Ionicons name={proposalPlace === 'advocate_office' ? 'radio-button-on' : 'radio-button-off'} size={20} color={theme.colors.primary} />
              <Text style={styles.radioLabel}>{"Advocate's office (free)"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioRow} onPress={() => setProposalPlace('citizen')}>
              <Ionicons name={proposalPlace === 'citizen' ? 'radio-button-on' : 'radio-button-off'} size={20} color={theme.colors.primary} />
              <Text style={styles.radioLabel}>Another address</Text>
            </TouchableOpacity>
            {proposalPlace === 'citizen' && (
              <TextInput style={styles.input} placeholder="Meeting address" value={proposalAddress} onChangeText={setProposalAddress} />
            )}
          </View>
          <Button
            title="Send proposal"
            onPress={() => actionMutation.mutate({
              id: data.id,
              endpoint: data.canRespond ? 'accept' : 'location',
              payload: { location: { type: proposalPlace, address: proposalPlace === 'citizen' ? proposalAddress : undefined } }
            })}
            isLoading={actionMutation.isPending}
            disabled={proposalPlace === 'citizen' && !proposalAddress.trim()}
          />
        </View>
      );
    }

    return null;
  };

  const renderItem = ({ item }: { item: any }) => {
    const { data, kind } = item;
    const isOwner = role === 'citizen' || role === 'business' || role === 'professional';
    const isAdvocate = role === 'professional';
    const otherParty = role === 'citizen' ? data.advocateName : data.citizenName;
    const phoneNum = role === 'professional' ? data.citizenPhone : data.advocatePhone;
    const place = PLACE_LABELS[data.locationType] || 'Service provider office';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{data.subject || data.serviceName || 'Appointment'}</Text>
          <Badge status={data.status} />
        </View>

        <Text style={styles.cardSubtitle}>
          {kind === 'advocate' ? (role === 'hub' ? `${data.citizenName} with ${data.advocateName}` : `With ${otherParty}`) : `${data.serviceCategory} • With ${data.otherPartyName}`}
        </Text>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
          <Text style={styles.detailText}>
            {new Date(data.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {data.durationMinutes} min
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
          <Text style={styles.detailText}>
            {place} {data.locationAddress ? `- ${data.locationAddress}` : ''}
          </Text>
        </View>

        {phoneNum && (
          <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${phoneNum}`)}>
            <Ionicons name="call-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.phoneText}>Call Contact: {phoneNum}</Text>
          </TouchableOpacity>
        )}

        {/* OTP display for Citizen/Advocate/Provider */}
        {data.myHubMeetingOtp && (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>Hub Participation Code</Text>
            <Text style={styles.otpValue}>{data.myHubMeetingOtp}</Text>
            <TouchableOpacity onPress={() => resendOtpMutation.mutate(data.id)} style={{ marginTop: 4 }}>
              <Text style={styles.resendOtpLink}>Resend OTP via SMS/Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {data.myFeeDue > 0 && (
            <Button style={{marginTop: 8}} title={`Pay ₹${data.myFeeDue}`} onPress={() => showAlert('Payment', 'Payment Gateway Integration Pending')} />
          )}

          {data.canRespond && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{flex: 1}} title="Accept" onPress={() => actionMutation.mutate({ id: data.id, endpoint: 'accept', payload: {} })} isLoading={actionMutation.isPending} />
              <Button style={{flex: 1}} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />
              <Button style={{flex: 1}} title="Reject" variant="danger" onPress={() => actionMutation.mutate({ id: data.id, endpoint: 'reject', payload: { reason: 'Rejected via mobile app' } })} isLoading={actionMutation.isPending} />
            </View>
          )}

          {data.status === 'awaiting_location' && isOwner && data.locationProposedBy !== role && (data.locationType !== 'lone_hub' || data.hubId) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{flex: 1}} title="Agree to place" onPress={() => actionMutation.mutate({ id: data.id, endpoint: 'location/agree', payload: {} })} isLoading={actionMutation.isPending} />
              <Button style={{flex: 1}} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />
            </View>
          )}

          {['requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(data.status) && isOwner && !data.canRespond && data.status !== 'awaiting_location' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{flex: 1}} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />
              <Button style={{flex: 1}} title="Reschedule" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-reschedule` ? null : `${data.id}-reschedule`)} />
            </View>
          )}

          {isAdvocate && ['confirmed', 'completed'].includes(data.status) && (
            <Button style={{marginTop: 8}} title="Book a Follow-up" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-followup` ? null : `${data.id}-followup`)} />
          )}

          {isAdvocate && data.status === 'confirmed' && data.locationType !== 'lone_hub' && (
            <Button style={{marginTop: 8}} title="Mark Meeting Held" onPress={() => actionMutation.mutate({ id: data.id, endpoint: 'complete', payload: {} })} isLoading={actionMutation.isPending} />
          )}

          {isOwner && ['pending_payment', 'requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(data.status) && data.locationType === 'lone_hub' && data.hubId && (
            <Button style={{marginTop: 8}} title="Hub Closed / Unavailable" variant="danger" onPress={() => actionMutation.mutate({ id: data.id, endpoint: 'hub-unavailable', payload: {} })} isLoading={actionMutation.isPending} />
          )}

          {/* Hub Owner Verify OTP Action */}
          {role === 'hub' && data.locationType === 'lone_hub' && data.status === 'confirmed' && (
            <Button
              style={{marginTop: 8}}
              title={panelOpenFor === `${data.id}-hub` ? "Close OTP Verification" : "Verify Attendance OTPs"}
              variant="secondary"
              onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-hub` ? null : `${data.id}-hub`)}
            />
          )}

          {/* Case Navigation */}
          {data.problemId && role !== 'hub' && (
            <Button style={{marginTop: 8}} title="Case & Chat" variant="ghost" onPress={() => router.push(`/case/${data.problemId}`)} />
          )}
        </View>

        {/* Action Panel expansion */}
        {renderActionPanel(item)}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.tabsContainer}>
        {(['pending', 'completed', 'all'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, service, or status..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item, index) => `${item.kind}-${item.data.id}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  tabsContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: theme.colors.muted },
  tabTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, height: '100%' },
  listContent: { padding: theme.spacing.md, paddingTop: 8 },
  card: { padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { ...theme.typography.h3, flex: 1, marginRight: 8 },
  cardSubtitle: { ...theme.typography.body, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: 13, color: theme.colors.muted, marginLeft: 6, fontWeight: '500' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  phoneText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginLeft: 6 },
  otpBox: { marginTop: 12, padding: 12, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: '#BAE6FD' },
  otpLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  otpValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.secondary, letterSpacing: 4, marginTop: 4 },
  resendOtpLink: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 },
  actionsContainer: { marginTop: 12 },
  actionPanel: { marginTop: 16, padding: 16, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  panelTitle: { ...theme.typography.h3, marginBottom: 4 },
  panelDesc: { ...theme.typography.small, marginBottom: 12 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.sm, padding: 12, marginBottom: 8 },
  radioGroup: { marginBottom: 12 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingVertical: 4 },
  radioLabel: { ...theme.typography.body },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: theme.colors.muted },
});
