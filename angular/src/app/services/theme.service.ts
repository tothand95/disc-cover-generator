import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dcg-theme';

/**
 * Reactive theme toggle. Writes `data-theme` on <html> so styles.scss can
 * override token vars. `system` clears the attribute and lets the
 * prefers-color-scheme media query decide.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readInitial());

  constructor() {
    effect(() => {
      const m = this.mode();
      const root = document.documentElement;
      if (m === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', m);
      }
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {
        /* ignore storage errors */
      }
    });
  }

  toggle(): void {
    const resolved = this.resolved();
    this.mode.set(resolved === 'dark' ? 'light' : 'dark');
  }

  resolved(): 'light' | 'dark' {
    const m = this.mode();
    if (m !== 'system') return m;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private readInitial(): ThemeMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
      /* ignore */
    }
    return 'system';
  }
}
