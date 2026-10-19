import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MailCheck, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { api, ApiError } from '../../services/api';

export function VerifyEmailScreen({ route, navigation }: any) {
  // Pega o token passado por parâmetro ou rota
  const initialToken = route?.params?.token || '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify() {
    if (!token.trim()) {
      setErrorMessage('Informe o token de verificação enviado.');
      return;
    }
    if (!password) {
      setErrorMessage('Informe a senha cadastrada para ativar.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.verifyEmail(token.trim(), password);
      setSuccessMessage(res.message || 'E-mail confirmado com sucesso!');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível confirmar o e-mail. Verifique os dados.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <ArrowLeft size={20} color={colors.textMuted} />
            <Text style={styles.backText}>Ir para o Login</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              {successMessage ? (
                <CheckCircle2 size={32} color={colors.positive} />
              ) : (
                <MailCheck size={32} color={colors.primary} />
              )}
            </View>
            <Text style={styles.title}>
              {successMessage ? 'Conta confirmada!' : 'Confirme seu e-mail'}
            </Text>
            <Text style={styles.subtitle}>
              {successMessage
                ? 'Sua conta está ativa. Redirecionando para o login...'
                : 'Digite o token e a senha que você escolheu no cadastro para ativar sua conta.'}
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {!successMessage && (
            <View style={styles.form}>
              <Input
                label="Token de Verificação"
                value={token}
                onChangeText={setToken}
                placeholder="Cole o token recebido aqui"
                autoCapitalize="none"
              />

              <Input
                label="Sua Senha do Cadastro"
                value={password}
                onChangeText={setPassword}
                placeholder="Digite sua senha cadastrada"
                secureTextEntry
              />

              <Button
                title="Ativar Minha Conta"
                onPress={handleVerify}
                loading={loading}
                variant="primary"
                style={styles.submitButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyRegular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    ...typography.caption,
    color: colors.negative,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  successText: {
    ...typography.caption,
    color: colors.positive,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    gap: spacing.base,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});