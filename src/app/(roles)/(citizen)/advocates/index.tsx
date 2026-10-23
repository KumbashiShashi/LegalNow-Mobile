import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { mediaUrl } from '../../../../utils/media';

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

const fetchProfessionals = async (category: string, search: string, location: string) => {
  const params: any = {};
  if (category) params.category = category;
  if (search.trim()) params.search = search.trim();
  if (location.trim()) params.location = location.trim();

  const { data } = await apiClient.get('/marketplace/professionals', { params });
  return Array.isArray(data) ? data : [];
};

export default function AdvocateDirectoryScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [city, setCity] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: advocates = [], isLoading, error } = useQuery({
    queryKey: ['advocates', selectedCategory, search, city],
    queryFn: () => fetchProfessionals(selectedCategory, search, city),
  });

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
              placeholder="Search name or expertise..."
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

        {/* Category Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('')}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
              All Practice Areas
            </Text>
          </TouchableOpacity>
          {categories.map((cat: string) => {
            const active = selectedCategory === cat;
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
          {isLoading ? 'Searching verified advocates...' : `${advocates.length} advocate${advocates.length === 1 ? '' : 's'} available`}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.danger} />
          <Text style={styles.errorText}>Could not load advocates. Please check network connection.</Text>
        </View>
      ) : (
        <FlatList
          data={advocates}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No matching advocates</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search criteria, selecting another practice area, or clearing filters.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.text },
  cityBox: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityInput: { flex: 1, fontSize: 13, color: theme.colors.text },
  categoryScroll: { flexDirection: 'row', paddingVertical: 2 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  categoryTextActive: { color: '#FFF', fontWeight: '700' },
  countRow: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 12, color: theme.colors.muted, fontWeight: '500' },
  listContent: { padding: 14, paddingTop: 4, paddingBottom: 32 },
  card: { padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  advocateName: { ...theme.typography.h3, fontSize: 15, flex: 1, marginRight: 6 },
  locationText: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  bioText: { fontSize: 12, color: theme.colors.text, lineHeight: 16, marginBottom: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  subTag: { backgroundColor: '#F3F4F6' },
  subTagText: { color: theme.colors.muted, fontWeight: '500' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  feeLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary },
  bookCta: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  bookCtaText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
  errorContainer: { alignItems: 'center', marginTop: 40, padding: 16 },
  errorText: { color: theme.colors.danger, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
