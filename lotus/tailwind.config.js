/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{tsx,ts,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        figma: {
          bg: 'var(--figma-color-bg)',
          'bg-secondary': 'var(--figma-color-bg-secondary)',
          'bg-tertiary': 'var(--figma-color-bg-tertiary)',
          text: 'var(--figma-color-text)',
          'text-secondary': 'var(--figma-color-text-secondary)',
          'text-tertiary': 'var(--figma-color-text-tertiary)',
          border: 'var(--figma-color-border)',
          'brand': 'var(--figma-color-bg-brand)',
          'brand-hover': 'var(--figma-color-bg-brand-hover)',
          'brand-pressed': 'var(--figma-color-bg-brand-pressed)',
          'brand-text': 'var(--figma-color-text-brand)',
          success: 'var(--figma-color-bg-success)',
          warning: 'var(--figma-color-bg-warning)',
          danger: 'var(--figma-color-bg-danger)',
        },
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        lg: '14px',
        xl: '16px',
      },
      fontFamily: {
        figma: ['Inter', 'sans-serif'],
        display: ['"Google Sans Flex"', 'Inter', 'sans-serif'],
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};
