import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../styles/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { CaseChat } from '../../components/shared/CaseChat';
import { showAlert } from '../../utils/alert';

const fetchCaseDetails = async (id: string) => {
  const { data } = await apiClient.get(`/problems/${id}`);
  return data;
};

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', location: '' });

  const isOwner = role === 'citizen' || role === 'business';
  const isAdvocate = role === 'professional';
  const isAdmin = role === 'admin';

  const { data: problem, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => fetchCaseDetails(id),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put(`/problems/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setIsEditing(false);
      showAlert('Success', 'Case updated successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Changes could not be saved.');
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch(`/marketplace/problems/${id}/status`, { status: 'completed' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      showAlert('Case Completed', 'This case has been marked as completed.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Status update failed.');
    }
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !problem) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>You do not have access to this case.</Text>
      </View>
    );
  }

  const isAssigned = Boolean(problem.assignedProfessionalId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Case Details`, headerShown: true }} />

      {/* Header Info */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{problem.title}</Text>
          <Badge status={problem.status} />
        </View>
        <Text style={styles.categoryInfo}>
          {problem.category || 'Uncategorised'} {problem.location ? `• ${problem.location}` : ''}
        </Text>
        <Text style={styles.caseDate}>Opened {new Date(problem.createdAt).toLocaleDateString()}</Text>
      </Card>

      {/* Description Panel */}
      <Text style={styles.sectionTitle}>Description</Text>
      <Card>
        {!isEditing ? (
          <>
            <Text style={styles.descriptionText}>{problem.description}</Text>

            {/* Attachments List */}
            {(problem.attachments || []).length > 0 && (
              <View style={styles.attachmentsBox}>
                <Text style={styles.attachmentTitle}>Supporting Documents:</Text>
                {problem.attachments.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.attachmentChip}
                    onPress={() => Linking.openURL(url.startsWith('http') ? url : `http://localhost:5000${url}`)}
                  >
                    <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.attachmentText}>Attachment {index + 1}</Text>
                    <Ionicons name="download-outline" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isOwner && problem.status !== 'completed' && (
              <TouchableOpacity onPress={() => {
                setEditForm({ title: problem.title, description: problem.description, location: problem.location || '' });
                setIsEditing(true);
              }} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit case details</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput style={styles.input} value={editForm.title} onChangeText={t => setEditForm(f => ({ ...f, title: t }))} />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={editForm.description} onChangeText={t => setEditForm(f => ({ ...f, description: t }))} multiline />
            <Text style={styles.inputLabel}>City</Text>
            <TextInput style={styles.input} value={editForm.location} onChangeText={t => setEditForm(f => ({ ...f, location: t }))} />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Button title="Save changes" onPress={() => updateMutation.mutate(editForm)} isLoading={updateMutation.isPending} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setIsEditing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>

      {/* Advocate Assignment Banner */}
      <Text style={styles.sectionTitle}>Advocate</Text>
      <Card>
        <Text style={styles.advocateTitle}>
          {isAssigned ? (isAdvocate ? 'You are the advocate for this case' : 'Your Advocate Assigned') : 'No advocate assigned yet'}
        </Text>
        {isAssigned ? (
          <Text style={styles.successMessage}>An advocate has accepted an appointment for this case. Manage your meetings under Appointments.</Text>
        ) : (
          <Text style={styles.mutedMessage}>Advocates are not assigned automatically. Search verified advocates and request an appointment.</Text>
        )}
      </Card>

      {/* Case Chat & Messaging */}
      {isAssigned ? (
        <>
          <Text style={styles.sectionTitle}>Private Messages</Text>
          <CaseChat problemId={id} />
        </>
      ) : (
        isOwner && (
          <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={styles.mutedMessage}>Messaging unlocks once an advocate accepts an appointment for this case.</Text>
          </Card>
        )
      )}

      {/* Advocate Lifecycle Action */}
      {isAssigned && problem.status !== 'completed' && (isOwner || isAdvocate || isAdmin) && (
        <Card style={styles.trustStrip}>
          <Text style={styles.trustTitle}>All done?</Text>
          <Text style={styles.trustSubtitle}>Mark this case completed when the matter is fully resolved.</Text>
          <Button
            title="Mark Completed"
            onPress={() => completeMutation.mutate()}
            isLoading={completeMutation.isPending}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: theme.colors.danger },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  card: { padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { ...theme.typography.h2, flex: 1, marginRight: 8 },
  categoryInfo: { fontSize: 14, color: theme.colors.primary, fontWeight: '600', marginBottom: 4 },
  caseDate: { fontSize: 13, color: theme.colors.muted },
  sectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.xs, marginTop: theme.spacing.sm },
  descriptionText: { ...theme.typography.body, lineHeight: 22 },
  attachmentsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  attachmentTitle: { ...theme.typography.small, fontWeight: 'bold', marginBottom: 6 },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, padding: 8, borderRadius: theme.borderRadius.sm, marginBottom: 6, alignSelf: 'flex-start' },
  attachmentText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  editBtn: { marginTop: 12 },
  editBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  inputLabel: { ...theme.typography.small, marginBottom: 4, marginTop: 8, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, fontSize: 14, color: theme.colors.text },
  advocateTitle: { ...theme.typography.h3, marginBottom: 8 },
  successMessage: { fontSize: 13, color: theme.colors.success, backgroundColor: theme.colors.successBg, padding: 12, borderRadius: theme.borderRadius.sm, lineHeight: 18 },
  mutedMessage: { fontSize: 13, color: theme.colors.muted, textAlign: 'center' },
  trustStrip: { backgroundColor: theme.colors.primaryLight, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.md },
  trustTitle: { ...theme.typography.h3, color: theme.colors.primary, marginBottom: 2 },
  trustSubtitle: { ...theme.typography.small, color: theme.colors.muted, textAlign: 'center' },
});
