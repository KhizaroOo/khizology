/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base palette
        'k-bg':       '#F5F5F8',
        'k-dark':     '#2A3439',
        // Monster colors
        'artooo':     '#F5CF5C',
        'toolooo':    '#F7933C',
        'future-1':   '#B699FF',
        'future-2':   '#5DB3D7',
        'future-3':   '#DF78A0',
        'future-4':   '#93B96A',
        'future-5':   '#E38D7C',
      },
      fontFamily: {
        sans:   ['Mulish', 'sans-serif'],
        accent: ['Poppins', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
