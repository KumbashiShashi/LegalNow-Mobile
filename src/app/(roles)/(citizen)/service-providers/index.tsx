import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { ServiceCatalogueItem } from '../../../../types/api';

const fetchServices = async (): Promise<ServiceCatalogueItem[]> => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

export default function ServiceProviderDirectoryScreen() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['service-catalogue'],
    queryFn: fetchServices,
  });

  const {
    data: providers = [],
    isLoading: loadingProviders,
    refetch: executeSearch,

  } = useQuery({
    queryKey: ['service-providers', selectedServiceId, city, postalCode],
    queryFn: async () => {
      if (!selectedServiceId) return [];
      const { data } = await apiClient.get('/service-marketplace/providers', {
        params: {
          serviceId: selectedServiceId,
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: false,
  });

  const handleSearch = () => {
    if (!selectedServiceId) return;
    setHasSearched(true);
    executeSearch();
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Service Providers', headerShown: true }} />

      <FlatList
        data={providers}
        keyExtractor={(item: any) => item.id || item.businessName}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Independent service marketplace</Text>
            <Text style={styles.title}>Find Verified Providers</Text>
            <Text style={styles.subtitle}>
              Browse active, identity-verified service providers whose service eligibility and documents have been approved.
            </Text>

            {/* Service Category Selector */}
            <Text style={styles.sectionHeading}>1. Choose Service</Text>
            {loadingServices ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChipsRow}>
                {services.map((svc) => {
                  const isSelected = svc.id === selectedServiceId;
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[styles.serviceChip, isSelected && styles.serviceChipSelected]}
                      onPress={() => {
                        setSelectedServiceId(svc.id);
                        setHasSearched(false);
                      }}
                    >
                      <Text style={[styles.serviceChipCategory, isSelected && styles.serviceChipTextSelected]}>
                        {svc.category}
                      </Text>
                      <Text style={[styles.serviceChipName, isSelected && styles.serviceChipTextSelected]}>
                        {svc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {selectedService && (
              <View style={styles.selectedServiceBanner}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedServiceTitle}>{selectedService.name}</Text>
                  <Text style={styles.selectedServiceDesc}>
                    {selectedService.description || `Specialized service under ${selectedService.category}.`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Badge status="verified" label={`${selectedService.requiredSubscriptionTier || 'Basic'} Tier`} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                      Indicative Fee: ₹{(selectedService.estimatedPriceMin || 1500).toLocaleString('en-IN')} – ₹{(selectedService.estimatedPriceMax || 3500).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Location Filters */}
            <Text style={styles.sectionHeading}>2. Location (Optional)</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="City (e.g. Bengaluru)"
                placeholderTextColor={theme.colors.muted}
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[styles.input, { width: 120 }]}
                placeholder="PIN Code"
                placeholderTextColor={theme.colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                value={postalCode}
                onChangeText={setPostalCode}
              />
            </View>

            <Button
              title={loadingProviders ? 'Searching Providers...' : 'Search Verified Providers'}
              onPress={handleSearch}
              disabled={!selectedServiceId || loadingProviders}
              style={{ marginTop: 8, marginBottom: 16 }}
            />

            {hasSearched && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {providers.length} {providers.length === 1 ? 'Provider' : 'Providers'} Found
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <Card
            style={styles.providerCard}
            onPress={() => {
              router.push({
                pathname: '/(roles)/(citizen)/service-providers/[id]',
                params: {
                  id: item.id,
                  name: item.businessName || item.name,
                  serviceName: selectedService?.name,
                  serviceCategory: selectedService?.category,
                  city: item.city,
                  state: item.state,
                  experienceYears: item.experienceYears != null ? String(item.experienceYears) : undefined,
                  workingHours: item.workingHours,
                  servicesOffered: item.servicesOffered,
                  serviceId: selectedServiceId,
                },
              });
            }}
          >
            <View style={styles.providerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{item.businessName || item.name || 'Verified Provider'}</Text>
                <Text style={styles.providerLocation}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.muted} />{' '}
                  {item.city ? `${item.city}, ${item.state || ''}` : 'Regional Service'}
                </Text>
              </View>
              <Badge status="verified" label="Identity & Docs Verified" />
            </View>

            <View style={styles.providerStats}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Experience</Text>
                <Text style={styles.statValue}>
                  {item.experienceYears ? `${item.experienceYears} Years` : 'Established'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Coverage Radius</Text>
                <Text style={styles.statValue}>
                  {item.serviceRadiusKm ? `${item.serviceRadiusKm} km` : 'Citywide'}
                </Text>
              </View>
            </View>

            {item.workingHours && (
              <Text style={styles.workingHoursText}>
                <Ionicons name="time-outline" size={12} color={theme.colors.muted} /> Hours: {item.workingHours}
              </Text>
            )}

            <Button
              title="Request This Service"
              onPress={() => {
                router.push({
                  pathname: '/(roles)/(citizen)/submit',
                  params: {
                    serviceId: selectedServiceId,
                    serviceName: selectedService?.name,
                    category: selectedService?.category,
                  },
                });
              }}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
        ListEmptyComponent={
          hasSearched && !loadingProviders ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={44} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No Providers Found in This Area</Text>
              <Text style={styles.emptySubtitle}>
                Try clearing the city or PIN code filter to view all verified providers offering this service.
              </Text>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    ...theme.typography.eyebrow,
    marginBottom: 4,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  serviceChipsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  serviceChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
    maxWidth: 200,
  },
  serviceChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  serviceChipCategory: {
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serviceChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  serviceChipTextSelected: {
    color: '#FFFFFF',
  },
  selectedServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FE',
    borderWidth: 1,
    borderColor: '#C2DCFD',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  selectedServiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  selectedServiceDesc: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  resultsHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  providerCard: {
    marginBottom: 12,
    padding: theme.spacing.md,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  providerName: {
    ...theme.typography.h3,
    marginBottom: 2,
  },
  providerLocation: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  providerStats: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    marginVertical: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  workingHoursText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  emptyTitle: {
    ...theme.typography.h3,
    marginTop: 12,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
});
