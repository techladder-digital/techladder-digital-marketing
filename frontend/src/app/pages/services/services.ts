import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ServiceItem } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { ServiceDetailDialog } from '../../shared/components/detail-dialogs/detail-dialogs';
import { ServiceCard } from '../../shared/components/service-card/service-card';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/state/states';

@Component({
  selector: 'tl-services-page',
  imports: [RouterLink, MatIconModule, ServiceCard, LoadingState, ErrorState, EmptyState],
  template: `
    <section class="page-hero" aria-labelledby="services-title">
      <div class="container-fluid px-3 px-md-5">
        <span class="tl-eyebrow">Services</span>
        <h1 id="services-title" class="tl-heading">Two paths, one team</h1>
        <p class="tl-lead">Choose the path that fits your goal — or combine both. Every engagement starts with a free consultation and a clear scope.</p>
        <nav class="jump" aria-label="Service paths">
          <a routerLink="/services" fragment="digital-marketing" class="jump__item">
            <mat-icon aria-hidden="true">campaign</mat-icon><span><strong>Path A</strong>Digital Marketing</span>
          </a>
          <a routerLink="/services" fragment="website-software" class="jump__item jump__item--dark">
            <mat-icon aria-hidden="true">code</mat-icon><span><strong>Path B</strong>Website &amp; Software</span>
          </a>
        </nav>
      </div>
    </section>

    @if (loading()) {
      <tl-loading-state label="Loading services…" />
    } @else if (failed()) {
      <div class="container-fluid px-3 px-md-5 py-5">
        <tl-error-state message="We couldn't load our services right now." (retry)="load()" />
      </div>
    } @else {
      <section id="digital-marketing" class="tl-section path" aria-labelledby="path-a">
        <div class="container-fluid px-3 px-md-5">
          <div class="path__head">
            <span class="path__tag">Path A</span>
            <h2 id="path-a" class="tl-heading">Digital Marketing</h2>
            <p class="tl-lead">Creative content, advertising and social media services to help the right people find your business.</p>
          </div>
          <div class="row g-4">
            @for (s of marketing(); track s.id) {
              <div class="col-12 col-md-6 col-xl-4"><tl-service-card [service]="s" (learnMore)="open($event)" /></div>
            } @empty {
              <div class="col-12"><tl-empty-state icon="campaign" title="No services listed yet">Please check back soon or contact us directly.</tl-empty-state></div>
            }
          </div>
        </div>
      </section>

      <section id="website-software" class="tl-section tl-section--dark path" aria-labelledby="path-b">
        <div class="container-fluid px-3 px-md-5">
          <div class="path__head">
            <span class="path__tag path__tag--light">Path B</span>
            <h2 id="path-b" class="tl-heading">Website &amp; Software Services</h2>
            <p class="tl-lead">Websites, e-commerce, web applications and business software — designed, built and maintained for you.</p>
          </div>
          <div class="row g-4">
            @for (s of software(); track s.id) {
              <div class="col-12 col-md-6 col-xl-4"><tl-service-card [service]="s" tone="dark" (learnMore)="open($event)" /></div>
            } @empty {
              <div class="col-12"><p class="tl-lead">No services listed yet. Please contact us directly.</p></div>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .page-hero { padding: 56px 0 40px; border-bottom: 1px solid var(--tl-ink-12); }
    .jump { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 24px; }
    .jump__item { display: flex; gap: 12px; align-items: center; padding: 14px 20px; border-radius: 14px; border: 2px solid var(--tl-orange); text-decoration: none; min-width: 240px; }
    .jump__item span { display: flex; flex-direction: column; font-size: 1.05rem; font-weight: 700; }
    .jump__item strong { font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--tl-ink-70); }
    .jump__item mat-icon { color: var(--tl-orange); }
    .jump__item--dark { background: var(--tl-black); color: var(--tl-white); border-color: var(--tl-black); }
    .jump__item--dark strong { color: var(--tl-paper-70); }
    .path { scroll-margin-top: calc(var(--tl-topbar-h) + 8px); }
    .path__head { margin-bottom: 28px; }
    .path__tag { display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--tl-orange); color: var(--tl-black); font-weight: 800; font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; }
  `,
})
export class ServicesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  private readonly services = signal<ServiceItem[]>([]);
  protected readonly marketing = computed(() => this.services().filter((s) => s.category === 'digital_marketing'));
  protected readonly software = computed(() => this.services().filter((s) => s.category === 'website_software'));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<ServiceItem[]>('/services').subscribe({
      next: (s) => {
        this.services.set(s);
        this.loading.set(false);
        // Scroll to #fragment once the sections exist.
        const id = location.hash.replace('#', '');
        if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView());
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected open(s: ServiceItem): void {
    this.dialog.open(ServiceDetailDialog, { data: s, maxWidth: '640px', width: '92vw', autoFocus: 'dialog' });
  }
}
