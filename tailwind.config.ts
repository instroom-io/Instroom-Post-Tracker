import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-manrope)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: 'hsl(var(--background))',
          surface: 'hsl(var(--background-surface))',
          muted: 'hsl(var(--background-muted))',
          overlay: 'hsl(var(--background-overlay))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          light: 'hsl(var(--foreground-light))',
          lighter: 'hsl(var(--foreground-lighter))',
          muted: 'hsl(var(--foreground-muted))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          strong: 'hsl(var(--border-strong))',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          muted: 'hsl(var(--brand-muted))',
          dark: 'hsl(var(--brand-dark))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          muted: 'hsl(var(--accent-muted))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          muted: 'hsl(var(--warning-muted))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          muted: 'hsl(var(--destructive-muted))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          muted: 'hsl(var(--info-muted))',
        },
        'marketing-dark': 'hsl(var(--marketing-section-dark))',
        platform: {
          instagram: {
            DEFAULT: 'hsl(var(--platform-instagram))',
            muted: 'hsl(var(--platform-instagram-muted))',
          },
          tiktok: {
            DEFAULT: 'hsl(var(--platform-tiktok))',
            muted: 'hsl(var(--platform-tiktok-muted))',
          },
          youtube: {
            DEFAULT: 'hsl(var(--platform-youtube))',
            muted: 'hsl(var(--platform-youtube-muted))',
          },
        },
      },
      borderRadius: {
        sm:    '0.25rem',   // 4px
        md:    '0.375rem',  // 6px
        lg:    '0.5rem',    // 8px
        xl:    '0.75rem',   // 12px — explicit semantic token
        '2xl': '1rem',      // 16px — modals, large panels
      },
      boxShadow: {
        xs:  'var(--shadow-xs)',
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow-md)',
        lg:  'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
