import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { ServiceConversation } from '../../../components/shared/ServiceConversation';
import { ServiceMeetingScheduler } from '../../../components/shared/ServiceMeetingScheduler';
import { showAlert } from '../../../utils/alert';

const fetchLeads = async () => {
  const { data } = await apiClient.get('/service-marketplace/leads');
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    ...item,
    id: item.leadId || item.id,
    leadId: item.leadId || item.id,
  }));
};

const fetchSubscription = async () => {
  const { data } = await apiClient.get('/service-marketplace/subscription');
  return data;
};

export default function ProviderDashboardScreen() {
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [activeChatLead, setActiveChatLead] = useState<any | null>(null);
  const [activeMeetingLead, setActiveMeetingLead] = useState<any | null>(null);
  const [disputeLead, setDisputeLead] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('unresponsive_customer');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['provider-leads'],
    queryFn: fetchLeads,
    refetchInterval: 15000,
  });

  const { data: subscription } = useQuery({
    queryKey: ['provider-subscription'],
    queryFn: fetchSubscription,
  });

  const disputeMutation = useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason: string }) => {
      const { data } = await apiClient.post(`/service-marketplace/leads/${leadId}/dispute`, { reason });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-leads'] });
      setDisputeLead(null);
      showAlert('Dispute Recorded', data?.message || '1 lead replacement credit has been restored to your quota.');
    },
    onError: (err: any) => {
      showAlert('Dispute Error', err.response?.data?.message || 'Could not submit dispute for this lead.');
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ leadId, response }: { leadId: string, response: 'accepted' | 'declined' }) => {
      setRespondingId(leadId);
      const { data } = await apiClient.post(`/service-marketplace/leads/${leadId}/respond`, { response });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-leads'] });
      setRespondingId(null);
      showAlert('Success', 'Lead response recorded.');
    },
    onError: (err: any) => {
      setRespondingId(null);
      showAlert('Error', err.response?.data?.message || 'Could not submit response.');
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string, status: 'in_progress' | 'completed' | 'cancelled' }) => {
      const { data } = await apiClient.put(`/service-marketplace/leads/${leadId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-leads'] });
      showAlert('Updated', 'Service status updated successfully.');
    },
    onError: (err: any) => {
      showAlert('Error', err.response?.data?.message || 'Could not update status.');
    }
  });

  const filteredLeads = leads.filter((item: any) => {
    if (filterTab === 'pending') return item.status === 'matched' || item.status === 'pending' || item.status === 'offered';
    if (filterTab === 'active') return item.status === 'accepted' || item.status === 'in_progress';
    if (filterTab === 'completed') return item.status === 'completed';
    return true;
  });

  const pendingCount = leads.filter((l: any) => l.status === 'matched' || l.status === 'pending' || l.status === 'offered').length;
  const activeCount = leads.filter((l: any) => l.status === 'accepted' || l.status === 'in_progress').length;
  const completedCount = leads.filter((l: any) => l.status === 'completed').length;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Service Marketplace</Text>
        <Text style={styles.title}>Available Leads</Text>
        <Text style={styles.subtitle}>Review service requests matched to your coverage area and categories.</Text>
      </View>

      {/* Subscription & Leads Quota Mini Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statPill}>
          <Ionicons name="card-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.statPillText}>
            {subscription?.tier ? `${subscription.tier.toUpperCase()} TIER` : 'BASIC'} • {subscription?.availableCredits ?? 10} leads available
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(roles)/(provider)/profile')}
          style={styles.statActionLink}
        >
          <Text style={styles.statActionText}>Plan & Areas →</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'all', label: `All (${leads.length})` },
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'active', label: `Active (${activeCount})` },
          { key: 'completed', label: `Done (${completedCount})` },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, filterTab === t.key && styles.tabItemActive]}
            onPress={() => setFilterTab(t.key as any)}
          >
            <Text style={[styles.tabItemText, filterTab === t.key && styles.tabItemTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text style={styles.errorText}>Could not load marketplace leads.</Text>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item, index) => String(item.leadId || item.id || `lead-${index}`)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const currentLeadId = item.leadId || item.id || `lead-${index}`;
            const isPending = item.status === 'matched' || item.status === 'pending';
            const isAccepted = item.status === 'accepted' || item.status === 'in_progress';
            const isCompleted = item.status === 'completed';

            return (
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.serviceName || item.title}</Text>
                  <Badge status={item.status} />
                </View>

                <Text style={styles.categoryText}>{item.serviceCategory}</Text>
                <Text style={styles.customerText}>Customer: {item.customerName || 'Anonymous Citizen'}</Text>

                {item.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                    <Text style={styles.locationText}>{item.location}</Text>
                  </View>
                )}

                {/* Dispute Status Banner */}
                {item.disputeStatus && (
                  <View style={styles.disputeNotice}>
                    <Ionicons name="information-circle" size={16} color="#B45309" />
                    <Text style={styles.disputeNoticeText}>
                      Dispute: {item.disputeStatus.toUpperCase()} {item.isCreditReplaced ? '• Lead Credit Restored' : '• Under Review'}
                    </Text>
                  </View>
                )}

                {isPending && (
                  <View style={styles.actionRow}>
                    <Button
                      title="Accept Lead"
                      onPress={() => respondMutation.mutate({ leadId: currentLeadId, response: 'accepted' })}
                      isLoading={respondMutation.isPending && respondingId === currentLeadId}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Reject"
                      variant="danger"
                      onPress={() => respondMutation.mutate({ leadId: currentLeadId, response: 'declined' })}
                      isLoading={respondMutation.isPending && respondingId === currentLeadId}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}

                {isAccepted && (
                  <View style={styles.serviceActionsWrap}>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.toolButton}
                        onPress={() => setActiveChatLead(item)}
                      >
                        <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.toolButtonText}>Direct Chat</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toolButton}
                        onPress={() => setActiveMeetingLead(item)}
                      >
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.toolButtonText}>Propose Meeting</Text>
                      </TouchableOpacity>

                      {!item.isCreditReplaced && item.disputeStatus !== 'approved' && (
                        <TouchableOpacity
                          style={styles.toolButtonDispute}
                          onPress={() => setDisputeLead(item)}
                        >
                          <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                          <Text style={styles.toolButtonDisputeText}>Dispute</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[styles.actionRow, { marginTop: 8 }]}>
                      {item.status === 'accepted' && (
                        <Button
                          title="Mark In-Progress"
                          variant="secondary"
                          onPress={() => statusMutation.mutate({ leadId: currentLeadId, status: 'in_progress' })}
                          isLoading={statusMutation.isPending}
                          style={{ flex: 1 }}
                        />
                      )}
                      <Button
                        title="Mark Completed"
                        variant="primary"
                        onPress={() => statusMutation.mutate({ leadId: currentLeadId, status: 'completed' })}
                        isLoading={statusMutation.isPending}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#137333" />
                    <Text style={styles.completedText}>Service fulfillment completed</Text>
                  </View>
                )}
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No leads available</Text>
              <Text style={styles.emptyText}>When citizens request services matching your profile, they will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Direct Chat Modal */}
      <Modal
        visible={!!activeChatLead}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveChatLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeChatLead && (
              <ServiceConversation
                leadId={activeChatLead.leadId || activeChatLead.id}
                onClose={() => setActiveChatLead(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Propose Meeting Modal */}
      <Modal
        visible={!!activeMeetingLead}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveMeetingLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeMeetingLead && (
              <ServiceMeetingScheduler
                leadId={activeMeetingLead.leadId || activeMeetingLead.id}
                onSuccess={() => setActiveMeetingLead(null)}
                onClose={() => setActiveMeetingLead(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Dispute Lead Modal */}
      <Modal
        visible={!!disputeLead}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDisputeLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 18 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalHeading}>Dispute Lead</Text>
              <TouchableOpacity onPress={() => setDisputeLead(null)}>
                <Ionicons name="close" size={22} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 14, lineHeight: 18 }}>
              If a customer cannot be reached or the request is fraudulent, dispute this lead to request 1 replacement credit.
            </Text>

            {[
              { id: 'unresponsive_customer', label: 'Customer is unresponsive / not answering' },
              { id: 'fraudulent_requirement', label: 'Spam or fraudulent requirement' },
              { id: 'invalid_contact', label: 'Wrong or disconnected phone number' },
              { id: 'out_of_scope', label: 'Requirement outside selected service category' },
            ].map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.disputeOption, disputeReason === r.id && styles.disputeOptionSelected]}
                onPress={() => setDisputeReason(r.id)}
              >
                <Ionicons
                  name={disputeReason === r.id ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={disputeReason === r.id ? theme.colors.primary : theme.colors.muted}
                />
                <Text style={[styles.disputeOptionText, disputeReason === r.id && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setDisputeLead(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Dispute"
                variant="danger"
                onPress={() => disputeMutation.mutate({ leadId: disputeLead.leadId || disputeLead.id, reason: disputeReason })}
                isLoading={disputeMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBar: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  statActionLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: theme.colors.primary },
  tabItemText: { fontSize: 12, fontWeight: '500', color: theme.colors.muted },
  tabItemTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  disputeNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.sm, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  disputeNoticeText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  toolButtonDispute: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolButtonDisputeText: { fontSize: 12, fontWeight: '700', color: theme.colors.danger },
  modalHeading: { ...theme.typography.h2, fontSize: 18 },
  disputeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  disputeOptionSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  disputeOptionText: { fontSize: 13, color: theme.colors.text, flex: 1 },
  eyebrow: { ...theme.typography.eyebrow, marginBottom: 2 },
  title: { ...theme.typography.h1 },
  subtitle: { ...theme.typography.body, marginTop: 2 },
  errorText: { color: theme.colors.danger, textAlign: 'center', marginTop: 20 },
  listContent: { padding: theme.spacing.md },
  card: { padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { ...theme.typography.h3, flex: 1, marginRight: 8 },
  categoryText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginBottom: 4 },
  customerText: { ...theme.typography.body, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { fontSize: 13, color: theme.colors.muted, marginLeft: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  serviceActionsWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  toolButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E6FCE6',
    borderRadius: theme.borderRadius.sm,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#137333',
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyTitle: { ...theme.typography.h3, marginTop: 12 },
  emptyText: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
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
