import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { LANGUAGES } from '../../utils/languages';

interface LanguageInputProps {
  value: string[];
  onChange: (languages: string[]) => void;
  label?: string;
}

export function LanguageInput({
  value,
  onChange,
  label = 'Languages you can consult in',
}: LanguageInputProps) {
  const [customInput, setCustomInput] = useState('');

  const addLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (!trimmed) return;
    if (!value.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setCustomInput('');
  };

  const removeLanguage = (lang: string) => {
    onChange(value.filter((l) => l !== lang));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Suggested Language Quick Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
        {LANGUAGES.map((lang) => {
          const isSelected = value.some((l) => l.toLowerCase() === lang.toLowerCase());
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.suggestChip, isSelected && styles.suggestChipActive]}
              onPress={() => (isSelected ? removeLanguage(lang) : addLanguage(lang))}
            >
              <Text style={[styles.suggestChipText, isSelected && styles.suggestChipTextActive]}>
                {isSelected ? `${lang} ✓` : `+ ${lang}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Custom Language Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="Type other language (e.g. Konkani)..."
          placeholderTextColor={theme.colors.muted}
          onSubmitEditing={() => addLanguage(customInput)}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !customInput.trim() && styles.addButtonDisabled]}
          onPress={() => addLanguage(customInput)}
          disabled={!customInput.trim()}
        >
          <Ionicons name="add" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Selected Tags Roster */}
      {value.length > 0 && (
        <View style={styles.tagsRoster}>
          {value.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={styles.selectedTag}
              onPress={() => removeLanguage(lang)}
            >
              <Text style={styles.selectedTagText}>{lang} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    ...theme.typography.small,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  suggestionScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  suggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  suggestChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  suggestChipText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  suggestChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  tagsRoster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedTag: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  selectedTagText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
});

