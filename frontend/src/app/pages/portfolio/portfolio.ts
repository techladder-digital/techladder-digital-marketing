import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PortfolioCategory, PortfolioProject } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { PORTFOLIO_CATEGORY_LABELS } from '../../core/utils/labels';
import { PortfolioDetailDialog } from '../../shared/components/detail-dialogs/detail-dialogs';
import { PortfolioCard } from '../../shared/components/portfolio-card/portfolio-card';
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/state/states';

@Component({
  selector: 'tl-portfolio-page',
  imports: [MatChipsModule, PortfolioCard, LoadingState, ErrorState, EmptyState],
  template: `
    <section class="tl-section" aria-labelledby="pf-title">
      <div class="container-fluid px-3 px-md-5">
        <span class="tl-eyebrow">Portfolio</span>
        <h1 id="pf-title" class="tl-heading">Our work</h1>
        <p class="tl-lead">A selection of marketing, video, design, website and software projects. Items marked
          <span class="tl-badge tl-badge--orange">Sample / concept work</span> are demonstrations, not client projects.</p>

        <mat-chip-listbox class="filters" aria-label="Filter projects by category" [value]="active()" (change)="setCategory($event.value)">
          <mat-chip-option value="all">All</mat-chip-option>
          @for (c of categories; track c[0]) {
            <mat-chip-option [value]="c[0]">{{ c[1] }}</mat-chip-option>
          }
        </mat-chip-listbox>

        <div aria-live="polite">
          @if (loading()) {
            <tl-loading-state label="Loading projects…" />
          } @else if (failed()) {
            <tl-error-state message="We couldn't load the portfolio right now." (retry)="load()" />
          } @else {
            <p class="visually-hidden">{{ projects().length }} projects shown</p>
            <div class="row g-4">
              @for (p of projects(); track p.id) {
                <div class="col-12 col-md-6 col-xl-4"><tl-portfolio-card [project]="p" (open)="openProject($event)" /></div>
              } @empty {
                <div class="col-12">
                  <tl-empty-state icon="collections" title="No projects in this category yet">
                    New work is added regularly. Contact us to discuss examples relevant to your project.
                  </tl-empty-state>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .filters { margin: 24px 0 28px; display: block; }
  `,
})
export class PortfolioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** ?category= query parameter (bound by the router). */
  readonly category = input<string | undefined>();

  protected readonly categories = Object.entries(PORTFOLIO_CATEGORY_LABELS) as [PortfolioCategory, string][];
  protected readonly active = signal<PortfolioCategory | 'all'>('all');
  protected readonly projects = signal<PortfolioProject[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  ngOnInit(): void {
    const c = this.category();
    if (c && c in PORTFOLIO_CATEGORY_LABELS) this.active.set(c as PortfolioCategory);
    this.load();
  }

  protected setCategory(value: PortfolioCategory | 'all' | undefined): void {
    this.active.set(value ?? 'all');
    this.router.navigate([], { queryParams: { category: value && value !== 'all' ? value : null }, replaceUrl: true });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    const cat = this.active();
    this.api.get<PortfolioProject[]>('/portfolio', cat === 'all' ? {} : { category: cat }).subscribe({
      next: (p) => {
        this.projects.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  protected openProject(p: PortfolioProject): void {
    this.dialog.open(PortfolioDetailDialog, { data: p, maxWidth: p.videoUrl ? '960px' : '760px', width: '94vw', autoFocus: 'dialog' });
  }
}
