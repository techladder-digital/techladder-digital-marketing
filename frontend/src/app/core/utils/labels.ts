import { DeliveryStatus, PortfolioCategory, ProjectType, ServiceCategory, SocialPlatform } from '../models/models';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  digital_marketing: 'Digital Marketing',
  website_software: 'Website & Software',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  digital_marketing: 'Digital Marketing',
  website: 'Website',
  software: 'Software',
};

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  digital_marketing: 'Digital Marketing',
  ai_ad_videos: 'AI Advertisement Videos',
  real_estate_marketing: 'Real Estate Marketing',
  website_development: 'Website Development',
  software_development: 'Software Development',
  logo_graphic_design: 'Logo & Graphic Design',
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  threads: 'Threads',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

/** Short text badges used instead of third-party brand logos (swap for official icon assets if desired). */
export const PLATFORM_BADGES: Record<SocialPlatform, string> = {
  instagram: 'IG',
  facebook: 'FB',
  whatsapp: 'WA',
  threads: 'TH',
  youtube: 'YT',
  linkedin: 'IN',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  skipped: 'Not configured',
  accepted: 'Accepted by provider',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

export const BUDGET_RANGES = [
  'Under ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹3,00,000',
  'Above ₹3,00,000',
  'Not sure yet',
] as const;

/** Maps a service category (and title) to the enquiry form's project type. */
export function projectTypeForService(category: ServiceCategory, title: string): ProjectType {
  if (category === 'digital_marketing') return 'digital_marketing';
  return /software|application/i.test(title) && !/website/i.test(title)
    ? 'software'
    : 'website';
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Builds a wa.me link from a stored number (digits only). Returns null if not configured. */
export function whatsappLink(number: string | null | undefined, text?: string | null): string | null {
  const digits = (number ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}

export function mailtoLink(email: string | null | undefined, subject?: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
