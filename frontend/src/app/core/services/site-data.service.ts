import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { PublicSocialLink, SiteSettings } from '../models/models';
import { mailtoLink, telLink, whatsappLink } from '../utils/labels';
import { ApiService } from './api.service';

/** Public site configuration (contact details, hero, social links) loaded once and shared via signals. */
@Injectable({ providedIn: 'root' })
export class SiteDataService {
  private readonly api = inject(ApiService);

  readonly settings = signal<Partial<SiteSettings>>({});
  readonly socialLinks = signal<PublicSocialLink[]>([]);
  readonly loaded = signal(false);
  readonly loadFailed = signal(false);

  readonly companyName = computed(() => this.settings().company_name || 'TechLadder Digital Marketing');
  readonly whatsappUrl = computed(() =>
    whatsappLink(this.settings().whatsapp_number, this.settings().whatsapp_prefill_message),
  );
  readonly phoneUrl = computed(() => telLink(this.settings().business_phone));
  readonly emailUrl = computed(() => mailtoLink(this.settings().business_email, 'Website enquiry'));
  readonly mapsUrl = computed(() => {
    const u = this.settings().google_maps_url;
    return u && u.startsWith('https://') ? u : null;
  });

  private loading = false;

  load(force = false): void {
    if ((this.loaded() && !force) || this.loading) return;
    this.loading = true;
    forkJoin({
      settings: this.api.get<SiteSettings>('/settings/public').pipe(catchError(() => of(null))),
      social: this.api.get<PublicSocialLink[]>('/social-links').pipe(catchError(() => of(null))),
    }).subscribe(({ settings, social }) => {
      if (settings) this.settings.set(settings);
      if (social) this.socialLinks.set(social);
      this.loadFailed.set(!settings);
      this.loaded.set(true);
      this.loading = false;
    });
  }

  /** WhatsApp link with a custom prefilled message (e.g. after an enquiry). */
  whatsappWith(text: string): string | null {
    return whatsappLink(this.settings().whatsapp_number, text);
  }
}
