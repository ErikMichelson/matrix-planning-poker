import react from '@vitejs/plugin-react';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  define: {
    // The toolkit dynamically reads CRA-style variables; use its defaults in the browser.
    'process.env': '{}',
  },
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
    sortImports: {},
    ignorePatterns: ['dist/**', 'README.md', 'LICENSE'],
    semi: true,
    singleQuote: true,
    jsxSingleQuote: true,
    printWidth: 100,
  },
});
