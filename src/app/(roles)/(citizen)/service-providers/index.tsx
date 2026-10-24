import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import { ServiceCatalogueItem } from '../../../../types/api';
import {
  GOVT_SERVICE_FILTERS,
  PRIVATE_SERVICE_FILTERS,
  SERVICE_DEFAULT_SEARCH_SUGGESTIONS,
  ServiceCategoryFilter,
} from '../../../../utils/directoryFilters';

const fetchServices = async (): Promise<ServiceCatalogueItem[]> => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

export default function ServiceProviderDirectoryScreen() {
  const params = useLocalSearchParams<{ serviceId?: string; filterId?: string; type?: 'all' | 'govt' | 'private'; search?: string }>();

  const initialFilter = params.filterId
    ? [...GOVT_SERVICE_FILTERS, ...PRIVATE_SERVICE_FILTERS].find((f) => f.id === params.filterId)
    : undefined;

  const [activeTab, setActiveTab] = useState<'all' | 'govt' | 'private'>(
    params.type || (initialFilter ? initialFilter.type : 'all')
  );
  const [selectedFilterId, setSelectedFilterId] = useState<string>(params.filterId || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(params.serviceId || '');
  const [searchQuery, setSearchQuery] = useState(params.search || initialFilter?.name || '');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [hasSearched, setHasSearched] = useState(Boolean(params.filterId || params.serviceId));

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['service-catalogue'],
    queryFn: fetchServices,
  });

  const activeFilter = [...GOVT_SERVICE_FILTERS, ...PRIVATE_SERVICE_FILTERS].find((f) => f.id === selectedFilterId);

  const matchedServiceFromFilter = activeFilter && services.length > 0
    ? services.find(
        (s) =>
          s.name.toLowerCase().includes(activeFilter.suggestedCatalogueQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(activeFilter.suggestedCatalogueQuery.toLowerCase())
      ) || services[0]
    : undefined;

  const effectiveServiceId = selectedServiceId || matchedServiceFromFilter?.id || '';

  const {
    data: providers = [],
    isLoading: loadingProviders,
    refetch: executeSearch,
  } = useQuery({
    queryKey: ['service-providers', effectiveServiceId, city, postalCode],
    queryFn: async () => {
      if (!effectiveServiceId) return [];
      const { data } = await apiClient.get('/service-marketplace/providers', {
        params: {
          serviceId: effectiveServiceId,
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(effectiveServiceId && (hasSearched || params.filterId || params.serviceId)),
  });

  const handleIconCategoryPress = (filter: ServiceCategoryFilter) => {
    if (selectedFilterId === filter.id) {
      setSelectedFilterId('');
      setSelectedServiceId('');
      setHasSearched(false);
      return;
    }

    setSelectedFilterId(filter.id);
    setActiveTab(filter.type);
    setSearchQuery(filter.name);

    // Find closest catalogue match
    const matchedService = services.find(
      (s) =>
        s.name.toLowerCase().includes(filter.suggestedCatalogueQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(filter.suggestedCatalogueQuery.toLowerCase())
    ) || services[0];

    if (matchedService) {
      setSelectedServiceId(matchedService.id);
    }
    setHasSearched(true);
  };

  const handleSuggestionPillPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    // Find matching filter or service
    const matchedService = services.find(
      (s) =>
        suggestion.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(suggestion.toLowerCase())
    ) || services[0];

    if (matchedService) {
      setSelectedServiceId(matchedService.id);
      setHasSearched(true);
    }
  };

  const handleManualSearch = () => {
    if (!effectiveServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
    setHasSearched(true);
    executeSearch();
  };

  const selectedService = services.find((s) => s.id === effectiveServiceId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Find Service Providers', headerShown: true }} />

      <FlatList
        data={providers}
        keyExtractor={(item: any) => item.id || item.businessName}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Independent service marketplace</Text>
            <Text style={styles.title}>Find Verified Providers</Text>
            <Text style={styles.subtitle}>
              Browse government process facilitators and private business service professionals with verified identity and credentials.
            </Text>

            {/* Primary Govt vs Private vs All Toggle */}
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
                  All Services
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'govt' && styles.tabButtonActive]}
                onPress={() => setActiveTab('govt')}
              >
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={activeTab === 'govt' ? '#FFF' : '#1A73E8'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, activeTab === 'govt' && styles.tabButtonTextActive]}>
                  Govt Services
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'private' && styles.tabButtonActive]}
                onPress={() => setActiveTab('private')}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={activeTab === 'private' ? '#FFF' : '#137333'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, activeTab === 'private' && styles.tabButtonTextActive]}>
                  Private & Pro
                </Text>
              </TouchableOpacity>
            </View>

            {/* Text Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={theme.colors.muted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search service (e.g. RTO, BESCOM, Khata, CA)..."
                placeholderTextColor={theme.colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Text Filter with Default List of Services */}
            <Text style={styles.sectionHeading}>Common Services</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={{ paddingRight: 16 }}>
              {SERVICE_DEFAULT_SEARCH_SUGGESTIONS.map((suggestion) => {
                const isSelected = searchQuery.toLowerCase() === suggestion.toLowerCase();
                return (
                  <TouchableOpacity
                    key={suggestion}
                    style={[styles.suggestionPill, isSelected && styles.suggestionPillActive]}
                    onPress={() => handleSuggestionPillPress(suggestion)}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={12}
                      color={isSelected ? '#FFF' : theme.colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.suggestionPillText, isSelected && styles.suggestionPillTextActive]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Government UI Image / Icon Filters */}
            {(activeTab === 'all' || activeTab === 'govt') && (
              <View style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <Ionicons name="shield-checkmark" size={16} color="#1A73E8" />
                  <Text style={styles.categorySectionTitle}>Government Services & Boards</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={{ paddingRight: 16 }}>
                  {GOVT_SERVICE_FILTERS.map((f) => {
                    const isSelected = selectedFilterId === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.iconCard, isSelected && { borderColor: f.color, backgroundColor: f.bg }]}
                        onPress={() => handleIconCategoryPress(f)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.iconCircle, { backgroundColor: f.bg }]}>
                          <Ionicons name={f.iconName as any} size={22} color={f.color} />
                        </View>
                        <Text style={[styles.iconCardTitle, isSelected && { color: f.color, fontWeight: '700' }]}>
                          {f.name}
                        </Text>
                        <Text style={styles.iconCardBadge}>{f.badge}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Private UI Image / Icon Filters */}
            {(activeTab === 'all' || activeTab === 'private') && (
              <View style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <Ionicons name="construct" size={16} color="#E65100" />
                  <Text style={styles.categorySectionTitle}>Private Trade & Professional Services</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={{ paddingRight: 16 }}>
                  {PRIVATE_SERVICE_FILTERS.map((f) => {
                    const isSelected = selectedFilterId === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.iconCard, isSelected && { borderColor: f.color, backgroundColor: f.bg }]}
                        onPress={() => handleIconCategoryPress(f)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.iconCircle, { backgroundColor: f.bg }]}>
                          <Ionicons name={f.iconName as any} size={22} color={f.color} />
                        </View>
                        <Text style={[styles.iconCardTitle, isSelected && { color: f.color, fontWeight: '700' }]}>
                          {f.name}
                        </Text>
                        <Text style={styles.iconCardBadge}>{f.badge}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Selected Service Context Banner */}
            {activeFilter && (
              <View style={[styles.activeFilterBanner, { backgroundColor: activeFilter.bg, borderColor: activeFilter.color }]}>
                <Ionicons name={activeFilter.iconName as any} size={24} color={activeFilter.color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.activeFilterTitle, { color: activeFilter.color }]}>
                    {activeFilter.name} ({activeFilter.badge})
                  </Text>
                  <Text style={styles.activeFilterDesc}>{activeFilter.description}</Text>
                  <Text style={styles.activeFilterSamples}>
                    Common requests: {activeFilter.sampleServices.join(' • ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Service Catalogue Chips Selection */}
            <Text style={styles.sectionHeading}>Linked Catalogue Service</Text>
            {loadingServices ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChipsRow} contentContainerStyle={{ paddingRight: 16 }}>
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

            {/* Location & Search Controls */}
            <Text style={styles.sectionHeading}>Location & Search</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="City (e.g. Bengaluru)"
                placeholderTextColor={theme.colors.muted}
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[styles.input, { width: 110 }]}
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
              onPress={handleManualSearch}
              disabled={!selectedServiceId || loadingProviders}
              style={{ marginTop: 8, marginBottom: 16 }}
            />

            {hasSearched && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {providers.length} Verified {providers.length === 1 ? 'Provider' : 'Providers'} Available
                </Text>
                {(selectedFilterId || searchQuery || city || postalCode) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFilterId('');
                      setSearchQuery('');
                      setCity('');
                      setPostalCode('');
                      setHasSearched(false);
                    }}
                  >
                    <Text style={styles.clearLink}>Clear filters</Text>
                  </TouchableOpacity>
                )}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: 16 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 4 },
  title: { ...theme.typography.h1, marginBottom: 4 },
  subtitle: { ...theme.typography.body, color: theme.colors.muted, marginBottom: 14 },
  tabToggleRow: { flexDirection: 'row', backgroundColor: '#E9EEF4', borderRadius: 8, padding: 3, marginBottom: 12 },
  tabButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  tabButtonActive: { backgroundColor: theme.colors.primary },
  tabButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.secondary },
  tabButtonTextActive: { color: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.text },
  sectionHeading: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 6, marginTop: 6 },
  pillsScroll: { flexDirection: 'row', marginBottom: 12 },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FE',
    borderWidth: 1,
    borderColor: '#D2E3FC',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  suggestionPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  suggestionPillText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  suggestionPillTextActive: { color: '#FFFFFF' },
  categorySection: { marginBottom: 12 },
  categorySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  categorySectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary },
  iconScroll: { flexDirection: 'row' },
  iconCard: {
    width: 96,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  iconCardTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  iconCardBadge: { fontSize: 9, color: theme.colors.muted, marginTop: 2, textAlign: 'center' },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  activeFilterTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  activeFilterDesc: { fontSize: 12, color: theme.colors.text, lineHeight: 16 },
  activeFilterSamples: { fontSize: 11, color: theme.colors.muted, marginTop: 4 },
  serviceChipsRow: { flexDirection: 'row', marginBottom: 12 },
  serviceChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
    maxWidth: 220,
  },
  serviceChipSelected: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  serviceChipCategory: { fontSize: 10, color: theme.colors.muted, fontWeight: '600', textTransform: 'uppercase' },
  serviceChipName: { fontSize: 12, color: theme.colors.text, marginTop: 2 },
  serviceChipTextSelected: { color: '#FFFFFF' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: theme.colors.text,
  },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsCount: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary },
  clearLink: { fontSize: 12, color: theme.colors.primary, fontWeight: '700' },
  providerCard: { padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  providerName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  providerLocation: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  providerStats: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 6, padding: 8, marginTop: 10, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: theme.colors.muted, textTransform: 'uppercase' },
  statValue: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.colors.border },
  workingHoursText: { fontSize: 12, color: theme.colors.muted, marginTop: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.secondary, marginTop: 10 },
  emptySubtitle: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
});
