import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
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
import { HubPicker, SelectedHubLocation } from './HubPicker';

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

const REJECT_REASONS = [
  'Schedule conflict',
  'Outside area of practice',
  'Not taking new clients currently',
  'Jurisdiction not covered',
];

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
  const [proposalHub, setProposalHub] = useState<SelectedHubLocation | null>(null);
  const [followupForm, setFollowupForm] = useState({ when: '', reason: '' });
  const [rejectReason, setRejectReason] = useState('Schedule conflict');
  const [cancelReason, setCancelReason] = useState('');

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['appointments', role],
    queryFn: () => fetchAppointments(role),
    refetchInterval: 15000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, kind = 'advocate', endpoint, payload }: { id: string, kind?: string, endpoint: string, payload: any }) => {
      let url = '';
      let body = payload;
      if (kind === 'service-provider') {
        if (endpoint === 'accept') {
          url = `/service-meetings/${id}/respond`;
          body = { response: 'accepted' };
        } else if (endpoint === 'reject') {
          url = `/service-meetings/${id}/respond`;
          body = { response: 'rejected', reason: payload?.reason };
        } else if (endpoint === 'reschedule') {
          url = `/service-meetings/${id}/reschedule`;
          body = { newStartTime: payload.startTime };
        } else if (endpoint === 'complete') {
          url = `/service-meetings/${id}/complete`;
        } else if (endpoint === 'cancel') {
          url = `/service-meetings/${id}/cancel`;
          body = { reason: payload?.reason };
        } else {
          url = `/service-meetings/${id}/${endpoint}`;
        }
      } else {
        url = endpoint === '__followup' ? '/appointments/follow-up' : `/appointments/${id}/${endpoint}`;
      }
      const { data } = await apiClient.post(url, body);
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

  const payFeeMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: string }) => {
      const { data: order } = await apiClient.post(kind === 'service-provider' ? `/service-meetings/${id}/pay` : `/appointments/${id}/pay`);
      return order;
    },
    onSuccess: async (order) => {
      // In DEV environment or simulated payments, complete verification immediately
      const isSimulated = order.razorpayOrderId?.startsWith('order_sim_') || !order.razorpayKeyId;
      if (isSimulated) {
        try {
          await apiClient.post('/fees/verify', {
            razorpayOrderId: order.razorpayOrderId,
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpaySignature: 'simulated_signature',
            paymentMethod: 'direct',
          });
          queryClient.invalidateQueries({ queryKey: ['appointments', role] });
          showAlert('Payment Complete', `Payment of ₹${order.amount?.toLocaleString('en-IN')} verified successfully! Meeting confirmed.`);
        } catch (err: any) {
          showAlert('Error', err?.response?.data?.message || 'Payment verification failed.');
        }
      } else {
        Alert.alert(
          'Complete Payment',
          `Payment Order ID: ${order.razorpayOrderId}\nAmount Due: ₹${order.amount?.toLocaleString('en-IN')}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'DEV Test Confirm',
              onPress: async () => {
                try {
                  await apiClient.post('/fees/verify', {
                    razorpayOrderId: order.razorpayOrderId,
                    razorpayPaymentId: `pay_test_${Date.now()}`,
                    razorpaySignature: 'test_signature',
                    paymentMethod: 'razorpay',
                  });
                  queryClient.invalidateQueries({ queryKey: ['appointments', role] });
                  showAlert('Payment Received', 'Appointment payment verified and confirmed!');
                } catch (err: any) {
                  showAlert('Error', err?.response?.data?.message || 'Payment could not be verified.');
                }
              }
            }
          ]
        );
      }
    },
    onError: (err: any) => {
      showAlert('Payment Error', err?.response?.data?.message || 'Could not initiate payment order.');
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
    mutationFn: async ({ id, kind }: { id: string; kind: string }) => {
      const { data } = await apiClient.post(kind === 'service-provider' ? `/service-meetings/${id}/hub-otps/resend` : `/appointments/${id}/hub-otps/resend`);
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
              payload: { citizenOtp: otpForm.citizenOtp, [kind === 'advocate' ? 'advocateOtp' : 'serviceProviderOtp']: otpForm.professionalOtp }
            })}
            isLoading={hubVerifyMutation.isPending}
            disabled={!otpForm.citizenOtp || !otpForm.professionalOtp}
          />
        </View>
      );
    }

    if (panelOpenFor === `${data.id}-reject`) {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Decline Appointment Request</Text>
          <Text style={styles.panelDesc}>Select or enter a reason for declining this request so the other party is informed.</Text>
          <View style={styles.chipsRow}>
            {REJECT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, rejectReason === r && styles.chipActive]}
                onPress={() => setRejectReason(r)}
              >
                <Text style={[styles.chipText, rejectReason === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Or type custom reason..."
            value={rejectReason}
            onChangeText={setRejectReason}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              style={{ flex: 1 }}
              title="Confirm Decline"
              variant="danger"
              onPress={() => actionMutation.mutate({
                id: data.id,
                kind,
                endpoint: 'reject',
                payload: { reason: rejectReason.trim() || 'Schedule conflict' }
              })}
              isLoading={actionMutation.isPending}
            />
            <Button
              style={{ flex: 1 }}
              title="Cancel"
              variant="secondary"
              onPress={() => setPanelOpenFor(null)}
            />
          </View>
        </View>
      );
    }

    if (panelOpenFor === `${data.id}-cancel`) {
      return (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Cancel Appointment</Text>
          <Text style={styles.panelDesc}>Are you sure you want to cancel this appointment? This action cannot be undone.</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              style={{ flex: 1 }}
              title="Confirm Cancellation"
              variant="danger"
              onPress={() => actionMutation.mutate({
                id: data.id,
                kind,
                endpoint: 'cancel',
                payload: { reason: cancelReason.trim() || 'Cancelled by user' }
              })}
              isLoading={actionMutation.isPending}
            />
            <Button
              style={{ flex: 1 }}
              title="Keep Appointment"
              variant="secondary"
              onPress={() => setPanelOpenFor(null)}
            />
          </View>
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
              kind,
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
          <Text style={styles.panelDesc}>Enter the new proposed time for the meeting. The other party will review it.</Text>
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
              kind,
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
            <TouchableOpacity style={styles.radioRow} onPress={() => setProposalPlace('lone_hub')}>
              <Ionicons name={proposalPlace === 'lone_hub' ? 'radio-button-on' : 'radio-button-off'} size={20} color={theme.colors.primary} />
              <Text style={styles.radioLabel}>LegalNow Hub near us</Text>
            </TouchableOpacity>
            {proposalPlace === 'lone_hub' && (
              <HubPicker
                when={data.startTime}
                durationMinutes={data.durationMinutes}
                appointmentId={data.id}
                selectedId={proposalHub?.hubId}
                onSelect={setProposalHub}
              />
            )}
          </View>
          <Button
            title="Send proposal"
            onPress={() => actionMutation.mutate({
              id: data.id,
              kind,
              endpoint: data.canRespond ? 'accept' : 'location',
              payload: {
                location: {
                  type: proposalPlace,
                  address: proposalPlace === 'citizen' ? proposalAddress : undefined,
                  hubId: proposalPlace === 'lone_hub' ? proposalHub?.hubId : undefined,
                  lat: proposalPlace === 'lone_hub' ? proposalHub?.lat : undefined,
                  lng: proposalPlace === 'lone_hub' ? proposalHub?.lng : undefined,
                }
              }
            })}
            isLoading={actionMutation.isPending}
            disabled={(proposalPlace === 'citizen' && !proposalAddress.trim()) || (proposalPlace === 'lone_hub' && !proposalHub)}
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
    const isOpen = ['pending_payment', 'requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(data.status);

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
            <TouchableOpacity onPress={() => resendOtpMutation.mutate({ id: data.id, kind })} style={{ marginTop: 4 }}>
              <Text style={styles.resendOtpLink}>Resend OTP via SMS/Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {data.myFeeDue > 0 && (
            <Button
              style={{ marginTop: 8 }}
              title={`Pay ₹${data.myFeeDue}`}
              onPress={() => payFeeMutation.mutate({ id: data.id, kind })}
              isLoading={payFeeMutation.isPending}
            />
          )}

          {data.canRespond && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{ flex: 1 }} title="Accept" onPress={() => actionMutation.mutate({ id: data.id, kind, endpoint: 'accept', payload: {} })} isLoading={actionMutation.isPending} />
              {kind === 'advocate' && <Button style={{ flex: 1 }} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />}
              <Button style={{ flex: 1 }} title="Decline" variant="danger" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-reject` ? null : `${data.id}-reject`)} />
            </View>
          )}

          {data.status === 'awaiting_location' && isOwner && data.locationProposedBy !== role && (data.locationType !== 'lone_hub' || data.hubId) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{ flex: 1 }} title="Agree to place" onPress={() => actionMutation.mutate({ id: data.id, kind, endpoint: 'location/agree', payload: {} })} isLoading={actionMutation.isPending} />
              <Button style={{ flex: 1 }} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />
            </View>
          )}

          {['requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(data.status) && isOwner && !data.canRespond && data.status !== 'awaiting_location' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button style={{ flex: 1 }} title="Change Place" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-place` ? null : `${data.id}-place`)} />
              <Button style={{ flex: 1 }} title="Reschedule" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-reschedule` ? null : `${data.id}-reschedule`)} />
            </View>
          )}

          {isAdvocate && ['confirmed', 'completed'].includes(data.status) && (
            <Button style={{ marginTop: 8 }} title="Book a Follow-up" variant="secondary" onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-followup` ? null : `${data.id}-followup`)} />
          )}

          {(isAdvocate || role === 'service_provider') && data.status === 'confirmed' && data.locationType !== 'lone_hub' && (
            <Button style={{ marginTop: 8 }} title="Mark Meeting Held" onPress={() => actionMutation.mutate({ id: data.id, kind, endpoint: 'complete', payload: {} })} isLoading={actionMutation.isPending} />
          )}

          {kind === 'advocate' && isOwner && data.status !== 'pending_payment' && ['requested', 'awaiting_location', 'awaiting_fees', 'confirmed'].includes(data.status) && data.locationType === 'lone_hub' && data.hubId && (
            <Button style={{ marginTop: 8 }} title="Hub Closed / Unavailable" variant="danger" onPress={() => actionMutation.mutate({ id: data.id, kind, endpoint: 'hub-unavailable', payload: {} })} isLoading={actionMutation.isPending} />
          )}

          {/* Cancellation by Participant */}
          {isOpen && isOwner && (
            <Button
              style={{ marginTop: 8 }}
              title={panelOpenFor === `${data.id}-cancel` ? "Close Cancel" : "Cancel Appointment"}
              variant="danger"
              onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-cancel` ? null : `${data.id}-cancel`)}
            />
          )}

          {/* Hub Owner Verify OTP Action */}
          {role === 'hub' && data.locationType === 'lone_hub' && data.status === 'confirmed' && (
            <Button
              style={{ marginTop: 8 }}
              title={panelOpenFor === `${data.id}-hub` ? "Close OTP Verification" : "Verify Attendance OTPs"}
              variant="secondary"
              onPress={() => setPanelOpenFor(panelOpenFor === `${data.id}-hub` ? null : `${data.id}-hub`)}
            />
          )}

          {/* Case Navigation */}
          {data.problemId && role !== 'hub' && (
            <Button style={{ marginTop: 8 }} title="Case & Chat" variant="ghost" onPress={() => router.push(`/case/${data.problemId}`)} />
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
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={theme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter appointments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Appointment Cards List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => `${item.kind}-${item.data.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No appointments found</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'completed'
                  ? 'You do not have any completed meetings in your archive.'
                  : 'You have no scheduled appointments at this moment.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  tabsContainer: { flexDirection: 'row', padding: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  tabActive: { backgroundColor: theme.colors.primaryLight },
  tabText: { fontSize: 13, color: theme.colors.muted, fontWeight: '500' },
  tabTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, margin: 12, marginBottom: 4, paddingHorizontal: 12, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 13 },
  listContent: { padding: 12, paddingBottom: 40 },
  card: { padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1, marginRight: 8 },
  cardSubtitle: { fontSize: 13, color: theme.colors.muted, marginBottom: 8, fontWeight: '500' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { fontSize: 12, color: theme.colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: theme.colors.primaryLight, padding: 6, borderRadius: 4, alignSelf: 'flex-start' },
  phoneText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  otpBox: { backgroundColor: '#E6F4EA', padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  otpLabel: { fontSize: 11, color: '#137333', fontWeight: 'bold' },
  otpValue: { fontSize: 20, fontWeight: 'bold', color: '#137333', letterSpacing: 3, marginVertical: 2 },
  resendOtpLink: { fontSize: 11, color: theme.colors.primary, textDecorationLine: 'underline' },
  actionsContainer: { marginTop: 6 },
  actionPanel: { backgroundColor: theme.colors.background, padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: theme.colors.border },
  panelTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  panelDesc: { fontSize: 11, color: theme.colors.muted, marginBottom: 10, lineHeight: 15 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, padding: 8, fontSize: 13, marginBottom: 8 },
  radioGroup: { marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  radioLabel: { fontSize: 13, color: theme.colors.text },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 12 },
  emptyText: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
