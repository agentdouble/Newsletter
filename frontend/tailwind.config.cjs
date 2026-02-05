/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--app-background))',
        foreground: 'hsl(var(--app-foreground))',
        card: 'hsl(var(--app-card))',
        'card-foreground': 'hsl(var(--app-card-foreground))',
        popover: 'hsl(var(--app-popover))',
        'popover-foreground': 'hsl(var(--app-popover-foreground))',
        primary: 'hsl(var(--app-primary))',
        'primary-foreground': 'hsl(var(--app-primary-foreground))',
        secondary: 'hsl(var(--app-secondary))',
        'secondary-foreground': 'hsl(var(--app-secondary-foreground))',
        muted: 'hsl(var(--app-muted))',
        'muted-foreground': 'hsl(var(--app-muted-foreground))',
        accent: 'hsl(var(--app-accent))',
        'accent-foreground': 'hsl(var(--app-accent-foreground))',
        destructive: 'hsl(var(--app-destructive))',
        'destructive-foreground': 'hsl(var(--app-destructive-foreground))',
        border: 'hsl(var(--app-border))',
        input: 'hsl(var(--app-input))',
        ring: 'hsl(var(--app-ring))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--app-radius)',
        md: 'calc(var(--app-radius) - 2px)',
        sm: 'calc(var(--app-radius) - 4px)'
      }
    }
  },
  plugins: []
};
