// Sobrepõe o app.json (o Expo/EAS passa o conteúdo dele em `config`): ícone, splash e favicon da marca.
const MID = '#1D8EC8'; // meio do degradê da marca (azul → teal)

module.exports = ({ config }) => ({
  ...config,
  icon: './assets/icon.png',
  splash: undefined, // remove o splash padrão antigo
  plugins: [
    ...(config.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-splash-screen'),
    'expo-secure-store',
    'expo-status-bar',
    'expo-web-browser',
    ['expo-splash-screen', { backgroundColor: MID, image: './assets/splash-icon.png', imageWidth: 200 }],
  ],
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundImage: './assets/adaptive-background.png',
    },
  },
  web: { ...config.web, favicon: './assets/favicon.png' },
});
