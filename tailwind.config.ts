import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-mona)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#1b1d1f',
        'ink-muted': 'rgba(27,29,31,0.45)',
        'ink-soft': 'rgba(27,29,31,0.15)',
        danger: '#ff3b30',
        mood: {
          'happy-from':   '#fff4d8', 'happy-to':   '#ffd987',
          'joyful-from':  '#d6f5ea', 'joyful-to':  '#8de2c9',
          'annoyed-from': '#ece0ff', 'annoyed-to': '#c4a3ff',
          'worried-from': '#fff1d6', 'worried-to': '#ffd07a',
          'dizzy-from':   '#ffe0e1', 'dizzy-to':   '#ff9ca0',
          'sad-from':     '#e3ecff', 'sad-to':     '#a3bcff',
          'angry-from':   '#ffdcdc', 'angry-to':   '#ff7e7e',
          'love-from':    '#ffe2ec', 'love-to':    '#ffa3bc',
          'sleepy-from':  '#ece4ff', 'sleepy-to':  '#b9a3e8',
          'neutral-from': '#f0eee9', 'neutral-to': '#d6cfc1',
        },
        cat: {
          comida:        '#77d6bd',
          casa:          '#b587fb',
          transporte:    '#a3bcff',
          ocio:          '#fed282',
          salud:         '#ff8a8e',
          suscripciones: '#c4a3ff',
          otros:         '#d6cfc1',
        },
      },
      borderRadius: {
        card:   '28px',
        mood:   '36px',
        item:   '20px',
        sheet:  '36px',
        action: '16px',
      },
      boxShadow: {
        card:   '0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)',
        item:   '0 2px 8px -4px rgba(0,0,0,0.05)',
        nav:    '0 8px 24px -8px rgba(0,0,0,0.10)',
        action: '0 4px 12px -4px rgba(0,0,0,0.10)',
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
    },
  },
  plugins: [],
};

export default config;
