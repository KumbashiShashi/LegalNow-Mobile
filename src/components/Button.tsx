import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle
}: ButtonProps) {

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
          text: { color: theme.colors.secondary }
        };
      case 'danger':
        return {
          button: { backgroundColor: theme.colors.dangerBg, borderWidth: 1, borderColor: '#FECACA' },
          text: { color: theme.colors.danger }
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 10, paddingHorizontal: 15 },
          text: { color: theme.colors.primary, fontSize: 13 }
        };
      default: // primary
        return {
          button: { backgroundColor: theme.colors.primary, borderWidth: 0 },
          text: { color: '#FFFFFF' }
        };
    }
  };

  const variantStyles = getVariantStyles();
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        variantStyles.button,
        isDisabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFF' : theme.colors.primary} />
      ) : (
        <Text style={[styles.baseText, variantStyles.text, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  baseText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
