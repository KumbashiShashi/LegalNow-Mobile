import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/fees/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !inv) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Invoice not found or access denied.</Text>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const exGst = inv.gstPercent > 0 ? (inv.amount || 0) - (inv.gstAmount || 0) : inv.amount || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: inv.number || 'Tax Receipt', headerShown: true }} />

      <Card style={styles.sheetCard}>
        {/* Header */}
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{inv.seller?.name || 'LegalNow Services'}</Text>
            {inv.seller?.address && <Text style={styles.sellerMeta}>{inv.seller.address}</Text>}
            {inv.seller?.gstin && <Text style={styles.sellerGstin}>GSTIN: {inv.seller.gstin}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceDocTitle}>{inv.seller?.gstin ? 'TAX INVOICE' : 'RECEIPT'}</Text>
            <Badge status={inv.status === 'paid' ? 'verified' : 'pending'} label={(inv.status || 'paid').toUpperCase()} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Invoice Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{inv.number || 'INV-0000'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Date Issued</Text>
            <Text style={styles.metaValue}>
              {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </Text>
          </View>
        </View>

        {/* Billed To & Payment Ref */}
        <View style={styles.partyBox}>
          <Text style={styles.partyHeading}>Billed To:</Text>
          <Text style={styles.partyName}>{inv.billTo?.name || 'Customer'}</Text>
          {inv.billTo?.address && <Text style={styles.partyMeta}>{inv.billTo.address}</Text>}
          <Text style={styles.partyMeta}>
            {[inv.billTo?.email, inv.billTo?.phone].filter(Boolean).join(' • ')}
          </Text>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.partyMeta}>Gateway Order ID: {inv.orderId || '—'}</Text>
            {inv.razorpayPaymentId && <Text style={styles.partyMeta}>Payment ID: {inv.razorpayPaymentId}</Text>}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableColHeader, { flex: 2 }]}>Description</Text>
          <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'right' }]}>Amount</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>{inv.description || 'LegalNow Platform Service'}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
            ₹{(inv.amount || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Calculations */}
        {inv.gstPercent > 0 && (
          <>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Amount (Excl. GST)</Text>
              <Text style={styles.calcValue}>₹{Math.round(exGst * 100) / 100}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>GST @ {inv.gstPercent}%</Text>
              <Text style={styles.calcValue}>₹{inv.gstAmount || 0}</Text>
            </View>
          </>
        )}

        <View style={[styles.calcRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: '#E0E0E0' }]}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalValue}>₹{(inv.total || inv.amount || 0).toLocaleString('en-IN')}</Text>
        </View>

        {inv.amountInWords && (
          <Text style={styles.amountWords}>
            Amount in words: <Text style={{ fontStyle: 'italic' }}>{inv.amountInWords}</Text>
          </Text>
        )}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            This is a computer-generated receipt issued by LegalNow. Convenience fees are not legal consultation fees.
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: theme.colors.danger, fontSize: 16 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  sheetCard: { padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sellerName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary },
  sellerMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  sellerGstin: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  invoiceDocTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 11, color: theme.colors.muted },
  metaValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  partyBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, marginBottom: 14 },
  partyHeading: { fontSize: 11, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase' },
  partyName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  partyMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F3F4', padding: 8, borderRadius: 6, marginBottom: 6 },
  tableColHeader: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4 },
  tableCell: { fontSize: 13, color: theme.colors.text },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  calcLabel: { fontSize: 12, color: theme.colors.muted },
  calcValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  amountWords: { fontSize: 11, color: theme.colors.muted, marginTop: 8 },
  footerNote: { marginTop: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#E0E0E0' },
  footerNoteText: { fontSize: 11, color: '#757575', textAlign: 'center', lineHeight: 15 },
});
