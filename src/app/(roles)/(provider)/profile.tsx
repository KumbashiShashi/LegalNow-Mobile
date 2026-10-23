import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../../utils/alert';
import { useAuthStore } from '../../../store/useAuthStore';
import { ChangePasswordModal } from '../../../components/shared/ChangePasswordModal';

const fetchProviderProfile = async () => {
  const { data } = await apiClient.get('/service-marketplace/me');
  return data;
};

const fetchCatalogue = async () => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

export default function ServiceProviderProfileScreen() {
  const { user, logout } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    servicesOffered: '',
    experienceYears: '',
    workingHours: '',
    serviceRadiusKm: '',
    isAvailable: false,
    maximumConcurrentLeads: '',
    serviceCatalogueItemIds: [] as string[]
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({ queryKey: ['provider-profile'], queryFn: fetchProviderProfile });
  const { data: catalogue = [] } = useQuery({ queryKey: ['catalogue'], queryFn: fetchCatalogue });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put('/service-marketplace/me', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      setIsEditing(false);
      showAlert('Success', 'Profile saved successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not save.');
    }
  });

  const startEdit = () => {
    setForm({
      businessName: profile?.businessName || '',
      servicesOffered: profile?.servicesOffered || '',
      experienceYears: profile?.experienceYears ? String(profile.experienceYears) : '',
      workingHours: profile?.workingHours || '',
      serviceRadiusKm: profile?.serviceRadiusKm ? String(profile.serviceRadiusKm) : '',
      isAvailable: profile?.isAvailable || false,
      maximumConcurrentLeads: profile?.maximumConcurrentLeads ? String(profile.maximumConcurrentLeads) : '10',
      serviceCatalogueItemIds: (profile?.services || []).map((s: any) => s.id),
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!form.businessName.trim() || form.serviceCatalogueItemIds.length === 0) {
      showAlert('Validation Error', 'Business name and at least one service are required.');
      return;
    }

    updateMutation.mutate({
      ...form,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
      maximumConcurrentLeads: form.maximumConcurrentLeads ? Number(form.maximumConcurrentLeads) : 10,
    });
  };

  const toggleService = (id: string) => {
    setForm(prev => {
      if (prev.serviceCatalogueItemIds.includes(id)) {
        return { ...prev, serviceCatalogueItemIds: prev.serviceCatalogueItemIds.filter(i => i !== id) };
      }
      return { ...prev, serviceCatalogueItemIds: [...prev.serviceCatalogueItemIds, id] };
    });
  };

  if (loadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.introBox}>
        <Text style={styles.eyebrow}>Business Details</Text>
        <Text style={styles.title}>Provider Settings</Text>
        <Text style={styles.subtitle}>Update your business information and select the services you provide.</Text>
      </View>

      <Card>
        {!isEditing ? (
          <View>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{profile?.businessName || 'Your Business'}</Text>
              <Button title="Edit Details" variant="ghost" onPress={startEdit} />
            </View>

            <View style={styles.detailList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Accepting Leads</Text>
                <Text style={[styles.detailValue, { color: profile?.isAvailable ? theme.colors.success : theme.colors.danger }]}>
                  {profile?.isAvailable ? 'Yes' : 'No - Paused'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{profile?.experienceYears ? `${profile.experienceYears} Years` : 'Not set'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Service Radius</Text>
                <Text style={styles.detailValue}>{profile?.serviceRadiusKm ? `${profile.serviceRadiusKm} km` : 'Not set'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Working Hours</Text>
                <Text style={styles.detailValue}>{profile?.workingHours || 'Not set'}</Text>
              </View>
              <View style={styles.detailItemBox}>
                <Text style={styles.detailLabel}>About Services</Text>
                <Text style={[styles.detailValue, { marginTop: 4, fontWeight: '400' }]}>{profile?.servicesOffered || 'No details provided.'}</Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, { marginTop: 16, marginBottom: 8 }]}>Selected Services</Text>
            <View style={styles.tagsContainer}>
              {(profile?.services || []).map((svc: any) => (
                <View key={svc.id} style={styles.tag}>
                  <Text style={styles.tagText}>{svc.name}</Text>
                </View>
              ))}
              {(profile?.services || []).length === 0 && <Text style={{ color: theme.colors.muted }}>No services selected yet.</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}>
              <Ionicons name={form.isAvailable ? 'checkbox' : 'square-outline'} size={24} color={theme.colors.primary} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.toggleTitle}>Accepting new leads</Text>
                <Text style={styles.toggleSubtitle}>Pause to stop receiving new service requests temporarily.</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput style={styles.input} value={form.businessName} onChangeText={(v) => setForm(f => ({...f, businessName: v}))} />

            <Text style={styles.inputLabel}>About your services</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={form.servicesOffered}
              onChangeText={(v) => setForm(f => ({...f, servicesOffered: v}))}
              multiline
            />

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Experience (Years)</Text>
                <TextInput style={styles.input} value={form.experienceYears} keyboardType="numeric" onChangeText={(v) => setForm(f => ({...f, experienceYears: v}))} />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>Service Radius (km)</Text>
                <TextInput style={styles.input} value={form.serviceRadiusKm} keyboardType="numeric" onChangeText={(v) => setForm(f => ({...f, serviceRadiusKm: v}))} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Max Concurrent Leads</Text>
                <TextInput style={styles.input} value={form.maximumConcurrentLeads} keyboardType="numeric" onChangeText={(v) => setForm(f => ({...f, maximumConcurrentLeads: v}))} />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>Working Hours</Text>
                <TextInput style={styles.input} value={form.workingHours} onChangeText={(v) => setForm(f => ({...f, workingHours: v}))} placeholder="e.g. 9 AM - 6 PM" />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Catalogue Selection *</Text>
            <View style={styles.tagsContainer}>
              {catalogue.map((item: any) => {
                const isSelected = form.serviceCatalogueItemIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.tag, isSelected && styles.tagSelected]}
                    onPress={() => toggleService(item.id)}
                  >
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Button title="Save changes" onPress={handleSave} isLoading={updateMutation.isPending} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} disabled={updateMutation.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>
      <Button title="Change Password" variant="secondary" onPress={() => setShowChangePassword(true)} style={{ marginTop: theme.spacing.md }} />
      <Button title="Sign Out" variant="danger" onPress={logout} style={{ marginTop: theme.spacing.sm }} />
      <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} email={user?.email} phone={user?.phone} />
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
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, marginTop: 4 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  tagSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tagText: { fontSize: 13, color: theme.colors.text },
  tagTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  inputLabel: { ...theme.typography.small, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
