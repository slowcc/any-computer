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

// Plugin to inject recipe examples at build time
function recipeExamplesPlugin() {
  return {
    name: 'recipe-examples',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('codeExecution')) {
        try {
          // Get all .md files from recipes directory
          const recipesDir = path.join(__dirname, 'src/recipes');
          const recipeFiles = fs.readdirSync(recipesDir)
            .filter(file => file.endsWith('.md'));
          
          // Read and concatenate all recipe contents
          const allRecipes = recipeFiles
            .map(file => {
              const filePath = path.join(recipesDir, file);
              const content = fs.readFileSync(filePath, 'utf-8');
              // Escape backticks and special characters to prevent template literal issues
              return content.replace(/`/g, '\\`')
                          .replace(/\$/g, '\\$');
            })
            .join('\n\n---------------\n\n');

          // Replace the placeholder with all recipe contents
          const updatedCode = code.replace(
            /\{\{recipes\/\*\.md\}\}/g,
            allRecipes
          );
          
          return updatedCode;
        } catch (error) {
          console.error('Failed to load recipe examples:', error);
          return code;
        }
      }
      return null;
    }
  };
}

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
    recipeExamplesPlugin(),
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