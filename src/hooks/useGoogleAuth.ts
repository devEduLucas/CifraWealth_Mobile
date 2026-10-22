import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

declare const process: any;

WebBrowser.maybeCompleteAuthSession();

// IDs públicos do OAuth (Google Cloud Console). Defina em .env como EXPO_PUBLIC_*.
const WEB_CLIENT_ID: string | undefined =
  (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID : undefined) || undefined;
const IOS_CLIENT_ID: string | undefined =
  (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID : undefined) || undefined;
const ANDROID_CLIENT_ID: string | undefined =
  (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID : undefined) || undefined;

// Só há login Google quando existe um client ID para a plataforma atual.
export const isGoogleConfigured: boolean =
  Platform.select({ ios: !!IOS_CLIENT_ID, android: !!ANDROID_CLIENT_ID, default: !!WEB_CLIENT_ID }) ?? false;

const FALLBACK_ERROR = 'Erro ao entrar com Google.';

// Só chame este hook quando isGoogleConfigured for true (o provider exige o client ID).
export function useGoogleAuth(
  onIdToken: (idToken: string) => Promise<void>,
  onError: (message: string) => void
) {
  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    selectAccount: true,
  });
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef(onIdToken);
  const errorRef = useRef(onError);
  tokenRef.current = onIdToken;
  errorRef.current = onError;

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        errorRef.current('O Google não retornou uma credencial válida. Tente novamente.');
        setLoading(false);
        return;
      }
      tokenRef
        .current(idToken)
        .catch((err: unknown) => errorRef.current(err instanceof Error && err.message ? err.message : FALLBACK_ERROR))
        .finally(() => setLoading(false));
      return;
    }

    if (response.type === 'error') errorRef.current(FALLBACK_ERROR);
    setLoading(false); // cancelado/fechado pelo usuário
  }, [response]);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      await promptAsync();
    } catch {
      errorRef.current(FALLBACK_ERROR);
      setLoading(false);
    }
  }, [promptAsync]);

  return { start, loading };
}
