/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: true,
  },
  theme: {
    extend: {
      colors: {
        'accent-primary': 'var(--accent-primary)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-theme': 'var(--bg-theme)',
        'bg-transparent': 'var(--bg-transparent)',
        'bg-hover': 'var(--bg-hover)',
        'bg-highlight': 'linear-gradient(to right, #4889E5, #4176F9)',
        'bg-selected': 'var(--bg-selected)',
        'bg-contrast': 'var(--bg-contrast)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-accent1': 'var(--text-accent1)',
        'text-accent2': 'var(--text-accent2)',
        'text-accent3': 'var(--text-accent3)',
        'text-success': 'var(--text-success)',
        'text-danger': 'var(--text-danger)',
        'text-placeholder': 'var(--text-placeholder)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        'border-tertiary': 'var(--border-tertiary)',
        'bg-scrollbar-hover': 'var(--bg-scrollbar-hover)',
        'bg-scrollbar-thumb': 'var(--bg-scrollbar-thumb)',
      },
    },
  },
  plugins: [
  ],
  variants: {
    extend: {
      textColor: ['empty'],
      content: ['empty'],
    },
  },
}
