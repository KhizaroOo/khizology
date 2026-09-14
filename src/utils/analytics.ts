// Only public product metadata crosses this boundary. Never pass input values here.
export type Consent = 'accepted' | 'declined';
const consentKey = 'khizooology-analytics-consent';
const measurementId = (import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '').trim();
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };
let choice: Consent | null = null;
let initialized = false;
let loaded = false;
let started = false;

export function configured() { return /^G-[A-Z0-9]{6,20}$/.test(measurementId); }
export function consent(): Consent | null {
  if (typeof window === 'undefined') return null;
  if (!initialized) {
    initialized = true;
    try {
      const saved = localStorage.getItem(consentKey);
      if (saved === 'accepted' || saved === 'declined') choice = saved;
    } catch { /* Use this page's in-memory choice if storage is unavailable. */ }
  }
  return choice;
}
function pageMetadata() {
  // The server-generated canonical is fixed, never location.href or user URL state.
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const page = new URL(canonical || 'https://khizooology.com/');
  return { page_location: `https://khizooology.com${page.pathname}`, page_referrer: '', page_title: document.title };
}
function command(...args: unknown[]) { (window as unknown as AnalyticsWindow).gtag?.(...args); }
export function loadAnalytics() {
  if (!configured() || consent() !== 'accepted' || loaded) return;
  loaded = true;
  const w = window as unknown as AnalyticsWindow;
  w[`ga-disable-${measurementId}`] = false;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer!.push(arguments); };
  command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  command('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  command('js', new Date());
  command('config', measurementId, { ...pageMetadata(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: 'none', cookie_flags: 'SameSite=Lax;Secure' });
  command('event', 'page_view', pageMetadata());
  const script = document.createElement('script');
  script.id = 'khizooology-ga';
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.onerror = () => { w[`ga-disable-${measurementId}`] = true; w.dataLayer = []; };
  document.head.appendChild(script);
}
export function setConsent(value: Consent) {
  const wasLoaded = loaded;
  choice = value;
  initialized = true;
  try { localStorage.setItem(consentKey, value); } catch { /* Keep in memory. */ }
  if (value === 'accepted') loadAnalytics();
  else if (typeof window !== 'undefined') {
    const w = window as unknown as AnalyticsWindow;
    w[`ga-disable-${measurementId}`] = true;
    w.dataLayer = [];
    document.getElementById('khizooology-ga')?.remove();
    // Disable first, then reload to remove Google's already-executed code and timers.
    try { for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_')) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
    }
    } catch { /* Cookie access can be blocked; disabling and reload still apply. */ }
    if (wasLoaded) window.location.reload();
  }
  document.dispatchEvent(new Event('analytics-consent-change'));
}
function emit(name: string, params: Record<string, string | number>) {
  if (!configured() || consent() !== 'accepted' || !loaded || (window as unknown as AnalyticsWindow)[`ga-disable-${measurementId}`]) return;
  command('event', name, { ...pageMetadata(), ...params });
}
function toolMetadata() {
  const node = document.querySelector<HTMLElement>('[data-tool-slug]');
  if (!node || !/^[a-z0-9-]+$/.test(node.dataset.toolSlug || '')) return null;
  const family = node.dataset.toolFamily || '';
  if (!['check', 'simulate', 'decide', 'plan', 'create'].includes(family)) return null;
  return { tool_slug: node.dataset.toolSlug!, tool_family: family, feature_level: Number(node.dataset.featureLevel) || 2 };
}
export function trackToolStart() {
  const metadata = toolMetadata();
  if (started || !metadata || consent() !== 'accepted' || !configured()) return;
  started = true;
  emit('tool_start', metadata);
}
export function trackArtworkView(slug: string) {
  // Match a public SSR artwork record, never search text or an uploaded filename.
  if ([...document.querySelectorAll<HTMLElement>('[data-artwork-slug]')].some(node => node.dataset.artworkSlug === slug)) emit('artwork_view', { artwork_slug: slug });
}
export function trackToolExport(exportType: 'svg' | 'png' | 'json') {
  const metadata = toolMetadata();
  if (metadata && ['svg', 'png', 'json'].includes(exportType)) emit('tool_export', { tool_slug: metadata.tool_slug, export_type: exportType });
}
type SharedFeatureMetadata = { monster: 'toolooo' | 'artooo' | 'infooo'; content_type: 'tool' | 'artwork' | 'infooo_world'; slug: string; action: string };
function validSharedMetadata(metadata: SharedFeatureMetadata) {
  return /^[a-z0-9-]+$/.test(metadata.slug) && /^[a-z_]+$/.test(metadata.action);
}
export function trackShareAction(metadata: SharedFeatureMetadata) {
  if (validSharedMetadata(metadata)) emit('share_action', metadata);
}
export function trackRelatedContentClick(metadata: Omit<SharedFeatureMetadata, 'action'>) {
  if (validSharedMetadata({ ...metadata, action: 'open' })) emit('related_content_click', metadata);
}
function validToolId(value: string) { return /^[a-z0-9-]+$/.test(value); }
function trackToolLv3(event: 'tool_favorite' | 'tool_unfavorite' | 'tool_scenario_select' | 'tool_next_move' | 'tool_chain_next', toolId: string, extra: Record<string, string> = {}) {
  if (validToolId(toolId) && Object.values(extra).every((value) => /^[a-z0-9-]+$/.test(value))) emit(event, { tool_id: toolId, ...extra });
}
export function trackToolFavorite(toolId: string, favorite: boolean) { trackToolLv3(favorite ? 'tool_favorite' : 'tool_unfavorite', toolId); }
export function trackToolScenarioSelect(toolId: string, scenarioId: string) { trackToolLv3('tool_scenario_select', toolId, { scenario_id: scenarioId }); }
export function trackToolNextMove(toolId: string, targetToolId: string) { trackToolLv3('tool_next_move', toolId, { target_tool_id: targetToolId }); }
export function trackToolChainAction(event: 'tool_chain_next', toolId: string, chainId: string, targetToolId?: string) { trackToolLv3(event, toolId, { chain_id: chainId, ...(targetToolId ? { target_tool_id: targetToolId } : {}) }); }
export function trackContractDriftRun(changeCount: number, summary: { likelyBreaking: number; needsReview: number; additive: number }) {
  const bucket = changeCount === 0 ? 'none' : changeCount <= 3 ? 'few' : changeCount <= 10 ? 'several' : 'many';
  emit('contract_drift_run', { tool_id: 'api-payload-doctor', change_count_bucket: bucket, likely_breaking_count: summary.likelyBreaking, needs_review_count: summary.needsReview, additive_count: summary.additive });
}

