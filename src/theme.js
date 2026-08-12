export const THEME = {
  colors: {
    bg: {
      base: '#f2f7fd',
      surface: '#ffffff',
      surfaceHover: '#f5f9fd',
      elevated: '#ffffff',
    },
    border: {
      default: 'rgba(21, 101, 192, 0.10)',
      strong: 'rgba(21, 101, 192, 0.22)',
    },
    accent: {
      blue: '#1976d2',
      blueDeep: '#1565c0',
      teal: '#26a69a',
      amber: '#f9a825',
      green: '#2e7d32',
      red: '#e53935',
    },
    text: {
      primary: '#16233b',
      secondary: '#5b6b82',
      muted: '#93a2b8',
    },
  },

  glass: {
    glass: {
      background: '#ffffff',
      border: '1px solid rgba(21, 101, 192, 0.10)',
      borderRadius: 16,
      boxShadow: '0 8px 24px rgba(21, 66, 130, 0.08)',
    },
    glassStrong: {
      background: '#ffffff',
      border: '1px solid rgba(21, 101, 192, 0.20)',
      borderRadius: 16,
    },
  },

  typography: {
    fontMono: "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
    fontSans: "'Inter', system-ui, sans-serif",
  },
};

export const GlobalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  scrollbar-width: none;
}

*::-webkit-scrollbar {
  display: none;
}

body {
  background: #f2f7fd;
  font-family: 'Inter', system-ui, sans-serif;
  margin: 0;
  padding: 0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.pulse {
  animation: pulse 1.8s infinite;
}

.slideUp {
  animation: slideUp 0.35s ease;
}

.shimmer {
  background: linear-gradient(90deg, rgba(21,101,192,0.06) 0%, rgba(21,101,192,0.12) 50%, rgba(21,101,192,0.06) 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
`;
