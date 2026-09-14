import { useEffect, useState } from 'react';
import { trackToolFavorite } from '../../../utils/analytics';
import { readWorkspace, toggleFavorite } from './workspace';

export default function ToolFavoriteButton({ toolId, toolName }: { toolId: string; toolName: string }) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => { setFavorite(readWorkspace().favorites.includes(toolId)); }, [toolId]);
  const toggle = () => { const next = toggleFavorite(toolId); setFavorite(next); trackToolFavorite(toolId, next); };
  return <button type="button" aria-pressed={favorite} aria-label={`${favorite ? 'Remove' : 'Add'} ${toolName} ${favorite ? 'from' : 'to'} My Toolooo`} onClick={toggle} style={{ minHeight: 36, padding: '.4rem .7rem', border: '1px solid var(--k-border)', borderRadius: '.5rem', background: favorite ? 'color-mix(in srgb, #F7933C 12%, var(--k-bg-card))' : 'var(--k-bg-card)', color: favorite ? '#C66B19' : 'var(--k-text)', font: '700 .74rem Poppins, sans-serif', cursor: 'pointer' }}>
    {favorite ? '★ Saved' : '☆ Save'}
  </button>;
}
