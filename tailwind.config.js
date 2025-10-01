/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Setwise Brand Colors - Electric Calm Palette
        'electric-indigo': '#4F46E5',
        'mint-lift': '#34D399',
        'night-graphite': '#0F172A',
        'cloud': '#F8FAFC',
        'accent-pulse': '#F59E0B',
        // Alt Energetic Dark Palette
        'neon-blue': '#2563EB',
        'lime-pop': '#84CC16',
        'true-black': '#09090B',
        'slate': '#1F2937',
        'coral-warm': '#FB7185',
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'brand': '0 4px 20px rgba(79, 70, 229, 0.1)',
        'brand-lg': '0 8px 32px rgba(79, 70, 229, 0.15)',
      },
    },
  },
  plugins: [],
}
