/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Superficies (modo escuro e o padrao do app)
        base: {
          900: '#0b0f14',
          800: '#111821',
          700: '#18212c',
          600: '#222c3a',
          500: '#2f3b4b',
        },
        // Cor de destaque: verde-limao
        lime: {
          DEFAULT: '#c2f542',
          300: '#d7f97f',
          400: '#c2f542',
          500: '#a8e01f',
          600: '#86b513',
        },
        danger: '#f2555a',
        warn: '#f5a623',
        ok: '#3ddc97',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -16px rgb(0 0 0 / 0.8)',
        glow: '0 0 0 1px rgb(194 245 66 / 0.35), 0 8px 32px -8px rgb(194 245 66 / 0.35)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        'pr-pop': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulse_ring: {
          '0%': { boxShadow: '0 0 0 0 rgb(194 245 66 / 0.5)' },
          '100%': { boxShadow: '0 0 0 14px rgb(194 245 66 / 0)' },
        },
      },
      animation: {
        'pr-pop': 'pr-pop 420ms cubic-bezier(.22,1,.36,1)',
        'slide-up': 'slide-up 220ms ease-out',
        'pulse-ring': 'pulse_ring 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
