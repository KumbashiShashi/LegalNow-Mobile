import { Platform } from 'react-native';

export const theme = {
  colors: {
    primary: '#0c6b68', // var(--teal)
    primaryDark: '#07514f', // var(--teal-dark)
    primaryLight: '#dcefeb', // var(--mint)
    secondary: '#17212b', // var(--ink)
    text: '#17212b', // var(--ink)
    muted: '#68747e', // var(--muted)
    background: '#f7f9f8', // var(--paper)
    surface: '#ffffff', // var(--white)
    border: '#dfe6e8', // var(--line)
    gold: '#d6a85c', // var(--gold)

    // Status badges
    success: '#0c6b68', // Mapping verified/paid to primary teal
    successBg: '#dcefeb',
    danger: '#a5483c', // Notice error text
    dangerBg: '#fff0ed', // Notice error bg
    warning: '#b45309', // Fallback for pending
    warningBg: '#fffbeb',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    eyebrow: {
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      color: '#64748B',
    },
    h1: {
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // closest to Source Serif 4
      fontSize: 32,
      fontWeight: '700' as const,
      color: '#17212b',
      letterSpacing: -0.35,
    },
    h2: {
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      fontSize: 26,
      fontWeight: '700' as const,
      color: '#17212b',
      letterSpacing: -0.35,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: '#17212b',
    },
    body: {
      fontSize: 14,
      color: '#68747e', // Muted text typically used for descriptions
      lineHeight: 22,
    },
    small: {
      fontSize: 12,
      color: '#64748B',
    }
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    pill: 9999,
  }
};
