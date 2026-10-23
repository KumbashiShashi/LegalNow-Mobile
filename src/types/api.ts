export type UserRole = 'citizen' | 'business' | 'professional' | 'hub' | 'service_provider' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  photoUrl?: string;
  aadharVerified?: boolean;
  aadharNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  adminType?: string;
  adminPermissions?: string[];
  createdAt?: string;
}

export interface Problem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  location?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  jurisdiction?: string;
  language?: string | null;
  status: 'open' | 'assigned' | 'in_progress' | 'closed' | 'cancelled';
  assignedProfessionalId?: string | null;
  assignedProfessionalName?: string | null;
  requestedServiceId?: string | null;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Professional {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  categories: string[];
  experienceYears?: number;
  languages?: string[];
  bio?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  barCouncilEnrollmentNumber?: string;
  consultationFee?: number;
  photoUrl?: string;
}

export interface AppointmentLocation {
  type: 'advocate_office' | 'citizen' | 'lone_hub';
  address?: string;
  lat?: number;
  lng?: number;
  hubId?: string;
}

export interface Appointment {
  id: string;
  problemId: string;
  professionalId: string;
  userId: string;
  startTime: string;
  durationMinutes: number;
  type?: string;
  initiatedBy: 'citizen' | 'advocate';
  subject?: string;
  notes?: string;
  status: 'pending_payment' | 'requested' | 'awaiting_location' | 'awaiting_fees' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  locationType: 'advocate_office' | 'citizen' | 'lone_hub';
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  hubId?: string;
  locationProposedBy?: 'citizen' | 'advocate';
  locationAgreed?: boolean;
  rejectionReason?: string;
  createdAt: string;
  acceptedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  hubPayoutAmount?: number;
  citizenHubOtp?: string;
  advocateHubOtp?: string;
  citizenHubOtpVerified?: boolean;
  advocateHubOtpVerified?: boolean;
  // Hydrated counterparty view
  citizenName?: string;
  professionalName?: string;
  hubName?: string;
  problemTitle?: string;
}

export interface ServiceMeeting {
  id: string;
  serviceLeadId: string;
  customerUserId: string;
  serviceProviderUserId: string;
  startTime: string;
  durationMinutes: number;
  locationType: 'provider_office' | 'lone_hub';
  locationAddress: string;
  hubId?: string;
  status: 'proposed' | 'awaiting_fees' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  customerName?: string;
  serviceProviderName?: string;
  hubName?: string;
  customerHubOtp?: string;
  serviceProviderHubOtp?: string;
  customerHubOtpVerified?: boolean;
  serviceProviderHubOtpVerified?: boolean;
}

export interface Hub {
  id: string;
  userId: string;
  shopName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  openDays?: string[];
  openTime?: string;
  closeTime?: string;
  gstin?: string;
  businessDetails?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isSuspended: boolean;
  verificationNote?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  upiId?: string;
  subscription?: {
    status: 'active' | 'expired' | 'pending';
    expiresAt?: string;
  };
  earnings?: {
    accrued: number;
    due: number;
    paid: number;
  };
  env?: string;
}

export interface ServiceCatalogueItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  isActive: boolean;
  estimatedDays?: number;
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  requiredSubscriptionTier?: string;
}

export interface ServiceLead {
  id: string;
  problemId: string;
  serviceCatalogueItemId: string;
  serviceName?: string;
  serviceCategory?: string;
  customerUserId: string;
  customerName?: string;
  serviceProviderUserId?: string;
  serviceProviderName?: string;
  status: 'open' | 'matched' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'disputed';
  location?: string;
  title?: string;
  notes?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Message {
  id: string;
  problemId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  attachments?: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CitizenSubscription {
  status: 'active' | 'inactive' | 'expired';
  renewalDate?: string;
  amountDue?: number;
  planName?: string;
  benefits?: string[];
}

export interface Invoice {
  id: string;
  userId: string;
  referenceId?: string;
  type: string;
  amount: number;
  baseAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceNumber: string;
  customerName?: string;
  customerAddress?: string;
  customerGstin?: string;
  createdAt: string;
}

