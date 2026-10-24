import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
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

// Known active service with verified provider in PostgreSQL
const PRIMARY_LICENCE_SERVICE_ID = 'b1d4e8a0-6c3f-4a91-8d20-000000000003';

const fetchProvidersForService = async (serviceId: string, city?: string, postalCode?: string) => {
  if (!serviceId) return [];
  try {
    const { data } = await apiClient.get('/service-marketplace/providers', {
      params: {
        serviceId,
        city: city?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
      },
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
  const [searchQuery, setSearchQuery] = useState(params.search || initialFilter?.name || '');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // 1. Fetch active service catalogue items
  const { data: services = [], isLoading: loadingServices, error: errorServices } = useQuery({
    queryKey: ['service-catalogue'],
    queryFn: fetchServices,
  });

  // Determine active filter object
  const activeFilter = [...GOVT_SERVICE_FILTERS, ...PRIVATE_SERVICE_FILTERS].find((f) => f.id === selectedFilterId);

  // Find linked catalogue service from selected filter or param
  const linkedServiceId = useMemo(() => {
    if (params.serviceId) return params.serviceId;
    if (activeFilter && services.length > 0) {
      const match = services.find(
        (s) =>
          s.name.toLowerCase().includes(activeFilter.suggestedCatalogueQuery.toLowerCase()) ||
          s.category.toLowerCase().includes(activeFilter.suggestedCatalogueQuery.toLowerCase())
      );
      if (match) return match.id;
    }
    return PRIMARY_LICENCE_SERVICE_ID;
  }, [params.serviceId, activeFilter, services]);

  // 2. Fetch providers for the primary/selected service
  const { data: providers = [] } = useQuery({
    queryKey: ['service-providers', linkedServiceId, city, postalCode],
    queryFn: () => fetchProvidersForService(linkedServiceId, city, postalCode),
    enabled: Boolean(linkedServiceId),
  });

  // Client-side filtering of Catalogue Services
  const filteredServices = useMemo(() => {
    let list = services;

    // Filter by Tab (Govt vs Private vs All)
    if (activeTab === 'govt') {
      list = list.filter(
        (s) =>
          s.category.toLowerCase().includes('government') ||
          s.category.toLowerCase().includes('assocition') ||
          s.name.toLowerCase().includes('licence') ||
          s.name.toLowerCase().includes('process')
      );
    } else if (activeTab === 'private') {
      list = list.filter(
        (s) =>
          s.category.toLowerCase().includes('business') ||
          s.category.toLowerCase().includes('tax') ||
          s.category.toLowerCase().includes('other')
      );
    }

    // Filter by Selected Category Filter (e.g. RTO, Electricity, Nagara Palike, Home Contractors)
    if (activeFilter) {
      const targetQuery = activeFilter.suggestedCatalogueQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(targetQuery) ||
          s.category.toLowerCase().includes(targetQuery) ||
          activeFilter.sampleServices.some(
            (sample) => s.name.toLowerCase().includes(sample.toLowerCase()) || sample.toLowerCase().includes(s.name.toLowerCase())
          )
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCategory = s.category.toLowerCase().includes(q);
        const matchesDesc = s.description ? s.description.toLowerCase().includes(q) : false;

        // Check if query matches associated keyword/synonym
        const matchesKeyword =
          (q.includes('rto') || q.includes('licence') || q.includes('license') || q.includes('rc')) &&
          s.name.toLowerCase().includes('licence');
        const matchesElectricity =
          (q.includes('bescom') || q.includes('electricity') || q.includes('power')) &&
          (s.name.toLowerCase().includes('process') || s.name.toLowerCase().includes('local-authority'));
        const matchesWater =
          (q.includes('bwssb') || q.includes('water')) &&
          (s.name.toLowerCase().includes('application') || s.name.toLowerCase().includes('process'));
        const matchesKhata =
          (q.includes('bbmp') || q.includes('khata') || q.includes('palike')) &&
          s.name.toLowerCase().includes('local-authority');
        const matchesTax =
          (q.includes('tax') || q.includes('gst') || q.includes('itr')) &&
          (s.category.toLowerCase().includes('tax') || s.name.toLowerCase().includes('tax'));
        const matchesAudit =
          (q.includes('audit') || q.includes('ca')) &&
          s.name.toLowerCase().includes('compliance');
        const matchesAssociation =
          (q.includes('society') || q.includes('association') || q.includes('rwa') || q.includes('aoa')) &&
          s.category.toLowerCase().includes('assocition');

        return (
          matchesName ||
          matchesCategory ||
          matchesDesc ||
          matchesKeyword ||
          matchesElectricity ||
          matchesWater ||
          matchesKhata ||
          matchesTax ||
          matchesAudit ||
          matchesAssociation
        );
      });
    }

    return list;
  }, [services, activeTab, activeFilter, searchQuery]);

  // Client-side filtering of Providers
  const filteredProviders = useMemo(() => {
    let list = providers;

    // Filter by Tab
    if (activeTab === 'private') {
      // Ms Madhu Associates is Govt / Licence assistance
      list = list.filter((p: any) => !p.serviceCategory?.toLowerCase().includes('government'));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p: any) => {
        const name = (p.name || p.businessName || '').toLowerCase();
        const svc = (p.serviceName || '').toLowerCase();
        const cat = (p.serviceCategory || '').toLowerCase();
        const cityMatch = (p.city || '').toLowerCase();
        const offered = (p.servicesOffered || '').toLowerCase();
        return (
          name.includes(q) ||
          svc.includes(q) ||
          cat.includes(q) ||
          cityMatch.includes(q) ||
          offered.includes(q) ||
          (q.includes('rto') && svc.includes('licence')) ||
          (q.includes('licence') && svc.includes('licence'))
        );
      });
    }

    // Filter by City
    if (city.trim()) {
      const c = city.trim().toLowerCase();
      list = list.filter((p: any) => (p.city || '').toLowerCase().includes(c));
    }

    return list;
  }, [providers, activeTab, searchQuery, city]);

  const handleIconCategoryPress = (filter: ServiceCategoryFilter) => {
    if (selectedFilterId === filter.id) {
      setSelectedFilterId('');
    } else {
      setSelectedFilterId(filter.id);
      setActiveTab(filter.type);
    }
  };

  const handleSuggestionPillPress = (suggestion: string) => {
    if (searchQuery === suggestion) {
      setSearchQuery('');
    } else {
      setSearchQuery(suggestion);
    }
  };

  const handleClearFilters = () => {
    setSelectedFilterId('');
    setSearchQuery('');
    setCity('');
    setPostalCode('');
    setActiveTab('all');
  };

  const totalResultsCount = filteredProviders.length + filteredServices.length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Find Service Providers', headerShown: true }} />

      <FlatList
        data={[]}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Page Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Independent Service Marketplace</Text>
              <Text style={styles.title}>Find Verified Providers & Services</Text>
              <Text style={styles.subtitle}>
                LegalNow connects you with verified independent professionals and government process specialists. Facilitation & connection service only.
              </Text>
            </View>

            {/* Primary Tab Switcher: All, Govt, Private */}
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('all');
                  setSelectedFilterId('');
                }}
              >
                <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
                  All Services ({services.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'govt' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('govt');
                  setSelectedFilterId('');
                }}
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
                onPress={() => {
                  setActiveTab('private');
                  setSelectedFilterId('');
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={activeTab === 'private' ? '#FFF' : '#137333'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabButtonText, activeTab === 'private' && styles.tabButtonTextActive]}>
                  Private & Trade
                </Text>
              </TouchableOpacity>
            </View>

            {/* Global Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={theme.colors.muted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search service, provider, or board (e.g. RTO, BESCOM, Madhu, CA)..."
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
            <Text style={styles.sectionHeading}>Common Requests & Synonyms</Text>
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

            {/* Government Category Icons Scroll */}
            {(activeTab === 'all' || activeTab === 'govt') && (
              <View style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <Ionicons name="shield-checkmark" size={16} color="#1A73E8" />
                  <Text style={styles.categorySectionTitle}>Government Services & Boards</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={{ paddingRight: 16 }}>
                  {/* All Govt Chip */}
                  <TouchableOpacity
                    style={[
                      styles.iconCard,
                      activeTab === 'govt' && !selectedFilterId && styles.iconCardActive,
                    ]}
                    onPress={() => {
                      setActiveTab('govt');
                      setSelectedFilterId('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: activeTab === 'govt' && !selectedFilterId ? '#D2E3FC' : '#E8F0FE' }]}>
                      <Ionicons name="business" size={22} color="#1A73E8" />
                    </View>
                    <Text style={[styles.iconCardTitle, activeTab === 'govt' && !selectedFilterId && { color: '#1A73E8', fontWeight: '700' }]}>
                      All Govt
                    </Text>
                    <Text style={styles.iconCardBadge}>All Boards</Text>
                  </TouchableOpacity>

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

            {/* Private Category Icons Scroll */}
            {(activeTab === 'all' || activeTab === 'private') && (
              <View style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <Ionicons name="construct" size={16} color="#E65100" />
                  <Text style={styles.categorySectionTitle}>Private Trade & Professional Services</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={{ paddingRight: 16 }}>
                  {/* All Private Chip */}
                  <TouchableOpacity
                    style={[
                      styles.iconCard,
                      activeTab === 'private' && !selectedFilterId && styles.iconCardActive,
                    ]}
                    onPress={() => {
                      setActiveTab('private');
                      setSelectedFilterId('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: activeTab === 'private' && !selectedFilterId ? '#FED7AA' : '#FFF3E0' }]}>
                      <Ionicons name="briefcase" size={22} color="#E65100" />
                    </View>
                    <Text style={[styles.iconCardTitle, activeTab === 'private' && !selectedFilterId && { color: '#E65100', fontWeight: '700' }]}>
                      All Private
                    </Text>
                    <Text style={styles.iconCardBadge}>Trade & Pro</Text>
                  </TouchableOpacity>

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

            {/* Selected Filter Context Banner */}
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

            {/* Location Filters */}
            <View style={styles.filterRow}>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <Ionicons name="location-outline" size={16} color={theme.colors.muted} style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.inputInner}
                  placeholder="Filter City (e.g. Bengaluru)"
                  placeholderTextColor={theme.colors.muted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputBox, { width: 110 }]}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="PIN Code"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={postalCode}
                  onChangeText={setPostalCode}
                />
              </View>
            </View>

            {/* Results Count & Clear Button */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                Showing {totalResultsCount} verified {totalResultsCount === 1 ? 'option' : 'options'}
              </Text>
              {(selectedFilterId || searchQuery || city || postalCode || activeTab !== 'all') ? (
                <TouchableOpacity onPress={handleClearFilters}>
                  <Text style={styles.clearLink}>Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ============================================================== */}
            {/* SECTION 1: VERIFIED SERVICE PROVIDERS                          */}
            {/* ============================================================== */}
            {filteredProviders.length > 0 && (
              <View style={styles.providersSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#137333" />
                  <Text style={styles.sectionTitleText}>
                    Verified Independent Providers ({filteredProviders.length})
                  </Text>
                </View>

                {filteredProviders.map((provider: any) => (
                  <Card key={provider.id || provider.businessName} style={styles.providerCard}>
                    <View style={styles.providerHeader}>
                      <View style={styles.avatarWrap}>
                        <Text style={styles.avatarText}>
                          {(provider.name || provider.businessName || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.providerName}>
                          {provider.businessName || provider.name || 'Verified Provider'}
                        </Text>
                        <Text style={styles.providerLocation}>
                          <Ionicons name="location-outline" size={12} color={theme.colors.muted} />{' '}
                          {[provider.city, provider.state].filter(Boolean).join(', ') || 'Regional Service Area'}
                        </Text>
                        <View style={{ marginTop: 4 }}>
                          <Badge status="verified" label="Identity & Documents Approved" />
                        </View>
                      </View>
                    </View>

                    <View style={styles.serviceTagLine}>
                      <Text style={styles.serviceCategoryLabel}>
                        {provider.serviceCategory || 'Government Services'} · {provider.serviceName || 'Licence Assistance'}
                      </Text>
                    </View>

                    <View style={styles.providerStats}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Experience</Text>
                        <Text style={styles.statValue}>
                          {provider.experienceYears ? `${provider.experienceYears} Years` : 'Established'}
                        </Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Coverage</Text>
                        <Text style={styles.statValue}>Citywide</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={[styles.statValue, { color: '#137333' }]}>Active</Text>
                      </View>
                    </View>

                    {provider.servicesOffered ? (
                      <Text style={styles.servicesOfferedText} numberOfLines={2}>
                        {provider.servicesOffered}
                      </Text>
                    ) : (
                      <Text style={styles.servicesOfferedText}>
                        Provides verified assistance, documentation support, and end-to-end liaison.
                      </Text>
                    )}

                    <View style={styles.providerActionsRow}>
                      <TouchableOpacity
                        style={styles.requestButton}
                        onPress={() => {
                          router.push({
                            pathname: '/(roles)/(citizen)/submit',
                            params: {
                              serviceId: linkedServiceId,
                              serviceName: provider.serviceName || 'Licence-related assistance',
                              category: provider.serviceCategory || 'Government Services',
                            },
                          });
                        }}
                      >
                        <Ionicons name="send" size={14} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.requestButtonText}>Request This Service</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewProfileButton}
                        onPress={() => {
                          router.push({
                            pathname: '/(roles)/(citizen)/service-providers/[id]',
                            params: {
                              id: provider.id,
                              name: provider.businessName || provider.name,
                              serviceName: provider.serviceName,
                              serviceCategory: provider.serviceCategory,
                              city: provider.city,
                              state: provider.state,
                              experienceYears: provider.experienceYears != null ? String(provider.experienceYears) : undefined,
                              servicesOffered: provider.servicesOffered,
                              serviceId: linkedServiceId,
                            },
                          });
                        }}
                      >
                        <Text style={styles.viewProfileButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* ============================================================== */}
            {/* SECTION 2: SERVICE CATALOGUE & PRICING BANDS                   */}
            {/* ============================================================== */}
            <View style={styles.catalogueSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="list" size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitleText}>
                  Available Services & Indicative Fee Bands ({filteredServices.length})
                </Text>
              </View>

              {loadingServices ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
              ) : errorServices ? (
                <Text style={styles.errorText}>Could not load service catalogue. Please pull to refresh.</Text>
              ) : filteredServices.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={40} color={theme.colors.border} />
                  <Text style={styles.emptyTitle}>No matching services found</Text>
                  <Text style={styles.emptySubtitle}>Try choosing a different category or clearing your search query.</Text>
                  <TouchableOpacity style={styles.resetBtn} onPress={handleClearFilters}>
                    <Text style={styles.resetBtnText}>View All Services</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredServices.map((svc) => (
                  <Card key={svc.id} style={styles.serviceCatalogueCard}>
                    <View style={styles.serviceHeaderTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceCategoryBadgeText}>{svc.category}</Text>
                        <Text style={styles.serviceItemTitle}>{svc.name}</Text>
                      </View>
                      <Badge
                        status="open"
                        label={`${svc.requiredSubscriptionTier || 'basic'} tier`}
                      />
                    </View>

                    {/* Indicative Fee Band Highlight */}
                    <View style={styles.feeBandBox}>
                      <Ionicons name="pricetag-outline" size={15} color="#1A73E8" style={{ marginRight: 6 }} />
                      <Text style={styles.feeBandLabel}>Indicative Fee Band:</Text>
                      <Text style={styles.feeBandValue}>
                        ₹{(svc.estimatedPriceMin || 1500).toLocaleString('en-IN')} – ₹{(svc.estimatedPriceMax || 3500).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <Text style={styles.serviceGuidanceText}>
                      Direct connection with verified independent providers. Your request will be routed to qualified specialists in your area.
                    </Text>

                    <View style={styles.serviceCardFooter}>
                      <TouchableOpacity
                        style={styles.catalogueRequestBtn}
                        onPress={() => {
                          router.push({
                            pathname: '/(roles)/(citizen)/submit',
                            params: {
                              serviceId: svc.id,
                              serviceName: svc.name,
                              category: svc.category,
                            },
                          });
                        }}
                      >
                        <Text style={styles.catalogueRequestBtnText}>Request This Service →</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Connection Service Disclaimer Strip (Matching Web App) */}
            <View style={styles.disclaimerStrip}>
              <Ionicons name="information-circle-outline" size={18} color="#5F6368" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.disclaimerText}>
                <Text style={{ fontWeight: 'bold' }}>LegalNow Independent Connection Service: </Text>
                We connect citizens with verified, independent service providers. A request is routed to eligible providers; contact details and direct chat are shared once a provider accepts. LegalNow does not perform execution or completion of trade works.
              </Text>
            </View>
          </View>
        }
        renderItem={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: 12 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 2 },
  title: { ...theme.typography.h1, marginBottom: 4 },
  subtitle: { ...theme.typography.body, color: theme.colors.muted, fontSize: 13, lineHeight: 18 },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E9EEF4',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
    marginTop: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
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
  sectionHeading: { fontSize: 11, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
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
  categorySection: { marginBottom: 14 },
  categorySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  categorySectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.secondary },
  iconScroll: { flexDirection: 'row' },
  iconCard: {
    width: 94,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  iconCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E8F0FE',
  },
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
  },
  inputInner: { flex: 1, fontSize: 12, color: theme.colors.text },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary },
  clearLink: { fontSize: 12, color: theme.colors.primary, fontWeight: '700' },
  providersSection: { marginBottom: 18 },
  catalogueSection: { marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitleText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.secondary },
  providerCard: { padding: theme.spacing.md, marginBottom: 12 },
  providerHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#137333' },
  providerName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  providerLocation: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  serviceTagLine: { marginTop: 8, paddingVertical: 2 },
  serviceCategoryLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  providerStats: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 9, color: theme.colors.muted, textTransform: 'uppercase' },
  statValue: { fontSize: 11, fontWeight: '700', color: theme.colors.text, marginTop: 1 },
  statDivider: { width: 1, height: 20, backgroundColor: theme.colors.border },
  servicesOfferedText: { fontSize: 12, color: theme.colors.text, marginTop: 8, lineHeight: 16 },
  providerActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    borderRadius: 6,
  },
  requestButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  viewProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewProfileButtonText: { color: theme.colors.secondary, fontSize: 12, fontWeight: '600' },
  serviceCatalogueCard: { padding: theme.spacing.md, marginBottom: 10 },
  serviceHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceCategoryBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase' },
  serviceItemTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  feeBandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  feeBandLabel: { fontSize: 11, color: theme.colors.muted, marginRight: 6 },
  feeBandValue: { fontSize: 12, fontWeight: 'bold', color: theme.colors.secondary },
  serviceGuidanceText: { fontSize: 11, color: theme.colors.muted, marginTop: 8, lineHeight: 15 },
  serviceCardFooter: { marginTop: 10, alignItems: 'flex-end' },
  catalogueRequestBtn: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  catalogueRequestBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  disclaimerStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: '#5F6368', lineHeight: 16 },
  errorText: { color: theme.colors.danger, textAlign: 'center', marginVertical: 12, fontSize: 13 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.secondary, marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  resetBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  resetBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
});
