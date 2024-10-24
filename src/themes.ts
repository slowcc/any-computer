export const darkTheme = {
  name: 'dark',
  accent: {
    primary: '#007aff',
  },
  background: {
    primary: '#181818',
    secondary: '#2C2C2C66',
    tertiary: '#44444422',
    theme: '#0d111799',
    transparent: 'transparent',
    highlight: 'rgba(0, 0, 0, 0.22)',
    selected: 'rgba(255, 255, 255, 0.06)',
    hover: 'rgba(255, 255, 255, 0.04)',
    contrast: 'rgba(255, 255, 255, 0.1)',
    scrollbarHover: '#353535',
    scrollbarThumb: '#333333',
  },
  text: {
    primary: '#dedede',
    secondary: '#f6f6f6',
    tertiary: '#e8e8e8',
    accent1: '#646cff',
    accent2: '#535bf2',
    accent3: '#24c8db',
    success: '#1DB954',
    danger: '#FF0000',
    placeholder: 'rgba(255, 255, 255, 0.5)',
  },
  effects: {
    glow1: '#747bff',
    glow2: '#61dafb',
  },
  border: {
    primary: 'rgba(0, 0, 0, 0.3)',
    secondary: 'rgba(255, 255, 255, 0.1)',
    tertiary: 'rgba(255, 255, 255, 0.3)',
  },
};

export const lightTheme = {
  name: 'light',
  accent: {
    primary: '#007aff',
  },
  background: {
    primary: '#f6f6f6',
    secondary: '#ddddddCC',
    tertiary: 'rgba(0, 0, 0, 0.03)',
    theme: '#ffffff99',
    transparent: 'transparent',
    highlight: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.12)',
    hover: 'rgba(0, 0, 0, 0.06)',
    contrast: 'rgb(255 255 255 / 85%)',
    scrollbarHover: '#DDD',
    scrollbarThumb: '#b0b0b0',
  },
  text: {
    primary: '#0f0f0f',
    secondary: '#2b2b2b',
    tertiary: '#4a4a4a',
    accent1: '#535bf2',
    accent2: '#646cff',
    accent3: '#1a8a9d',
    success: '#15873d',
    danger: '#FF0000',
    placeholder: 'rgba(0, 0, 0, 0.5)',
  },
  effects: {
    glow1: '#535bf2',
    glow2: '#4596a8',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.3)',
    secondary: 'rgba(0, 0, 0, 0.1)',
    tertiary: 'rgba(0, 0, 0, 0.3)',
  },
};

export type Theme = typeof darkTheme;
