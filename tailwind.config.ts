import type { Config } from 'tailwindcss';

/**
 * Every colour here is a CSS custom property holding space-separated RGB
 * channels, wrapped so Tailwind can still fold an opacity modifier into it
 * (`bg-surface/90`). The values themselves live in `app/globals.css`, once
 * per theme, which is what lets the whole interface change ground without a
 * single utility class in the markup having to know that it did.
 */
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

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
       *
       * Each role holds its meaning in both themes — `sunk` is always the well
       * cut into the ground and `surface` is always the thing raised off it —
       * so a dark theme is a different set of values for the same six roles,
       * not a second set of classes.
       */
      colors: {
        paper: channel('paper'),
        surface: channel('surface'),
        // The proofing bench the sheet sits on, and the wells inside panels.
        sunk: channel('sunk'),
        /*
         * The printed page, which is not part of the theme.
         *
         * A worksheet is white because it is going to be printed on white
         * paper, and a proof that darkens with the interface around it is
         * lying about what comes out of the printer. This one value stays put
         * while everything behind it moves.
         */
        sheet: '#FFFFFF',
        /*
         * The scrim under a dialog. A fixed dark wash rather than `ink` at low
         * alpha: `ink` is near-black in one theme and near-white in the other,
         * so the same class would dim the page in daylight and bleach it at
         * night.
         */
        overlay: 'var(--overlay)',
        ink: {
          DEFAULT: channel('ink'),
          soft: channel('ink-soft'),
          mute: channel('ink-mute'),
        },
        line: {
          DEFAULT: channel('line'),
          strong: channel('line-strong'),
        },
        /*
         * The closing panel on the landing page: the one slab that is darker
         * than everything around it. It carries its own ink because it is a
         * fixed ground rather than a themed one — inverting it in dark mode
         * would put a floodlit white block at the bottom of a night page.
         */
        band: {
          DEFAULT: channel('band'),
          ink: channel('band-ink'),
        },
        /*
         * One accent, spent on one thing at a time: the button that acts, and
         * the option that is currently chosen. Brighter than the old burnt
         * orange, because a muted warm tone that read as "ink" on cream reads
         * as dirt on a white ground.
         *
         * `on` is the text that sits on top of a filled accent. It is a token
         * rather than a literal `white` because the dark theme lifts the
         * accent until white on top of it stops being readable, and the fix
         * there is dark text, not a dimmer button.
         */
        accent: {
          DEFAULT: channel('accent'),
          hover: channel('accent-hover'),
          soft: channel('accent-soft'),
          line: channel('accent-line'),
          ink: channel('accent-ink'),
          ring: channel('accent-ring'),
          on: channel('accent-on'),
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
         *
         * The values are variables because a shadow is a light effect, and a
         * dark ground needs a different one: a wash tuned to darken white by a
         * few percent is simply invisible over near-black, so the dark theme
         * deepens every step rather than reusing these.
         */
        xs: 'var(--shadow-xs)',
        sheet: 'var(--shadow-sheet)',
        lift: 'var(--shadow-lift)',
        // A sheet lying on the bench: a contact shadow, then a long soft one.
        proof: 'var(--shadow-proof)',
        pop: 'var(--shadow-pop)',
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
