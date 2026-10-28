import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { Footer } from '../../shared/components/footer/footer';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { TopNav } from '../../shared/components/top-nav/top-nav';
import { WhatsappButton } from '../../shared/components/whatsapp-button/whatsapp-button';

const COLLAPSE_KEY = 'tl_sidebar_collapsed';

/** Public layout: left sidebar (slide-out drawer on mobile), sticky top nav, content, footer. */
@Component({
  selector: 'tl-main-layout',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, TopNav, Footer, WhatsappButton],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <mat-sidenav-container class="shell" [hasBackdrop]="isMobile()">
      <mat-sidenav id="site-drawer" class="shell__nav" [class.shell__nav--collapsed]="collapsed() && !isMobile()"
                   [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile() || drawerOpen()"
                   (closedStart)="drawerOpen.set(false)" [fixedInViewport]="true" [attr.aria-label]="'Site navigation'">
        <tl-sidebar [collapsed]="collapsed() && !isMobile()" [mobile]="isMobile()"
                    (toggleCollapse)="toggleCollapse()" (closeDrawer)="drawerOpen.set(false)" (navigate)="onNavigate()" />
      </mat-sidenav>
      <mat-sidenav-content class="shell__content">
        <tl-top-nav [mobile]="isMobile()" (openMenu)="drawerOpen.set(true)" />
        <main id="main-content" tabindex="-1">
          <router-outlet />
        </main>
        <tl-footer />
      </mat-sidenav-content>
    </mat-sidenav-container>
    <tl-whatsapp-button />
  `,
  styles: `
    .shell { min-height: 100vh; background: var(--tl-white); }
    .shell__nav { width: 260px; border-right: 0; transition: width .2s ease; }
    .shell__nav--collapsed { width: 84px; }
    .shell__content { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1 0 auto; outline: none; }
  `,
})
export class MainLayout {
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 991.98px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );
  protected readonly drawerOpen = signal(false);
  protected readonly collapsed = signal(readCollapsed());
  protected readonly navWidth = computed(() => (this.isMobile() ? 0 : this.collapsed() ? 84 : 260));

  protected toggleCollapse(): void {
    this.collapsed.update((c) => !c);
    try {
      localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  protected onNavigate(): void {
    if (this.isMobile()) this.drawerOpen.set(false);
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}
