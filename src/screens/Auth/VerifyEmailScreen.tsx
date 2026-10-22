import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Mail,
  MailCheck,
  RefreshCw,
  Info,
  Edit3,
  Check,
} from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthMessage } from '../../components/auth/AuthMessage';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { useAuthTheme, neoShadow } from '../../theme/authTheme';
import { api, ApiError } from '../../services/api';

interface VerifyEmailScreenProps {
  route: any;
  navigation: any;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function VerifyEmailScreen({ route, navigation }: VerifyEmailScreenProps) {
  const { palette: p } = useAuthTheme();

  // Dados recebidos do cadastro
  const initialEmail = route?.params?.email || '';
  const nome = route?.params?.nome || '';
  const sobrenome = route?.params?.sobrenome || '';
  const senha = route?.params?.senha || '';

  const [email, setEmail] = useState(initialEmail);
  const [newEmail, setNewEmail] = useState('');
  const [showChangeEmail, setShowChangeEmail] = useState(false);

  // Estados de reenvio
  const [resending, setResending] = useState(false);

  // Estados de alteração de e-mail
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);

  // Feedback geral (sucesso / erro)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Reenviar confirmação para o e-mail atual
  async function handleResend() {
    const targetEmail = email.trim();
    if (!targetEmail) {
      setFeedback({ type: 'error', message: 'Informe seu e-mail para reenviar a confirmação.' });
      return;
    }
    try {
      setResending(true);
      setFeedback(null);
      const res = await api.resendVerification(targetEmail);
      setFeedback({
        type: 'success',
        message: res.message || 'Novo link de confirmação enviado com sucesso! Verifique sua caixa de entrada.',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Não foi possível solicitar outro e-mail agora. Tente novamente mais tarde.' });
      }
    } finally {
      setResending(false);
    }
  }

  // Alterar e-mail diretamente nesta tela mantendo a mesma senha
  async function handleChangeEmail() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setChangeEmailError('Informe o novo e-mail.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setChangeEmailError('Digite um e-mail válido (ex: seu@email.com).');
      return;
    }
    if (trimmed === email.toLowerCase()) {
      setChangeEmailError('O novo e-mail deve ser diferente do anterior.');
      return;
    }

    try {
      setChangingEmail(true);
      setChangeEmailError(null);
      setFeedback(null);

      // Altera apenas o e-mail, reutilizando a senha e dados cadastrados
      if (senha) {
        await api.register(nome || '', sobrenome || '', trimmed, senha);
      } else {
        await api.resendVerification(trimmed);
      }

      setEmail(trimmed);
      setNewEmail('');
      setShowChangeEmail(false);
      setFeedback({
        type: 'success',
        message: `E-mail alterado para ${trimmed}. Novo link de confirmação enviado!`,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setChangeEmailError(err.message);
      } else {
        setChangeEmailError('Não foi possível alterar o e-mail. Verifique os dados e tente novamente.');
      }
    } finally {
      setChangingEmail(false);
    }
  }

  return (
    <AuthLayout
      title="Confirme seu e-mail"
      subtitle="E-MAIL DE ATIVAÇÃO ENVIADO"
    >
      {/* Mensagens de feedback de sucesso ou erro */}
      {feedback ? <AuthMessage type={feedback.type} message={feedback.message} /> : null}

      {/* Card principal com destaque de e-mail enviado */}
      <View
        style={[
          styles.mainCard,
          { backgroundColor: p.surface, borderColor: p.surfaceBorder },
          neoShadow(p, 1.2),
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: p.successBg, borderColor: p.success }]}>
          <MailCheck size={36} color={p.success} />
        </View>

        <Text style={[styles.cardTitle, { color: p.text }]}>
          Enviamos um link de confirmação
        </Text>

        {email ? (
          <View style={[styles.emailBadge, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
            <Mail size={15} color={p.accent} />
            <Text style={[styles.emailText, { color: p.text }]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.cardInstructions, { color: p.textMuted }]}>
          Abra o e-mail recebido e clique no link para ativar sua conta. Por segurança, o link tem validade de <Text style={{ color: p.text, fontWeight: '700' }}>24 horas</Text>.
        </Text>

        {/* Dica de spam sem emojis, com ícone Info */}
        <View style={[styles.hintBox, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
          <Info size={16} color={p.accent} style={styles.hintIcon} />
          <Text style={[styles.hintText, { color: p.textMuted }]}>
            Não encontrou? Confira também a pasta de <Text style={{ fontWeight: '600', color: p.text }}>spam</Text> ou lixo eletrônico.
          </Text>
        </View>
      </View>

      {/* Seção de Reenvio */}
      <View style={styles.resendSection}>
        <Text style={[styles.resendPrompt, { color: p.textMuted }]}>
          Não recebeu a mensagem ou o link expirou?
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.8}
          style={[
            styles.resendButton,
            { backgroundColor: p.surface, borderColor: p.accent },
            neoShadow(p, 0.6),
          ]}
        >
          {resending ? (
            <ActivityIndicator size="small" color={p.accent} />
          ) : (
            <>
              <RefreshCw size={15} color={p.accent} />
              <Text style={[styles.resendButtonText, { color: p.accent }]}>
                Reenviar e-mail de confirmação
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Seção: Alterar e-mail incorreto direto nesta tela sem alterar a senha */}
      <View
        style={[
          styles.changeEmailCard,
          { backgroundColor: p.surface, borderColor: p.surfaceBorder },
          neoShadow(p, 0.8),
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setShowChangeEmail((prev) => !prev);
            setChangeEmailError(null);
          }}
          activeOpacity={0.8}
          style={styles.changeEmailToggle}
        >
          <View style={styles.changeEmailTitleRow}>
            <Edit3 size={16} color={p.accent} />
            <Text style={[styles.changeEmailTitle, { color: p.text }]}>
              Digitou o e-mail incorreto?
            </Text>
          </View>
          <Text style={[styles.changeEmailActionLink, { color: p.link }]}>
            {showChangeEmail ? 'Fechar' : 'Alterar e-mail'}
          </Text>
        </TouchableOpacity>

        {showChangeEmail ? (
          <View style={styles.changeEmailBody}>
            <Text style={[styles.changeEmailDesc, { color: p.textMuted }]}>
              Informe o novo e-mail abaixo. Manteremos a mesma senha cadastrada e enviaremos o link para ele.
            </Text>

            {changeEmailError ? <AuthMessage type="error" message={changeEmailError} /> : null}

            <AuthInput
              label="Novo e-mail"
              placeholder="Digite o novo e-mail"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                if (changeEmailError) setChangeEmailError(null);
              }}
              error={changeEmailError || undefined}
            />

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleChangeEmail}
              disabled={changingEmail}
              activeOpacity={0.85}
              style={[
                styles.changeEmailSubmit,
                { backgroundColor: p.surface, borderColor: p.accent },
                neoShadow(p, 0.6),
              ]}
            >
              {changingEmail ? (
                <ActivityIndicator size="small" color={p.accent} />
              ) : (
                <>
                  <Check size={16} color={p.accent} />
                  <Text style={[styles.changeEmailSubmitText, { color: p.accent }]}>
                    Atualizar e-mail e reenviar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Botão de ação principal */}
      <View style={styles.mainAction}>
        <AuthButton
          title="Já confirmou? Entrar"
          onPress={() => navigation.navigate('Login')}
        />
      </View>

      <AuthFooterLink
        prompt="Já ativou sua conta?"
        linkLabel="Fazer login"
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 6,
    maxWidth: '100%',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardInstructions: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  hintBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  hintIcon: {
    flexShrink: 0,
    marginRight: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  resendSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendPrompt: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  changeEmailCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  changeEmailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  changeEmailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  changeEmailTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeEmailActionLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  changeEmailBody: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  changeEmailDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  changeEmailSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },
  changeEmailSubmitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mainAction: {
    width: '100%',
    marginTop: 4,
  },
});
