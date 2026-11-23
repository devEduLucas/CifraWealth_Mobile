import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { useAuthTheme } from '../../theme/authTheme';
import { api, ApiError } from '../../services/api';

interface ResetPasswordScreenProps {
  route?: any;
  navigation: any;
}

const MIN_LENGTH = 8;

// Aberta pelo link do e-mail (https://cifrawealth.vercel.app/reset-password?token=...).
export function ResetPasswordScreen({ route, navigation }: ResetPasswordScreenProps) {
  const { palette: p } = useAuthTheme();
  const token: string | undefined = route?.params?.token || undefined;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    let invalid = false;
    if (password.length < MIN_LENGTH) {
      setPasswordError(`A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`);
      invalid = true;
    }
    if (confirm !== password) {
      setConfirmError('As senhas não coincidem.');
      invalid = true;
    }
    if (invalid) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha. Verifique sua conexão.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="Não foi possível abrir o link">
        <View style={styles.center} accessibilityLiveRegion="polite">
          <AlertCircle size={48} color={p.error} />
          <Text style={[styles.message, { color: p.textMuted }]}>
            Este link de redefinição está incompleto ou expirou. Solicite um novo link para continuar.
          </Text>
        </View>
        <AuthButton title="Solicitar novo link" onPress={() => navigation.navigate('ForgotPassword')} />
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Senha redefinida!" subtitle="Tudo certo">
        <View style={styles.center} accessibilityLiveRegion="polite">
          <CheckCircle2 size={48} color={p.success} />
          <Text style={[styles.message, { color: p.textMuted }]}>
            Sua senha foi alterada com sucesso. Já pode entrar com a nova senha.
          </Text>
        </View>
        <AuthButton title="Ir para o login" onPress={() => navigation.navigate('Login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Defina sua nova senha"
      description="Escolha uma senha forte que você não use em outros lugares."
    >
      {errorMessage ? <AuthMessage type="error" message={errorMessage} /> : null}

      <AuthInput
        label="Nova senha"
        placeholder="Nova senha"
        icon={Lock}
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (passwordError) setPasswordError(undefined);
        }}
        error={passwordError}
      />

      <AuthInput
        label="Confirmar nova senha"
        placeholder="Confirmar nova senha"
        icon={Lock}
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          if (confirmError) setConfirmError(undefined);
        }}
        error={confirmError}
      />

      <AuthButton title="Redefinir senha" onPress={handleSubmit} loading={loading} />

      <AuthFooterLink prompt="Lembrou a senha?" linkLabel="Voltar ao login" onPress={() => navigation.navigate('Login')} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 16 },
});
