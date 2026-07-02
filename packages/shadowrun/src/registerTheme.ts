// Apply the Shadowrun cyberpunk theme to the document root.
// html.dtk-theme-shadowrun has specificity 0,1,1 and beats fascia's
// .dtk-theme-dark / .dtk-theme-light (specificity 0,1,0) automatically.
export function registerTheme(): void {
  document.documentElement.classList.add('dtk-theme-shadowrun');
}
