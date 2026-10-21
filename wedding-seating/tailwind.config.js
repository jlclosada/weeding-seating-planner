/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        gold: 'var(--gold)',
        'gold-soft': 'var(--gold-soft)',
        danger: 'var(--danger)',
        ok: 'var(--ok)',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        float: '0 10px 30px -14px rgba(60, 40, 20, 0.35), 0 0 0 1px rgba(60, 40, 20, 0.04)',
        lift: '0 24px 60px -24px rgba(60, 40, 20, 0.45), 0 0 0 1px rgba(60, 40, 20, 0.05)',
      },
    },
  },
  plugins: [],
};
