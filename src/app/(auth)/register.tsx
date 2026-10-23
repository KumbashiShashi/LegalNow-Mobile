import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { showAlert } from '../../utils/alert';
import { TermsModal } from '../../components/shared/TermsModal';
import { Ionicons } from '@expo/vector-icons';

const fetchCategories = async () => {
  const { data } = await apiClient.get('/marketplace/categories');
  return Array.isArray(data) ? data : [];
};

const fetchServices = async () => {
  const { data } = await apiClient.get('/service-marketplace/services');
  return Array.isArray(data) ? data : [];
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RegisterScreen() {
  const [role, setRole] = useState('citizen');
  const [step, setStep] = useState<'account' | 'location' | 'details' | 'verification'>('account');

  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');

  // Advocate specific
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');

  // Hub specific
  const [shopName, setShopName] = useState('');
  const [gstin, setGstin] = useState('');
  const [businessDetails, setBusinessDetails] = useState('');
  const [openDays, setOpenDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Business & Service Provider specific
  const [businessName, setBusinessName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('');
  const [workingHours, setWorkingHours] = useState('');

  // Citizen specific
  const [category, setCategory] = useState('');

  // Terms & Conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: providerServices = [] } = useQuery({ queryKey: ['services'], queryFn: fetchServices });

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/auth/register', payload);
      return data;
    },
    onSuccess: (data) => {
      showAlert(
        'Registration Complete',
        `Account created successfully for ${data.name || firstName}. Please log in with your credentials.`,
        () => router.replace('/(auth)/login')
      );
    },
    onError: (err: any) => {
      showAlert('Registration Failed', err.response?.data?.message || 'Could not create account. Please check your inputs.');
    }
  });

  const toggleSpecialization = (cat: string) => {
    if (specializations.includes(cat)) {
      setSpecializations(specializations.filter(c => c !== cat));
    } else {
      if (specializations.length >= 3) {
        showAlert('Limit Reached', 'Select up to 3 specializations.');
        return;
      }
      setSpecializations([...specializations, cat]);
    }
  };

  const toggleService = (id: string) => {
    if (serviceIds.includes(id)) {
      setServiceIds(serviceIds.filter(s => s !== id));
    } else {
      setServiceIds([...serviceIds, id]);
    }
  };

  const toggleDay = (d: string) => {
    if (openDays.includes(d)) {
      setOpenDays(openDays.filter(day => day !== d));
    } else {
      setOpenDays([...openDays, d]);
    }
  };

  const handleRegister = () => {
    if (!firstName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      showAlert('Validation Error', 'Please complete the basic account information.');
      return;
    }

    if (role === 'professional' && specializations.length === 0) {
      showAlert('Validation Error', 'Advocates must select at least 1 specialization.');
      return;
    }

    if (role === 'hub' && (!shopName.trim() || !bankName.trim() || !bankNumber.trim() || !bankIfsc.trim())) {
      showAlert('Validation Error', 'LegalNow Hubs require Shop Name and Bank Payout details.');
      return;
    }

    if (role === 'service_provider' && serviceIds.length === 0) {
      showAlert('Validation Error', 'Service Providers must select at least 1 catalogue service.');
      return;
    }

    if (!termsAccepted) {
      showAlert('Terms Required', 'Please accept the Terms & Conditions to proceed with registration.');
      return;
    }

    const payload: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      phone: phone.replace(/\D/g, ''),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.replace(/\D/g, ''),
      aadharNumber: aadharNumber.replace(/\D/g, ''),
      role,
      ...(role === 'professional' ? { categories: specializations, languages } : {}),
      ...(role === 'hub' ? {
        shopName: shopName.trim(),
        gstin: gstin.trim(),
        businessDetails: businessDetails.trim(),
        openDays: openDays.join(','),
        openTime,
        closeTime,
        latitude: lat ? Number(lat) : undefined,
        longitude: lng ? Number(lng) : undefined,
        bankAccountName: bankName.trim(),
        bankAccountNumber: bankNumber.trim(),
        bankIfsc: bankIfsc.trim(),
        upiId: upiId.trim(),
      } : {}),
      ...(role === 'service_provider' ? {
        serviceIds,
        businessName: businessName.trim(),
        servicesOffered: servicesOffered.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : undefined,
        workingHours: workingHours.trim(),
        languages,
      } : {}),
      ...(role === 'business' ? {
        businessName: businessName.trim(),
        organizationType: organizationType.trim(),
      } : {}),
      ...(role === 'citizen' ? { preferredCategory: category } : {}),
      acceptedTerms: true,
    };

    registerMutation.mutate(payload);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Create Account', headerShown: true }} />

        <View style={styles.header}>
          <Text style={styles.title}>Registration</Text>
          <Text style={styles.subtitle}>Complete your profile for instant account verification.</Text>
        </View>

        {/* Step Navigation Tabs */}
        <View style={styles.stepTabs}>
          {(['account', 'location', 'details', 'verification'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.stepTab, step === s && styles.stepTabActive]}
              onPress={() => setStep(s)}
            >
              <Text style={[styles.stepTabText, step === s && styles.stepTabTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.card}>
          {step === 'account' && (
            <View>
              <Text style={styles.sectionLabel}>1. Account Role & Credentials</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleContainer}>
                {[
                  { id: 'citizen', label: 'Individual' },
                  { id: 'business', label: 'Business' },
                  { id: 'professional', label: 'Advocate' },
                  { id: 'hub', label: 'LegalNow Hub' },
                  { id: 'service_provider', label: 'Service Provider' }
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleChip, role === r.id && styles.roleChipActive]}
                    onPress={() => setRole(r.id)}
                  >
                    <Text style={[styles.roleText, role === r.id && styles.roleTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="John" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Doe" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="john@example.com" />

              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile number" />

              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Create a password" />

              <Button title="Next: Location Details →" onPress={() => setStep('location')} style={{ marginTop: theme.spacing.md }} />
            </View>
          )}

          {step === 'location' && (
            <View>
              <Text style={styles.sectionLabel}>2. Address & Jurisdiction</Text>
              <Text style={styles.inputLabel}>Address Line 1 *</Text>
              <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholder="Building / Street Address" />

              <Text style={styles.inputLabel}>Address Line 2</Text>
              <TextInput style={styles.input} value={addressLine2} onChangeText={setAddressLine2} placeholder="Area / Landmark" />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Bengaluru" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>PIN Code *</Text>
                  <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit PIN" />
                </View>
              </View>

              <Text style={styles.inputLabel}>State *</Text>
              <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="e.g. Karnataka" />

              <View style={styles.rowActions}>
                <Button title="Back" variant="secondary" onPress={() => setStep('account')} style={{ flex: 1 }} />
                <Button title="Next: Details →" onPress={() => setStep('details')} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 'details' && (
            <View>
              <Text style={styles.sectionLabel}>3. Role-Specific Details</Text>

              {role === 'professional' && (
                <View>
                  <Text style={styles.inputLabel}>Select Specializations (1 to 3) *</Text>
                  <View style={styles.tagsContainer}>
                    {categories.map((cat: string) => {
                      const isSel = specializations.includes(cat);
                      return (
                        <TouchableOpacity key={cat} style={[styles.tag, isSel && styles.tagSelected]} onPress={() => toggleSpecialization(cat)}>
                          <Text style={[styles.tagText, isSel && styles.tagTextSelected]}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Languages Spoken (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={languageInput}
                    onChangeText={(val) => {
                      setLanguageInput(val);
                      setLanguages(val.split(',').map(s => s.trim()).filter(Boolean));
                    }}
                    placeholder="e.g. English, Hindi, Telugu"
                  />
                </View>
              )}

              {role === 'hub' && (
                <View>
                  <Text style={styles.inputLabel}>Shop Name *</Text>
                  <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="e.g. Metro Legal Hub" />

                  <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
                  <TextInput style={styles.input} value={gstin} onChangeText={setGstin} autoCapitalize="characters" maxLength={15} />

                  <Text style={styles.inputLabel}>Operating Days</Text>
                  <View style={styles.tagsContainer}>
                    {DAYS.map(d => (
                      <TouchableOpacity key={d} style={[styles.tag, openDays.includes(d) && styles.tagSelected]} onPress={() => toggleDay(d)}>
                        <Text style={[styles.tagText, openDays.includes(d) && styles.tagTextSelected]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Facility / Hub Details (Optional)</Text>
                  <TextInput style={styles.input} value={businessDetails} onChangeText={setBusinessDetails} placeholder="e.g. Wi-Fi, conference desk" />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Open Time</Text>
                      <TextInput style={styles.input} value={openTime} onChangeText={setOpenTime} placeholder="09:00" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Close Time</Text>
                      <TextInput style={styles.input} value={closeTime} onChangeText={setCloseTime} placeholder="20:00" />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Latitude</Text>
                      <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="numeric" placeholder="17.3850" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Longitude</Text>
                      <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="numeric" placeholder="78.4867" />
                    </View>
                  </View>
                </View>
              )}

              {role === 'service_provider' && (
                <View>
                  <Text style={styles.inputLabel}>Select Catalogue Services *</Text>
                  <View style={styles.tagsContainer}>
                    {providerServices.map((svc: any) => {
                      const isSel = serviceIds.includes(svc.id);
                      return (
                        <TouchableOpacity key={svc.id} style={[styles.tag, isSel && styles.tagSelected]} onPress={() => toggleService(svc.id)}>
                          <Text style={[styles.tagText, isSel && styles.tagTextSelected]}>{svc.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Business Name</Text>
                  <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} />

                  <Text style={styles.inputLabel}>Services Description</Text>
                  <TextInput style={styles.input} value={servicesOffered} onChangeText={setServicesOffered} placeholder="e.g. GST registration, licenses" />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Experience (Years)</Text>
                      <TextInput style={styles.input} value={experienceYears} onChangeText={setExperienceYears} keyboardType="number-pad" placeholder="5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Service Radius (Km)</Text>
                      <TextInput style={styles.input} value={serviceRadiusKm} onChangeText={setServiceRadiusKm} keyboardType="number-pad" placeholder="25" />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Working Hours</Text>
                  <TextInput style={styles.input} value={workingHours} onChangeText={setWorkingHours} placeholder="9:00 AM - 6:00 PM" />
                </View>
              )}

              {role === 'business' && (
                <View>
                  <Text style={styles.inputLabel}>Registered Organization Name *</Text>
                  <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} />

                  <Text style={styles.inputLabel}>Organization Type</Text>
                  <TextInput style={styles.input} value={organizationType} onChangeText={setOrganizationType} placeholder="e.g. Private Limited, Partnership" />
                </View>
              )}

              {role === 'citizen' && (
                <View>
                  <Text style={styles.inputLabel}>Preferred Legal Category</Text>
                  <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Property, Corporate" />
                </View>
              )}

              <View style={styles.rowActions}>
                <Button title="Back" variant="secondary" onPress={() => setStep('location')} style={{ flex: 1 }} />
                <Button title="Next: Verification →" onPress={() => setStep('verification')} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 'verification' && (
            <View>
              <Text style={styles.sectionLabel}>4. Identity & Verification Data</Text>

              <Text style={styles.inputLabel}>12-Digit Aadhar Number</Text>
              <TextInput style={styles.input} value={aadharNumber} onChangeText={setAadharNumber} keyboardType="number-pad" maxLength={12} placeholder="1234 5678 9012" />

              {role === 'hub' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Payout Account Holder Name *</Text>
                  <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />

                  <Text style={styles.inputLabel}>Payout Bank Account Number *</Text>
                  <TextInput style={styles.input} value={bankNumber} onChangeText={setBankNumber} keyboardType="number-pad" />

                  <Text style={styles.inputLabel}>Bank IFSC Code *</Text>
                  <TextInput style={styles.input} value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />

                  <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
                  <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
                </View>
              )}

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={termsAccepted ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={termsAccepted ? theme.colors.primary : theme.colors.muted}
                />
                <Text style={styles.termsText}>
                  I have read and agree to the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTermsModal(true);
                    }}
                  >
                    Terms &amp; Conditions
                  </Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.rowActions}>
                <Button title="Back" variant="secondary" onPress={() => setStep('details')} style={{ flex: 1 }} />
                <Button
                  title="Submit Registration"
                  onPress={handleRegister}
                  isLoading={registerMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </Card>

        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginHint}>Already registered?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Log in here</Text>
          </TouchableOpacity>
        </View>

        <TermsModal
          visible={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => setTermsAccepted(true)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.md },
  title: { ...theme.typography.h1, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body },
  stepTabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, padding: 4, borderWidth: 1, borderColor: theme.colors.border },
  stepTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.borderRadius.sm },
  stepTabActive: { backgroundColor: theme.colors.primaryLight },
  stepTabText: { fontSize: 11, fontWeight: '600', color: theme.colors.muted },
  stepTabTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  card: { padding: theme.spacing.md },
  sectionLabel: { ...theme.typography.h3, marginBottom: theme.spacing.md, color: theme.colors.primary },
  roleContainer: { flexDirection: 'row', paddingBottom: theme.spacing.md },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginRight: 8 },
  roleChipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  roleText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  roleTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  inputLabel: { ...theme.typography.small, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 12, fontSize: 15 },
  row: { flexDirection: 'row' },
  rowActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  tagSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  tagText: { fontSize: 12, color: theme.colors.text },
  tagTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  hintText: { ...theme.typography.small, color: theme.colors.muted, marginTop: 8, marginBottom: 12 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 16 },
  termsText: { ...theme.typography.body, fontSize: 13, color: theme.colors.text, flex: 1 },
  termsLink: { color: theme.colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  loginLinkContainer: { marginTop: theme.spacing.xl, alignItems: 'center' },
  loginHint: { ...theme.typography.body, color: theme.colors.muted },
  loginLink: { ...theme.typography.body, color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 },
});
