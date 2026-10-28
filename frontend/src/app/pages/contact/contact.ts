import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SiteDataService } from '../../core/services/site-data.service';
import { EnquiryForm } from '../../shared/components/enquiry-form/enquiry-form';

@Component({
  selector: 'tl-contact-page',
  imports: [MatIconModule, EnquiryForm],
  template: `
    <section class="tl-section" aria-labelledby="contact-title">
      <div class="container-fluid px-3 px-md-5">
        <span class="tl-eyebrow">Contact &amp; Enquiry</span>
        <h1 id="contact-title" class="tl-heading">Let's talk about your project</h1>
        <p class="tl-lead">Reach us directly, or send an enquiry and we'll get back to you.</p>

        <div class="row g-3 my-3" role="list" aria-label="Contact options">
          <div class="col-6 col-lg-3" role="listitem">
            @if (site.emailUrl(); as url) {
              <a class="contact tl-card" [href]="url"><mat-icon aria-hidden="true">mail</mat-icon><strong>Email Us</strong><span>{{ site.settings().business_email }}</span></a>
            } @else {
              <div class="contact contact--off" aria-disabled="true"><mat-icon aria-hidden="true">mail</mat-icon><strong>Email Us</strong><span>Not available yet</span></div>
            }
          </div>
          <div class="col-6 col-lg-3" role="listitem">
            @if (site.whatsappUrl(); as url) {
              <a class="contact tl-card" [href]="url" target="_blank" rel="noopener noreferrer"><mat-icon aria-hidden="true">chat</mat-icon><strong>WhatsApp Us</strong><span>Opens WhatsApp</span></a>
            } @else {
              <div class="contact contact--off" aria-disabled="true"><mat-icon aria-hidden="true">chat</mat-icon><strong>WhatsApp Us</strong><span>Not available yet</span></div>
            }
          </div>
          <div class="col-6 col-lg-3" role="listitem">
            @if (site.phoneUrl(); as url) {
              <a class="contact tl-card" [href]="url"><mat-icon aria-hidden="true">call</mat-icon><strong>Call Us</strong><span>{{ site.settings().business_phone }}</span></a>
            } @else {
              <div class="contact contact--off" aria-disabled="true"><mat-icon aria-hidden="true">call</mat-icon><strong>Call Us</strong><span>Not available yet</span></div>
            }
          </div>
          <div class="col-6 col-lg-3" role="listitem">
            @if (site.mapsUrl(); as url) {
              <a class="contact tl-card" [href]="url" target="_blank" rel="noopener noreferrer"><mat-icon aria-hidden="true">directions</mat-icon><strong>Get Directions</strong><span>Google Maps</span></a>
            } @else {
              <div class="contact contact--off" aria-disabled="true"><mat-icon aria-hidden="true">directions</mat-icon><strong>Get Directions</strong><span>Not available yet</span></div>
            }
          </div>
        </div>

        <div class="row g-4 mt-2">
          <div class="col-12 col-xl-8">
            <div id="enquiry-form" class="tl-form-panel anchor">
              <h2 class="h4 mb-1">Send an enquiry</h2>
              <p class="text-muted-ink">Tell us what you need. We usually reply within one business day.</p>
              <tl-enquiry-form [presetType]="type()" [presetService]="service()" />
            </div>
          </div>
          <div class="col-12 col-xl-4">
            <aside class="info" aria-label="Business details">
              <h2 class="h5">Business details</h2>
              <dl>
                @if (site.settings().business_address; as a) { <dt>Address</dt><dd>{{ a }}</dd> }
                @if (site.settings().business_hours; as h) { <dt>Business hours</dt><dd>{{ h }}</dd> }
                @if (site.settings().business_email; as e) { <dt>Email</dt><dd><a [href]="site.emailUrl()">{{ e }}</a></dd> }
                @if (site.settings().business_phone; as p) { <dt>Phone</dt><dd><a [href]="site.phoneUrl()">{{ p }}</a></dd> }
              </dl>
              @if (!site.settings().business_address && !site.settings().business_hours && !site.settings().business_email && !site.settings().business_phone) {
                <p class="mb-0 text-muted-ink">Use the enquiry form and we'll get back to you.</p>
              }
            </aside>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .contact { display: flex; flex-direction: column; gap: 4px; padding: 18px; height: 100%; text-decoration: none; color: var(--tl-black); min-width: 0; }
    .contact mat-icon { color: var(--tl-orange); margin-bottom: 6px; }
    .contact span { font-size: .85rem; color: var(--tl-ink-70); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .contact--off { border: 1px dashed var(--tl-ink-12); border-radius: var(--tl-radius); opacity: .7; }
    .anchor { scroll-margin-top: calc(var(--tl-topbar-h) + 12px); }
    .info { background: var(--tl-black); color: var(--tl-white); border-radius: var(--tl-radius); padding: 24px; }
    .info dt { color: var(--tl-orange); font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; margin-top: 14px; }
    .info dd { margin: 4px 0 0; color: var(--tl-paper-70); word-break: break-word; }
    .info a { color: var(--tl-white); }
  `,
})
export class ContactPage {
  protected readonly site = inject(SiteDataService);
  /** Query params from "Enquire Now": ?type=website&service=Business%20Website%20Development */
  readonly type = input<string | undefined>();
  readonly service = input<string | undefined>();
}
