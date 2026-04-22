import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, './src'),
  build: {
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true,
  },
  plugins: [vue()],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      fyo: path.resolve(__dirname, './fyo'),
      src: path.resolve(__dirname, './src'),
      schemas: path.resolve(__dirname, './schemas'),
      backend: path.resolve(__dirname, './backend'),
      models: path.resolve(__dirname, './models'),
      utils: path.resolve(__dirname, './utils'),
      regional: path.resolve(__dirname, './regional'),
      reports: path.resolve(__dirname, './reports'),
      dummy: path.resolve(__dirname, './dummy'),
      fixtures: path.resolve(__dirname, './fixtures'),
    },
  },
  define: {
    'process.env': {},
  },
});
