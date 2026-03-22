/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDF8F3',
        warm: '#F5EDE4',
        terracotta: '#C47B5B',
        terracottaDark: '#A85C3C',
        sage: '#87A96B',
        sageDark: '#6B8E4E',
        ink: '#2C2416',
        muted: '#6B5B4F',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'avatar-glow': 'avatar-glow 3s ease-in-out infinite',
        'avatar-breathe': 'avatar-breathe 4s ease-in-out infinite',
        'avatar-smile': 'avatar-smile 5s ease-in-out infinite',
        'avatar-dot': 'avatar-dot 2.5s ease-in-out infinite',
        'loader-bounce': 'loader-bounce 1.2s ease-in-out infinite',
        'suggest-in': 'suggest-in 0.55s ease-out forwards',
        'shimmer-slow': 'shimmer-slow 8s ease-in-out infinite',
      },
      keyframes: {
        'suggest-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer-slow': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.55' },
        },
        'loader-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '40%': { transform: 'translateY(-6px)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.9, transform: 'scale(1.02)' },
        },
        'avatar-glow': {
          '0%, 100%': { opacity: '0.12' },
          '50%': { opacity: '0.22' },
        },
        'avatar-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'avatar-smile': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'avatar-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
}
