import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import dsv from '@rollup/plugin-dsv'

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

  // Remove the manual chunks configuration
  build: {
    rollupOptions: {
      output: {
        // manualChunks configuration removed
      },
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    watch: {
      ignored: [],
    },
    proxy: {
      '/anthropic': {
        target: 'https://api.anthropic.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ''),
      }
    }
  },
}));