import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Shogun palette (from existing styles.css)
        accent: {
          DEFAULT: '#0071E3',
          hover: '#0077ED',
          soft: 'rgba(0, 113, 227, 0.08)',
        },
        success: '#34C759',
        warning: '#FF9F0A',
        danger: '#FF3B30',
        info: '#5AC8FA',
        purple: '#AF52DE',
      },
      fontFamily: {
        display: ['Satoshi', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        display: '32px',
        title: '20px',
        body: '15px',
        caption: '13px',
        micro: '11px',
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'glass-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'glass-md': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glass-xl': '0 16px 48px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 0 4px rgba(0, 113, 227, 0.2)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      backdropSaturate: {
        150: '150%',
        180: '180%',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    // Custom glass utilities
    function ({ addUtilities }: { addUtilities: any }) {
      addUtilities({
        '.glass-bg': {
          background: 'rgba(255, 255, 255, 0.05)',
        },
        '.glass-border': {
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-shadow': {
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        '.glass-highlight': {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), transparent)',
        },
        '.contain-layout': {
          contain: 'layout style',
        },
      });
    },
  ],
};

export default config;
