import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../styles/theme';
import { Card } from '../../../../components/Card';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';

export default function ServiceProviderProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    serviceName?: string;
    serviceCategory?: string;
    city?: string;
    state?: string;
    experienceYears?: string;
    workingHours?: string;
    servicesOffered?: string;
    serviceId?: string;
  }>();

  const providerName = params.name || 'Verified Service Provider';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: providerName, headerShown: true }} />

      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{providerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name}>{providerName}</Text>
            <Text style={styles.location}>
              <Ionicons name="location-outline" size={14} color={theme.colors.muted} />{' '}
              {[params.city, params.state].filter(Boolean).join(', ') || 'Regional Service Area'}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Badge status="verified" label="Identity & Docs Verified" />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service</Text>
          <Text style={styles.detailValue}>
            {params.serviceName || params.serviceCategory || 'Legal & Business Service'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience</Text>
          <Text style={styles.detailValue}>
            {params.experienceYears ? `${params.experienceYears} Years` : 'Established Practitioner'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Working Hours</Text>
          <Text style={styles.detailValue}>{params.workingHours || 'Standard Business Hours'}</Text>
        </View>

        {params.servicesOffered && (
          <View style={[styles.detailRow, { flexDirection: 'column', gap: 4, marginTop: 6 }]}>
            <Text style={styles.detailLabel}>About Services:</Text>
            <Text style={styles.aboutText}>{params.servicesOffered}</Text>
          </View>
        )}

        <Button
          title="Request This Service"
          variant="primary"
          onPress={() => {
            router.push({
              pathname: '/(roles)/(citizen)/submit',
              params: {
                serviceId: params.serviceId,
                serviceName: params.serviceName,
                category: params.serviceCategory,
              },
            });
          }}
          style={{ marginTop: 18 }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  headerCard: { padding: theme.spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  name: { ...theme.typography.h2, fontSize: 18 },
  location: { ...theme.typography.body, color: theme.colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { ...theme.typography.body, color: theme.colors.muted, fontSize: 13 },
  detailValue: { ...theme.typography.body, fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'right' },
  aboutText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
});
