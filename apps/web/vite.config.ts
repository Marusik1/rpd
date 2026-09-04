import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function deploymentBase(): string {
  const configured = process.env.VITE_BASE_PATH?.trim();
  if (configured) {
    const leadingSlash = configured.startsWith('/') ? configured : `/${configured}`;
    return leadingSlash.endsWith('/') ? leadingSlash : `${leadingSlash}/`;
  }
  const repository = process.env.GITHUB_REPOSITORY?.split('/').at(-1);
  return repository ? `/${repository}/` : '/';
}

export default defineConfig({
  base: deploymentBase(),
  plugins: [react()],
  publicDir: '../../public',
  build: { outDir: 'dist', emptyOutDir: true },
});
