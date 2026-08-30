import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * One neutral scale, with a role per step rather than three greys picked
       * by eye: app ground, raised surface, sunk well, two borders, three text
       * levels. The roles are the ones Radix Colors argues for.
       *
       * The greys are neutral rather than warmed. A marketplace listing is
       * judged next to a hundred other listings on a white page, and the tool
       * that makes it should read the same way: the only colour on screen is
       * the work itself and the one control that acts on it.
       */
      colors: {
        paper: '#F7F8FA',
        surface: '#FFFFFF',
        // The proofing bench the sheet sits on, and the wells inside panels.
        sunk: '#EDEFF3',
        ink: {
          DEFAULT: '#101317',
          soft: '#48505B',
          mute: '#79818E',
        },
        line: {
          DEFAULT: '#E6E8EC',
          strong: '#CFD4DC',
        },
        /*
         * One accent, spent on one thing at a time: the button that acts, and
         * the option that is currently chosen. Brighter than the old burnt
         * orange, because a muted warm tone that read as "ink" on cream reads
         * as dirt on a white ground.
         */
        accent: {
          DEFAULT: '#E4550D',
          hover: '#C2410C',
          soft: '#FFF4EC',
          line: '#FBD1B3',
          ink: '#B8430A',
          ring: '#F9BC94',
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
        /*
         * Four steps of one soft, neutral shadow, plus the two the sheet and
         * the dialog need. Depth is what separates a card from the page here,
         * because the borders are hairlines rather than frames.
         */
        xs: '0 1px 2px rgba(16,19,23,0.05)',
        sheet: '0 1px 2px rgba(16,19,23,0.04), 0 4px 12px -4px rgba(16,19,23,0.08)',
        lift: '0 2px 4px rgba(16,19,23,0.04), 0 14px 28px -10px rgba(16,19,23,0.14)',
        // A sheet lying on the bench: a contact shadow, then a long soft one.
        proof: '0 1px 2px rgba(16,19,23,0.10), 0 14px 36px -14px rgba(16,19,23,0.30)',
        pop: '0 24px 64px -24px rgba(16,19,23,0.40)',
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
