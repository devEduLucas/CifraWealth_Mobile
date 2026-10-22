import React, { useEffect, useRef, useState } from 'react';
import { Key, Lock } from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { api, ApiError } from '../../services/api';

export function VerifyEmailScreen({ route, navigation }: any) {
  // Pega o token passado por parâmetro ou rota
  const initialToken = route?.params?.token || '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

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
      redirectTimer.current = setTimeout(() => {
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
    <AuthLayout
      title={successMessage ? 'Conta confirmada!' : 'Confirme seu e-mail'}
      subtitle={successMessage ? 'Redirecionando para o login' : 'Ative sua conta para continuar'}
      description={
        successMessage
          ? undefined
          : 'Digite o token e a senha que você escolheu no cadastro para ativar sua conta.'
      }
    >
      {errorMessage ? <AuthMessage type="error" message={errorMessage} /> : null}
      {successMessage ? <AuthMessage type="success" message={successMessage} /> : null}

      {!successMessage && (
        <>
          <AuthInput
            label="Token de Verificação"
            placeholder="Cole o token recebido aqui"
            icon={Key}
            autoCapitalize="none"
            autoCorrect={false}
            value={token}
            onChangeText={setToken}
          />

          <AuthInput
            label="Sua Senha do Cadastro"
            placeholder="Digite sua senha cadastrada"
            icon={Lock}
            isPassword
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          <AuthButton title="Ativar Minha Conta" onPress={handleVerify} loading={loading} />
        </>
      )}

      <AuthFooterLink
        prompt="Já confirmou?"
        linkLabel="Ir para o login"
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
}
