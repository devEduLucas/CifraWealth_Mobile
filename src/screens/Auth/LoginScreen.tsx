import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthCheckbox } from '../../components/auth/AuthCheckbox';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { GoogleAuthSection } from '../../components/auth/GoogleAuthSection';
import { useAuthTheme } from '../../theme/authTheme';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../services/api';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const { palette: p } = useAuthTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !senha) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await login(email.trim(), senha, remember);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível entrar. Verifique seus dados e o servidor.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para continuar">
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
        value={email}
        onChangeText={setEmail}
      />

      <AuthInput
        label="Senha"
        placeholder="Senha"
        icon={Lock}
        isPassword
        autoComplete="password"
        textContentType="password"
        value={senha}
        onChangeText={setSenha}
      />

      <View style={styles.optionsRow}>
        <AuthCheckbox label="Lembrar de mim" checked={remember} onChange={setRemember} />
        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => navigation.navigate('ForgotPassword')}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={[styles.forgotText, { color: p.link }]}>Esqueceu a senha?</Text>
        </TouchableOpacity>
      </View>

      <AuthButton title="Entrar" onPress={handleLogin} loading={loading} />

      <GoogleAuthSection mode="signin" />

      <AuthFooterLink
        prompt="Ainda não tem conta?"
        linkLabel="Criar conta"
        onPress={() => navigation.navigate('Register')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 14,
  },
  forgotText: { fontSize: 14, fontWeight: '700' },
});
