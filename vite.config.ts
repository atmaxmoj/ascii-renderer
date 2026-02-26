import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({ include: ['src'] }),
  ],
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
