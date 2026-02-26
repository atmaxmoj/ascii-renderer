import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({ include: ['src'] }),
  ],
  resolve: {
    alias: {
      'ascii-renderer': resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AsciiRenderer',
      fileName: 'ascii-renderer',
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/snapshot/**/*.test.ts'],
    environment: 'jsdom',
  },
});
