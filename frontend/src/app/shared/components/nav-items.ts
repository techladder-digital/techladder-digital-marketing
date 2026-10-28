import { TranslationKey } from '../../core/i18n/translations';

export interface NavItem {
  label: string;
  /** Dictionary key for the label (English / Tamil). */
  key: TranslationKey;
  path: string;
  icon: string;
  fragment?: string;
  exact?: boolean;
}

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Home', key: 'nav.home', path: '/', icon: 'home', exact: true },
  { label: 'Services', key: 'nav.services', path: '/services', icon: 'design_services' },
  { label: 'Portfolio', key: 'nav.portfolio', path: '/portfolio', icon: 'collections' },
  { label: 'Feedback', key: 'nav.feedback', path: '/feedback', icon: 'reviews' },
  { label: 'Contact', key: 'nav.contact', path: '/contact', icon: 'call', exact: true },
  { label: 'Enquiry', key: 'nav.enquiry', path: '/contact', icon: 'edit_note', fragment: 'enquiry-form' },
];