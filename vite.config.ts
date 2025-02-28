import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import dsv from '@rollup/plugin-dsv'
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ReactCompilerConfig = {
  runtime: "automatic",
};

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    svgr(),
    dsv(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
  ],

  // Rest of the config remains the same...
  build: {
    rollupOptions: {
      output: {},
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    watch: {
      ignored: [],
    }
  },
}));