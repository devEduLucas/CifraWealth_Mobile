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
import { Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react-native';
import { colors, spacing, radii } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { api, ApiError } from '../../services/api';

interface RegisterScreenProps {
  navigation: any;
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRegister() {
    if (!nome.trim() || !email.trim() || !senha) {
      setErrorMessage('Por favor preencha nome, e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.register(nome.trim(), sobrenome.trim(), email.trim(), senha);
      setSuccessMessage(res.message || 'Conta criada com sucesso! Faça login para continuar.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Falha ao cadastrar. Tente novamente.');
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
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>
              Comece a gerenciar suas finanças com o CifraWealth
            </Text>
          </View>

          <View style={styles.formCard}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Nome"
              placeholder="Ex: Eduardo"
              value={nome}
              onChangeText={setNome}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Sobrenome"
              placeholder="Ex: Lucas"
              value={sobrenome}
              onChangeText={setSobrenome}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Button
              title="Cadastrar"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />

            <View style={styles.footerLinkContainer}>
              <Text style={styles.footerPrompt}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Fazer login</Text>
              </TouchableOpacity>
            </View>
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
  successBox: {
    backgroundColor: colors.positiveBg,
    borderColor: colors.positive,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  successText: {
    color: colors.positive,
    fontSize: 13,
  },
  submitButton: {
    marginTop: spacing.base,
  },
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerPrompt: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
