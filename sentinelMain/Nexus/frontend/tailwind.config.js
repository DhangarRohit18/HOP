/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          blue: '#0A192F', // Dark Blue
          lightBlue: '#172A45', // Lighter Dark Blue for hovers
          white: '#FFFFFF', // Pure White
          canvas: '#FFFFFF',
          surface: '#F8FAFC',
          surfaceSoft: '#F1F5F9',
          surfaceBlue: '#E2E8F0',
          borderSoft: '#CBD5E1',
          borderDefault: '#94A3B8',
          borderStrong: '#0A192F',
          borderBlue: '#0A192F',
          textPrimary: '#0A192F',
          textSecondary: '#334155',
          textMuted: '#64748B',
          primary: '#0A192F',
          primaryHover: '#172A45',
          attention: '#3B82F6',
          statusHealthy: '#10B981',
          statusRisk: '#F59E0B',
          statusCritical: '#EF4444',
          statusQuarantined: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
