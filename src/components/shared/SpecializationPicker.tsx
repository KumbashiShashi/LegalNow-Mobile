import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface SpecializationPickerProps {
  value: string[];
  onChange: (specializations: string[]) => void;
  options?: string[];
  max?: number;
  label?: string;
}

export function SpecializationPicker({
  value,
  onChange,
  options = [],
  max = 3,
  label = 'Specializations — choose 1 to',
}: SpecializationPickerProps) {
  const [customInput, setCustomInput] = useState('');
  const atLimit = value.length >= max;

  const has = (list: string[], v: string) =>
    list.some((x) => x.toLowerCase() === v.toLowerCase());

  const toggle = (name: string) => {
    if (has(value, name)) {
      onChange(value.filter((x) => x.toLowerCase() !== name.toLowerCase()));
    } else if (!atLimit) {
      onChange([...value, name]);
    }
  };

  const addNew = () => {
    const v = customInput.trim();
    if (!v || atLimit) return;
    if (!has(value, v)) {
      onChange([...value, v]);
    }
    setCustomInput('');
  };

  const choices = Array.from(new Set([...options, ...value]));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {label} {max}
        </Text>
        <Text style={[styles.countBadge, value.length >= 1 ? styles.countBadgeOk : styles.countBadgeWarn]}>
          {value.length} of {max} selected
        </Text>
      </View>

      {/* Choices Chips Grid */}
      <View style={styles.chipsContainer}>
        {choices.map((c) => {
          const selected = has(value, c);
          const disabled = !selected && atLimit;

          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => toggle(c)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {c}
                {selected ? ' ×' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add Custom Specialization Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, atLimit && styles.inputDisabled]}
          value={customInput}
          onChangeText={setCustomInput}
          placeholder={atLimit ? `Maximum of ${max} reached` : "Don't see yours? Type new..."}
          placeholderTextColor={theme.colors.muted}
          editable={!atLimit}
          onSubmitEditing={addNew}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, (atLimit || !customInput.trim()) && styles.addBtnDisabled]}
          onPress={addNew}
          disabled={atLimit || !customInput.trim()}
        >
          <Ionicons name="add" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...theme.typography.small,
    fontWeight: '600',
    color: theme.colors.text,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  countBadgeOk: {
    backgroundColor: '#E6F4EA',
    color: '#137333',
  },
  countBadgeWarn: {
    backgroundColor: '#FEF7E0',
    color: '#B06000',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  chipTextDisabled: {
    color: theme.colors.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.text,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
});

