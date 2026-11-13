/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      // Starlight storybook palette (M6): one set of names for the whole shell.
      colors: {
        night: '#2B1E5C', gold: '#F6C945', rose: '#FF8FB8', lilac: '#C9B3F2', mint: '#8FD6C4', cream: '#FFF8EC', ink: '#2A2140',
      },
      // Andika for every word she reads, Nunito for titles and buttons' chrome.
      fontFamily: {
        read: ['Andika', 'Nunito', 'system-ui', 'sans-serif'],
        title: ['Nunito', 'system-ui', 'sans-serif'],
      },
      // Type scale: reading text is never smaller than 24px, letter tiles are 36px.
      fontSize: {
        read: ['1.5rem', { lineHeight: '1.35' }],
        tile: ['2.25rem', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
};
