import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF9',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1C1917',
          soft: '#57534E',
          mute: '#8A827C',
        },
        line: {
          DEFAULT: '#E7E5E4',
          strong: '#D6D3D1',
        },
        accent: {
          DEFAULT: '#C2410C',
          hover: '#9A3412',
          soft: '#FFF3EA',
          ring: '#F0A47A',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        brand: ['DoodleGen Brand', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      boxShadow: {
        sheet: '0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -16px rgba(28,25,23,0.18)',
        pop: '0 12px 40px -20px rgba(28,25,23,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.22,1,0.36,1) both',
        sweep: 'sweep 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
