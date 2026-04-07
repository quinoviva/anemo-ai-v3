import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '*.js',
    'scripts/**',
    'functions/**',
    'public/workers/**',
    'src/dataconnect-generated/**',
    'src/dataconnect-admin-generated/**',
  ]),
  ...tseslint.configs.recommended,
  ...nextVitals,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/immutability': 'off',
      'jsx-a11y/alt-text': 'off',
    }
  }
]);
