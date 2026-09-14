export interface WorkspaceTool { id: string; slug: string; name: string; icon: string; family: string; }
export interface WorkspaceState { favorites: string[]; recent: Array<{ toolId: string; openedAt: number }>; chainProgress: Record<string, string[]>; }
const KEY = 'khizology:toolooo:workspace:v1';
const LIMIT = 16;
const validId = (id: string) => /^[a-z0-9-]+$/.test(id);
const empty = (): WorkspaceState => ({ favorites: [], recent: [], chainProgress: {} });

export function readWorkspace(): WorkspaceState {
  if (typeof window === 'undefined') return empty();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!stored || !Array.isArray(stored.favorites) || !Array.isArray(stored.recent) || typeof stored.chainProgress !== 'object') return empty();
    return {
      favorites: stored.favorites.filter((id: unknown) => typeof id === 'string' && validId(id)).slice(0, LIMIT),
      recent: stored.recent.filter((item: unknown): item is { toolId: string; openedAt: number } => Boolean(item && typeof item === 'object' && validId((item as { toolId?: string }).toolId || '') && Number.isFinite((item as { openedAt?: number }).openedAt))).slice(0, LIMIT),
      chainProgress: Object.fromEntries(Object.entries(stored.chainProgress).map(([chainId, ids]) => [chainId, Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && validId(id)).slice(0, LIMIT) : []])),
    };
  } catch { return empty(); }
}
function writeWorkspace(next: WorkspaceState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('khizology:toolooo:workspace')); } catch { /* Private mode or quota: the feature remains session-safe. */ }
}
export function recordRecent(toolId: string) {
  if (!validId(toolId)) return;
  const state = readWorkspace();
  writeWorkspace({ ...state, recent: [{ toolId, openedAt: Date.now() }, ...state.recent.filter((item) => item.toolId !== toolId)].slice(0, LIMIT) });
}
export function toggleFavorite(toolId: string): boolean {
  if (!validId(toolId)) return false;
  const state = readWorkspace();
  const favored = !state.favorites.includes(toolId);
  writeWorkspace({ ...state, favorites: favored ? [toolId, ...state.favorites].slice(0, LIMIT) : state.favorites.filter((id) => id !== toolId) });
  return favored;
}
export function clearWorkspace() { writeWorkspace(empty()); }
export function markChainStep(chainId: string, toolId: string) {
  if (!validId(chainId) || !validId(toolId)) return;
  const state = readWorkspace(); const completed = new Set(state.chainProgress[chainId] || []); completed.add(toolId);
  writeWorkspace({ ...state, chainProgress: { ...state.chainProgress, [chainId]: [...completed].slice(0, LIMIT) } });
}
