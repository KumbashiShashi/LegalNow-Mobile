import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface BadgeProps {
  status: string;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  let bgColor = theme.colors.primaryLight;
  let textColor = theme.colors.primary;

  const normalizedStatus = status.toLowerCase();

  if (['completed', 'confirmed', 'verified', 'active', 'paid'].includes(normalizedStatus)) {
    bgColor = theme.colors.successBg;
    textColor = theme.colors.success;
  } else if (['rejected', 'cancelled', 'refunded', 'suspended'].includes(normalizedStatus)) {
    bgColor = theme.colors.dangerBg;
    textColor = theme.colors.danger;
  } else if (['pending', 'requested', 'awaiting'].some(s => normalizedStatus.includes(s))) {
    bgColor = theme.colors.warningBg;
    textColor = theme.colors.warning;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>
        {label || status.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
