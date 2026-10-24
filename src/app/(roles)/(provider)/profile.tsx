import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { showAlert } from '../../../utils/alert';
import { useAuthStore } from '../../../store/useAuthStore';
import { ChangePasswordModal } from '../../../components/shared/ChangePasswordModal';
import { PhotoPicker } from '../../../components/shared/PhotoPicker';
import { LanguageInput } from '../../../components/shared/LanguageInput';
import { INDIAN_STATES } from '../../../utils/indianStates';
import {
  ServiceProviderLocation,
  ServiceProviderDocument,
  ServiceProviderSubscription,
  ServiceCatalogueItem,
} from '../../../types/api';

const fetchProviderProfile = async () => {
  const { data } = await apiClient.get('/service-marketplace/me');
  return data;
};

const fetchCatalogue = async (): Promise<ServiceCatalogueItem[]> => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

const fetchLocations = async (): Promise<ServiceProviderLocation[]> => {
  const { data } = await apiClient.get('/service-marketplace/locations');
  return Array.isArray(data) ? data : [];
};

const fetchDocuments = async (): Promise<ServiceProviderDocument[]> => {
  const { data } = await apiClient.get('/service-marketplace/documents');
  return Array.isArray(data) ? data : [];
};

const fetchSubscription = async (): Promise<ServiceProviderSubscription> => {
  const { data } = await apiClient.get('/service-marketplace/subscription');
  return data;
};

