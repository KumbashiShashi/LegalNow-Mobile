import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../../utils/alert';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fetchHubProfile = async () => {
  const { data } = await apiClient.get('/hubs/me');
  return data;
};

export default function LoneHubProfileScreen() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    isAvailable: false,
    meetingAvailable: false,
    openDays: [] as string[],
    openTime: '',
    closeTime: '',
    businessDetails: '',
    latitude: '',
    longitude: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    upiId: '',
  });

  const { data: hub, isLoading } = useQuery({ queryKey: ['hub-profile'], queryFn: fetchHubProfile });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put('/hubs/me', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-profile'] });
      setIsEditing(false);
      showAlert('Success', 'Hub details saved successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not save.');
    }
  });

  const startEdit = () => {
    setForm({
      isAvailable: hub?.isAvailable || false,
      meetingAvailable: hub?.meetingAvailable || false,
      openDays: hub?.openDays ? hub.openDays.split(',') : [],
      openTime: hub?.openTime || '',
      closeTime: hub?.closeTime || '',
      businessDetails: hub?.businessDetails || '',
      latitude: hub?.latitude ? String(hub.latitude) : '',
      longitude: hub?.longitude ? String(hub.longitude) : '',
      bankAccountName: hub?.bankAccountName || '',
      bankAccountNumber: hub?.bankAccountNumber || '',
      bankIfsc: hub?.bankIfsc || '',
      upiId: hub?.upiId || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...form,
      openDays: form.openDays.join(','),
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    });
  };

  const toggleDay = (day: string) => {
    setForm(prev => {
      if (prev.openDays.includes(day)) {
        return { ...prev, openDays: prev.openDays.filter(d => d !== day) };
      }
      return { ...prev, openDays: [...prev.openDays, day] };
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.introBox}>
        <Text style={styles.eyebrow}>Availability</Text>
        <Text style={styles.title}>Hours & details</Text>
        <Text style={styles.subtitle}>{"Manage your LegalNow Hub's physical availability and payout details."}</Text>
      </View>

      <Card>
        {!isEditing ? (
          <View>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{hub?.shopName || 'LegalNow Hub'}</Text>
              <Button title="Edit Settings" variant="ghost" onPress={startEdit} />
            </View>

            <View style={styles.detailList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Accepting Meetings Now</Text>
                <Text style={[styles.detailValue, { color: hub?.isAvailable ? theme.colors.success : theme.colors.danger }]}>
                  {hub?.isAvailable ? 'Yes - Available' : 'No - Closed today'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Offering Meeting Space</Text>
                <Text style={styles.detailValue}>{hub?.meetingAvailable ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Operating Days</Text>
                <Text style={styles.detailValue}>{hub?.openDays || 'Not set'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Timings</Text>
                <Text style={styles.detailValue}>{hub?.openTime || '--:--'} to {hub?.closeTime || '--:--'}</Text>
              </View>
              <View style={styles.detailItemBox}>
                <Text style={styles.detailLabel}>Shop Details</Text>
                <Text style={[styles.detailValue, { marginTop: 4, fontWeight: '400' }]}>{hub?.businessDetails || 'No details provided.'}</Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, { marginTop: 16, marginBottom: 8 }]}>Payout Details</Text>
            <View style={styles.detailList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Account Holder</Text>
                <Text style={styles.detailValue}>{hub?.bankAccountName || 'Not set'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>UPI ID</Text>
                <Text style={styles.detailValue}>{hub?.upiId || 'Not set'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}>
              <Ionicons name={form.isAvailable ? 'checkbox' : 'square-outline'} size={24} color={theme.colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.toggleTitle}>Available for meetings right now</Text>
                <Text style={styles.toggleSubtitle}>Switch off if the shop is closed or full today</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm(f => ({ ...f, meetingAvailable: !f.meetingAvailable }))}>
              <Ionicons name={form.meetingAvailable ? 'checkbox' : 'square-outline'} size={24} color={theme.colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.toggleTitle}>Offer a meeting space</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Operating Days</Text>
            <View style={styles.daysContainer}>
              {DAYS.map(d => {
                const isSelected = form.openDays.includes(d);
                return (
                  <TouchableOpacity key={d} style={[styles.dayChip, isSelected && styles.dayChipSelected]} onPress={() => toggleDay(d)}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Opens (HH:mm)</Text>
                <TextInput style={styles.input} value={form.openTime} onChangeText={(v) => setForm(f => ({...f, openTime: v}))} placeholder="09:00" />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>Closes (HH:mm)</Text>
                <TextInput style={styles.input} value={form.closeTime} onChangeText={(v) => setForm(f => ({...f, closeTime: v}))} placeholder="18:00" />
              </View>
            </View>

            <Text style={styles.inputLabel}>Shop Details</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={form.businessDetails}
              onChangeText={(v) => setForm(f => ({...f, businessDetails: v}))}
              multiline
            />

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput style={styles.input} value={form.latitude} keyboardType="numeric" onChangeText={(v) => setForm(f => ({...f, latitude: v}))} />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput style={styles.input} value={form.longitude} keyboardType="numeric" onChangeText={(v) => setForm(f => ({...f, longitude: v}))} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Payout details</Text>

            <Text style={styles.inputLabel}>Account holder name</Text>
            <TextInput style={styles.input} value={form.bankAccountName} onChangeText={(v) => setForm(f => ({...f, bankAccountName: v}))} />

            <Text style={styles.inputLabel}>Account number</Text>
            <TextInput style={styles.input} value={form.bankAccountNumber} onChangeText={(v) => setForm(f => ({...f, bankAccountNumber: v}))} keyboardType="number-pad" />

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <TextInput style={styles.input} value={form.bankIfsc} onChangeText={(v) => setForm(f => ({...f, bankIfsc: v}))} autoCapitalize="characters" />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>UPI ID</Text>
                <TextInput style={styles.input} value={form.upiId} onChangeText={(v) => setForm(f => ({...f, upiId: v}))} autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button title="Save changes" onPress={handleSave} isLoading={updateMutation.isPending} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} disabled={updateMutation.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  introBox: { marginBottom: theme.spacing.lg },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: theme.spacing.xs },
  title: { ...theme.typography.h1, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.md, marginBottom: theme.spacing.md },
  cardTitle: { ...theme.typography.h2, marginBottom: 4 },
  detailList: { gap: 12 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  detailItemBox: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  detailLabel: { ...theme.typography.body, color: theme.colors.muted, flex: 1 },
  detailValue: { ...theme.typography.body, fontWeight: '600', flex: 1, textAlign: 'right' },
  formContainer: { marginTop: 8 },
  sectionTitle: { ...theme.typography.h3, marginTop: 16, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 12 },
  toggleTitle: { ...theme.typography.body, fontWeight: '600' },
  toggleSubtitle: { ...theme.typography.small, marginTop: 2 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, marginTop: 4 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  dayChipSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  dayText: { fontSize: 13, color: theme.colors.text },
  dayTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  inputLabel: { ...theme.typography.small, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
