// Same-origin embed only. Read the existing site theme; never persist viewer preferences.
(() => {
  if (window.parent === window) return;
  try {
    if (window.parent.location.origin !== window.location.origin) return;
    const parentRoot = window.parent.document.documentElement;
    const root = document.documentElement;
    root.dataset.siteEmbed = 'true';
    const tokens = ['--k-bg', '--k-bg-card', '--k-bg-elevated', '--k-text', '--k-text-muted', '--k-border'];
    function syncTheme() {
      const style = window.parent.getComputedStyle(parentRoot);
      for (const token of tokens) {
        const value = style.getPropertyValue(token).trim();
        if (value && CSS.supports('color', value)) root.style.setProperty(token, value);
      }
      root.classList.toggle('dark', parentRoot.classList.contains('dark'));
    }
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    const observeTheme = () => { syncTheme(); observer.observe(parentRoot, { attributes: true, attributeFilter: ['class', 'style'] }); };
    observeTheme();
    window.addEventListener('pageshow', observeTheme);
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  } catch { /* A cross-origin embed keeps its standalone theme. */ }
})();
