import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../../components/Button';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { contact, destination } = useLocalSearchParams<{ contact: string; destination?: string }>();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [apiError, setApiError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const { setAuthSession, logout } = useAuthStore();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      setApiError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setIsVerifying(true);
      setApiError(null);
      setFlashMessage(null);

      const response = await apiClient.post('/auth/login-otp/verify', {
        identifier: contact?.trim(),
        otp: otp.trim(),
      });

      const { token, user } = response.data;

      // Strict Admin Module Exclusion
      if (user?.role === 'admin') {
        await logout();
        Alert.alert(
          'Web Portal Access Only',
          'Administrative accounts cannot access the mobile application. Please log in through the LegalNow Web Portal.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }

      await setAuthSession(token, user);
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    try {
      setIsResending(true);
      setApiError(null);
      setFlashMessage(null);

      const res = await apiClient.post('/auth/login-otp/send', {
        identifier: contact?.trim(),
      });

      setFlashMessage(res.data?.message || 'New verification code dispatched.');
      setResendCooldown(30);
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Could not resend OTP. Please wait a moment.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Change Number / Email</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to{' '}
          <Text style={styles.highlightText}>{destination || contact}</Text>.
        </Text>

        {flashMessage && <Text style={styles.flashBanner}>{flashMessage}</Text>}
        {apiError && <Text style={styles.errorBanner}>{apiError}</Text>}

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#BDC1C6"
          onChangeText={(val) => {
            setOtp(val.replace(/\D/g, ''));
            if (apiError) setApiError(null);
          }}
          value={otp}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          autoFocus
        />

        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          isLoading={isVerifying}
          disabled={otp.length !== 6}
          style={{ marginBottom: 16 }}
        />

        <View style={styles.resendRow}>
          {resendCooldown > 0 ? (
            <Text style={styles.cooldownText}>
              Resend code in <Text style={{ fontWeight: 'bold' }}>{resendCooldown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              <Text style={styles.resendLink}>
                {isResending ? 'Sending...' : 'Didn’t receive code? Resend OTP'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  highlightText: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  input: {
    height: 64,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 32,
    letterSpacing: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.lg,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FDE7E9',
    color: '#D93025',
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
    textAlign: 'center',
  },
  flashBanner: {
    backgroundColor: '#E6F4EA',
    color: '#137333',
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  cooldownText: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});
