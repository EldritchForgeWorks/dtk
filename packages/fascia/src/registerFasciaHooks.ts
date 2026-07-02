declare const Hooks: { once(event: string, fn: () => void): void };

import { registerPartials } from './registerPartials.js';

function applyThemeClass(): void {
  const root = document.documentElement;
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dtk-theme-dark', dark);
  root.classList.toggle('dtk-theme-light', !dark);
}

export function registerFasciaHooks(): void {
  applyThemeClass();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyThemeClass);

  Hooks.once('init', () => {
    registerPartials();
  });
}
