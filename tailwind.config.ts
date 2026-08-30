import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * One warm scale, with a role per step rather than three greys picked by
       * eye: app ground, raised surface, sunk well, two borders, three text
       * levels. The roles are the ones Radix Colors argues for; the values are
       * warmed by hand, because this product is about paper.
       */
      colors: {
        paper: '#FAF7F3',
        surface: '#FFFFFF',
        // The proofing bench the sheet sits on, and the wells inside panels.
        sunk: '#F1EBE4',
        ink: {
          DEFAULT: '#1A1613',
          soft: '#4C443D',
          mute: '#877C72',
        },
        line: {
          DEFAULT: '#E9E1D8',
          strong: '#D3C7BA',
        },
        accent: {
          DEFAULT: '#C2410C',
          hover: '#9A3412',
          soft: '#FDF1E8',
          line: '#EFCCB1',
          ink: '#A83C0A',
          ring: '#F0A47A',
        },
      },
      fontFamily: {
        // Archivo, the family Archivo Black already comes from, so the studio
        // and the worksheets are set in one superfamily. Its tabular figures
        // are what keep a column of print specs from dancing.
        sans: [
          'Archivo UI',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        brand: ['DoodleGen Brand', 'Archivo UI', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      boxShadow: {
        sheet: '0 1px 2px rgba(26,22,19,0.05), 0 8px 24px -16px rgba(26,22,19,0.20)',
        // A sheet lying on the bench: contact shadow, then a long soft one.
        proof:
          '0 1px 1px rgba(26,22,19,0.10), 0 2px 6px -2px rgba(26,22,19,0.10), 0 24px 48px -28px rgba(26,22,19,0.45)',
        pop: '0 12px 40px -20px rgba(26,22,19,0.35)',
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
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.28' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        draw: {
          '0%': { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
        'check-in': {
          '0%': { strokeDashoffset: '1', opacity: '0' },
          '100%': { strokeDashoffset: '0', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.22,1,0.36,1) both',
        sweep: 'sweep 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
        ripple: 'ripple 560ms cubic-bezier(0.22,1,0.36,1) forwards',
        pop: 'pop 260ms cubic-bezier(0.34,1.56,0.64,1)',
        'pop-in': 'pop-in 260ms cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 5s ease-in-out infinite',
        marquee: 'marquee 26s linear infinite',
        draw: 'draw 1.4s cubic-bezier(0.65,0,0.35,1) forwards',
        'check-in': 'check-in 420ms cubic-bezier(0.65,0,0.35,1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
