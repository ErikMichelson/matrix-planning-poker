import react from '@vitejs/plugin-react';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  lint: {
    ignorePatterns: ['dist/**'],
    plugins: ['typescript', 'react'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'react/rules-of-hooks': 'error',
      'react/exhaustive-deps': 'warn',
      'react/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  fmt: {
    ignorePatterns: ['dist/**', 'README.md', 'LICENSE'],
  },
});
