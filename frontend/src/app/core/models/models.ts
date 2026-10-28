// Typed models matching the backend API (camelCase DTOs).

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export type ServiceCategory = 'digital_marketing' | 'website_software';
export type ProjectType = 'digital_marketing' | 'website' | 'software';
export type ContactMethod = 'email' | 'whatsapp' | 'both';
export type EnquiryStatus = 'new' | 'contacted' | 'in_progress' | 'closed' | 'spam';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type DeliveryStatus = 'pending' | 'skipped' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';
export type SocialPlatform = 'instagram' | 'facebook' | 'whatsapp' | 'threads' | 'youtube' | 'linkedin';
export type PortfolioCategory =
  | 'digital_marketing'
  | 'ai_ad_videos'
  | 'real_estate_marketing'
  | 'website_development'
  | 'software_development'
  | 'logo_graphic_design';

export interface ServiceItem {
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
}

export type ServicePayload = Omit<ServiceItem, 'id'>;

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
  createdAt: string;
}

export type PortfolioPayload = Omit<PortfolioProject, 'id' | 'createdAt'>;

export interface PublicFeedback {
  id: number;
  customerName: string;
  businessName: string | null;
  serviceCategory: ServiceCategory;
  projectName: string;
  rating: number;
  feedbackMessage: string;
  createdAt: string;
}

export interface AdminFeedback extends PublicFeedback {
  consentToPublish: boolean;
  moderationStatus: ModerationStatus;
}

export interface FeedbackPayload {
  customerName: string;
  businessName: string | null;
  serviceCategory: ServiceCategory;
  projectName: string;
  rating: number;
  feedbackMessage: string;
  consentToPublish: boolean;
  website?: string;
}

export interface PublicSocialLink {
  platform: SocialPlatform;
  profileName: string | null;
  profileUrl: string;
  followerCount: number | null;
  countSource: 'manual' | 'api' | null;
  lastCountUpdate: string | null;
}

export interface AdminSocialLink {
  id: number;
  platform: SocialPlatform;
  profileName: string | null;
  profileUrl: string | null;
  followerCount: number | null;
  countType: 'manual' | 'api';
  apiAccountId: string | null;
  lastCountUpdate: string | null;
  lastSyncError: string | null;
  isEnabled: boolean;
  showFollowerCount: boolean;
  displayOrder: number;
}

export interface SiteSettings {
  company_name: string | null;
  hero_headline: string | null;
  hero_subheading: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  company_intro: string | null;
  business_email: string | null;
  whatsapp_number: string | null;
  business_phone: string | null;
  business_address: string | null;
  google_maps_url: string | null;
  business_hours: string | null;
  footer_text: string | null;
  whatsapp_prefill_message: string | null;
}

export interface EnquiryPayload {
  fullName: string;
  businessName: string | null;
  email: string;
  phone: string;
  projectType: ProjectType;
  serviceName: string;
  budgetRange: string | null;
  message: string;
  preferredContactMethod: ContactMethod;
  consentToContact: true;
  website?: string;
}

export interface EnquiryResult {
  enquiryId: number;
  notifications: { email: DeliveryStatus; whatsapp: DeliveryStatus };
}

export interface NotificationLog {
  id: number;
  channel: 'email' | 'whatsapp';
  deliveryStatus: DeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  nextRetryAt: string | null;
  updatedAt: string;
}

export interface Enquiry extends Omit<EnquiryPayload, 'website' | 'consentToContact'> {
  id: number;
  consentToContact: boolean;
  enquiryStatus: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
  notifications?: NotificationLog[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor';
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  admin: AdminUser;
}

export interface DashboardStats {
  totalEnquiries: number;
  newEnquiries: number;
  enquiriesLast7Days: number;
  pendingNotifications: number;
  failedNotifications: number;
  approvedFeedback: number;
  pendingFeedback: number;
  publishedProjects: number;
}

export interface ChannelOutcome {
  status: DeliveryStatus;
  at: string;
  error: string | null;
}

export interface IntegrationStatus {
  email: { configured: boolean; lastOutcome: ChannelOutcome | null };
  whatsapp: { configured: boolean; webhookConfigured: boolean; lastOutcome: ChannelOutcome | null };
  socialApis: { youtube: boolean; meta: boolean; supportedPlatforms: SocialPlatform[] };
}

export interface AuditEntry {
  id: number;
  adminName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export type MediaKind = 'image' | 'video';

export interface MediaFile {
  id: number;
  kind: MediaKind;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
}