export function initializeAnalytics() {
  loadAnalytics();
  const tool = document.querySelector('[data-tool-slug]');
  const interaction = (event: Event) => {
    if (event.isTrusted && event.target instanceof Element && event.target.closest('input,textarea,select,button,summary')) trackToolStart();
  };
  tool?.addEventListener('input', interaction);
  tool?.addEventListener('change', interaction);
  tool?.addEventListener('click', interaction);
  const channels: Record<string, string> = { 'instagram.com': 'instagram', 'linkedin.com': 'linkedin', 'facebook.com': 'facebook', 'twitter.com': 'twitter', 'wa.me': 'whatsapp', 't.me': 'telegram', 'threads.net': 'threads', 'tiktok.com': 'tiktok', 'snapchat.com': 'snapchat', 'pinterest.com': 'pinterest', 'discordapp.com': 'discord', 'github.com': 'github', 'medium.com': 'medium', 'codepen.io': 'codepen' };
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || !link.closest('footer, .dav-connect')) return;
    const target = new URL(link.href);
    const channel = target.protocol === 'mailto:' ? 'email' : channels[target.hostname.replace(/^www\./, '')];
    if (channel) emit('contact_click', { contact_type: channel });
  });
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLElement>('[data-related-content]');
    const monster = link?.dataset.relatedMonster;
    const contentType = link?.dataset.relatedContentType;
    const slug = link?.dataset.relatedSlug;
    if ((monster === 'toolooo' || monster === 'artooo') && (contentType === 'tool' || contentType === 'artwork') && slug && /^[a-z0-9-]+$/.test(slug)) {
      trackRelatedContentClick({ monster, content_type: contentType, slug });
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === consentKey) {
      if (event.newValue === 'accepted') { choice = 'accepted'; loadAnalytics(); }
      else setConsent('declined');
      document.dispatchEvent(new Event('analytics-consent-change'));
    }
  });
}
