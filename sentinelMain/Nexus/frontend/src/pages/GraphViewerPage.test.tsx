import { describe, it, expect } from 'vitest';
import { GraphViewerPage } from './GraphViewerPage';

describe('Operational Dependency Graph Component', () => {
  it('defines the GraphViewerPage React component', () => {
    expect(GraphViewerPage).toBeDefined();
    expect(typeof GraphViewerPage).toBe('function');
  });
});
