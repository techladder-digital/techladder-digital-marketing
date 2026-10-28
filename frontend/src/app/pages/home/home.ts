import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslationKey } from '../../core/i18n/translations';
import { PortfolioProject, PublicFeedback, ServiceItem } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { SiteDataService } from '../../core/services/site-data.service';
import { mediaUrl } from '../../core/utils/media-url';
import { PortfolioDetailDialog, ServiceDetailDialog } from '../../shared/components/detail-dialogs/detail-dialogs';
import { FeedbackCard } from '../../shared/components/feedback-card/feedback-card';
import { PortfolioCard } from '../../shared/components/portfolio-card/portfolio-card';
import { ServiceCard } from '../../shared/components/service-card/service-card';
import { SocialLinks } from '../../shared/components/social-links/social-links';
import { EmptyState, LoadingState } from '../../shared/components/state/states';

@Component({
  selector: 'tl-home-page',
  imports: [RouterLink, MatIconModule, ServiceCard, PortfolioCard, FeedbackCard, SocialLinks, LoadingState, EmptyState],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly site = inject(SiteDataService);
  protected readonly i18n = inject(LanguageService);

  protected readonly loading = signal(true);
  protected readonly services = signal<ServiceItem[]>([]);
  protected readonly featured = signal<PortfolioProject[]>([]);
  protected readonly feedback = signal<PublicFeedback[]>([]);

  // English: text from admin Website settings (if filled). Tamil: text from the Tamil dictionary.
  protected readonly headline = computed(() => this.fromAdmin(this.site.settings().hero_headline, 'home.headline'));
  protected readonly subheading = computed(() => this.fromAdmin(this.site.settings().hero_subheading, 'home.sub'));
  protected readonly intro = computed(() => this.fromAdmin(this.site.settings().company_intro, 'home.introText'));
  protected readonly heroImage = computed(() => mediaUrl(this.site.settings().hero_image_url) || '/assets/images/hero-banner.svg');
  protected readonly dmPreview = computed(() => this.services().filter((s) => s.category === 'digital_marketing').slice(0, 6));
  protected readonly wsPreview = computed(() => this.services().filter((s) => s.category === 'website_software').slice(0, 6));

  protected readonly reasons: { icon: string; title: TranslationKey; text: TranslationKey }[] = [
    { icon: 'hub', title: 'home.why1Title', text: 'home.why1Text' },
    { icon: 'auto_awesome', title: 'home.why2Title', text: 'home.why2Text' },
    { icon: 'fact_check', title: 'home.why3Title', text: 'home.why3Text' },
    { icon: 'devices', title: 'home.why4Title', text: 'home.why4Text' },
    { icon: 'lock', title: 'home.why5Title', text: 'home.why5Text' },
    { icon: 'support_agent', title: 'home.why6Title', text: 'home.why6Text' },
  ];

  ngOnInit(): void {
    forkJoin({
      services: this.api.get<ServiceItem[]>('/services').pipe(catchError(() => of([] as ServiceItem[]))),
      featured: this.api.get<PortfolioProject[]>('/portfolio', { featured: true, limit: 3 }).pipe(catchError(() => of([] as PortfolioProject[]))),
      feedback: this.api.get<PublicFeedback[]>('/feedback/public', { limit: 3 }).pipe(catchError(() => of([] as PublicFeedback[]))),
    }).subscribe((r) => {
      this.services.set(r.services);
      this.featured.set(r.featured);
      this.feedback.set(r.feedback);
      this.loading.set(false);
    });
  }

  protected openService(s: ServiceItem): void {
    this.dialog.open(ServiceDetailDialog, { data: s, maxWidth: '640px', width: '92vw', autoFocus: 'dialog' });
  }

  protected openProject(p: PortfolioProject): void {
    this.dialog.open(PortfolioDetailDialog, { data: p, maxWidth: p.videoUrl ? '960px' : '760px', width: '94vw', autoFocus: 'dialog' });
  }

  private fromAdmin(adminText: string | null | undefined, key: TranslationKey): string {
    return this.i18n.isTamil() ? this.i18n.t(key) : adminText || this.i18n.t(key);
  }
}