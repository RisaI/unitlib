import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                systems: resolve(__dirname, 'src/systems.ts'),
            },
            name: 'unitlib',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['fraction.js'],
        },
    },
    plugins: [dts({ insertTypesEntry: true })],
});
