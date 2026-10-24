import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { mediaUrl } from '../../../../utils/media';
import { ADVOCATE_FILTERS, ADVOCATE_PROBLEM_SUGGESTIONS, AdvocateCategoryFilter } from '../../../../utils/directoryFilters';

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

const fetchProfessionals = async (location: string) => {
  const params: any = {};
  if (location.trim()) params.location = location.trim();

  const { data } = await apiClient.get('/marketplace/professionals', { params });
  return Array.isArray(data) ? data : [];
};

export default function AdvocateDirectoryScreen() {
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const [search, setSearch] = useState(params.search || '');
  const [selectedCategory, setSelectedCategory] = useState(params.category || '');
  const [city, setCity] = useState('');

  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: allAdvocates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['advocates', city],
    queryFn: () => fetchProfessionals(city),
  });

  // Client-side smart filtering for instant responsiveness and accurate practice-area matching
  const filteredAdvocates = useMemo(() => {
    let list = allAdvocates;

    // 1. Specialty / Practice Area Filter
    if (selectedCategory && selectedCategory.trim()) {
      const cat = selectedCategory.trim().toLowerCase();
      const filterDef = ADVOCATE_FILTERS.find((f) => f.name.toLowerCase() === cat);

      list = list.filter((advocate: any) => {
        const cats = (advocate.categories || []).map((c: string) => c.toLowerCase());
        const subs = (advocate.subCategories || []).map((s: string) => s.toLowerCase());
        const bio = (advocate.bio || '').toLowerCase();
        const name = (advocate.name || '').toLowerCase();

        // Direct exact match
        if (cats.includes(cat) || subs.includes(cat)) {
          return true;
        }

        // Specific category branches
        if (cat === 'criminal') {
          return cats.includes('criminal') || subs.includes('criminal') || bio.includes('criminal') || bio.includes('bail');
        }

        if (cat === 'notary') {
          return cats.includes('notary') || subs.includes('notary') || bio.includes('notary');
        }

        // Filter keywords check
        if (filterDef && filterDef.keywords) {
          const hasKeyword = filterDef.keywords.some((kw) => {
            const k = kw.toLowerCase();
            return bio.includes(k) || cats.includes(k) || subs.includes(k) || name.includes(k);
          });
          if (hasKeyword) return true;
        }

        // General legal practitioner match:
        // Registered Bar advocates with general 'advocate' or 'legal' categories practice Civil, Family, Property, Business, Financial matters
        const isCriminalOnly = cats.length > 0 && cats.every((c: string) => c === 'criminal');
        const isNotaryOnly = cats.length > 0 && cats.every((c: string) => c === 'notary');
        const hasGeneralPractice = cats.some((c: string) => ['advocate', 'legal'].includes(c));

        if (hasGeneralPractice && !isCriminalOnly && !isNotaryOnly) {
          return true;
        }

        return false;
      });
    }

    // 2. Global Text Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((advocate: any) => {
        const name = (advocate.name || '').toLowerCase();
        const bio = (advocate.bio || '').toLowerCase();
        const loc = (advocate.location || '').toLowerCase();
        const cats = (advocate.categories || []).join(' ').toLowerCase();
        const subs = (advocate.subCategories || []).join(' ').toLowerCase();

        return (
          name.includes(q) ||
          bio.includes(q) ||
          loc.includes(q) ||
          cats.includes(q) ||
          subs.includes(q)
        );
      });
    }

    return list;
  }, [allAdvocates, selectedCategory, search]);

  const handleIconCategoryPress = (filter: AdvocateCategoryFilter) => {
    if (selectedCategory.toLowerCase() === filter.name.toLowerCase()) {
      setSelectedCategory('');
    } else {
      setSelectedCategory(filter.name);
    }
  };

  const handleProblemPillPress = (problemText: string) => {
    if (search === problemText) {
      setSearch('');
    } else {
      setSearch(problemText);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearch('');
    setCity('');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Find Verified Advocates', headerShown: true }} />

      {/* Header Search Tools */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={theme.colors.muted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search advocate name, problem, or law..."
              placeholderTextColor={theme.colors.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cityBox}>
            <Ionicons name="location-outline" size={16} color={theme.colors.muted} style={{ marginRight: 4 }} />
            <TextInput
              style={styles.cityInput}
              placeholder="City"
              placeholderTextColor={theme.colors.muted}
              value={city}
              onChangeText={setCity}
            />
            {city.length > 0 && (
              <TouchableOpacity onPress={() => setCity('')}>
                <Ionicons name="close-circle" size={14} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* UI Visual Image / Icon Filters: All, Family, Business, Property, Criminal, Financial, Consumer */}
        <Text style={styles.filterSubheader}>Browse by Practice Area</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconFiltersRow} contentContainerStyle={{ paddingRight: 16 }}>
          {/* All Advocates Option */}
          <TouchableOpacity
            style={[
              styles.iconCard,
              !selectedCategory && styles.iconCardActive,
            ]}
            onPress={() => setSelectedCategory('')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: !selectedCategory ? '#D2E3FC' : '#F1F3F4' }]}>
              <Ionicons name="people" size={22} color={!selectedCategory ? theme.colors.primary : '#5F6368'} />
            </View>
            <Text style={[styles.iconCardTitle, !selectedCategory && styles.iconCardTitleActive]}>
              All
            </Text>
          </TouchableOpacity>

          {ADVOCATE_FILTERS.map((f) => {
            const isSelected = selectedCategory.toLowerCase() === f.name.toLowerCase();
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.iconCard,
                  isSelected && { borderColor: f.color, backgroundColor: f.bg },
                ]}
                onPress={() => handleIconCategoryPress(f)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.iconName as any} size={22} color={f.color} />
                </View>
                <Text style={[styles.iconCardTitle, isSelected && { color: f.color, fontWeight: '700' }]}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Text Filter with Default List of Problems */}
        <Text style={styles.filterSubheader}>Common Legal Concerns</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.problemScroll} contentContainerStyle={{ paddingRight: 16 }}>
          {ADVOCATE_PROBLEM_SUGGESTIONS.map((problem) => {
            const isSelected = search.toLowerCase() === problem.toLowerCase();
            return (
              <TouchableOpacity
                key={problem}
                style={[styles.problemPill, isSelected && styles.problemPillActive]}
                onPress={() => handleProblemPillPress(problem)}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'help-circle-outline'}
                  size={14}
                  color={isSelected ? '#FFF' : theme.colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.problemPillText, isSelected && styles.problemPillTextActive]}>
                  {problem}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Secondary Category Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('')}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
              All Practice Areas
            </Text>
          </TouchableOpacity>
          {dbCategories.map((cat: string) => {
            const active = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(active ? '' : cat)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {isLoading
            ? 'Searching verified advocates...'
            : `Showing ${filteredAdvocates.length} of ${allAdvocates.length} verified advocate${allAdvocates.length === 1 ? '' : 's'}`}
        </Text>
        {selectedCategory || search || city ? (
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearLink}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.danger} />
          <Text style={styles.errorText}>Could not load advocates. Please check network connection.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAdvocates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>No advocates match your search</Text>
          <Text style={styles.emptySubtitle}>Try choosing a different practice area, problem keyword, or city.</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleClearFilters}>
            <Text style={styles.resetBtnText}>View All Verified Advocates</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAdvocates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(roles)/(citizen)/advocates/[id]',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.cardTop}>
                {item.photoUrl ? (
                  <Image source={{ uri: mediaUrl(item.photoUrl) }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{(item.name || 'A').charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.advocateName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Badge status="verified" label="Verified" />
                  </View>
                  <Text style={styles.locationText}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.muted} />{' '}
                    {item.location || 'India'}
                    {item.experienceYears ? ` • ${item.experienceYears} yrs experience` : ''}
                  </Text>
                </View>
              </View>

              {item.bio ? (
                <Text style={styles.bioText} numberOfLines={2}>
                  {item.bio}
                </Text>
              ) : null}

              {/* Specializations */}
              <View style={styles.tagsContainer}>
                {(item.categories || []).map((cat: string) => (
                  <View key={cat} style={styles.tag}>
                    <Text style={styles.tagText}>{cat}</Text>
                  </View>
                ))}
                {(item.subCategories || []).map((sub: string) => (
                  <View key={sub} style={[styles.tag, styles.subTag]}>
                    <Text style={[styles.tagText, styles.subTagText]}>{sub}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.feeLabel}>
                    {item.consultationFee > 0
                      ? `₹${item.consultationFee.toLocaleString('en-IN')} consultation`
                      : 'Fee on consultation'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.bookCta}
                  onPress={() =>
                    router.push({
                      pathname: '/(roles)/(citizen)/advocates/book',
                      params: { id: item.id },
                    })
                  }
                >
                  <Text style={styles.bookCtaText}>Book →</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  searchBox: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.text },
  cityBox: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 8,
    height: 42,
  },
  cityInput: { flex: 1, fontSize: 13, color: theme.colors.text },
  filterSubheader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 6,
  },
  iconFiltersRow: { flexDirection: 'row', marginBottom: 8 },
  iconCard: {
    width: 80,
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  iconCardTitleActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  problemScroll: { flexDirection: 'row', marginBottom: 10 },
  problemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D2E3FC',
    marginRight: 6,
  },
  problemPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  problemPillText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  problemPillTextActive: { color: '#FFFFFF' },
  categoryScroll: { flexDirection: 'row', paddingVertical: 4 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  categoryChipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  categoryText: { fontSize: 12, color: theme.colors.text },
  categoryTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  countText: { fontSize: 12, color: theme.colors.muted, fontWeight: '600' },
  clearLink: { fontSize: 12, color: theme.colors.primary, fontWeight: '700' },
  listContent: { padding: theme.spacing.md, paddingBottom: 40 },
  card: { padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  advocateName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1, marginRight: 6 },
  locationText: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  bioText: { fontSize: 13, color: theme.colors.text, marginTop: 8, lineHeight: 18 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 },
  tag: { backgroundColor: theme.colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border },
  tagText: { fontSize: 11, color: theme.colors.muted },
  subTag: { backgroundColor: '#EBF4FE', borderColor: '#D2E3FC' },
  subTagText: { color: theme.colors.primary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  feeLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.secondary },
  bookCta: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.borderRadius.sm },
  bookCtaText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  errorContainer: { padding: 32, alignItems: 'center' },
  errorText: { marginTop: 8, color: theme.colors.danger, textAlign: 'center', fontSize: 14 },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 6 },
  retryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.secondary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  resetBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  resetBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});
