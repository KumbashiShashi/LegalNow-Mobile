import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../../components/Button';
import { showAlert } from '../../utils/alert';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-15 digit mobile number.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.post('/auth/forgot-password', { phone: phone.trim() });
      setMessage(res.data?.message || 'If an account exists for that mobile number, a reset code has been sent to its registered email.');
      setStep('reset');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send the reset code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit code received.');
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
        phone: phone.trim(),
        otp: otp.trim(),
        newPassword,
      });
      showAlert('Password Reset Successful', 'Please log in with your new password.', () => {
        router.replace('/(auth)/login');
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the mobile number registered to your account. We will send a one-time verification code to your registered email.
        </Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.infoBanner}>{message}</Text> : null}

        {step === 'request' && (
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Registered Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor={theme.colors.muted}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 15))}
              keyboardType="phone-pad"
              maxLength={15}
            />

            <Button
              title="Send Reset Code"
              onPress={requestOtp}
              isLoading={busy}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {step === 'reset' && (
          <View style={styles.form}>
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
              title="Reset Password"
              onPress={resetPassword}
              isLoading={busy}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity style={styles.resendLink} onPress={requestOtp} disabled={busy}>
              <Text style={styles.resendText}>Did not receive code? Resend</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.loginText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 4,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    fontSize: 13,
    marginBottom: 16,
  },
  infoBanner: {
    backgroundColor: '#E1EFFE',
    color: '#1E429F',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    fontSize: 13,
    marginBottom: 16,
  },
  form: {
    marginBottom: 20,
  },
  inputLabel: {
    ...theme.typography.small,
    fontWeight: '600',
    marginBottom: 6,
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 14,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
