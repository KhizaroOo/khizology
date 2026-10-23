// Only public product metadata crosses this boundary. Never pass input values here.
export type Consent = 'accepted' | 'declined';
const consentKey = 'khizooology-analytics-consent';
const measurementId = (import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '').trim();
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };
let choice: Consent | null = null;
let initialized = false;
let loaded = false;
let started = false;
let listenersAttached = false;

function localPreview() {
  if (typeof window === 'undefined') return true;
  return ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(new URL(window.location.href).hostname);
}

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
// Only known public referral hosts; never forward private hosts, paths or URL state.
const publicReferralHosts = new Set(['google.com', 'google.co.uk', 'google.com.pk', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'github.com', 'linkedin.com', 'reddit.com', 'youtube.com', 'facebook.com', 'instagram.com', 'pinterest.com', 'x.com', 't.co', 'chatgpt.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com']);
function safeReferrer() {
  try {
    const referrer = new URL(document.referrer);
    return ['https:', 'http:'].includes(referrer.protocol) && !referrer.username && !referrer.password && !referrer.port && publicReferralHosts.has(referrer.hostname.replace(/^www\./, '')) ? `${referrer.protocol}//${referrer.hostname}/` : '';
  } catch { return ''; }
}
function pageMetadata() {
  // The server-generated canonical is fixed, never location.href or user URL state.
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const page = new URL(canonical || 'https://khizooology.com/');
  return { page_location: `https://khizooology.com${page.pathname}`, page_referrer: safeReferrer(), page_title: document.title };
}
function command(...args: unknown[]) { (window as unknown as AnalyticsWindow).gtag?.(...args); }
export function loadAnalytics() {
  if (!configured() || localPreview() || consent() !== 'accepted' || loaded) return;
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
function sourceMetadata() {
  const path = new URL(pageMetadata().page_location).pathname.split('/').filter(Boolean);
  const module = ({ toolbox: 'toolooo', artworks: 'artooo', infooo: 'infooo', notooo: 'notooo' } as Record<string, string>)[path[0]] || 'site';
  return { source_slug: path.at(-1) || 'home', source_module: module };
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
export function trackToolExport(exportType: 'svg' | 'png' | 'json' | 'csv' | 'md' | 'txt') {
  const metadata = toolMetadata();
  if (metadata && ['svg', 'png', 'json', 'csv', 'md', 'txt'].includes(exportType)) emit('tool_export', { ...metadata, export_type: exportType });
}
export function trackToolResult() {
  const metadata = toolMetadata();
  if (metadata) emit('result_generated', metadata);
}
type SharedFeatureMetadata = { monster: 'toolooo' | 'artooo' | 'infooo'; content_type: 'tool' | 'artwork' | 'infooo_world'; slug: string; action: string };
function validSharedMetadata(metadata: SharedFeatureMetadata) {
  return ['toolooo', 'artooo', 'infooo'].includes(metadata.monster) && ['tool', 'artwork', 'infooo_world'].includes(metadata.content_type) && /^[a-z0-9-]+$/.test(metadata.slug) && ['copy_result', 'share_result', 'copy_link', 'web_share', 'open'].includes(metadata.action);
}
export function trackShareAction(metadata: SharedFeatureMetadata) {
  if (!validSharedMetadata(metadata)) return;
  const name = metadata.action === 'share_result' ? 'result_shared' : metadata.action === 'copy_result' ? 'result_copied' : 'share_action';
  emit(name, { monster: metadata.monster, content_type: metadata.content_type, slug: metadata.slug, action: metadata.action, ...sourceMetadata() });
}
export function trackRelatedContentClick(metadata: Omit<SharedFeatureMetadata, 'action'>, artworkSource?: string, next = false) {
  if (!validSharedMetadata({ ...metadata, action: 'open' })) return;
  const source = sourceMetadata();
  if (artworkSource && [...document.querySelectorAll<HTMLElement>('[data-artwork-slug]')].some(node => node.dataset.artworkSlug === artworkSource)) source.source_slug = artworkSource;
  emit(next ? 'try_next_click' : metadata.monster === 'artooo' ? 'related_art_click' : 'related_tool_click', { ...source, destination_slug: metadata.slug, destination_module: metadata.monster, content_type: metadata.content_type, ...(toolMetadata() || {}) });
}
function validToolId(value: string) { return /^[a-z0-9-]+$/.test(value); }
function trackToolLv3(event: 'tool_favorite' | 'tool_unfavorite' | 'tool_scenario_select' | 'tool_next_move' | 'tool_chain_next', toolId: string, extra: Record<string, string> = {}) {
  if (validToolId(toolId) && Object.values(extra).every((value) => /^[a-z0-9-]+$/.test(value))) emit(event, { tool_id: toolId, ...extra });
}
export function trackToolFavorite(toolId: string, favorite: boolean) { trackToolLv3(favorite ? 'tool_favorite' : 'tool_unfavorite', toolId); }
export function trackToolScenarioSelect(toolId: string, scenarioId: string) { trackToolLv3('tool_scenario_select', toolId, { scenario_id: scenarioId }); }
export function trackToolNextMove(toolId: string, targetToolId: string) {
  if (validToolId(toolId) && validToolId(targetToolId)) emit('try_next_click', { ...sourceMetadata(), source_slug: toolId, destination_slug: targetToolId, destination_module: 'toolooo', ...(toolMetadata() || {}) });
}
export function trackToolChainAction(event: 'tool_chain_next', toolId: string, chainId: string, targetToolId?: string) { trackToolLv3(event, toolId, { chain_id: chainId, ...(targetToolId ? { target_tool_id: targetToolId } : {}) }); }
export function trackContractDriftRun(changeCount: number, summary: { likelyBreaking: number; needsReview: number; additive: number }) {
  const bucket = changeCount === 0 ? 'none' : changeCount <= 3 ? 'few' : changeCount <= 10 ? 'several' : 'many';
  emit('contract_drift_run', { tool_id: 'api-payload-doctor', change_count_bucket: bucket, likely_breaking_count: summary.likelyBreaking, needs_review_count: summary.needsReview, additive_count: summary.additive });
  emit('tool_complete', { tool_slug: 'api-payload-doctor', tool_family: 'check', completion_type: 'contract_review' });
}

type InfoooAnalyticsMetadata = { world_slug: string; entity_id?: string; guide_id?: string };
function validInfoooMetadata(metadata: InfoooAnalyticsMetadata) {
  return /^[a-z0-9-]+$/.test(metadata.world_slug) && (!metadata.entity_id || /^[a-z0-9-]+$/.test(metadata.entity_id)) && (!metadata.guide_id || /^[a-z0-9-]+$/.test(metadata.guide_id));
}
// Infooo events carry only public world metadata. Never pass search text, viewer state, or personal information.
export function trackInfoooWorldStart(world_slug: string) { if (validInfoooMetadata({ world_slug })) emit('infooo_world_start', { world_slug }); }
export function trackInfoooEntityView(world_slug: string, entity_id: string) { if (validInfoooMetadata({ world_slug, entity_id })) emit('infooo_entity_view', { world_slug, entity_id }); }
export function trackInfoooGuideStart(world_slug: string, guide_id: string) { if (validInfoooMetadata({ world_slug, guide_id })) emit('infooo_guide_start', { world_slug, guide_id }); }
export function trackInfoooGuideComplete(world_slug: string, guide_id: string) { if (validInfoooMetadata({ world_slug, guide_id })) emit('infooo_guide_complete', { world_slug, guide_id }); }
export function trackInfoooShare(world_slug: string) { if (validInfoooMetadata({ world_slug })) emit('infooo_share', { world_slug }); }

export function initializeAnalytics() {
  loadAnalytics();
  if (listenersAttached) return;
  listenersAttached = true;
  const tool = document.querySelector('[data-tool-slug]');
  const interaction = (event: Event) => {
    if (event.isTrusted && event.target instanceof Element && event.target.closest('input,textarea,select,button') && !event.target.closest('.share-foundation, [aria-label="Toolooo connections"]')) trackToolStart();
  };
  tool?.addEventListener('input', interaction);
  tool?.addEventListener('change', interaction);
  tool?.addEventListener('click', interaction);
  const channels: Record<string, string> = { 'instagram.com': 'instagram', 'linkedin.com': 'linkedin', 'facebook.com': 'facebook', 'twitter.com': 'twitter', 'wa.me': 'whatsapp', 't.me': 'telegram', 'threads.net': 'threads', 'tiktok.com': 'tiktok', 'snapchat.com': 'snapchat', 'pinterest.com': 'pinterest', 'discordapp.com': 'discord', 'github.com': 'github', 'medium.com': 'medium', 'codepen.io': 'codepen' };
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const target = new URL(link.href);
    const channel = target.protocol === 'mailto:' ? 'email' : channels[target.hostname.replace(/^www\./, '')];
    if (['email', 'whatsapp'].includes(channel) || (channel === 'linkedin' && (link.closest('.dav-connect') || sourceMetadata().source_slug === 'my-portfolio')) || (target.origin === new URL(window.location.href).origin && target.pathname.replace(/\/$/, '') === '/drop-a-vibe')) {
      emit('contact_click', { ...sourceMetadata(), contact_type: channel || 'contact_page' });
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLElement>('[data-related-content]');
    const monster = link?.dataset.relatedMonster;
    const contentType = link?.dataset.relatedContentType;
    const slug = link?.dataset.relatedSlug;
    if ((monster === 'toolooo' || monster === 'artooo') && (contentType === 'tool' || contentType === 'artwork') && slug && /^[a-z0-9-]+$/.test(slug)) {
      trackRelatedContentClick({ monster, content_type: contentType, slug }, link?.dataset.relatedSource, link?.dataset.discoveryAction === 'next');
      return;
    }
    const tag = event.target.closest<HTMLElement>('[data-artwork-tag]')?.dataset.artworkTag;
    if (tag && /^[a-z0-9-]+$/.test(tag)) { emit('artwork_tag_click', { ...sourceMetadata(), tag }); return; }
    const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;
    const target = new URL(anchor.href);
    if (target.origin !== new URL(window.location.href).origin) return;
    const destination = ({ toolbox: 'toolooo', artworks: 'artooo', infooo: 'infooo', notooo: 'notooo' } as Record<string, string>)[target.pathname.split('/').filter(Boolean)[0]];
    const source = sourceMetadata();
    if (destination && destination !== source.source_module) emit('module_discovery', { ...source, destination_module: destination });
  });
  window.addEventListener('storage', event => {
    if (event.key === consentKey) {
      if (event.newValue === 'accepted') { choice = 'accepted'; loadAnalytics(); }
      else setConsent('declined');
      document.dispatchEvent(new Event('analytics-consent-change'));
    }
  });
}
