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
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, radii } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { api, ApiError } from '../../services/api';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSendReset() {
    if (!email.trim()) {
      setErrorMessage('Digite seu e-mail cadastrado.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await api.forgotPassword(email.trim());
      setSubmitted(true);
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
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={colors.textMuted} />
            <Text style={styles.backText}>Voltar ao login</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Digite seu e-mail cadastrado para enviarmos as instruções de redefinição
            </Text>
          </View>

          <View style={styles.formCard}>
            {submitted ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={48} color={colors.primary} />
                <Text style={styles.successTitle}>E-mail enviado!</Text>
                <Text style={styles.successMessage}>
                  Se este e-mail estiver registrado em nossa plataforma, você receberá
                  as instruções para criar uma nova senha em instantes.
                </Text>
                <Button
                  title="Voltar ao início"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.returnButton}
                />
              </View>
            ) : (
              <>
                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <Input
                  label="E-mail"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={18} color={colors.textMuted} />}
                />

                <Button
                  title="Enviar instruções"
                  onPress={handleSendReset}
                  loading={loading}
                  style={styles.submitButton}
                />
              </>
            )}
          </View>
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
    flexGrow: 1,
    padding: spacing.screenPadding,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  errorBox: {
    backgroundColor: colors.negativeBg,
    borderColor: colors.negative,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.negative,
    fontSize: 13,
  },
  submitButton: {
    marginTop: spacing.base,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  successMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.base,
    lineHeight: 20,
  },
  returnButton: {
    width: '100%',
    marginTop: spacing.base,
  },
});
