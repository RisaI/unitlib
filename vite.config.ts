import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'unitlib',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['fraction.js'],
        },
    },
    plugins: [dts({ insertTypesEntry: true })],
});
