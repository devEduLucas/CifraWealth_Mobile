import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Expo only inlines EXPO_PUBLIC variables when they are referenced directly
 * with dot notation. Keep these expressions static (do not wrap them in
 * typeof checks, optional chaining, destructuring, or dynamic property access).
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const PLATFORM_CLIENT_ID = Platform.select({
  android: ANDROID_CLIENT_ID,
  ios: IOS_CLIENT_ID,
  default: WEB_CLIENT_ID,
});

export const isGoogleConfigured = Boolean(PLATFORM_CLIENT_ID?.trim());

const FALLBACK_ERROR = 'Não foi possível iniciar o login com Google. Tente novamente.';

export function useGoogleAuth(
  onIdToken: (idToken: string) => Promise<void>,
  onError: (message: string) => void
) {
  // The request is loaded asynchronously by AuthSession. Do not discard it:
  // promptAsync must only run after request is ready.
  const [request, response, promptAsync] = Google.useAuthRequest({
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
        .catch((err: unknown) => {
          errorRef.current(err instanceof Error && err.message ? err.message : FALLBACK_ERROR);
        })
        .finally(() => setLoading(false));
      return;
    }

    if (response.type === 'error') {
      const message = response.error?.message || FALLBACK_ERROR;
      errorRef.current(message);
    }

    // A pessoa pode cancelar ou fechar a janela do Google.
    setLoading(false);
  }, [response]);

  const start = useCallback(async () => {
    if (!request) {
      errorRef.current('O login do Google ainda está sendo preparado. Tente novamente em alguns segundos.');
      return;
    }

    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'error') {
        errorRef.current(result.error?.message || FALLBACK_ERROR);
        setLoading(false);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setLoading(false);
      }
    } catch (err) {
      errorRef.current(err instanceof Error && err.message ? err.message : FALLBACK_ERROR);
      setLoading(false);
    }
  }, [request, promptAsync]);

  return { start, loading, ready: Boolean(request) };
}