import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Lang, TranslationKey, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'tl-lang';

/** Keeps the current language and gives the right word for each key. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly doc = inject(DOCUMENT);

  /** Current language: 'en' or 'ta'. Remembered in the visitor's browser. */
  readonly lang = signal<Lang>(readSaved());
  readonly isTamil = computed(() => this.lang() === 'ta');

  constructor() {
    this.applyToPage(this.lang());
  }

  /** Word for a key in the current language, e.g. t('nav.home') → "Home" or "முகப்பு". */
  t(key: TranslationKey): string {
    return TRANSLATIONS[this.lang()][key] ?? TRANSLATIONS.en[key];
  }

  toggle(): void {
    this.set(this.lang() === 'en' ? 'ta' : 'en');
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode — language still works, just not remembered */
    }
    this.applyToPage(lang);
  }

  /** <html lang="ta"> helps screen readers and Google read the page correctly. */
  private applyToPage(lang: Lang): void {
    this.doc.documentElement.lang = lang;
    this.doc.documentElement.classList.toggle('lang-ta', lang === 'ta');
  }
}

function readSaved(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ta' ? 'ta' : 'en';
  } catch {
    return 'en';
  }
}