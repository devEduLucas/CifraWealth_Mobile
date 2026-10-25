import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { GoogleAuthSection } from '../../components/auth/GoogleAuthSection';
import { api, ApiError } from '../../services/api';
import { pendingRegistration } from '../../services/pendingRegistration';

interface RegisterScreenProps {
  navigation: any;
}

type FieldErrors = { nome?: string; email?: string; senha?: string; confirmar?: string };

const MISMATCH_MESSAGE = 'As senhas não coincidem.';

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  // Mostra a divergência assim que o campo é abandonado e a mantém atualizada se a senha mudar.
  const confirmError =
    errors.confirmar ?? (confirmTouched && confirmSenha && confirmSenha !== senha ? MISMATCH_MESSAGE : undefined);

  async function handleRegister() {
    // Mesmas regras de antes: nome, e-mail e senha obrigatórios; sobrenome opcional.
    const nextErrors: FieldErrors = {};
    if (!nome.trim()) nextErrors.nome = 'Informe seu nome.';
    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.';
    if (!senha) nextErrors.senha = 'Informe uma senha.';
    const missingRequired = Object.keys(nextErrors).length > 0;

    if (!confirmSenha) nextErrors.confirmar = 'Confirme sua senha.';
    else if (confirmSenha !== senha) nextErrors.confirmar = MISMATCH_MESSAGE;

    setErrors(nextErrors);
    setConfirmTouched(true);
    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage(missingRequired ? 'Por favor preencha nome, e-mail e senha.' : nextErrors.confirmar ?? null);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.register(nome.trim(), sobrenome.trim(), email.trim(), senha);
      // A senha fica só em memória (nunca em parâmetros de rota, que no web aparecem na URL).
      pendingRegistration.set({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        email: email.trim(),
        senha,
      });
      navigation.navigate('VerifyEmail', { email: email.trim() });
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
    <AuthLayout title="Crie sua conta" subtitle="Comece a organizar suas finanças">
      {errorMessage ? <AuthMessage type="error" message={errorMessage} /> : null}
      {successMessage ? <AuthMessage type="success" message={successMessage} /> : null}

      <AuthInput
        label="Nome"
        placeholder="Nome"
        icon={UserIcon}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        value={nome}
        onChangeText={(v) => {
          setNome(v);
          clearFieldError('nome');
        }}
        error={errors.nome}
      />

      <AuthInput
        label="Sobrenome"
        placeholder="Sobrenome"
        icon={UserIcon}
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
        value={sobrenome}
        onChangeText={setSobrenome}
      />

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
        onChangeText={(v) => {
          setEmail(v);
          clearFieldError('email');
        }}
        error={errors.email}
      />

      <AuthInput
        label="Senha"
        placeholder="Senha (mínimo 8 caracteres)"
        icon={Lock}
        isPassword
        autoComplete="new-password"
        textContentType="newPassword"
        value={senha}
        onChangeText={(v) => {
          setSenha(v);
          clearFieldError('senha');
        }}
        error={errors.senha}
      />

      <AuthInput
        label="Confirmar senha"
        placeholder="Confirmar senha"
        icon={Lock}
        isPassword
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
        value={confirmSenha}
        onChangeText={(v) => {
          setConfirmSenha(v);
          clearFieldError('confirmar');
        }}
        onBlur={() => setConfirmTouched(true)}
        error={confirmError}
      />

      <AuthButton title="Cadastrar" onPress={handleRegister} loading={loading} />

      <GoogleAuthSection mode="signup" />

      <AuthFooterLink
        prompt="Já tem uma conta?"
        linkLabel="Fazer login"
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
}
