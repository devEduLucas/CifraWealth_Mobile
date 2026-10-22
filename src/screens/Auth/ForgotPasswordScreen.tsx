import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mail, CheckCircle2 } from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { useAuthTheme } from '../../theme/authTheme';
import { api, ApiError } from '../../services/api';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { palette: p } = useAuthTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSendReset() {
    const value = email.trim();
    if (!value) {
      setEmailError('Informe seu e-mail.');
      return;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setEmailError('Digite um e-mail válido, como seu@email.com.');
      return;
    }

    try {
      setLoading(true);
      setEmailError(undefined);
      setErrorMessage(null);
      await api.forgotPassword(value);
      setSubmitted(true); // a confirmação é sempre a mesma: não revela se o e-mail existe
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível enviar o link. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleTryAnotherEmail() {
    setSubmitted(false);
    setEmail('');
  }

  if (submitted) {
    return (
      <AuthLayout title="Verifique seu e-mail" subtitle="Instruções enviadas">
        <View style={styles.successContainer} accessibilityLiveRegion="polite">
          <CheckCircle2 size={48} color={p.success} />
          <Text style={[styles.successMessage, { color: p.textMuted }]}>
            Se houver uma conta associada a este e-mail, enviaremos as instruções para criar uma nova
            senha. O link tem validade limitada; confira também a caixa de spam.
          </Text>
        </View>

        <AuthButton title="Voltar ao login" onPress={() => navigation.navigate('Login')} />

        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleTryAnotherEmail}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={styles.secondaryAction}
        >
          <Text style={[styles.secondaryActionText, { color: p.link }]}>Usar outro e-mail</Text>
        </TouchableOpacity>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail cadastrado"
      description="Enviaremos as instruções de redefinição para o seu e-mail."
    >
      {errorMessage ? <AuthMessage type="error" message={errorMessage} /> : null}

      <AuthInput
        label="E-mail"
        placeholder="E-mail"
        icon={Mail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSendReset}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (emailError) setEmailError(undefined);
        }}
        error={emailError}
      />

      <AuthButton title="Enviar instruções" onPress={handleSendReset} loading={loading} />

      <AuthFooterLink
        prompt="Lembrou a senha?"
        linkLabel="Voltar ao login"
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  successContainer: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  successMessage: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 16 },
  secondaryAction: { alignSelf: 'center', marginTop: 24 },
  secondaryActionText: { fontWeight: '700', fontSize: 14 },
});
