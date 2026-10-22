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

// Único provedor social: botão quadrado de vidro com o logo do Google.
function GoogleTile({ label, onPress, loading, disabled, hint }: GoogleTileProps) {
  const { palette: p } = useAuthTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      activeOpacity={0.85}
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
  const { start, loading } = useGoogleAuth(loginWithGoogle, setError);

  return (
    <>
      <GoogleTile
        label={LABELS[mode]}
        loading={loading}
        onPress={() => {
          setError(null);
          start();
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

export function GoogleAuthSection({ mode }: GoogleAuthSectionProps) {
  return (
    <View style={styles.wrapper}>
      <AuthDivider />
      {isGoogleConfigured ? (
        <ConfiguredGoogle mode={mode} />
      ) : (
        // Sem client ID da plataforma atual: botão desativado, como no frontend.
        <GoogleTile label="Google indisponível" disabled hint="Use seu e-mail e senha para entrar." />
      )}
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
  inactive: { opacity: 0.55 },
  error: { marginTop: 10, textAlign: 'center', fontSize: 12 },
});
