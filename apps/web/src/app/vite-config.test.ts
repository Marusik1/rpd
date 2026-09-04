import { describe, expect, it } from 'vitest';
import config from '../../vite.config.js';

describe('Vite web configuration', () => {
  it('serves the repository public directory and emits to the web workspace', () => {
    expect(config.publicDir).toBe('../../public');
    expect(config.build?.outDir).toBe('dist');
  });
});