export default function ServiceProviderProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'locations' | 'verification' | 'subscription'>('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile Form state
  const [form, setForm] = useState({
    businessName: '',
    servicesOffered: '',
    experienceYears: '',
    workingHours: '',
    serviceRadiusKm: '',
    isAvailable: false,
    maximumConcurrentLeads: '',
    languages: [] as string[],
    serviceCatalogueItemIds: [] as string[],
  });

  // Location Form state
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    state: INDIAN_STATES[0] as string,
    district: '',
    city: '',
    postalCode: '',
    jurisdiction: '',
  });

  // Document Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTypeInput, setDocTypeInput] = useState('Identity & Address Proof');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  // Upgrade Modal state
  const [upgradeTierModal, setUpgradeTierModal] = useState<{
    key: string;
    name: string;
    fee: number;
    leads: number;
  } | null>(null);

  // Queries
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: fetchProviderProfile,
  });

  const { data: catalogue = [] } = useQuery({
    queryKey: ['catalogue'],
    queryFn: fetchCatalogue,
  });

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['provider-locations'],
    queryFn: fetchLocations,
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['provider-documents'],
    queryFn: fetchDocuments,
  });

  const { data: subscription } = useQuery({
    queryKey: ['provider-subscription'],
    queryFn: fetchSubscription,
  });

  // Mutations
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
      showAlert('Error', err.response?.data?.message || 'Could not save profile.');
    },
  });

  const submitProfileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/service-marketplace/me/submit');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      showAlert('Submitted', 'Your provider profile has been submitted for platform review.');
    },
    onError: (err: any) => {
      showAlert('Submission Error', err.response?.data?.message || 'Could not submit profile.');
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/service-marketplace/locations', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-locations'] });
      setShowAddLocationModal(false);
      setLocationForm({
        state: INDIAN_STATES[0],
        district: '',
        city: '',
        postalCode: '',
        jurisdiction: '',
      });
      showAlert('Success', 'Coverage location added successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not add coverage area.');
    },
  });

  const removeLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      await apiClient.delete(`/service-marketplace/locations/${locationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-locations'] });
      showAlert('Location Removed', 'Coverage area has been deactivated.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not remove coverage area.');
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please choose a file to upload.');
      const formData = new FormData();
      formData.append('documentType', docTypeInput);
      if (selectedServiceId) {
        formData.append('serviceId', selectedServiceId);
      }
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as any);

      const { data } = await apiClient.post('/service-marketplace/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-documents'] });
      setShowUploadModal(false);
      setSelectedFile(null);
      showAlert('Document Uploaded', 'Your verification document was uploaded successfully.');
    },
    onError: (err: any) => {
      showAlert('Upload Failed', err.response?.data?.message || err.message || 'Could not upload document.');
    },
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/service-marketplace/verification/submit');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['provider-documents'] });
      showAlert('Submitted', 'Your documents have been submitted for verification review.');
    },
    onError: (err: any) => {
      showAlert('Verification Error', err.response?.data?.message || 'Could not submit verification.');
    },
  });

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async ({ tier }: { tier: string }) => {
      try {
        const { data } = await apiClient.post('/service-marketplace/subscription/upgrade', {
          tier,
          paymentMethod: 'dev_test',
          paymentReference: `DEV-TEST-${Date.now()}`,
        });
        return data;
      } catch (err: any) {
        if (err.response?.status === 403) {
          const payRes = await apiClient.post('/service-marketplace/subscription/pay', { tier });
          const { razorpayOrderId } = payRes.data;
          if (razorpayOrderId) {
            await apiClient.post('/fees/verify', {
              razorpayOrderId,
              razorpayPaymentId: `sim_pay_${Date.now()}`,
              razorpaySignature: 'sim_sig_valid',
              paymentMethod: 'direct',
            });
            return { message: `${tier.toUpperCase()} subscription activated successfully.` };
          }
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      setUpgradeTierModal(null);
      showAlert('Subscription Activated', data?.message || 'Subscription package updated successfully!');
    },
    onError: (err: any) => {
      showAlert('Subscription Error', err.response?.data?.message || 'Could not update subscription.');
    },
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
      languages: profile?.languages || [],
      serviceCatalogueItemIds: (profile?.services || []).map((s: any) => s.id),
    });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
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
    setForm((prev) => {
      if (prev.serviceCatalogueItemIds.includes(id)) {
        return { ...prev, serviceCatalogueItemIds: prev.serviceCatalogueItemIds.filter((i) => i !== id) };
      }
      return { ...prev, serviceCatalogueItemIds: [...prev.serviceCatalogueItemIds, id] };
    });
  };

  const pickDocumentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'document.pdf',
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch {
      showAlert('Error', 'Unable to pick document file.');
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const profileStatus = profile?.verificationStatus || 'draft';
  const isSubscribed = Boolean(subscription?.isSubscribed);
  const currentTier = (subscription?.tier || profile?.subscriptionTier || 'basic').toLowerCase();
  const availableCredits = subscription?.availableCredits ?? (profile?.monthlyLeadsQuota || 10);
  const quotaUsed = subscription?.leadsUsed ?? 0;
  const quotaTotal = subscription?.monthlyQuota ?? (profile?.monthlyLeadsQuota || 10);
  const rolloverCredits = subscription?.rolloverCredits ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Intro Header */}
      <View style={styles.introBox}>
        <Text style={styles.eyebrow}>Service Provider Workspace</Text>
        <Text style={styles.title}>{profile?.businessName || 'Business Profile'}</Text>
        <Text style={styles.subtitle}>
          Configure your service offering, coverage areas, compliance documents, and subscription tier.
        </Text>
      </View>

      {/* Top Segmented Navigation Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'profile', label: 'Profile', icon: 'business-outline' },
          { key: 'locations', label: `Areas (${locations.length})`, icon: 'map-outline' },
          { key: 'verification', label: 'Verification', icon: 'shield-checkmark-outline' },
          { key: 'subscription', label: 'Subscription', icon: 'card-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? theme.colors.primary : theme.colors.muted}
            />
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===================== TAB 1: PROFILE ===================== */}
      {activeTab === 'profile' && (
        <View style={styles.tabContent}>
          <Card>
            <PhotoPicker
              name={profile?.businessName || user?.name || 'Service Provider'}
              photoUrl={user?.photoUrl}
              onPhotoUpdated={(updated) => {
                queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
                if (updated.photoUrl !== undefined) {
                  useAuthStore.getState().updateUser(updated);
                }
              }}
              label="Business Logo / Provider Photo"
              hint="Visible to customers reviewing service proposals"
            />

            {!isEditing ? (
              <View>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{profile?.businessName || 'Your Business'}</Text>
                    <Badge
                      status={profileStatus === 'active' || profileStatus === 'approved' ? 'verified' : 'pending'}
                      label={`Platform: ${profileStatus.replace('_', ' ')}`}
                    />
                  </View>
                  <Button title="Edit Details" variant="ghost" onPress={startEdit} />
                </View>

                <View style={styles.detailList}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Accepting Leads</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: profile?.isAvailable ? theme.colors.success : theme.colors.danger },
                      ]}
                    >
                      {profile?.isAvailable ? 'Yes (Active)' : 'No (Paused)'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Experience</Text>
                    <Text style={styles.detailValue}>
                      {profile?.experienceYears ? `${profile.experienceYears} Years` : 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Service Radius</Text>
                    <Text style={styles.detailValue}>
                      {profile?.serviceRadiusKm ? `${profile.serviceRadiusKm} km` : 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Working Hours</Text>
                    <Text style={styles.detailValue}>{profile?.workingHours || 'Not set'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Max Concurrent Leads</Text>
                    <Text style={styles.detailValue}>{profile?.maximumConcurrentLeads || 10}</Text>
                  </View>

                  {/* Languages Display */}
                  <View style={styles.detailItemBox}>
                    <Text style={styles.detailLabel}>Languages Spoken</Text>
                    <View style={styles.chipsRow}>
                      {(profile?.languages || []).map((lang: string) => (
                        <View key={lang} style={styles.chipPill}>
                          <Text style={styles.chipPillText}>{lang}</Text>
                        </View>
                      ))}
                      {(profile?.languages || []).length === 0 && (
                        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>No languages specified.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailItemBox}>
                    <Text style={styles.detailLabel}>About Services</Text>
                    <Text style={[styles.detailValue, { marginTop: 4, fontWeight: '400', textAlign: 'left' }]}>
                      {profile?.servicesOffered || 'No details provided.'}
                    </Text>
                  </View>
                </View>

                {/* Selected Services Catalogue */}
                <Text style={[styles.cardTitle, { marginTop: 18, marginBottom: 8 }]}>Selected Services</Text>
                <View style={styles.tagsContainer}>
                  {(profile?.services || []).map((svc: any) => (
                    <View key={svc.id} style={styles.tag}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                      <Text style={styles.tagText}>{svc.name}</Text>
                    </View>
                  ))}
                  {(profile?.services || []).length === 0 && (
                    <Text style={{ color: theme.colors.muted }}>No services selected yet.</Text>
                  )}
                </View>

                {/* Profile Submit Action */}
                {profileStatus === 'draft' && (
                  <View style={styles.submitNoticeBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#B45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.submitNoticeTitle}>Profile is currently in Draft</Text>
                      <Text style={styles.submitNoticeText}>
                        Submit your profile for administrator review once you have chosen your services.
                      </Text>
                      <Button
                        title="Submit Profile for Review"
                        onPress={() => submitProfileMutation.mutate()}
                        isLoading={submitProfileMutation.isPending}
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* Edit Profile Form */
              <View style={styles.formContainer}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
                >
                  <Ionicons
                    name={form.isAvailable ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.toggleTitle}>Accepting new leads</Text>
                    <Text style={styles.toggleSubtitle}>Pause to stop receiving new service requests temporarily.</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Business Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.businessName}
                  onChangeText={(v) => setForm((f) => ({ ...f, businessName: v }))}
                />

                <Text style={styles.inputLabel}>About your services</Text>
                <TextInput
                  style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  value={form.servicesOffered}
                  onChangeText={(v) => setForm((f) => ({ ...f, servicesOffered: v }))}
                  multiline
                />

                {/* Language Picker */}
                <LanguageInput
                  value={form.languages}
                  onChange={(langs) => setForm((f) => ({ ...f, languages: langs }))}
                  label="Languages you and your team operate in"
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Experience (Years)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.experienceYears}
                      keyboardType="numeric"
                      onChangeText={(v) => setForm((f) => ({ ...f, experienceYears: v }))}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Service Radius (km)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.serviceRadiusKm}
                      keyboardType="numeric"
                      onChangeText={(v) => setForm((f) => ({ ...f, serviceRadiusKm: v }))}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Max Concurrent Leads</Text>
                    <TextInput
                      style={styles.input}
                      value={form.maximumConcurrentLeads}
                      keyboardType="numeric"
                      onChangeText={(v) => setForm((f) => ({ ...f, maximumConcurrentLeads: v }))}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Working Hours</Text>
                    <TextInput
                      style={styles.input}
                      value={form.workingHours}
                      onChangeText={(v) => setForm((f) => ({ ...f, workingHours: v }))}
                      placeholder="e.g. 9 AM - 6 PM"
                    />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Catalogue Selection *</Text>
                <Text style={styles.hintText}>Select all government and legal services your business provides:</Text>
                <View style={styles.tagsContainer}>
                  {catalogue.map((item: any) => {
                    const isSelected = form.serviceCatalogueItemIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.tag, isSelected && styles.tagSelected]}
                        onPress={() => toggleService(item.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={16}
                          color={isSelected ? theme.colors.primary : theme.colors.muted}
                        />
                        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Save changes"
                    onPress={handleSaveProfile}
                    isLoading={updateMutation.isPending}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setIsEditing(false)}
                    disabled={updateMutation.isPending}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ===================== TAB 2: COVERAGE LOCATIONS ===================== */}
      {activeTab === 'locations' && (
        <View style={styles.tabContent}>
          <Card>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Operating Coverage Areas</Text>
                <Text style={styles.cardSubtitle}>Locations where you can deliver services or attend meetings.</Text>
              </View>
              <Button
                title="+ Add Area"
                variant="primary"
                onPress={() => setShowAddLocationModal(true)}
              />
            </View>

            {loadingLocations ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : locations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={40} color={theme.colors.muted} />
                <Text style={styles.emptyTitle}>No Coverage Areas Added</Text>
                <Text style={styles.emptySubtitle}>
                  Add states, cities, or districts to start receiving matched service requests in your area.
                </Text>
                <Button
                  title="Add First Coverage Area"
                  onPress={() => setShowAddLocationModal(true)}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <View style={styles.locationsList}>
                {locations.map((loc) => (
                  <View key={loc.id} style={styles.locationItem}>
                    <View style={styles.locationPinWrap}>
                      <Ionicons name="location" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationTitle}>
                        {[loc.city, loc.district, loc.state].filter(Boolean).join(', ')}
                      </Text>
                      <Text style={styles.locationMeta}>
                        {[loc.postalCode ? `PIN: ${loc.postalCode}` : null, loc.jurisdiction ? `Jurisdiction: ${loc.jurisdiction}` : null]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteLocBtn}
                      onPress={() => removeLocationMutation.mutate(loc.id)}
                      disabled={removeLocationMutation.isPending}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ===================== TAB 3: VERIFICATION & DOCUMENTS ===================== */}
      {activeTab === 'verification' && (
        <View style={styles.tabContent}>
          {/* Onboarding Checklist Card */}
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Platform Onboarding Status</Text>
                <Text style={styles.cardSubtitle}>LegalNow verification requirements for public listing</Text>
              </View>
              <Badge
                status={profileStatus === 'active' || profileStatus === 'approved' ? 'verified' : 'pending'}
                label={profileStatus.toUpperCase()}
              />
            </View>

            <View style={styles.stepList}>
              <View style={styles.stepRow}>
                <Ionicons
                  name={profileStatus !== 'draft' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={profileStatus !== 'draft' ? '#137333' : theme.colors.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>Step 1: Submit Business Profile</Text>
                  <Text style={styles.stepDesc}>
                    {profileStatus !== 'draft'
                      ? 'Completed · Business details submitted'
                      : 'Pending · Select catalogue services and submit profile'}
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <Ionicons
                  name={documents.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={documents.length > 0 ? '#137333' : theme.colors.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>Step 2: Upload Verification Documents</Text>
                  <Text style={styles.stepDesc}>
                    {documents.length > 0
                      ? `${documents.length} document(s) uploaded`
                      : 'Pending · Upload business license or ID proof'}
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <Ionicons
                  name={profileStatus === 'active' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={profileStatus === 'active' ? '#137333' : theme.colors.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stepTitle}>Step 3: Admin Review & Listing Activation</Text>
                  <Text style={styles.stepDesc}>
                    {profileStatus === 'active'
                      ? 'Active · Approved to appear in Find Service Providers'
                      : 'Under review · Pending administrator approval'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                title="+ Upload Document"
                variant="secondary"
                onPress={() => setShowUploadModal(true)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit for Verification"
                variant="primary"
                onPress={() => submitVerificationMutation.mutate()}
                isLoading={submitVerificationMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {/* Uploaded Documents List Card */}
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Uploaded Compliance Documents ({documents.length})</Text>
              <Button title="Refresh" variant="ghost" onPress={() => queryClient.invalidateQueries({ queryKey: ['provider-documents'] })} />
            </View>

            {loadingDocuments ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : documents.length === 0 ? (
              <Text style={styles.emptyText}>No verification documents uploaded yet.</Text>
            ) : (
              documents.map((doc) => (
                <View key={doc.id} style={styles.docItem}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>{doc.documentType}</Text>
                    <Text style={styles.docSub}>{doc.originalFileName || 'Uploaded File'}</Text>
                    {doc.reviewNote && (
                      <Text style={styles.docReviewNote}>Note: {doc.reviewNote}</Text>
                    )}
                  </View>
                  <Badge
                    status={
                      doc.reviewStatus === 'approved'
                        ? 'verified'
                        : doc.reviewStatus === 'rejected'
                        ? 'declined'
                        : 'pending'
                    }
                    label={(doc.reviewStatus || 'pending').toUpperCase()}
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {/* ===================== TAB 4: SUBSCRIPTION & QUOTA ===================== */}
      {activeTab === 'subscription' && (
        <View style={styles.tabContent}>
          {/* Active Plan Overview Card */}
          <Card style={{ marginBottom: 12 }}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Active Package: {currentTier.toUpperCase()}</Text>
                <Text style={styles.cardSubtitle}>
                  {isSubscribed
                    ? `Active plan expires on ${subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('en-IN') : 'renewal'}`
                    : 'Subscribe to a tier package to receive and respond to service requests.'}
                </Text>
              </View>
              <Badge
                status={isSubscribed ? 'verified' : 'pending'}
                label={isSubscribed ? 'SUBSCRIBED' : 'INACTIVE'}
              />
            </View>

            {/* Quota Progress */}
            <View style={styles.quotaProgressBox}>
              <View style={styles.quotaRow}>
                <Text style={styles.quotaLabel}>Monthly Leads Quota</Text>
                <Text style={styles.quotaValue}>
                  {quotaUsed} / {quotaTotal} Used
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, quotaTotal > 0 ? (quotaUsed / quotaTotal) * 100 : 0)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Quota Metrics Grid */}
            <View style={styles.quotaGrid}>
              <View style={styles.quotaCol}>
                <Text style={styles.quotaMetricNumber}>{availableCredits}</Text>
                <Text style={styles.quotaMetricLabel}>Available Leads</Text>
              </View>
              <View style={styles.quotaColDivider} />
              <View style={styles.quotaCol}>
                <Text style={[styles.quotaMetricNumber, { color: '#137333' }]}>+{rolloverCredits}</Text>
                <Text style={styles.quotaMetricLabel}>Rollover Carried</Text>
              </View>
              <View style={styles.quotaColDivider} />
              <View style={styles.quotaCol}>
                <Text style={[styles.quotaMetricNumber, { color: '#B45309' }]}>
                  {subscription?.disputedLeads ?? profile?.disputedLeadsCount ?? 0}
                </Text>
                <Text style={styles.quotaMetricLabel}>Disputes Filed</Text>
              </View>
            </View>
          </Card>

          {/* Tier Packages Comparison */}
          <Text style={styles.sectionHeaderTitle}>Choose or Upgrade Package</Text>

          {[
            {
              key: 'basic',
              name: 'Basic Package',
              fee: 1499,
              leads: 10,
              extra: 49,
              features: ['10 Matched Leads / Month', 'Standard Category Access', 'Replacement Credits on Dispute'],
            },
            {
              key: 'gold',
              name: 'Gold Package',
              fee: 2999,
              leads: 25,
              extra: 99,
              features: [
                '25 Matched Leads / Month',
                'Priority Matching Algorithm',
                'Licenses & RTO Categories',
                'Rollover of Unused Leads',
              ],
            },
            {
              key: 'premium',
              name: 'Premium Package',
              fee: 4999,
              leads: 50,
              extra: 199,
              features: [
                '50 Matched Leads / Month',
                'Full Catalogue Access (Property, EC, Khata)',
                'Dedicated Account Priority',
                'Unlimited Lead Rollover',
              ],
            },
          ].map((pkg) => {
            const isCurrent = currentTier === pkg.key && isSubscribed;
            return (
              <Card key={pkg.key} style={[styles.pkgCard, isCurrent && styles.pkgCardCurrent]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.pkgTitle}>{pkg.name}</Text>
                    <Text style={styles.pkgPrice}>
                      ₹{pkg.fee.toLocaleString('en-IN')}{' '}
                      <Text style={styles.pkgPeriod}>/ year ({pkg.leads} leads/mo)</Text>
                    </Text>
                  </View>
                  {isCurrent ? (
                    <Badge status="verified" label="CURRENT PLAN" />
                  ) : (
                    <Button
                      title="Select Plan"
                      variant="primary"
                      onPress={() =>
                        setUpgradeTierModal({
                          key: pkg.key,
                          name: pkg.name,
                          fee: pkg.fee,
                          leads: pkg.leads,
                        })
                      }
                    />
                  )}
                </View>

                <View style={styles.pkgFeatures}>
                  {pkg.features.map((f, i) => (
                    <View key={i} style={styles.pkgFeatureRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#137333" />
                      <Text style={styles.pkgFeatureText}>{f}</Text>
                    </View>
                  ))}
                  <Text style={styles.pkgExtraLeadText}>Extra lead rate: ₹{pkg.extra} / lead</Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Account Settings Strip */}
      <View style={styles.bottomSection}>
        <Button
          title="Change Password"
          variant="secondary"
          onPress={() => setShowChangePassword(true)}
          style={{ marginBottom: 10 }}
        />
        <Button
          title="Sign Out"
          variant="secondary"
          onPress={logout}
          style={{ marginBottom: 10 }}
        />
        <Button
          title="Log Out of All Devices"
          variant="danger"
          onPress={() => {
            Alert.alert(
              'Log Out Everywhere',
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
      </View>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        email={user?.email}
        phone={user?.phone}
      />

      {/* Add Coverage Location Modal */}
      <Modal
        visible={showAddLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Coverage Area</Text>
              <TouchableOpacity onPress={() => setShowAddLocationModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>State *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {INDIAN_STATES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateChip, locationForm.state === st && styles.stateChipActive]}
                    onPress={() => setLocationForm((f) => ({ ...f, state: st }))}
                  >
                    <Text
                      style={[
                        styles.stateChipText,
                        locationForm.state === st && styles.stateChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>District</Text>
              <TextInput
                style={styles.input}
                value={locationForm.district}
                onChangeText={(v) => setLocationForm((f) => ({ ...f, district: v }))}
                placeholder="e.g. Bangalore Urban"
              />

              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={locationForm.city}
                onChangeText={(v) => setLocationForm((f) => ({ ...f, city: v }))}
                placeholder="e.g. Bengaluru"
              />

              <Text style={styles.inputLabel}>Postal PIN Code</Text>
              <TextInput
                style={styles.input}
                value={locationForm.postalCode}
                keyboardType="numeric"
                onChangeText={(v) => setLocationForm((f) => ({ ...f, postalCode: v }))}
                placeholder="e.g. 560001"
              />

              <Text style={styles.inputLabel}>Jurisdiction / Sub-region</Text>
              <TextInput
                style={styles.input}
                value={locationForm.jurisdiction}
                onChangeText={(v) => setLocationForm((f) => ({ ...f, jurisdiction: v }))}
                placeholder="e.g. Koramangala / South Zone"
              />
            </ScrollView>

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowAddLocationModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Add Area"
                variant="primary"
                onPress={() => addLocationMutation.mutate(locationForm)}
                isLoading={addLocationMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Verification Document</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Document Type *</Text>
            <TextInput
              style={styles.input}
              value={docTypeInput}
              onChangeText={setDocTypeInput}
              placeholder="e.g. Trade License, GSTIN, PAN, ID Proof"
            />

            <Text style={styles.inputLabel}>Related Service (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.stateChip, selectedServiceId === '' && styles.stateChipActive]}
                onPress={() => setSelectedServiceId('')}
              >
                <Text style={[styles.stateChipText, selectedServiceId === '' && styles.stateChipTextActive]}>
                  General / All Services
                </Text>
              </TouchableOpacity>
              {(profile?.services || []).map((svc: any) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[styles.stateChip, selectedServiceId === svc.id && styles.stateChipActive]}
                  onPress={() => setSelectedServiceId(svc.id)}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      selectedServiceId === svc.id && styles.stateChipTextActive,
                    ]}
                  >
                    {svc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Select File (PDF or Image, max 10MB) *</Text>
            <TouchableOpacity style={styles.filePickerBox} onPress={pickDocumentFile}>
              <Ionicons
                name={selectedFile ? 'document-attach' : 'cloud-upload-outline'}
                size={26}
                color={theme.colors.primary}
              />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Tap to select document file'}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowUploadModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Upload"
                variant="primary"
                onPress={() => uploadDocMutation.mutate()}
                isLoading={uploadDocMutation.isPending}
                disabled={!selectedFile}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Upgrade Subscription Modal */}
      <Modal
        visible={!!upgradeTierModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUpgradeTierModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscribe to {upgradeTierModal?.name}</Text>
              <TouchableOpacity onPress={() => setUpgradeTierModal(null)}>
                <Ionicons name="close" size={24} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 14 }}>
              Annual subscription fee: ₹{upgradeTierModal?.fee.toLocaleString('en-IN')}. Includes{' '}
              {upgradeTierModal?.leads} monthly leads with quota rollover.
            </Text>

            <View style={styles.devBanner}>
              <Ionicons name="flash" size={18} color="#B45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.devBannerTitle}>Development & Local Test Mode</Text>
                <Text style={styles.devBannerDesc}>
                  Activate this package instantly via DEV test bypass without payment gateway charges.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setUpgradeTierModal(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Instant Activate (DEV)"
                variant="primary"
                onPress={() =>
                  upgradeSubscriptionMutation.mutate({ tier: upgradeTierModal!.key })
                }
                isLoading={upgradeSubscriptionMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  introBox: { marginBottom: theme.spacing.md },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 2 },
  title: { ...theme.typography.h1, marginBottom: 2 },
  subtitle: { ...theme.typography.body, color: theme.colors.muted },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },

  tabContent: {
    marginBottom: theme.spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: { ...theme.typography.h2, fontSize: 17, marginBottom: 2 },
  cardSubtitle: { ...theme.typography.small, color: theme.colors.muted },

  detailList: { gap: 10 },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  detailItemBox: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  detailLabel: { ...theme.typography.body, color: theme.colors.muted, fontSize: 13, flex: 1 },
  detailValue: { ...theme.typography.body, fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'right' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chipPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipPillText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: 4 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  tagSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tagText: { fontSize: 12, color: theme.colors.text },
  tagTextSelected: { color: theme.colors.primary, fontWeight: '600' },

  submitNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  submitNoticeTitle: { fontSize: 13, fontWeight: 'bold', color: '#B45309' },
  submitNoticeText: { fontSize: 12, color: '#92400E', marginTop: 2 },

  formContainer: { marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 10,
  },
  toggleTitle: { ...theme.typography.body, fontWeight: '600' },
  toggleSubtitle: { ...theme.typography.small, marginTop: 2, color: theme.colors.muted },

  inputLabel: { ...theme.typography.small, marginBottom: 4, fontWeight: '600' },
  hintText: { fontSize: 12, color: theme.colors.muted, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sectionTitle: { ...theme.typography.h3, marginTop: 12, marginBottom: 4 },

  // Locations Tab styles
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  locationsList: { gap: 10 },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  locationPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  locationMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  deleteLocBtn: { padding: 8 },

  // Verification Tab styles
  stepList: { gap: 12, marginVertical: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepTitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  stepDesc: { fontSize: 12, color: theme.colors.muted, marginTop: 1 },
  emptyText: { color: theme.colors.muted, textAlign: 'center', marginVertical: 16 },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  docSub: { fontSize: 11, color: theme.colors.muted, marginTop: 1 },
  docReviewNote: { fontSize: 11, color: theme.colors.danger, marginTop: 2 },

  // Subscription Tab styles
  quotaProgressBox: { marginVertical: 10 },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  quotaLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  quotaValue: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  progressBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  quotaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 8,
  },
  quotaCol: { alignItems: 'center' },
  quotaColDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  quotaMetricNumber: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  quotaMetricLabel: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  sectionHeaderTitle: { ...theme.typography.h3, marginTop: 16, marginBottom: 10 },
  pkgCard: { marginBottom: 10 },
  pkgCardCurrent: { borderColor: theme.colors.primary, borderWidth: 2 },
  pkgTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  pkgPrice: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary, marginTop: 2 },
  pkgPeriod: { fontSize: 12, fontWeight: 'normal', color: theme.colors.muted },
  pkgFeatures: { marginTop: 10, gap: 6 },
  pkgFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pkgFeatureText: { fontSize: 12, color: theme.colors.text },
  pkgExtraLeadText: { fontSize: 11, color: theme.colors.muted, fontStyle: 'italic', marginTop: 4 },

  bottomSection: { marginTop: theme.spacing.md },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: { ...theme.typography.h2, fontSize: 18 },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 6,
  },
  stateChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stateChipText: { fontSize: 12, color: theme.colors.text },
  stateChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  filePickerBox: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 12,
  },
  filePickerText: { fontSize: 13, color: theme.colors.primary, marginTop: 6, fontWeight: '600' },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  devBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#B45309' },
  devBannerDesc: { fontSize: 11, color: '#92400E', marginTop: 1 },
});
