/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1440px',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        compact:
        {
          ...require('daisyui/src/theming/themes')['[data-theme=business]'],
          primary: '#4f46e5',
          secondary: '#06b6d4',
          accent: '#22c55e',
          neutral: '#111827',
          'base-100': '#0b1020',
          '--rounded-btn': '0.375rem',
          '--rounded-box': '0.375rem',
          '--btn-text-case': 'none',
        },
      },
      'light',
      'dark',
      'business',
    ],
    logs: false,
  },
}

