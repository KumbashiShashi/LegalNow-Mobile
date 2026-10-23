import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../Button';

export interface SelectedHubLocation {
  type: 'lone_hub';
  hubId: string;
  lat?: number;
  lng?: number;
  label: string;
}

interface HubItem {
  id: string;
  shopName: string;
  address?: string;
  openHours?: string;
  distanceKm?: number;
  match?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface HubPickerProps {
  when?: string;
  durationMinutes?: number;
  appointmentId?: string;
  serviceMeetingId?: string;
  selectedId?: string;
  onSelect: (hub: SelectedHubLocation) => void;
}

export function HubPicker({
  when,
  durationMinutes = 30,
  appointmentId,
  serviceMeetingId,
  selectedId,
  onSelect,
}: HubPickerProps) {
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [hubs, setHubs] = useState<HubItem[] | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchHubs = async () => {
    if (!postalCode.trim() && !city.trim()) {
      setMessage('Please enter a PIN code or city to locate nearby LegalNow Hubs.');
      return;
    }

    setIsSearching(true);
    setMessage('');
    try {
      const res = await apiClient.get('/hubs/available', {
        params: {
          postalCode: postalCode.trim() || undefined,
          city: city.trim() || undefined,
          when: when || undefined,
          durationMinutes,
          appointmentId: appointmentId || undefined,
          serviceMeetingId: serviceMeetingId || undefined,
        },
      });

      setHubs(res.data?.hubs || []);
      setRadius(res.data?.radiusKm || null);
      if (res.data?.message) {
        setMessage(res.data.message);
      }
    } catch (err: any) {
      setHubs(null);
      setMessage(err?.response?.data?.message || 'Could not search for hubs.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Find a LegalNow Hub</Text>
      <Text style={styles.subheading}>
        Neighbourhood stationery and cyber shops verified for private in-person consultations.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="PIN Code (e.g. 560001)"
          placeholderTextColor={theme.colors.muted}
          value={postalCode}
          onChangeText={setPostalCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="City (e.g. Bengaluru)"
          placeholderTextColor={theme.colors.muted}
          value={city}
          onChangeText={setCity}
        />
      </View>

      <Button
        title={isSearching ? 'Searching Hubs...' : 'Search Nearby Hubs'}
        onPress={searchHubs}
        variant="secondary"
        isLoading={isSearching}
        disabled={isSearching || (!postalCode.trim() && !city.trim())}
        style={{ marginTop: 6, marginBottom: 10 }}
      />

      {/* Status Notice */}
      {message ? (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      {/* Hub Results Roster */}
      {hubs && hubs.length > 0 && (
        <View style={styles.resultsList}>
          {hubs.map((h) => {
            const isSelected = selectedId === h.id;
            return (
              <View key={h.id} style={[styles.hubCard, isSelected && styles.hubCardSelected]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.hubName}>{h.shopName}</Text>
                  {h.address && <Text style={styles.hubAddress}>{h.address}</Text>}
                  <Text style={styles.hubMeta}>
                    {h.openHours ? `Open ${h.openHours}` : 'Operating today'}
                    {h.distanceKm != null ? ` • ${h.distanceKm} km away` : h.match ? ` • ${h.match}` : ''}
                  </Text>
                  {h.phone ? (
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${h.phone}`)}
                    >
                      <Ionicons name="call-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.phoneText}>Call Hub: {h.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
                  onPress={() =>
                    onSelect({
                      type: 'lone_hub',
                      hubId: h.id,
                      lat: h.latitude,
                      lng: h.longitude,
                      label: `${h.shopName}, ${h.address || ''}`,
                    })
                  }
                >
                  <Text style={[styles.selectBtnText, isSelected && styles.selectBtnTextActive]}>
                    {isSelected ? 'Selected ✓' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {hubs && hubs.length === 0 && !message && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No LegalNow Hub is available{radius ? ` within ${radius} km` : ''} at that time.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginBottom: 2,
  },
  subheading: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 10,
    lineHeight: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.text,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: theme.colors.primary,
    flex: 1,
  },
  emptyBox: {
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  resultsList: {
    gap: 8,
    marginTop: 4,
  },
  hubCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
  },
  hubCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F9F8',
  },
  hubName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hubAddress: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  hubMeta: {
    fontSize: 11,
    color: theme.colors.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  selectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  selectBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  selectBtnTextActive: {
    color: '#FFF',
  },
});
