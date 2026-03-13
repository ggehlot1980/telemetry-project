import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'telemetry-theme';
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeMode>('light');

  constructor() {
    this.initializeTheme();
  }

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);
    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    this.document.documentElement.style.colorScheme = theme;
    localStorage.setItem(this.storageKey, theme);
  }

  private initializeTheme(): void {
    const storedTheme = localStorage.getItem(this.storageKey);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      this.setTheme(storedTheme);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(prefersDark ? 'dark' : 'light');
  }
}
