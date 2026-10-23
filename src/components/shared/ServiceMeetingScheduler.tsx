import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../Button';
import { showAlert } from '../../utils/alert';
import { HubPicker, SelectedHubLocation } from './HubPicker';

interface ServiceMeetingSchedulerProps {
  leadId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ServiceMeetingScheduler({ leadId, onSuccess, onClose }: ServiceMeetingSchedulerProps) {
  const queryClient = useQueryClient();
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [durationMinutes] = useState(30);
  const [locationType, setLocationType] = useState<'provider_office' | 'lone_hub'>('provider_office');
  const [locationAddress, setLocationAddress] = useState('');
  const [selectedHub, setSelectedHub] = useState<SelectedHubLocation | null>(null);
  const [notes, setNotes] = useState('');

  const proposeMutation = useMutation({
    mutationFn: async () => {
      if (!meetingDate || !meetingTime) {
        throw new Error('Please select both date and time.');
      }

      const isoTime = `${meetingDate}T${meetingTime}:00Z`;

      if (locationType === 'provider_office' && !locationAddress.trim()) {
        throw new Error('Please provide the provider office address.');
      }

      if (locationType === 'lone_hub' && !selectedHub) {
        throw new Error('Please select an available LegalNow Hub.');
      }

      const payload = {
        startTime: isoTime,
        durationMinutes,
        locationType,
        locationAddress: locationType === 'provider_office' ? locationAddress.trim() : undefined,
        hubId: locationType === 'lone_hub' ? selectedHub?.hubId : undefined,
        lat: locationType === 'lone_hub' ? selectedHub?.lat : undefined,
        lng: locationType === 'lone_hub' ? selectedHub?.lng : undefined,
        notes: notes.trim() || undefined,
      };

      const { data } = await apiClient.post(`/service-meetings/lead/${leadId}`, payload);
      return data;
    },
    onSuccess: () => {
      showAlert('Meeting Proposed', 'Your meeting proposal has been sent to the client.');
      queryClient.invalidateQueries({ queryKey: ['provider-leads'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.();
    },
    onError: (err: any) => {
      showAlert('Could Not Propose Meeting', err.response?.data?.message || err.message || 'Validation error');
    }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Propose Service Meeting</Text>
          <Text style={styles.subtitle}>Coordinate meeting with the client</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Meeting Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2026-11-05"
          placeholderTextColor={theme.colors.muted}
          value={meetingDate}
          onChangeText={setMeetingDate}
        />

        <Text style={styles.label}>Start Time (HH:mm, 24h) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 14:30"
          placeholderTextColor={theme.colors.muted}
          value={meetingTime}
          onChangeText={setMeetingTime}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Meeting Location *</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioItem, locationType === 'provider_office' && styles.radioItemSelected]}
            onPress={() => setLocationType('provider_office')}
          >
            <Ionicons
              name={locationType === 'provider_office' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={locationType === 'provider_office' ? theme.colors.primary : theme.colors.muted}
            />
            <Text style={styles.radioText}>Provider Office</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioItem, locationType === 'lone_hub' && styles.radioItemSelected]}
            onPress={() => setLocationType('lone_hub')}
          >
            <Ionicons
              name={locationType === 'lone_hub' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={locationType === 'lone_hub' ? theme.colors.primary : theme.colors.muted}
            />
            <Text style={styles.radioText}>LegalNow Hub (Neutral Point)</Text>
          </TouchableOpacity>
        </View>

        {locationType === 'provider_office' ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Office Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full office address with landmarks"
              placeholderTextColor={theme.colors.muted}
              value={locationAddress}
              onChangeText={setLocationAddress}
              multiline
            />
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            <HubPicker
              when={`${meetingDate || '2026-11-15'}T${meetingTime || '14:30'}:00Z`}
              durationMinutes={durationMinutes}
              selectedId={selectedHub?.hubId}
              onSelect={setSelectedHub}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Meeting Notes / Agenda (Optional)</Text>
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Briefly state what documents or preparations are required..."
          placeholderTextColor={theme.colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <View style={styles.footer}>
        <Button
          title="Send Meeting Proposal"
          onPress={() => proposeMutation.mutate()}
          isLoading={proposeMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 500,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  radioItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  radioText: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    padding: 11,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubList: {
    gap: 6,
    marginTop: 6,
  },
  hubCard: {
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  hubCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  hubName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  hubAddress: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  footer: {
    marginTop: 10,
  },
});

