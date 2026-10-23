import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { mediaUrl } from '../../utils/media';

interface PhotoPickerProps {
  name?: string;
  photoUrl?: string | null;
  onPhotoUpdated?: (userProfile: any) => void;
  onChangeDataUrl?: (dataUrl: string | null) => void;
  size?: number;
  label?: string;
  hint?: string;
  editable?: boolean;
}

export function PhotoPicker({
  name,
  photoUrl,
  onPhotoUpdated,
  onChangeDataUrl,
  size = 80,
  label = 'Profile Photo',
  hint = 'Square JPEG, PNG or WEBP up to 2 MB',
  editable = true,
}: PhotoPickerProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUri = localPreview || (photoUrl ? mediaUrl(photoUrl) : null);

  const pickImage = async () => {
    setError(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll access is needed to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const asset = result.assets[0];
      setLocalPreview(asset.uri);

      // Registration/Pre-auth mode: pass base64 Data URL to form state
      if (onChangeDataUrl) {
        const mime = asset.mimeType || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        onChangeDataUrl(dataUrl);
        return;
      }

      // Online API mode: upload immediately to backend
      setBusy(true);
      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : (asset.mimeType || 'image/jpeg');

      formData.append('photo', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      const { data } = await apiClient.post('/auth/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onPhotoUpdated?.(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'The photo could not be uploaded.';
      setError(msg);
      Alert.alert('Upload Error', msg);
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setError(null);
            setLocalPreview(null);

            if (onChangeDataUrl) {
              onChangeDataUrl(null);
              return;
            }

            try {
              setBusy(true);
              const { data } = await apiClient.delete('/auth/photo');
              onPhotoUpdated?.(data);
            } catch (err: any) {
              const msg = err.response?.data?.message || err.message || 'Could not remove photo.';
              setError(msg);
              Alert.alert('Error', msg);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.pickerRow}>
        <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={[styles.avatarImg, { width: size, height: size, borderRadius: size / 2 }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
              <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
            </View>
          )}

          {busy && (
            <View style={[styles.busyOverlay, { width: size, height: size, borderRadius: size / 2 }]}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
        </View>

        {editable && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={pickImage}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.changeBtnText}>
                {busy ? 'Saving...' : displayUri ? 'Change photo' : 'Upload photo'}
              </Text>
            </TouchableOpacity>

            {Boolean(displayUri) && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={removePhoto}
                disabled={busy}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {hint && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    ...theme.typography.small,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
});

