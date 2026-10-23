import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../../components/Button';

interface LoginConfig {
  env: 'DEV' | 'STG' | 'PROD';
  loginMode: string;
  identifierType: string;
  otpDelivery: string;
}

const loginSchema = z.object({
  contactMethod: z.string().min(3, 'Please enter a valid mobile number or email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      contactMethod: '',
    },
  });

  useEffect(() => {
    apiClient.get('/auth/login-config')
      .then((res) => {
        setConfig(res.data);
      })
      .catch(() => {
        // Fallback default STG
        setConfig({ env: 'STG', loginMode: 'otp', identifierType: 'email_or_phone', otpDelivery: 'email_only' });
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setApiError(null);

      const res = await apiClient.post('/auth/login-otp/send', {
        identifier: data.contactMethod.trim(),
      });

      const destination = res.data?.destination || res.data?.message || '';

      router.push({
        pathname: '/(auth)/otp-verification',
        params: {
          contact: data.contactMethod.trim(),
          destination,
          env: config?.env || 'STG',
        },
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to send OTP code. Please check your input.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const env = config?.env || 'STG';
  const placeholder = env === 'PROD' ? 'Enter 10-digit mobile number' : 'Enter mobile number or email';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>L</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Legal<Text style={styles.brandNameAccent}>Now</Text></Text>
            <Text style={styles.tagline}>Legal Help & Services, Made Simple</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Sign In</Text>
          <View style={[styles.badge, env === 'PROD' ? styles.badgeProd : styles.badgeStg]}>
            <Text style={[styles.badgeText, env === 'PROD' ? styles.badgeTextProd : styles.badgeTextStg]}>
              {env === 'PROD' ? 'PROD (Mobile OTP)' : env === 'STG' ? 'STG (Email OTP)' : 'DEV MODE'}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {env === 'PROD'
            ? 'Sign in using your registered mobile number. We will send a 6-digit one-time password to verify your account.'
            : 'Sign in using your registered email address or mobile number. A 6-digit code will be sent to your email.'}
        </Text>

        {loadingConfig ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <Text style={styles.inputLabel}>{env === 'PROD' ? 'Mobile Number' : 'Email or Mobile'}</Text>
            <Controller
              control={control}
              name="contactMethod"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.contactMethod && styles.inputError]}
                  placeholder={placeholder}
                  placeholderTextColor={theme.colors.muted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value || ''}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={env === 'PROD' ? 'phone-pad' : 'email-address'}
                />
              )}
            />
            {errors.contactMethod && <Text style={styles.errorText}>{errors.contactMethod.message}</Text>}
            {apiError && <Text style={styles.errorBanner}>{apiError}</Text>}

            <Button
              title="Send Verification Code"
              onPress={() => handleSubmit(onSubmit)()}
              isLoading={isLoading}
              style={{ marginTop: 8 }}
            />

            <View style={styles.registerContainer}>
              <Text style={styles.registerHint}>New to LegalNow?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}> Register as Citizen or Professional</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.adminNote}>
              <Text style={styles.adminNoteText}>
                Are you a platform administrator? Admin functions are accessible via the LegalNow Web Portal only.
              </Text>
            </View>
          </>
        )}
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  brandNameAccent: {
    color: theme.colors.primary,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeStg: {
    backgroundColor: '#E8F0FE',
  },
  badgeProd: {
    backgroundColor: '#E6F4EA',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeTextStg: {
    color: '#1A73E8',
  },
  badgeTextProd: {
    color: '#137333',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FDE7E9',
    color: '#D93025',
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  registerHint: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  adminNote: {
    marginTop: 32,
    padding: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
  },
  adminNoteText: {
    fontSize: 12,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 16,
  },
});
