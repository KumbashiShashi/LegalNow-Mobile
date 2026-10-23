import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { HubPicker, SelectedHubLocation } from '../../../../components/shared/HubPicker';

export default function BookAppointmentScreen() {
  const params = useLocalSearchParams<{ id: string; professionalId?: string }>();
  const proId = params.id || params.professionalId || '';
  const queryClient = useQueryClient();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00');
  const [duration, setDuration] = useState('30');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [locationType, setLocationType] = useState<'advocate_office' | 'citizen' | 'lone_hub'>('advocate_office');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [selectedHub, setSelectedHub] = useState<SelectedHubLocation | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');

  const { data: advocate, isLoading: loadingAdvocate } = useQuery({
    queryKey: ['advocate', proId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/marketplace/professionals/${proId}`);
      return data;
    },
    enabled: !!proId,
  });

  const { data: fees } = useQuery({
    queryKey: ['fees-config'],
    queryFn: async () => {
      const { data } = await apiClient.get('/fees/config');
      return data;
    },
  });

  const { data: sub } = useQuery({
    queryKey: ['citizen-subscription'],
    queryFn: async () => {
      const { data } = await apiClient.get('/fees/citizen-subscription');
      return data;
    },
  });

  const { data: problems = [] } = useQuery({
    queryKey: ['my-problems'],
    queryFn: async () => {
      const { data } = await apiClient.get('/problems/mine');
      return Array.isArray(data) ? data : [];
    },
  });

  const isSubscribed = Boolean(sub?.active);
  const bookingFee = isSubscribed ? 0 : fees?.advocateBookingFee || 500;
  const hubFee = locationType === 'lone_hub' ? fees?.citizenHubFee || 200 : 0;
  const totalDue = bookingFee + hubFee;

  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/appointments', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (data.payNow > 0) {
        Alert.alert(
          'Appointment Requested',
          `Your request has been submitted. A booking fee of ₹${data.payNow} applies. You can complete payment directly from Appointments.`,
          [{ text: 'View Appointments', onPress: () => router.replace('/(roles)/(citizen)/appointments') }]
        );
      } else {
        Alert.alert(
          'Request Submitted',
          'Your appointment request has been sent to the advocate for review.',
          [{ text: 'View Appointments', onPress: () => router.replace('/(roles)/(citizen)/appointments') }]
        );
      }
    },
    onError: (err: any) => {
      Alert.alert('Booking Error', err.response?.data?.message || 'The appointment could not be requested.');
    },
  });

  const handleBookSubmit = () => {
    if (!date.trim()) {
      Alert.alert('Validation Error', 'Please enter a meeting date (e.g. 2026-11-15).');
      return;
    }
    if (!subject.trim() && !selectedProblemId) {
      Alert.alert('Validation Error', 'Please describe the consultation topic or link an existing case.');
      return;
    }
    if (locationType === 'citizen' && !citizenAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter the street address where you would like to meet.');
      return;
    }
    if (locationType === 'lone_hub' && !selectedHub) {
      Alert.alert('Validation Error', 'Please search and select a LegalNow Hub.');
      return;
    }

    const startDateTime = new Date(`${date.trim()}T${time.trim()}:00`);

    bookMutation.mutate({
      professionalId: proId,
      problemId: selectedProblemId || undefined,
      startTime: isNaN(startDateTime.getTime()) ? new Date().toISOString() : startDateTime.toISOString(),
      durationMinutes: Number(duration),
      subject: subject.trim() || 'Legal Consultation',
      notes: notes.trim(),
      location: {
        type: locationType,
        hubId: locationType === 'lone_hub' ? selectedHub?.hubId : undefined,
        lat: locationType === 'lone_hub' ? selectedHub?.lat : undefined,
        lng: locationType === 'lone_hub' ? selectedHub?.lng : undefined,
        address: locationType === 'citizen' ? citizenAddress.trim() : undefined,
      },
    });
  };

  if (loadingAdvocate) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Request Appointment', headerShown: true }} />

      {/* Advocate Brief Banner */}
      <Card style={styles.proCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{(advocate?.name || 'A').charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.proName}>{advocate?.name || 'Advocate'}</Text>
          <Text style={styles.proMeta}>
            {(advocate?.categories || []).join(', ')} • {advocate?.location || 'India'}
          </Text>
          <Badge status="verified" label="Verified Advocate" />
        </View>
      </Card>

      <Text style={styles.sectionHeading}>Consultation Details</Text>

      <Card style={styles.formCard}>
        {/* Link Existing Problem */}
        {problems.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>Link to My Legal Case (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.chip, !selectedProblemId && styles.chipActive]}
                onPress={() => setSelectedProblemId('')}
              >
                <Text style={[styles.chipText, !selectedProblemId && styles.chipTextActive]}>New Consultation</Text>
              </TouchableOpacity>
              {problems.map((prob: any) => {
                const active = selectedProblemId === prob.id;
                return (
                  <TouchableOpacity
                    key={prob.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setSelectedProblemId(prob.id);
                      if (!subject) setSubject(prob.title);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {prob.title || 'Untitled Case'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Text style={styles.inputLabel}>Consultation Subject *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Property documentation & dispute advice"
          placeholderTextColor={theme.colors.muted}
          value={subject}
          onChangeText={setSubject}
        />

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-11-15"
              placeholderTextColor={theme.colors.muted}
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.inputLabel}>Time (HH:mm) *</Text>
            <TextInput
              style={styles.input}
              placeholder="11:00"
              placeholderTextColor={theme.colors.muted}
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        {/* Duration Options */}
        <Text style={styles.inputLabel}>Duration</Text>
        <View style={styles.durationRow}>
          {['30', '45', '60'].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.durationChip, duration === mins && styles.durationChipActive]}
              onPress={() => setDuration(mins)}
            >
              <Text style={[styles.durationText, duration === mins && styles.durationTextActive]}>
                {mins} mins
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meeting Place Selector */}
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Where would you like to meet?</Text>
        <View style={styles.venueContainer}>
          <TouchableOpacity
            style={[styles.venueOption, locationType === 'advocate_office' && styles.venueOptionActive]}
            onPress={() => setLocationType('advocate_office')}
          >
            <Ionicons
              name={locationType === 'advocate_office' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={locationType === 'advocate_office' ? theme.colors.primary : theme.colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.venueTitle}>{"Advocate's Office (Chamber)"}</Text>
              <Text style={styles.venueDesc}>
                {advocate?.officeAddress || 'Registered chamber address'} • No Hub fee
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.venueOption, locationType === 'citizen' && styles.venueOptionActive]}
            onPress={() => setLocationType('citizen')}
          >
            <Ionicons
              name={locationType === 'citizen' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={locationType === 'citizen' ? theme.colors.primary : theme.colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.venueTitle}>A Place I Suggest</Text>
              <Text style={styles.venueDesc}>Provide an address; the advocate can agree or propose another</Text>
            </View>
          </TouchableOpacity>

          {locationType === 'citizen' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Enter meeting address (e.g. Indiranagar, Bengaluru)"
              placeholderTextColor={theme.colors.muted}
              value={citizenAddress}
              onChangeText={setCitizenAddress}
            />
          )}

          <TouchableOpacity
            style={[styles.venueOption, locationType === 'lone_hub' && styles.venueOptionActive]}
            onPress={() => setLocationType('lone_hub')}
          >
            <Ionicons
              name={locationType === 'lone_hub' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={locationType === 'lone_hub' ? theme.colors.primary : theme.colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.venueTitle}>LegalNow Hub Near Me</Text>
              <Text style={styles.venueDesc}>
                Verified neighbourhood stationery / cyber shop with internet & meeting space
              </Text>
            </View>
          </TouchableOpacity>

          {locationType === 'lone_hub' && (
            <HubPicker
              when={`${date || '2026-11-15'}T${time || '11:00'}:00Z`}
              durationMinutes={Number(duration)}
              selectedId={selectedHub?.hubId}
              onSelect={setSelectedHub}
            />
          )}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Notes for the Advocate (Optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          placeholder="Briefly state key questions or documents you are bringing..."
          placeholderTextColor={theme.colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Fee Calculation Summary */}
        <View style={styles.feeSummaryBox}>
          <Text style={styles.feeHeading}>Fee Summary</Text>
          <View style={styles.feeLine}>
            <Text style={styles.feeLabel}>Booking convenience fee</Text>
            <Text style={styles.feeAmount}>
              {isSubscribed ? `✓ ₹0 (Subscribed)` : `₹${bookingFee}`}
            </Text>
          </View>
          {locationType === 'lone_hub' && (
            <View style={styles.feeLine}>
              <Text style={styles.feeLabel}>LegalNow Hub convenience fee</Text>
              <Text style={styles.feeAmount}>₹{hubFee}</Text>
            </View>
          )}
          <View style={styles.feeDivider} />
          <View style={styles.feeLine}>
            <Text style={styles.totalLabel}>Pay Now</Text>
            <Text style={styles.totalAmount}>₹{totalDue}</Text>
          </View>
          <Text style={styles.feeNote}>
            {locationType === 'lone_hub'
              ? 'If the advocate rejects, your LegalNow Hub convenience fee is refunded automatically.'
              : 'Consultation fees are agreed directly with the advocate.'}
          </Text>
        </View>

        <Button
          title={
            bookMutation.isPending
              ? 'Submitting...'
              : totalDue > 0
              ? `Pay ₹${totalDue} & Send Request`
              : 'Send Appointment Request'
          }
          onPress={handleBookSubmit}
          isLoading={bookMutation.isPending}
          style={{ marginTop: 16 }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  proCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 16 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  proName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  proMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2, marginBottom: 4 },
  sectionHeading: { ...theme.typography.h2, fontSize: 16, marginBottom: 10 },
  formCard: { padding: 16 },
  inputLabel: { ...theme.typography.small, fontWeight: '600', marginBottom: 4, color: theme.colors.text },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: { fontSize: 12, color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  durationChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  durationTextActive: { color: '#FFF' },
  venueContainer: { gap: 8, marginTop: 4 },
  venueOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  venueOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F8FCF9',
  },
  venueTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  venueDesc: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  feeSummaryBox: {
    backgroundColor: '#F0F9F8',
    padding: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#D0EAE6',
    marginTop: 14,
  },
  feeHeading: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, marginBottom: 8 },
  feeLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feeLabel: { fontSize: 12, color: theme.colors.secondary },
  feeAmount: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  feeDivider: { height: 1, backgroundColor: '#D0EAE6', marginVertical: 6 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  feeNote: { fontSize: 11, color: theme.colors.muted, marginTop: 6, lineHeight: 15 },
});

