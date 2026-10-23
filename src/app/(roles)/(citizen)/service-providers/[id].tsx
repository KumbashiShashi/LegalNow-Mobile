import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';

const fetchProviderProfile = async (id: string) => {
  const { data } = await apiClient.get(`/service-marketplace/directory/${id}`);
  return data;
};

export default function ServiceProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['service-provider', id],
    queryFn: () => fetchProviderProfile(id),
  });

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
        <Text style={styles.errorText}>Could not load service provider profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: profile.businessName, headerShown: true }} />

      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.businessName}</Text>
            <Text style={styles.location}>
              <Ionicons name="location-outline" size={14} /> {profile.city}, {profile.state}
            </Text>
          </View>
          <Badge status={profile.isVerified ? 'verified' : 'pending'} />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience:</Text>
          <Text style={styles.detailValue}>{profile.experienceYears ? `${profile.experienceYears} Years` : 'Not specified'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Working Hours:</Text>
          <Text style={styles.detailValue}>{profile.workingHours || 'Not specified'}</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Services Offered</Text>
      <View style={styles.tagsContainer}>
        {(profile.services || []).map((svc: any) => (
          <View key={svc.id} style={styles.serviceItem}>
            <Text style={styles.serviceName}>{svc.name}</Text>
            <Text style={styles.serviceCategory}>{svc.category}</Text>
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
  headerCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  name: { ...theme.typography.h2, marginBottom: 4 },
  location: { ...theme.typography.body, color: theme.colors.muted },
  detailRow: { flexDirection: 'row', marginBottom: 4 },
  detailLabel: { ...theme.typography.body, color: theme.colors.muted, width: 120 },
  detailValue: { ...theme.typography.body, fontWeight: '500', flex: 1 },
  sectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm },
  tagsContainer: { gap: 8 },
  serviceItem: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  serviceName: { ...theme.typography.body, fontWeight: '600' },
  serviceCategory: { ...theme.typography.small, color: theme.colors.muted, marginTop: 2 },
});
