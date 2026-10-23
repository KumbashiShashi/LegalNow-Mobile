import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { showAlert } from '../../utils/alert';

interface LoginConfig {
  env: 'DEV' | 'STG' | 'PROD';
  loginMode: string;
  identifierType: string;
  otpDelivery: string;
}

const otpLoginSchema = z.object({
  contactMethod: z.string().min(3, 'Please enter a valid mobile number or email address'),
});

const passwordLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type OtpFormData = z.infer<typeof otpLoginSchema>;
type PasswordFormData = z.infer<typeof passwordLoginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setAuthSession = useAuthStore((state) => state.setAuthSession);
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form for OTP login (STG / PROD)
  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpLoginSchema),
    defaultValues: { contactMethod: '' },
  });

  // Form for Password login (DEV)
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { email: '', password: '' },
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

  const isDevPasswordMode = config?.env === 'DEV' || config?.loginMode === 'password';

  // Handle STG/PROD OTP dispatch
  const onOtpSubmit = async (data: OtpFormData) => {
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

  // Handle DEV Password Login
  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      setApiError(null);

      const res = await apiClient.post('/auth/login', {
        email: data.email.trim(),
        password: data.password,
      });

      const user = res.data?.user;
      const token = res.data?.token;

      if (user?.role === 'admin') {
        showAlert(
          'Admin Portal Notice',
          'Platform administrators must sign in via the LegalNow Web Portal only. Mobile access is restricted to marketplace users.',
          () => {}
        );
        return;
      }

      await setAuthSession(token, user);

      // Route based on role
      switch (user?.role) {
        case 'professional':
          router.replace('/(roles)/(advocate)');
          break;
        case 'hub':
          router.replace('/(roles)/(lonehub)');
          break;
        case 'service_provider':
          router.replace('/(roles)/(provider)');
          break;
        case 'business':
        case 'citizen':
        default:
          router.replace('/(roles)/(citizen)');
          break;
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid email or password. Please try again.';
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
          <View style={[styles.badge, env === 'PROD' ? styles.badgeProd : env === 'DEV' ? styles.badgeDev : styles.badgeStg]}>
            <Text style={[styles.badgeText, env === 'PROD' ? styles.badgeTextProd : env === 'DEV' ? styles.badgeTextDev : styles.badgeTextStg]}>
              {env === 'PROD' ? 'PROD (Mobile OTP)' : env === 'STG' ? 'STG (Email OTP)' : 'DEV (Password)'}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {isDevPasswordMode
            ? 'Sign in using your registered email and account password.'
            : env === 'PROD'
            ? 'Sign in using your registered mobile number. We will send a 6-digit one-time password to verify your account.'
            : 'Sign in using your registered email address or mobile number. A 6-digit code will be sent to your email.'}
        </Text>

        {loadingConfig ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : isDevPasswordMode ? (
          /* DEV Mode: Email & Password Form */
          <>
            <Text style={styles.inputLabel}>Email Address</Text>
            <Controller
              control={passwordForm.control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, passwordForm.formState.errors.email && styles.inputError]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.muted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
            />
            {passwordForm.formState.errors.email && (
              <Text style={styles.errorText}>{passwordForm.formState.errors.email.message}</Text>
            )}

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrap}>
              <Controller
                control={passwordForm.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.passwordInput, passwordForm.formState.errors.password && styles.inputError]}
                    placeholder="Enter account password"
                    placeholderTextColor={theme.colors.muted}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry={!showPassword}
                  />
                )}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>
            {passwordForm.formState.errors.password && (
              <Text style={styles.errorText}>{passwordForm.formState.errors.password.message}</Text>
            )}

            <View style={styles.forgotWrap}>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {apiError && <Text style={styles.errorBanner}>{apiError}</Text>}

            <Button
              title="Sign In with Password"
              onPress={passwordForm.handleSubmit(onPasswordSubmit)}
              isLoading={isLoading}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          /* STG / PROD Mode: OTP Request Form */
          <>
            <Text style={styles.inputLabel}>{env === 'PROD' ? 'Mobile Number' : 'Email or Mobile'}</Text>
            <Controller
              control={otpForm.control}
              name="contactMethod"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, otpForm.formState.errors.contactMethod && styles.inputError]}
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
            {otpForm.formState.errors.contactMethod && (
              <Text style={styles.errorText}>{otpForm.formState.errors.contactMethod.message}</Text>
            )}

            <View style={styles.forgotWrap}>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {apiError && <Text style={styles.errorBanner}>{apiError}</Text>}

            <Button
              title="Send Verification Code"
              onPress={otpForm.handleSubmit(onOtpSubmit)}
              isLoading={isLoading}
              style={{ marginTop: 8 }}
            />
          </>
        )}

        <View style={styles.registerContainer}>
          <Text style={styles.registerHint}>New to LegalNow?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}> Register as Citizen, Business, Provider or Advocate</Text>
          </TouchableOpacity>
        </View>

        {/* Explicit Admin Portal Notice */}
        <View style={styles.adminNote}>
          <Ionicons name="information-circle-outline" size={16} color="#5F6368" style={{ marginRight: 6 }} />
          <Text style={styles.adminNoteText}>
            Platform administrators must access system controls exclusively via the LegalNow Web Portal.
          </Text>
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
  badgeDev: {
    backgroundColor: '#FEF7E0',
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
  badgeTextDev: {
    color: '#B06000',
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: 6,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
  },
  forgotWrap: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  forgotLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
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
    marginTop: 20,
    alignItems: 'center',
  },
  registerHint: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
  },
  adminNoteText: {
    fontSize: 12,
    color: '#5F6368',
    flex: 1,
    lineHeight: 16,
  },
});
