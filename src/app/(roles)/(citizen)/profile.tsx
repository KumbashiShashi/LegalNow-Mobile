import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [aadharInput, setAadharInput] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return user;
      const { data } = await apiClient.get(`/auth/user/${user.id}`);
      return data;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put('/auth/profile', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      updateUser(data);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Profile could not be saved.');
    },
  });

  const aadharMutation = useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();
      formData.append('aadharNumber', payload.aadharNumber);
      if (payload.uri) {
        const filename = payload.uri.split('/').pop() || 'aadhar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', {
          uri: payload.uri,
          name: filename,
          type,
        } as any);
      }
      const { data } = await apiClient.post('/auth/aadhar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      Alert.alert('KYC Submitted', 'Aadhar submitted for administrative verification.');
    },
    onError: (err: any) => {
      Alert.alert('KYC Error', err.response?.data?.message || 'Aadhar upload failed.');
    },
  });

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll access is needed to select a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      try {
        const { data } = await apiClient.post('/auth/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
        if (data.photoUrl) updateUser({ photoUrl: data.photoUrl });
      } catch (e: any) {
        Alert.alert('Photo Upload Error', e.response?.data?.message || 'Could not update photo.');
      }
    }
  };

  const startEdit = () => {
    setForm({
      firstName: profile?.firstName || (profile?.name || '').split(' ')[0] || '',
      lastName: profile?.lastName || (profile?.name || '').split(' ').slice(1).join(' ') || '',
      phone: profile?.phone || '',
      addressLine1: profile?.addressLine1 || '',
      addressLine2: profile?.addressLine2 || '',
      city: profile?.city || '',
      state: profile?.state || '',
      postalCode: profile?.postalCode || '',
    });
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const currentProfile = profile || user;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.eyebrow}>Account & Security</Text>
        <Text style={styles.title}>My Profile</Text>
      </View>

      {/* Avatar & Identity Card */}
      <Card style={styles.profileHeaderCard}>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {currentProfile?.photoUrl ? (
              <Image source={{ uri: currentProfile.photoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{(currentProfile?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.name}>{currentProfile?.name || 'Customer'}</Text>
            <Text style={styles.email}>{currentProfile?.email}</Text>
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Badge status={currentProfile?.role || 'citizen'} label={(currentProfile?.role || 'citizen').toUpperCase()} />
              {currentProfile?.aadharVerified && (
                <Badge status="verified" label="KYC Verified" />
              )}
            </View>
          </View>
        </View>
      </Card>

      {/* Aadhar KYC Verification Panel */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionHeading}>Identity Verification (KYC)</Text>
        </View>

        {currentProfile?.aadharVerified ? (
          <View style={styles.kycVerifiedBox}>
            <Ionicons name="checkmark-circle" size={20} color="#137333" />
            <Text style={styles.kycVerifiedText}>
              Aadhar verified: {currentProfile?.aadharNumber || 'XXXX XXXX XXXX'}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.kycPromptText}>
              Upload your Aadhar card for verified customer badge and booking access.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 12-digit Aadhar number"
              placeholderTextColor={theme.colors.muted}
              keyboardType="number-pad"
              maxLength={12}
              value={aadharInput}
              onChangeText={setAadharInput}
            />
            <Button
              title="Upload Aadhar Card Image"
              variant="secondary"
              onPress={async () => {
                if (aadharInput.replace(/\D/g, '').length !== 12) {
                  Alert.alert('Validation Error', 'Please enter a valid 12-digit Aadhar number first.');
                  return;
                }
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                if (!res.canceled && res.assets[0]?.uri) {
                  aadharMutation.mutate({ aadharNumber: aadharInput, uri: res.assets[0].uri });
                }
              }}
              isLoading={aadharMutation.isPending}
            />
          </View>
        )}
      </Card>

      {/* Contact & Address Details */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionHeading}>Address & Contact</Text>
          {!isEditing && (
            <TouchableOpacity onPress={startEdit} style={styles.editLink}>
              <Text style={styles.editLinkText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isEditing ? (
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile</Text>
              <Text style={styles.detailValue}>{currentProfile?.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>
                {[currentProfile?.addressLine1, currentProfile?.addressLine2].filter(Boolean).join(', ') || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City / State</Text>
              <Text style={styles.detailValue}>
                {[currentProfile?.city, currentProfile?.state].filter(Boolean).join(', ') || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PIN Code</Text>
              <Text style={styles.detailValue}>{currentProfile?.postalCode || 'Not set'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.editForm}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))} />

            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))} />

            <Text style={styles.inputLabel}>Mobile Phone</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />

            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput style={styles.input} value={form.addressLine1} onChangeText={(v) => setForm((f) => ({ ...f, addressLine1: v }))} />

            <Text style={styles.inputLabel}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />

            <Text style={styles.inputLabel}>State</Text>
            <TextInput style={styles.input} value={form.state} onChangeText={(v) => setForm((f) => ({ ...f, state: v }))} />

            <Text style={styles.inputLabel}>PIN Code</Text>
            <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} value={form.postalCode} onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))} />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button title="Save Changes" onPress={() => updateMutation.mutate(form)} isLoading={updateMutation.isPending} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>

      {/* Account Actions */}
      <Card style={styles.sectionCard}>
        <Button
          title="Log Out"
          variant="secondary"
          onPress={async () => {
            await logout();
          }}
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Log Out of All Devices"
          variant="danger"
          onPress={() => {
            Alert.alert(
              'Log Out All Sessions',
              'This will invalidate your security stamp and sign you out across all mobile and web devices.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out Everywhere',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiClient.post('/auth/logout-all-devices');
                    } catch {}
                    await logout();
                  },
                },
              ]
            );
          }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  headerBox: { marginBottom: 16 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 2 },
  title: { ...theme.typography.h1 },
  profileHeaderCard: { padding: 16, marginBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 68, height: 68, borderRadius: 34 },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  email: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  sectionCard: { marginBottom: 12, padding: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: theme.colors.secondary, flex: 1 },
  editLink: { paddingHorizontal: 8, paddingVertical: 4 },
  editLinkText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  kycVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F4EA',
    padding: 12,
    borderRadius: 8,
  },
  kycVerifiedText: { fontSize: 13, color: '#137333', fontWeight: '600' },
  kycPromptText: { fontSize: 13, color: theme.colors.muted, marginBottom: 10, lineHeight: 18 },
  detailsList: { gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border },
  detailLabel: { fontSize: 13, color: theme.colors.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, maxWidth: '65%', textAlign: 'right' },
  editForm: { gap: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.secondary, marginBottom: 2 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
});
