import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  return Array.isArray(data) ? data : [];
};

export default function ProviderDashboardScreen() {
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [activeChatLead, setActiveChatLead] = useState<any | null>(null);
  const [activeMeetingLead, setActiveMeetingLead] = useState<any | null>(null);

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['provider-leads'],
    queryFn: fetchLeads,
    refetchInterval: 15000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ leadId, response }: { leadId: string, response: 'accepted' | 'rejected' }) => {
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

      {error ? (
        <Text style={styles.errorText}>Could not load marketplace leads.</Text>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
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

                {isPending && (
                  <View style={styles.actionRow}>
                    <Button
                      title="Accept Lead"
                      onPress={() => respondMutation.mutate({ leadId: item.id, response: 'accepted' })}
                      isLoading={respondMutation.isPending && respondingId === item.id}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Reject"
                      variant="danger"
                      onPress={() => respondMutation.mutate({ leadId: item.id, response: 'rejected' })}
                      isLoading={respondMutation.isPending && respondingId === item.id}
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
                    </View>

                    <View style={[styles.actionRow, { marginTop: 8 }]}>
                      {item.status === 'accepted' && (
                        <Button
                          title="Mark In-Progress"
                          variant="secondary"
                          onPress={() => statusMutation.mutate({ leadId: item.id, status: 'in_progress' })}
                          isLoading={statusMutation.isPending}
                          style={{ flex: 1 }}
                        />
                      )}
                      <Button
                        title="Mark Completed"
                        variant="primary"
                        onPress={() => statusMutation.mutate({ leadId: item.id, status: 'completed' })}
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
                leadId={activeChatLead.id}
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
                leadId={activeMeetingLead.id}
                onSuccess={() => setActiveMeetingLead(null)}
                onClose={() => setActiveMeetingLead(null)}
              />
            )}
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
