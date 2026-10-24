import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { HubPicker } from '../../../../components/shared/HubPicker';
import { mediaUrl } from '../../../../utils/media';

const fetchAdvocateProfile = async (id: string) => {
  const { data } = await apiClient.get(`/marketplace/professionals/${id}`);
  return data;
};

const fetchMyProblems = async () => {
  const { data } = await apiClient.get('/problems/mine');
  return Array.isArray(data) ? data : [];
};

export default function AdvocateProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [bookingPanelOpen, setBookingPanelOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [duration] = useState('30');
  const [locationType, setLocationType] = useState<'advocate_office' | 'citizen' | 'lone_hub'>('advocate_office');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['advocate', id],
    queryFn: () => fetchAdvocateProfile(id),
  });

  const { data: problems = [] } = useQuery({
    queryKey: ['my-problems'],
    queryFn: fetchMyProblems,
    enabled: bookingPanelOpen,
  });

  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/appointments', payload);
      return data;
    },
    onSuccess: (data) => {
      setBookingPanelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      if (data.payNow > 0) {
        Alert.alert(
          'Appointment Requested',
          `Your appointment request has been submitted. A booking fee of ₹${data.payNow} applies. You can complete payment from your Appointments tab.`,
          [{ text: 'View Appointments', onPress: () => router.push('/(roles)/(citizen)/appointments') }]
        );
      } else {
        Alert.alert(
          'Request Submitted',
          'Your appointment request has been sent to the advocate for review and confirmation.',
          [{ text: 'View Appointments', onPress: () => router.push('/(roles)/(citizen)/appointments') }]
        );
      }
    },
    onError: (err: any) => {
      Alert.alert('Booking Error', err.response?.data?.message || 'The appointment could not be requested.');
    },
  });

  const handleBook = () => {
    if (!meetingDate.trim()) {
      Alert.alert('Validation Error', 'Please specify a meeting date (e.g. 2026-11-05).');
      return;
    }
    if (!subject.trim() && !selectedProblemId) {
      Alert.alert('Validation Error', 'Please describe the consultation topic or link an existing case.');
      return;
    }
    if (locationType === 'citizen' && !citizenAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter your meeting address.');
      return;
    }
    if (locationType === 'lone_hub' && !selectedHubId) {
      Alert.alert('Validation Error', 'Please select a LegalNow Hub location.');
      return;
    }

    const startDateTime = new Date(`${meetingDate.trim()}T${meetingTime.trim()}:00`);

    bookMutation.mutate({
      professionalId: id,
      problemId: selectedProblemId || undefined,
      startTime: isNaN(startDateTime.getTime()) ? new Date().toISOString() : startDateTime.toISOString(),
      durationMinutes: Number(duration),
      subject: subject.trim() || 'Legal Consultation',
      notes: notes.trim(),
      location: {
        type: locationType,
        hubId: locationType === 'lone_hub' ? selectedHubId : undefined,
        address: locationType === 'citizen' ? citizenAddress.trim() : undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load advocate profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: profile.name || 'Advocate Profile', headerShown: true }} />

      {/* Header Profile Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          {profile.photoUrl ? (
            <Image source={{ uri: mediaUrl(profile.photoUrl) }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{(profile.name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.location}>
              <Ionicons name="location-outline" size={14} color={theme.colors.muted} /> {profile.location || 'Chamber Available'}
            </Text>
            <View style={{ marginTop: 4 }}>
              <Badge status={profile.verificationStatus === 'verified' ? 'verified' : 'pending'} label={profile.verificationStatus === 'verified' ? 'Verified Advocate' : 'Pending Verification'} />
            </View>
          </View>
        </View>

        {profile.barCouncilEnrollmentNumber && (
          <Text style={styles.barCouncilText}>
            Bar Council Reg: {profile.barCouncilEnrollmentNumber}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Experience</Text>
            <Text style={styles.statValue}>
              {profile.experienceYears ? `${profile.experienceYears} Years` : 'Senior'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Languages</Text>
            <Text style={styles.statValue}>
              {(profile.languages || []).join(', ') || 'English, Hindi'}
            </Text>
          </View>
        </View>

        {!bookingPanelOpen ? (
          <View style={{ marginTop: 14, gap: 8 }}>
            <Button
              title="Request an Appointment"
              onPress={() => router.push({ pathname: '/(roles)/(citizen)/advocates/book', params: { id } })}
            />
            <Button
              title="Quick Booking Panel"
              variant="secondary"
              onPress={() => setBookingPanelOpen(true)}
            />
          </View>
        ) : (
          <View style={styles.bookingPanel}>
            <Text style={styles.bookingTitle}>Schedule Appointment</Text>

            {/* Link Existing Problem */}
            {problems.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Link to Existing Case (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6 }}>
                  {problems.map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.problemChip, selectedProblemId === p.id && styles.problemChipSelected]}
                      onPress={() => setSelectedProblemId(selectedProblemId === p.id ? '' : p.id)}
                    >
                      <Text style={[styles.problemChipText, selectedProblemId === p.id && { color: '#FFF' }]} numberOfLines={1}>
                        {p.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.inputLabel}>Subject / Purpose</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Property documentation review"
              placeholderTextColor={theme.colors.muted}
              value={subject}
              onChangeText={setSubject}
            />

            <View style={styles.dateTimeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-11-10"
                  placeholderTextColor={theme.colors.muted}
                  value={meetingDate}
                  onChangeText={setMeetingDate}
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.inputLabel}>Time (HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:00"
                  placeholderTextColor={theme.colors.muted}
                  value={meetingTime}
                  onChangeText={setMeetingTime}
                />
              </View>
            </View>

            {/* Location Type Selector */}
            <Text style={styles.inputLabel}>Meeting Venue</Text>
            <View style={styles.locationSelector}>
              {[
                { type: 'advocate_office', label: "Advocate's Office" },
                { type: 'citizen', label: 'My Place' },
                { type: 'lone_hub', label: 'LegalNow Hub' },
              ].map((loc) => (
                <TouchableOpacity
                  key={loc.type}
                  style={[styles.locTab, locationType === loc.type && styles.locTabSelected]}
                  onPress={() => setLocationType(loc.type as any)}
                >
                  <Text style={[styles.locTabText, locationType === loc.type && styles.locTabTextSelected]}>
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {locationType === 'citizen' && (
              <TextInput
                style={styles.input}
                placeholder="Enter your street address for the meeting"
                placeholderTextColor={theme.colors.muted}
                value={citizenAddress}
                onChangeText={setCitizenAddress}
              />
            )}

            {locationType === 'lone_hub' && (
              <HubPicker
                when={new Date(`${meetingDate || '2026-11-15'}T${meetingTime || '10:00'}:00`).toISOString()}
                durationMinutes={Number(duration)}
                selectedId={selectedHubId}
                onSelect={(h) => setSelectedHubId(h.hubId)}
              />
            )}

            <Text style={styles.inputLabel}>Notes for Advocate</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              placeholder="Any specific questions or documents you will bring..."
              placeholderTextColor={theme.colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.bookingActions}>
              <Button
                title="Send Request"
                onPress={handleBook}
                isLoading={bookMutation.isPending}
                style={{ flex: 1 }}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setBookingPanelOpen(false)}
                disabled={bookMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </Card>

      {/* About & Bio */}
      <Text style={styles.sectionTitle}>About</Text>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.bioText}>
          {profile.bio || 'Advocate practicing before High Courts and District Courts with extensive legal advisory and courtroom experience.'}
        </Text>
      </Card>

      {/* Specializations */}
      <Text style={styles.sectionTitle}>Areas of Practice</Text>
      <View style={styles.tagsContainer}>
        {(profile.categories || []).map((cat: string) => (
          <View key={cat} style={styles.tag}>
            <Text style={styles.tagText}>{cat}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.danger, fontSize: 16 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  headerCard: { padding: theme.spacing.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  name: { ...theme.typography.h2, marginBottom: 2 },
  location: { ...theme.typography.body, color: theme.colors.muted },
  barCouncilText: { fontSize: 12, color: theme.colors.secondary, fontWeight: '600', marginBottom: 8 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginVertical: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: theme.colors.muted },
  statValue: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  sectionTitle: { ...theme.typography.h3, marginBottom: 8, marginTop: 4 },
  bioText: { ...theme.typography.body, lineHeight: 22 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  bookingPanel: {
    marginTop: 14,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bookingTitle: { ...theme.typography.h3, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 4 },
  subLabel: { fontSize: 11, color: theme.colors.muted, marginBottom: 6 },
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
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  problemChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
    maxWidth: 160,
  },
  problemChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  problemChipText: { fontSize: 12, color: theme.colors.text },
  locationSelector: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  locTab: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    alignItems: 'center',
  },
  locTabSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  locTabText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  locTabTextSelected: { color: '#FFF' },
  hubCard: {
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  hubCardSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  hubName: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  hubCity: { fontSize: 10, color: theme.colors.muted },
  bookingActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
