import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tl-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="tl-section text-center">
      <div class="container">
        <p class="code" aria-hidden="true">404</p>
        <h1 class="tl-heading">Page not found</h1>
        <p class="tl-lead mx-auto">The page you're looking for doesn't exist or may have moved.</p>
        <div class="d-flex gap-3 justify-content-center flex-wrap mt-4">
          <a class="tl-btn tl-btn--primary" routerLink="/">Go to home</a>
          <a class="tl-btn tl-btn--outline" routerLink="/contact">Contact us</a>
        </div>
      </div>
    </section>
  `,
  styles: `.code { font: 800 clamp(5rem, 14vw, 9rem)/1 var(--tl-font-display); color: var(--tl-orange); margin: 0; }`,
})
export class NotFoundPage {}
