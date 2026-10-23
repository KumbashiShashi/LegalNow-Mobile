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
import { Badge } from '../../../components/Badge';
import { useAuthStore } from '../../../store/useAuthStore';
import { INDIAN_STATES } from '../../../utils/indianStates';
import { LANGUAGES } from '../../../utils/languages';
import { ServiceCatalogueItem } from '../../../types/api';

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

const fetchServices = async (): Promise<ServiceCatalogueItem[]> => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

export default function SubmitScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ serviceId?: string; serviceName?: string; category?: string }>();

  const [title, setTitle] = useState(params.serviceName ? `Request for ${params.serviceName}` : '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [subCategory, setSubCategory] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState(INDIAN_STATES[0] as string);
  const [postalCode, setPostalCode] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [requestedServiceId] = useState<string | null>(params.serviceId || null);
  const [acknowledgedPriceBand, setAcknowledgedPriceBand] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: services = [] } = useQuery({ queryKey: ['service-catalogue'], queryFn: fetchServices });

  const linkedService = services.find((s) => s.id === requestedServiceId);

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

      if (!result.canceled && result.assets && result.assets[0]) {
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

    if (requestedServiceId && !acknowledgedPriceBand) {
      Alert.alert('Price Band Confirmation', 'Please acknowledge the indicative fee band before connecting with a service provider.');
      return;
    }

    submitMutation.mutate({
      userId: user?.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      subCategory: subCategory.trim() || null,
      requestedServiceId: requestedServiceId || null,
      location: city.trim(),
      district: district.trim() || null,
      state: state.trim() || null,
      postalCode: postalCode.replace(/\D/g, '') || null,
      jurisdiction: jurisdiction.trim() || null,
      language: preferredLanguage || null,
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
        {/* Linked Service Banner */}
        {requestedServiceId && (
          <View style={styles.serviceBanner}>
            <View style={styles.serviceNotice}>
              <Ionicons name="link-outline" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceNoticeText}>
                  Linked service: <Text style={{ fontWeight: 'bold' }}>{linkedService?.name || params.serviceName || 'Selected Service'}</Text>
                </Text>
                {linkedService && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Badge status="verified" label={`${linkedService.requiredSubscriptionTier || 'Basic'} Tier`} />
                    <Text style={styles.feeBandText}>
                      Indicative Fee Band: ₹{(linkedService.estimatedPriceMin || 1500).toLocaleString('en-IN')} – ₹{(linkedService.estimatedPriceMax || 3500).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Acknowledge Checkbox */}
            <TouchableOpacity
              style={styles.ackRow}
              onPress={() => setAcknowledgedPriceBand(!acknowledgedPriceBand)}
            >
              <Ionicons
                name={acknowledgedPriceBand ? 'checkbox' : 'square-outline'}
                size={22}
                color={theme.colors.primary}
              />
              <Text style={styles.ackText}>
                I understand this indicative market fee band and agree to connect with verified independent providers.
              </Text>
            </TouchableOpacity>
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

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="A short summary of the issue"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>What happened? (Problem Details) *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your legal question or requirement in plain language..."
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Sub-category (Optional)</Text>
        <TextInput
          style={styles.input}
          value={subCategory}
          onChangeText={setSubCategory}
          placeholder="e.g. Rental Agreement, Police NOC, Trademark filing"
          placeholderTextColor={theme.colors.muted}
        />

        {/* Location Section */}
        <Text style={styles.sectionHeader}>Location & Jurisdiction</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={theme.colors.muted}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={district}
            onChangeText={setDistrict}
            placeholder="District"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <Text style={styles.label}>State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateChips}>
          {INDIAN_STATES.map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.stateChip, state === st && styles.stateChipSelected]}
              onPress={() => setState(st)}
            >
              <Text style={[styles.stateChipText, state === st && styles.stateChipTextSelected]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="PIN Code (6 digits)"
            placeholderTextColor={theme.colors.muted}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={jurisdiction}
            onChangeText={setJurisdiction}
            placeholder="Jurisdiction / Court"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        {/* Preferred Language */}
        <Text style={styles.sectionHeader}>Preferred Consultation Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageChips}>
          {LANGUAGES.map((lang) => {
            const isSelected = preferredLanguage === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setPreferredLanguage(isSelected ? '' : lang)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {isSelected ? `${lang} ✓` : lang}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Attachments */}
        <Text style={styles.sectionHeader}>Supporting Documents (Optional)</Text>
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
  serviceBanner: {
    backgroundColor: '#EBF4FE',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  serviceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  serviceNoticeText: { fontSize: 13, color: '#1E40AF' },
  feeBandText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  ackText: { fontSize: 12, color: theme.colors.text, flex: 1, lineHeight: 16 },
  label: { ...theme.typography.body, fontWeight: '600', marginBottom: 6 },
  sectionHeader: { ...theme.typography.h3, fontSize: 14, marginTop: 14, marginBottom: 8 },
  categoryChips: { flexDirection: 'row', marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 6,
  },
  chipSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  stateChips: { flexDirection: 'row', marginBottom: 12 },
  stateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 6,
  },
  stateChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stateChipText: { fontSize: 12, color: theme.colors.text },
  stateChipTextSelected: { color: '#FFF', fontWeight: 'bold' },
  languageChips: { flexDirection: 'row', marginBottom: 14 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  attachmentText: { flex: 1, fontSize: 13, color: theme.colors.text },
});
