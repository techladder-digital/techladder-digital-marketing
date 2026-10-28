// Shared domain types (camelCase DTOs returned by the API).

export type AdminRole = 'admin' | 'editor';

export interface AuthenticatedAdmin {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
}

export const PROJECT_TYPES = ['digital_marketing', 'website', 'software'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const CONTACT_METHODS = ['email', 'whatsapp', 'both'] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'in_progress', 'closed', 'spam'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const SERVICE_CATEGORIES = ['digital_marketing', 'website_software'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const PORTFOLIO_CATEGORIES = [
  'digital_marketing',
  'ai_ad_videos',
  'real_estate_marketing',
  'website_development',
  'software_development',
  'logo_graphic_design',
] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'whatsapp', 'threads', 'youtube', 'linkedin'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type NotificationChannel = 'email' | 'whatsapp';
export const DELIVERY_STATUSES = ['pending', 'skipped', 'accepted', 'sent', 'delivered', 'read', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface Enquiry {
  id: number;
  fullName: string;
  businessName: string | null;
  email: string;
  phone: string;
  projectType: ProjectType;
  serviceName: string;
  budgetRange: string | null;
  message: string;
  preferredContactMethod: ContactMethod;
  consentToContact: boolean;
  enquiryStatus: EnquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NewEnquiry = Omit<Enquiry, 'id' | 'enquiryStatus' | 'createdAt' | 'updatedAt'>;

export interface NotificationLog {
  id: number;
  enquiryId: number;
  channel: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: number;
  customerName: string;
  businessName: string | null;
  serviceCategory: ServiceCategory;
  projectName: string;
  rating: number;
  feedbackMessage: string;
  consentToPublish: boolean;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioProject {
  id: number;
  title: string;
  category: PortfolioCategory;
  description: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  projectUrl: string | null;
  isSample: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: number;
  category: ServiceCategory;
  title: string;
  slug: string;
  description: string;
  details: string | null;
  icon: string | null;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialLink {
  id: number;
  platform: SocialPlatform;
  profileName: string | null;
  profileUrl: string | null;
  followerCount: number | null;
  countType: 'manual' | 'api';
  apiAccountId: string | null;
  lastCountUpdate: Date | null;
  lastSyncError: string | null;
  isEnabled: boolean;
  showFollowerCount: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** What visitors see — no internal fields, counts only when allowed. */
export interface PublicSocialLink {
  platform: SocialPlatform;
  profileName: string | null;
  profileUrl: string;
  followerCount: number | null;
  countSource: 'manual' | 'api' | null;
  lastCountUpdate: Date | null;
}
