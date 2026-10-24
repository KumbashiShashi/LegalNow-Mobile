import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../api/axiosClient';
import { theme } from '../../../styles/theme';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';

interface SubscriptionData {
  active: boolean;
  activeUntil: string | null;
  fee: number;
  months: number;
  bookingFee: number;
  env: string;
  history: {
    id: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
  }[];
}

const fetchSubscription = async (): Promise<SubscriptionData> => {
  const { data } = await apiClient.get('/fees/citizen-subscription');
  return data;
};

const fetchInvoices = async () => {
  const { data } = await apiClient.get('/fees/invoices');
  return Array.isArray(data) ? data : [];
};

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();

  const { data: sub, isLoading, error } = useQuery({
    queryKey: ['citizen-subscription'],
    queryFn: fetchSubscription,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: fetchInvoices,
  });

  const devSubscribeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/fees/citizen-subscription/dev-subscribe');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-subscription'] });
      Alert.alert('Subscription Activated', 'DEV subscription activated successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Subscription Error', err.response?.data?.message || 'Could not activate subscription.');
    },
  });

  const handlePay = async () => {
    try {
      const res = await apiClient.post('/fees/citizen-subscription/pay');
      const { razorpayOrderId, amount } = res.data;
      Alert.alert(
        'Subscription Checkout',
        `Initiate payment of ₹${amount?.toLocaleString('en-IN') || sub?.fee} (Order ${razorpayOrderId})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify & Activate',
            onPress: async () => {
              try {
                await apiClient.post('/fees/verify', {
                  razorpayOrderId,
                  razorpayPaymentId: `sim_pay_${Date.now()}`,
                  razorpaySignature: 'sim_sig_valid',
                  paymentMethod: 'direct',
                });
                queryClient.invalidateQueries({ queryKey: ['citizen-subscription'] });
                queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
                Alert.alert('Payment Successful', 'Your LegalNow subscription is now active!');
              } catch (verifyErr: any) {
                Alert.alert(
                  'Verification Notice',
                  verifyErr.response?.data?.message || 'Gateway signature verification required in live environment.'
                );
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Payment Error', err.response?.data?.message || 'Could not initiate payment.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !sub) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load subscription details.</Text>
      </View>
    );
  }

  const isActive = sub.active;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Subscription & Invoices', headerShown: true }} />

      <Card style={[styles.mainCard, isActive ? styles.activeCard : {}]}>
        <View style={styles.header}>
          <Text style={styles.title}>LegalNow Access Plan</Text>
          <Badge status={isActive ? 'verified' : 'pending'} label={isActive ? 'Active Plan' : 'Not Subscribed'} />
        </View>

        <Text style={styles.price}>
          ₹{sub.fee?.toLocaleString('en-IN') || 0}{' '}
          <Text style={styles.period}>/ {sub.months || 12} months</Text>
        </Text>

        <Text style={styles.benefitsIntro}>Your subscriber privileges include:</Text>
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#137333" />
            <Text style={styles.feature}>Direct appointments with verified advocates</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#137333" />
            <Text style={styles.feature}>
              Free advocate consultations (saves ₹{sub.bookingFee || 500} booking fee)
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#137333" />
            <Text style={styles.feature}>Host meetings securely at verified LegalNow Hubs</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#137333" />
            <Text style={styles.feature}>Full case document archive and priority Case Chat</Text>
          </View>
        </View>

        {isActive ? (
          <View style={styles.activeStatusBox}>
            <Ionicons name="shield-checkmark" size={20} color="#137333" />
            <Text style={styles.activeStatusText}>
              Subscription active until{' '}
              {sub.activeUntil ? new Date(sub.activeUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'renewal'}.
            </Text>
          </View>
        ) : (
          <Button
            title={`Subscribe for ₹${sub.fee?.toLocaleString('en-IN') || 0}`}
            onPress={handlePay}
            style={{ marginTop: theme.spacing.lg }}
          />
        )}

        {sub.env === 'DEV' && !isActive && (
          <TouchableOpacity
            style={styles.devBtn}
            onPress={() => devSubscribeMutation.mutate()}
            disabled={devSubscribeMutation.isPending}
          >
            <Text style={styles.devBtnText}>
              {devSubscribeMutation.isPending ? 'Activating...' : '⚡ DEV: Activate Free Test Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Invoices Section */}
      <View style={styles.invoiceHeader}>
        <Text style={styles.sectionTitle}>Invoice & Payment History</Text>
      </View>

      {invoices.length === 0 ? (
        <Card style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>No payment invoices yet.</Text>
        </Card>
      ) : (
        invoices.map((inv: any) => (
          <TouchableOpacity
            key={inv.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/invoices/${inv.id}` as any)}
          >
            <Card style={styles.invoiceCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontWeight: '700', fontSize: 14 }}>{inv.invoiceNumber || 'Tax Invoice'}</Text>
                <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                  ₹{inv.amount?.toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>
                {inv.type || 'Payment'} • {new Date(inv.createdAt).toLocaleDateString()}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Badge status={inv.status === 'paid' ? 'verified' : 'pending'} label={inv.status} />
                <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>
                  View Receipt →
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.danger, fontSize: 16 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  mainCard: { padding: theme.spacing.lg, borderWidth: 1.5, borderColor: theme.colors.border, marginBottom: 20 },
  activeCard: { borderColor: '#A8DAB5', backgroundColor: '#F8FCF9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { ...theme.typography.h2 },
  price: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 16 },
  period: { fontSize: 15, color: theme.colors.muted, fontWeight: 'normal' },
  benefitsIntro: { fontSize: 13, fontWeight: '600', color: theme.colors.secondary, marginBottom: 8 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feature: { ...theme.typography.body, fontSize: 13, fontWeight: '500', flex: 1 },
  activeStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    padding: 12,
    backgroundColor: '#E6F4EA',
    borderRadius: theme.borderRadius.md,
  },
  activeStatusText: { ...theme.typography.body, color: '#137333', fontWeight: '600', fontSize: 13 },
  devBtn: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  devBtnText: { color: '#B45309', fontWeight: '700', fontSize: 12 },
  invoiceHeader: { marginBottom: 12 },
  sectionTitle: { ...theme.typography.h2, fontSize: 18 },
  invoiceCard: { marginBottom: 10, padding: 14 },
});
