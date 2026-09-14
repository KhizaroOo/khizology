import { useEffect } from 'react';
import { recordRecent } from './workspace';

export default function ToolWorkspaceTracker({ toolId }: { toolId: string }) {
  useEffect(() => { recordRecent(toolId); }, [toolId]);
  return null;
}
