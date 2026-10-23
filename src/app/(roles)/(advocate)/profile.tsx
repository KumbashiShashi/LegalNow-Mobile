import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { showAlert } from '../../../utils/alert';
import { ChangePasswordModal } from '../../../components/shared/ChangePasswordModal';
import { SpecializationPicker } from '../../../components/shared/SpecializationPicker';
import { LanguageInput } from '../../../components/shared/LanguageInput';
import { PhotoPicker } from '../../../components/shared/PhotoPicker';


const fetchProfile = async () => {
  const { data } = await apiClient.get('/marketplace/advocate/profile');
  return data;
};

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

export default function AdvocateProfileScreen() {
  const { user, logout } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const [subCategoryInput, setSubCategoryInput] = useState('');

  const [form, setForm] = useState({
    categories: [] as string[],
    subCategories: [] as string[],
    languages: [] as string[],
    location: '',
    bio: '',
    experienceYears: '',
    consultationFee: '',
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({ queryKey: ['advocate-profile'], queryFn: fetchProfile, retry: false });
  const { data: allCategories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put('/marketplace/advocate/profile', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advocate-profile'] });
      setIsEditing(false);
      showAlert('Success', 'Profile saved successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Profile could not be saved.');
    }
  });

  const startEdit = () => {
    setForm({
      categories: profile?.categories || [],
      subCategories: profile?.subCategories || [],
      languages: profile?.languages || [],
      location: profile?.location || '',
      bio: profile?.bio || '',
      experienceYears: profile?.experienceYears ? String(profile.experienceYears) : '',
      consultationFee: profile?.consultationFee ? String(profile.consultationFee) : '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (form.categories.length < 1 || form.categories.length > 3) {
      showAlert('Validation Error', 'Please select between 1 and 3 specializations.');
      return;
    }

    updateMutation.mutate({
      ...form,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
    });
  };


  const addSubCategory = () => {
    const val = subCategoryInput.trim();
    if (!val) return;
    if (!form.subCategories.includes(val)) {
      setForm(prev => ({ ...prev, subCategories: [...prev.subCategories, val] }));
    }
    setSubCategoryInput('');
  };

  const removeSubCategory = (val: string) => {
    setForm(prev => ({ ...prev, subCategories: prev.subCategories.filter(s => s !== val) }));
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
        <Text style={styles.eyebrow}>Public listing</Text>
        <Text style={styles.title}>Advocate profile</Text>
        <Text style={styles.subtitle}>Maintain your professional details, specializations, and consultation fee.</Text>
      </View>

      <Card>
        <PhotoPicker
          name={profile?.name || user?.name || 'Advocate'}
          photoUrl={profile?.photoUrl || user?.photoUrl}
          onPhotoUpdated={(updated) => {
            queryClient.invalidateQueries({ queryKey: ['advocate-profile'] });
            if (updated.photoUrl !== undefined) {
              useAuthStore.getState().updateUser(updated);
            }
          }}
          label="Profile Photo"
          hint="Uploaded photo is visible on public directory and consultations"
        />

        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{profile?.name || 'Advocate Name'}</Text>
            <Badge
              status={profile?.verificationStatus || 'pending'}
              label={profile?.verificationStatus ? `Verification ${profile.verificationStatus}` : 'Pending Verification'}
            />
          </View>
          {!isEditing && (
            <Button title="Edit Profile" variant="ghost" onPress={startEdit} />
          )}
        </View>

        {!isEditing ? (
          <View style={styles.detailList}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email address</Text>
              <Text style={styles.detailValue}>{profile?.email || 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{profile?.location || 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue}>{profile?.experienceYears ? `${profile.experienceYears} Years` : 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Consultation Fee</Text>
              <Text style={styles.detailValue}>{profile?.consultationFee ? `₹${profile.consultationFee.toLocaleString('en-IN')}` : 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Specializations</Text>
              <Text style={styles.detailValue}>{(profile?.categories || []).join(', ') || 'None selected'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Sub-categories</Text>
              <Text style={styles.detailValue}>{(profile?.subCategories || []).join(', ') || 'None'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Languages</Text>
              <Text style={styles.detailValue}>{(profile?.languages || []).join(', ') || 'Not set'}</Text>
            </View>
            <View style={styles.detailItemBox}>
              <Text style={styles.detailLabel}>About you</Text>
              <Text style={[styles.detailValue, { marginTop: 4, fontWeight: '400' }]}>{profile?.bio || 'No bio provided.'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm(f => ({...f, location: v}))} placeholder="e.g. Bengaluru" />

            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput style={styles.input} value={form.experienceYears} keyboardType="number-pad" onChangeText={(v) => setForm(f => ({...f, experienceYears: v}))} />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={styles.inputLabel}>Consultation Fee (INR)</Text>
                <TextInput style={styles.input} value={form.consultationFee} keyboardType="number-pad" onChangeText={(v) => setForm(f => ({...f, consultationFee: v}))} />
              </View>
            </View>

            <Text style={styles.inputLabel}>About you</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={form.bio}
              onChangeText={(v) => setForm(f => ({...f, bio: v}))}
              multiline
              placeholder="Tell clients about your practice..."
            />

            <SpecializationPicker
              value={form.categories}
              onChange={(cats) => setForm(f => ({ ...f, categories: cats }))}
              options={allCategories}
              max={3}
            />

            <Text style={styles.inputLabel}>Sub-categories (e.g., Notary, Corporate Tax)</Text>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={subCategoryInput} onChangeText={setSubCategoryInput} placeholder="Add sub-category" />
              <Button title="Add" variant="secondary" onPress={addSubCategory} style={{ marginLeft: 8 }} />
            </View>
            <View style={styles.chipWrap}>
              {form.subCategories.map(s => (
                <TouchableOpacity key={s} style={styles.chip} onPress={() => removeSubCategory(s)}>
                  <Text style={styles.chipText}>{s} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>

            <LanguageInput
              value={form.languages}
              onChange={(langs) => setForm(f => ({ ...f, languages: langs }))}
            />

            <View style={styles.actionRow}>
              <Button title="Save changes" onPress={handleSave} isLoading={updateMutation.isPending} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} disabled={updateMutation.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>

      <Button title="Change Password" variant="secondary" onPress={() => setShowChangePassword(true)} style={{ marginTop: theme.spacing.md }} />
      <Button title="Sign Out" variant="danger" onPress={logout} style={{ marginTop: theme.spacing.lg }} />
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
  detailLabel: { ...theme.typography.body, color: theme.colors.muted },
  detailValue: { ...theme.typography.body, fontWeight: '600' },
  formContainer: { marginTop: 8 },
  inputLabel: { ...theme.typography.small, marginBottom: 4, marginTop: 8, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, marginTop: 4 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  tagSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tagText: { fontSize: 13, color: theme.colors.text },
  tagTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.pill },
  chipText: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
