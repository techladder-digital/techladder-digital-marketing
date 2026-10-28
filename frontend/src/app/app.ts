import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/services/seo.service';
import { SiteDataService } from './core/services/site-data.service';

@Component({
  selector: 'tl-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly site = inject(SiteDataService);

  ngOnInit(): void {
    this.seo.init();
    this.site.load();
  }
}
