import React from 'react';
import { StyleSheet, Text, View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Button } from '../Button';

export const TERMS_VERSION = '2026-09';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function TermsModal({ visible, onClose, onAccept }: TermsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Terms & Conditions</Text>
              <Text style={styles.version}>Version {TERMS_VERSION}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={true}>
            <Text style={styles.sectionHeading}>1. About LegalNow</Text>
            <Text style={styles.paragraph}>
              LegalNow is an online platform that lets logged-in citizens find independent advocates and book appointments.
              Advocates are not publicly listed or advertised. LegalNow is not a law firm, does not provide legal advice,
              and is not a party to the advocate–client relationship.
            </Text>

            <Text style={styles.sectionHeading}>2. Your Account</Text>
            <Text style={styles.paragraph}>
              You must provide accurate, current information and keep your credentials confidential. You are responsible for
              all activity under your account. You must be at least 18 years old to register.
            </Text>

            <Text style={styles.sectionHeading}>3. Identity Verification (KYC)</Text>
            <Text style={styles.paragraph}>
              Citizens and advocates must provide an Aadhar number and an image of the Aadhar for identity verification.
              The number and image are used only for verification, are visible only to you and authorised LegalNow administrators,
              and the number is masked once verified. Changing your Aadhar number requires uploading a new image and resets verification.
            </Text>

            <Text style={styles.sectionHeading}>4. Advocates</Text>
            <Text style={styles.paragraph}>
              Advocates confirm that they are legally entitled to practise, that their specializations (up to three) and
              profile details are accurate, and that they will handle client matters with professional care and confidentiality.
              LegalNow may suspend advocates who breach these terms.
            </Text>

            <Text style={styles.sectionHeading}>5. Citizens</Text>
            <Text style={styles.paragraph}>
              Citizens confirm that the problem details they submit are truthful and that they will not use the platform
              for unlawful purposes. Sharing a problem does not create an advocate–client relationship until an advocate accepts the case.
            </Text>

            <Text style={styles.sectionHeading}>6. Fees</Text>
            <Text style={styles.paragraph}>
              Advocates join free and pay no commission, subscription or booking fee. Citizens without a subscription pay a
              convenience fee for each advocate booking, even at the {"advocate's"} office; citizens with an active LegalNow subscription,
              and appointments an advocate books from their side, carry no booking fee. A further convenience fee applies when a meeting
              is held at a LegalNow Hub, and the advocate pays a LegalNow Hub usage fee for that meeting. LegalNow Hubs pay a subscription
              after a free period. All amounts are shown before you pay, and a LegalNow Hub fee is refunded if the appointment is rejected.
              Consultation fees are agreed directly between the citizen and the advocate.
            </Text>

            <Text style={styles.sectionHeading}>7. Privacy and Data</Text>
            <Text style={styles.paragraph}>
              You consent to LegalNow collecting and processing your personal data to operate the service, match citizens with advocates,
              verify identity, prevent fraud, and meet legal obligations. Case information is shared only with the advocates involved.
            </Text>

            <Text style={styles.sectionHeading}>8. Acceptable Use</Text>
            <Text style={styles.paragraph}>
              You must not misuse the platform, attempt unauthorized access, upload malicious files, harass other users, or provide false documents.
            </Text>

            <Text style={styles.sectionHeading}>9. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the extent permitted by law, LegalNow is not liable for the advice, acts, or omissions of advocates, or for outcomes of any legal matter.
            </Text>

            <Text style={styles.sectionHeading}>10. Changes and Governing Law</Text>
            <Text style={styles.paragraph}>
              We may update these terms and will ask you to accept material changes. These terms are governed by the laws of India,
              and the courts at Bengaluru have jurisdiction.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            {onAccept ? (
              <View style={styles.footerBtnRow}>
                <Button title="Decline" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
                <Button title="Accept Terms" variant="primary" onPress={() => { onAccept(); onClose(); }} style={{ flex: 1 }} />
              </View>
            ) : (
              <Button title="Close" variant="secondary" onPress={onClose} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h2,
    fontSize: 18,
  },
  version: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 16,
  },
  bodyContent: {
    paddingVertical: 12,
  },
  sectionHeading: {
    ...theme.typography.h3,
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
