import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { useAuthStore } from '../../../store/useAuthStore';
import { Problem } from '../../../types/api';
import { ServiceConversation } from '../../../components/shared/ServiceConversation';

const fetchProblems = async (): Promise<Problem[]> => {
  const { data } = await apiClient.get('/problems/mine');
  return Array.isArray(data) ? data : [];
};

const fetchServiceRequests = async () => {
  const { data } = await apiClient.get('/service-marketplace/my-requests');
  return Array.isArray(data) ? data : [];
};

export default function CitizenDashboard() {
  const { user, role } = useAuthStore();
  const isBusiness = role === 'business';
  const [activeChatLeadId, setActiveChatLeadId] = useState<string | null>(null);

  const { data: problems = [], isLoading: loadingProblems, error: errorProblems } = useQuery({
    queryKey: ['problems'],
    queryFn: fetchProblems,
  });

  const { data: serviceRequests = [], isLoading: loadingServices } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: fetchServiceRequests,
  });

  const openMatters = problems.filter((p) => p.status === 'open').length;
  const assignedMatters = problems.filter((p) => p.status === 'assigned' || p.status === 'in_progress').length;

  if (loadingProblems || loadingServices) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <Text style={styles.eyebrow}>{isBusiness ? 'Business Workspace' : 'Your LegalNow Workspace'}</Text>
        <Text style={styles.welcomeText}>Good to see you, {(user?.name || 'Customer').split(' ')[0]}.</Text>
        <Text style={styles.subtitle}>
          {isBusiness
            ? 'Manage your organization’s legal requirements and independent service providers.'
            : 'Track your legal matters, find verified advocates, and manage appointments.'}
        </Text>
      </View>

      {errorProblems && <Text style={styles.errorText}>Your matters could not be loaded. Pull to refresh.</Text>}

      {/* Stats Card */}
      <Card style={styles.statsCardContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{problems.length}</Text>
            <Text style={styles.statLabel}>Total cases</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#B06000' }]}>{openMatters}</Text>
            <Text style={styles.statLabel}>Open matters</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#137333' }]}>{assignedMatters}</Text>
            <Text style={styles.statLabel}>With advocates</Text>
          </View>
        </View>
      </Card>

      {/* Quick Action Navigation Buttons */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(roles)/(citizen)/advocates')}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#EBF4FE' }]}>
            <Ionicons name="search" size={20} color="#1A73E8" />
          </View>
          <Text style={styles.actionText}>Find Advocates</Text>
          <Text style={styles.actionSubtext}>Verified practitioners</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(roles)/(citizen)/service-providers')}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#E6F4EA' }]}>
            <Ionicons name="briefcase-outline" size={20} color="#137333" />
          </View>
          <Text style={styles.actionText}>Service Providers</Text>
          <Text style={styles.actionSubtext}>Govt & business services</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(roles)/(citizen)/submit')}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#FEF7E0' }]}>
            <Ionicons name="add-circle-outline" size={20} color="#B06000" />
          </View>
          <Text style={styles.actionText}>New Requirement</Text>
          <Text style={styles.actionSubtext}>Describe legal concern</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(roles)/(citizen)/subscription')}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#F3E8FD' }]}>
            <Ionicons name="card-outline" size={20} color="#7B1FA2" />
          </View>
          <Text style={styles.actionText}>Subscription</Text>
          <Text style={styles.actionSubtext}>Plan & tax receipts</Text>
        </TouchableOpacity>
      </View>

      {/* Service Requests Section */}
      {serviceRequests.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Requests ({serviceRequests.length})</Text>
          </View>
          {serviceRequests.map((request: any) => (
            <Card key={request.problemId || request.id} style={{ marginBottom: 10 }}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{request.serviceName || request.title}</Text>
                <Badge status={request.status || 'open'} />
              </View>
              <Text style={styles.cardSubtitle}>
                {request.serviceCategory || 'Service'} • {new Date(request.createdAt).toLocaleDateString()}
              </Text>
              {request.matches?.length > 0 ? (
                <View style={styles.matchesWrap}>
                  <Text style={styles.metaText}>
                    {request.matches.length} verified provider{request.matches.length > 1 ? 's' : ''} matched:
                  </Text>
                  {request.matches.map((match: any, idx: number) => {
                    const isChattable = match.status === 'accepted' || match.status === 'in_progress';
                    return (
                      <View key={`${match.leadId || idx}`} style={styles.matchRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.providerNameText}>{match.providerName || 'Registered Provider'}</Text>
                          <Text style={styles.providerMetaText}>
                            Status: <Text style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{match.status?.replace('_', ' ')}</Text>
                            {match.providerPhone ? ` • ${match.providerPhone}` : ''}
                          </Text>
                        </View>
                        {isChattable && (
                          <TouchableOpacity
                            style={styles.chatButton}
                            onPress={() => setActiveChatLeadId(match.leadId)}
                          >
                            <Ionicons name="chatbubbles-outline" size={14} color="#fff" />
                            <Text style={styles.chatButtonText}>Chat</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.mutedText}>Waiting for verified provider match in your area</Text>
              )}
            </Card>
          ))}
        </>
      )}

      {/* Recent Legal Problems */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Legal Matters</Text>
      </View>

      {problems.length === 0 ? (
        <Card style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={44} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>No Legal Matters Registered</Text>
          <Text style={styles.emptySubtitle}>
            Submit your first problem to find verified advocates or consult with specialized practitioners.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(roles)/(citizen)/submit')}
          >
            <Text style={styles.primaryButtonText}>Submit a Legal Matter</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        problems.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/case/${p.id}`)} style={{ marginBottom: 10 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Badge status={p.status} />
            </View>
            <Text style={styles.cardSubtitle}>
              {p.category || 'General Legal'} {p.location ? `• ${p.location}` : ''} • Opened{' '}
              {new Date(p.createdAt).toLocaleDateString()}
            </Text>
            {p.assignedProfessionalName && (
              <Text style={styles.assignedText}>
                <Ionicons name="person" size={12} color="#137333" /> Assigned Advocate: {p.assignedProfessionalName}
              </Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.linkText}>Open Case Workspace →</Text>
            </View>
          </Card>
        ))
      )}

      {/* Direct Chat Modal */}
      <Modal
        visible={!!activeChatLeadId}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveChatLeadId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeChatLeadId && (
              <ServiceConversation
                leadId={activeChatLeadId}
                onClose={() => setActiveChatLeadId(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  banner: { marginBottom: 16 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 4 },
  welcomeText: { ...theme.typography.h1, marginBottom: 4 },
  subtitle: { ...theme.typography.body, color: theme.colors.muted },
  errorText: { color: theme.colors.danger, marginBottom: 12 },
  statsCardContainer: { padding: 0, marginBottom: 16 },
  statsCard: { flexDirection: 'row', padding: theme.spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: theme.colors.muted, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  sectionTitle: { ...theme.typography.h2, fontSize: 18, marginBottom: 10, marginTop: 6 },
  actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  actionSubtext: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  sectionHeader: { marginTop: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  cardSubtitle: { fontSize: 12, color: theme.colors.muted, marginBottom: 6 },
  mutedText: { fontSize: 12, color: theme.colors.muted, fontStyle: 'italic' },
  metaText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  matchesWrap: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.border },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, backgroundColor: theme.colors.background, padding: 8, borderRadius: theme.borderRadius.sm },
  providerNameText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  providerMetaText: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  chatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.pill, gap: 4 },
  chatButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  assignedText: { fontSize: 12, color: '#137333', fontWeight: '600', marginTop: 4 },
  cardFooter: { marginTop: 8, alignItems: 'flex-end' },
  linkText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 24, marginTop: 4 },
  emptyTitle: { ...theme.typography.h3, marginTop: 12 },
  emptySubtitle: { ...theme.typography.body, textAlign: 'center', color: theme.colors.muted, marginTop: 6, marginBottom: 16 },
  primaryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.borderRadius.sm },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
});
