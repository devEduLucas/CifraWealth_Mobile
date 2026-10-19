import { Platform } from 'react-native';

declare const process: any;

// O backend do CifraWealth roda por padrão na porta 3000 com prefixo /api
const getLocalHostUrl = () => {
  if (Platform.OS === 'android') {
    // 10.0.2.2 é o alias do emulador Android para o localhost do computador
    return 'http://10.0.2.2:8000/api';
  }
  // No iOS Simulator, Web ou via USB com adb reverse
  return 'http://localhost:8000/api';
};

const rawUrl =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || getLocalHostUrl();

// Garante que a URL esteja sempre limpa e válida (sem erros como 8000api ou barras duplicadas)
export const API_BASE_URL = (() => {
  let url = String(rawUrl).trim().replace(/\/+$/, '');
  // Corrige se ficou sem barra entre a porta e api (ex: localhost:3000api -> localhost:3000/api)
  url = url.replace(/(:[0-9]+)(api)/i, '$1/$2');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
})();


