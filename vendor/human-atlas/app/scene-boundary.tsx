import { Component, type ReactNode } from 'react';

export default class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError('The 3D viewer could not load. Reload the viewer to try again.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
