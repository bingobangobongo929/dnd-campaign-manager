import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.multiloop.ttrpg',
  appName: 'Multiloop',
  webDir: 'out',

  // Load from Vercel deployment URL (server-rendered app)
  server: {
    url: 'https://multiloop.app',
    cleartext: false,
  },

  ios: {
    contentInset: 'automatic',
    scheme: 'Multiloop',
    backgroundColor: '#0a0a0f', // Match dark mode background
    preferredContentMode: 'mobile', // Force mobile rendering
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
