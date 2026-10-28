import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { SiteDataService } from '../../../core/services/site-data.service';
import { BrandLogo } from '../brand-logo/brand-logo';
import { SocialLinks } from '../social-links/social-links';

@Component({
  selector: 'tl-footer',
  imports: [RouterLink, MatIconModule, BrandLogo, SocialLinks],
  template: `
    <footer class="footer" aria-labelledby="footer-heading">
      <h2 id="footer-heading" class="visually-hidden">Footer</h2>
      <div class="container-fluid px-3 px-md-5">
        <div class="row g-4">
          <div class="col-12 col-lg-4">
            <tl-brand-logo tone="light" />
            <p class="footer__text">{{ tagline() }}</p>
            <tl-social-links variant="icons" tone="light" />
          </div>
          <div class="col-6 col-lg-2">
            <h3 class="footer__h">{{ i18n.t('footer.explore') }}</h3>
            <ul class="footer__list">
              <li><a routerLink="/">{{ i18n.t('nav.home') }}</a></li>
              <li><a routerLink="/services">{{ i18n.t('nav.services') }}</a></li>
              <li><a routerLink="/portfolio">{{ i18n.t('nav.portfolio') }}</a></li>
              <li><a routerLink="/feedback">{{ i18n.t('nav.feedback') }}</a></li>
              <li><a routerLink="/contact">{{ i18n.t('nav.contact') }}</a></li>
            </ul>
          </div>
          <div class="col-6 col-lg-3">
            <h3 class="footer__h">{{ i18n.t('nav.services') }}</h3>
            <ul class="footer__list">
              <li><a routerLink="/services" fragment="digital-marketing">{{ i18n.t('footer.dm') }}</a></li>
              <li><a routerLink="/services" fragment="website-software">{{ i18n.t('footer.ws') }}</a></li>
              <li><a routerLink="/contact" fragment="enquiry-form">{{ i18n.t('footer.consult') }}</a></li>
            </ul>
          </div>
          <div class="col-12 col-lg-3">
            <h3 class="footer__h">{{ i18n.t('nav.contact') }}</h3>
            <ul class="footer__list footer__contact">
              @if (site.settings().business_email; as email) {
                <li><mat-icon aria-hidden="true">mail</mat-icon><a [href]="site.emailUrl()">{{ email }}</a></li>
              }
              @if (site.settings().business_phone; as phone) {
                <li><mat-icon aria-hidden="true">call</mat-icon><a [href]="site.phoneUrl()">{{ phone }}</a></li>
              }
              @if (site.settings().business_address; as addr) {
                <li><mat-icon aria-hidden="true">place</mat-icon><span>{{ addr }}</span></li>
              }
              @if (site.settings().business_hours; as hours) {
                <li><mat-icon aria-hidden="true">schedule</mat-icon><span>{{ hours }}</span></li>
              }
              @if (!site.settings().business_email && !site.settings().business_phone) {
                <li><a routerLink="/contact" fragment="enquiry-form">{{ i18n.t('footer.sendEnquiry') }}</a></li>
              }
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© {{ year }} {{ site.companyName() }}. {{ i18n.t('footer.rights') }}</span>
          <a routerLink="/admin/login" class="footer__admin">Admin</a>
        </div>
      </div>
    </footer>
  `,
  styles: `
    .footer { background: var(--tl-black); color: var(--tl-white); padding: 56px 0 24px; border-top: 4px solid var(--tl-orange); }
    .footer__text { color: var(--tl-paper-70); margin: 16px 0; max-width: 360px; line-height: 1.6; }
    .footer__h { font-size: .8rem; letter-spacing: .14em; text-transform: uppercase; color: var(--tl-orange); margin-bottom: 14px; }
    .footer__list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .footer__list a { color: var(--tl-paper-70); text-decoration: none; }
    .footer__list a:hover { color: var(--tl-white); text-decoration: underline; }
    .footer__contact li { display: flex; gap: 10px; align-items: flex-start; color: var(--tl-paper-70); word-break: break-word; }
    .footer__contact mat-icon { color: var(--tl-orange); font-size: 18px; width: 18px; height: 18px; margin-top: 3px; flex-shrink: 0; }
    .footer__bottom { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--tl-paper-12); font-size: .85rem; color: var(--tl-paper-70); }
    .footer__admin { color: var(--tl-paper-70); }
  `,
})
export class Footer {
  protected readonly site = inject(SiteDataService);
  protected readonly i18n = inject(LanguageService);
  protected readonly year = new Date().getFullYear();
  /** English: the admin's footer text (if set). Tamil: the Tamil dictionary text. */
  protected readonly tagline = computed(() =>
    this.i18n.isTamil() ? this.i18n.t('footer.tagline') : this.site.settings().footer_text || this.i18n.t('footer.tagline'),
  );
}