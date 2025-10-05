/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Cyberpunk colors
        'neon-cyan': 'hsl(var(--neon-cyan))',
        'neon-pink': 'hsl(var(--neon-pink))',
        'neon-purple': 'hsl(var(--neon-purple))',
        'neon-green': 'hsl(var(--neon-green))',
        'dark-bg': 'hsl(var(--dark-bg))',
        'darker-bg': 'hsl(var(--darker-bg))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'matrix-rain': 'matrix-rain 10s linear infinite',
        'flicker': 'flicker 4s infinite alternate',
        'neon-border': 'neon-border 2s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px hsl(var(--neon-cyan)), 0 0 10px hsl(var(--neon-cyan)), 0 0 15px hsl(var(--neon-cyan))' },
          '50%': { boxShadow: '0 0 10px hsl(var(--neon-cyan)), 0 0 20px hsl(var(--neon-cyan)), 0 0 30px hsl(var(--neon-cyan))' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'neon-border': {
          '0%, 100%': { borderColor: 'hsl(var(--neon-cyan))', boxShadow: '0 0 5px hsl(var(--neon-cyan))' },
          '50%': { borderColor: 'hsl(var(--neon-pink))', boxShadow: '0 0 10px hsl(var(--neon-pink))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'cyber-grid': `
          radial-gradient(ellipse at top, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at bottom, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
          linear-gradient(45deg, hsl(var(--dark-bg)) 25%, transparent 25%),
          linear-gradient(-45deg, hsl(var(--dark-bg)) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, hsl(var(--dark-bg)) 75%),
          linear-gradient(-45deg, transparent 75%, hsl(var(--dark-bg)) 75%)
        `,
      },
      boxShadow: {
        'neon-cyan': '0 0 10px hsl(var(--neon-cyan)), 0 0 20px hsl(var(--neon-cyan)), 0 0 30px hsl(var(--neon-cyan))',
        'neon-pink': '0 0 10px hsl(var(--neon-pink)), 0 0 20px hsl(var(--neon-pink)), 0 0 30px hsl(var(--neon-pink))',
        'neon-purple': '0 0 10px hsl(var(--neon-purple)), 0 0 20px hsl(var(--neon-purple)), 0 0 30px hsl(var(--neon-purple))',
      },
    },
  },
  plugins: [],
}

