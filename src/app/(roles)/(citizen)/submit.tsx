import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

export default function SubmitScreen() {
  const params = useLocalSearchParams<{ serviceId?: string; serviceName?: string; category?: string }>();
  const [title, setTitle] = useState(params.serviceName ? `Request for ${params.serviceName}` : '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [requestedServiceId] = useState<string | null>(params.serviceId || null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/problems', payload);
      return data;
    },
    onSuccess: (data) => {
      Alert.alert('Case Created', 'Your legal matter or service requirement has been registered.');
      router.replace(`/case/${data.id}`);
    },
    onError: (error: any) => {
      Alert.alert('Submission Error', error.response?.data?.message || 'Submission failed. Please check required fields.');
    },
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || 'document.pdf',
          type: asset.mimeType || 'application/pdf',
        } as any);

        const uploadRes = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data?.url || uploadRes.data?.fileUrl) {
          const fileUrl = uploadRes.data.url || uploadRes.data.fileUrl;
          setAttachments((prev) => [...prev, fileUrl]);
        }
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.response?.data?.message || 'Could not upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please enter a Title and Problem Description.');
      return;
    }

    submitMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      requestedServiceId: requestedServiceId || null,
      location: city.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.replace(/\D/g, ''),
      attachments,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Submit Requirement', headerShown: true }} />

      <View style={styles.introBox}>
        <Text style={styles.eyebrow}>New case or service request</Text>
        <Text style={styles.title}>Describe What Help You Need</Text>
        <Text style={styles.subtitle}>
          Choose advocate consultation, an independent service provider, or describe your situation in plain language.
        </Text>
      </View>

      <Card style={styles.formCard}>
        {requestedServiceId && (
          <View style={styles.serviceNotice}>
            <Ionicons name="link-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.serviceNoticeText}>
              Linked to service: <Text style={{ fontWeight: 'bold' }}>{params.serviceName || 'Selected Service'}</Text>
            </Text>
          </View>
        )}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChips}>
          {categories.map((cat: string) => {
            const isSelected = cat === category;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Property boundary dispute consultation"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>What happened? (Details)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your legal question or requirement in plain language..."
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Location Details</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={theme.colors.muted}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={state}
            onChangeText={setState}
            placeholder="State"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <TextInput
          style={styles.input}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder="PIN Code (6 digits)"
          placeholderTextColor={theme.colors.muted}
          keyboardType="number-pad"
          maxLength={6}
        />

        {/* Attachments */}
        <Text style={styles.label}>Supporting Documents (Optional)</Text>
        {attachments.map((att, i) => (
          <View key={i} style={styles.attachmentItem}>
            <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.attachmentText} numberOfLines={1}>
              Attachment {i + 1}: {att.split('/').pop()}
            </Text>
            <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <Button
          title={isUploading ? 'Uploading Document...' : '+ Add PDF or Image Document'}
          variant="secondary"
          onPress={pickDocument}
          disabled={isUploading}
          style={{ marginBottom: 16 }}
        />

        <Button
          title="Submit & Register Case"
          onPress={onSubmit}
          isLoading={submitMutation.isPending}
          style={{ marginTop: 8 }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  introBox: { marginBottom: 16 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 2 },
  title: { ...theme.typography.h1, marginBottom: 4 },
  subtitle: { ...theme.typography.body, color: theme.colors.muted },
  formCard: { padding: theme.spacing.md },
  serviceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF4FE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  serviceNoticeText: { fontSize: 13, color: theme.colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary, marginBottom: 6, marginTop: 4 },
  categoryChips: { flexDirection: 'row', marginBottom: 14 },
  chip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  chipTextSelected: { color: '#FFF', fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F3F4',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  attachmentText: { flex: 1, fontSize: 12, color: theme.colors.text },
});
