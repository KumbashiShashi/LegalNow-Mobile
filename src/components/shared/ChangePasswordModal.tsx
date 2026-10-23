import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../Button';
import { showAlert } from '../../utils/alert';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  email?: string;
  phone?: string;
}

export function ChangePasswordModal({ visible, onClose, email, phone }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    setStep('request');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setBusy(false);
    onClose();
  };

  const sendCode = async () => {
    setBusy(true);
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email, phone });
      setStep('reset');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send the verification code.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError('');
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Enter the 6-digit code sent to your registered email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        phone,
        otp: otp.trim(),
        newPassword,
      });
      setStep('done');
      showAlert('Password Changed', 'Your password has been updated successfully.', handleClose);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {step === 'request' && (
            <View>
              <Text style={styles.bodyText}>
                For your security, updating your password requires a one-time verification code sent to your registered contact ({email || phone}).
              </Text>
              <Button
                title="Send Verification Code"
                onPress={sendCode}
                isLoading={busy}
                style={{ marginTop: 16 }}
              />
            </View>
          )}

          {step === 'reset' && (
            <View>
              <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor={theme.colors.muted}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={theme.colors.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={theme.colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <Button
                title="Update Password"
                onPress={submitReset}
                isLoading={busy}
                style={{ marginTop: 12 }}
              />

              <TouchableOpacity style={styles.resendBtn} onPress={sendCode} disabled={busy}>
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  bodyText: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  otpInput: {
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 10,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
