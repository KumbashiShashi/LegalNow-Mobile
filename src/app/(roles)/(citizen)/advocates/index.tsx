import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { apiClient } from '../../../../api/axiosClient';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';

const fetchAdvocates = async () => {
  const { data } = await apiClient.get('/marketplace/advocates');
  return Array.isArray(data) ? data : [];
};

export default function AdvocateDirectoryScreen() {
  const [search, setSearch] = useState('');

  const { data: advocates = [], isLoading, error } = useQuery({
    queryKey: ['advocates'],
    queryFn: fetchAdvocates,
  });

  const filtered = advocates.filter((a: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const str = `${a.name} ${a.location} ${(a.categories || []).join(' ')}`.toLowerCase();
    return str.includes(q);
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Find Advocates', headerShown: true }} />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, specialty, or city..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>Could not load advocates directory.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => router.push(`/(roles)/(citizen)/advocates/${item.id}`)}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.advocateName}>{item.name}</Text>
                  <Text style={styles.locationText}>
                    <Ionicons name="location-outline" size={12} /> {item.location || 'Remote'}
                  </Text>
                </View>
                <Badge status={item.verificationStatus === 'verified' ? 'verified' : 'pending'} />
              </View>

              <View style={styles.tagsContainer}>
                {(item.categories || []).map((cat: string) => (
                  <View key={cat} style={styles.tag}>
                    <Text style={styles.tagText}>{cat}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.experienceText}>{item.experienceYears ? `${item.experienceYears} yrs experience` : 'Experience not listed'}</Text>
                <Text style={styles.linkText}>View Profile →</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{`No advocates found matching "${search}"`}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, height: '100%' },
  errorText: { color: theme.colors.danger, textAlign: 'center', marginTop: 20 },
  listContent: { padding: theme.spacing.md, paddingTop: 0 },
  card: { padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  advocateName: { ...theme.typography.h3, marginBottom: 4 },
  locationText: { ...theme.typography.small, color: theme.colors.muted },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border },
  tagText: { fontSize: 11, color: theme.colors.text },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  experienceText: { ...theme.typography.small, fontWeight: '600' },
  linkText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: theme.colors.muted, fontSize: 14 },
});
