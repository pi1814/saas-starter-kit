module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    'node_modules/daisyui/dist/**/*.js',
    'node_modules/react-daisyui/dist/**/*.js',
  ],
  daisyui: {
    themes: [
      {
        boxyhq: {
          primary: '#25c2a0',
          secondary: '#303846',
          accent: '#570DF8',
          neutral: '#3D4451',
          info: '#3ABFF8',
          success: '#36D399',
          warning: '#FBBD23',
          error: '#F87272',
          'base-100': '#FFFFFF',
          'neutral-content': '#edf2f7',
          '--rounded-box': '0.25rem',
          '--rounded-btn': '.125rem',
          '--rounded-badge': '.125rem',
          '--animation-btn': '0',
          '--animation-input': '0',
          '--btn-focus-scale': '1',
        },
      },
      'black',
    ],
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
};
