import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { GoogleIcon } from '../icons/GoogleIcon';
import { AuthDivider } from './AuthDivider';
import { useAuth } from '../../hooks/useAuth';
import { isGoogleConfigured, useGoogleAuth } from '../../hooks/useGoogleAuth';
import { neoShadow, useAuthTheme } from '../../theme/authTheme';

interface GoogleAuthSectionProps {
  mode: 'signin' | 'signup';
}

const LABELS = {
  signin: 'Entrar com o Google',
  signup: 'Cadastrar-se com o Google',
};

interface GoogleTileProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  hint?: string;
}

function GoogleTile({ label, onPress, loading, disabled, hint }: GoogleTileProps) {
  const { palette: p } = useAuthTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      activeOpacity={0.78}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.tile,
        { backgroundColor: p.surface, borderColor: p.surfaceBorder },
        neoShadow(p, 1),
        (disabled || loading) && styles.inactive,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={p.accent} /> : <GoogleIcon size={26} />}
    </TouchableOpacity>
  );
}

function ConfiguredGoogle({ mode }: GoogleAuthSectionProps) {
  const { loginWithGoogle } = useAuth();
  const { palette: p } = useAuthTheme();
  const [error, setError] = useState<string | null>(null);
  const { start, loading, ready } = useGoogleAuth(loginWithGoogle, setError);

  return (
    <>
      <GoogleTile
        label={LABELS[mode]}
        loading={loading || !ready}
        disabled={!ready || loading}
        hint={!ready ? 'Preparando o login do Google' : LABELS[mode]}
        onPress={() => {
          setError(null);
          void start();
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: p.error }]}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

function GoogleNotConfigured({ mode }: GoogleAuthSectionProps) {
  const { palette: p } = useAuthTheme();
  const [showError, setShowError] = useState(false);

  return (
    <>
      {/* Keep the tile pressable: never present a dead/disabled social button. */}
      <GoogleTile
        label={LABELS[mode]}
        onPress={() => setShowError(true)}
        hint={LABELS[mode]}
      />
      {showError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: p.error }]}>
          O Client ID do Google para esta plataforma não chegou ao build. Configure
          EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID no ambiente Preview do EAS e gere um novo APK.
        </Text>
      ) : null}
    </>
  );
}

export function GoogleAuthSection({ mode }: GoogleAuthSectionProps) {
  return (
    <View style={styles.wrapper}>
      <AuthDivider />
      {isGoogleConfigured ? <ConfiguredGoogle mode={mode} /> : <GoogleNotConfigured mode={mode} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  tile: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: { opacity: 0.75 },
  error: { marginTop: 10, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
