import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles,
  Lock,
} from 'lucide-react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthButton } from '../../components/auth/AuthButton';
import { useAuthTheme, neoShadow } from '../../theme/authTheme';

interface EmailConfirmedScreenProps {
  route?: any;
  navigation: any;
}

export function EmailConfirmedScreen({ route, navigation }: EmailConfirmedScreenProps) {
  const { palette: p } = useAuthTheme();
  const email = route?.params?.email || '';

  function handleGoToLogin() {
    navigation.navigate('Login', { email });
  }

  return (
    <AuthLayout
      title="E-mail confirmado!"
      subtitle="CONTA ATIVADA COM SUCESSO"
      description="Seu endereço de e-mail foi validado. Sua conta Cifra Wealth está 100% ativa e pronta para uso."
    >
      {/* Card principal com efeito neumórfico e destaque de validação */}
      <View
        style={[
          styles.card,
          { backgroundColor: p.surface, borderColor: p.surfaceBorder },
          neoShadow(p, 1.2),
        ]}
      >
        {/* Círculo com ícone de sucesso e brilho sutil */}
        <View style={[styles.iconCircle, { backgroundColor: p.successBg, borderColor: p.success }]}>
          <CheckCircle2 size={46} color={p.success} strokeWidth={2.4} />
        </View>

        <Text style={[styles.cardHeading, { color: p.text }]}>
          Tudo pronto para começar!
        </Text>

        {email ? (
          <View style={[styles.badge, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
            <ShieldCheck size={16} color={p.success} />
            <Text style={[styles.badgeText, { color: p.text }]} numberOfLines={1}>
              {email}
            </Text>
            <View style={[styles.verifiedTag, { backgroundColor: p.successBg }]}>
              <Text style={[styles.verifiedTagText, { color: p.success }]}>Verificado</Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.cardDescription, { color: p.textMuted }]}>
          Agora você tem acesso irrestrito a todas as ferramentas financeiras inteligentes da plataforma.
        </Text>

        {/* Lista de benefícios liberados */}
        <View style={styles.featuresList}>
          <View style={[styles.featureItem, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
            <View style={[styles.featureIcon, { backgroundColor: p.surface }]}>
              <TrendingUp size={18} color={p.accent} />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={[styles.featureTitle, { color: p.text }]}>Painel e Relatórios</Text>
              <Text style={[styles.featureSubtitle, { color: p.textMuted }]}>
                Acompanhe receitas, despesas e fluxo mensal em tempo real.
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
            <View style={[styles.featureIcon, { backgroundColor: p.surface }]}>
              <Target size={18} color={p.accent} />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={[styles.featureTitle, { color: p.text }]}>Metas Financeiras</Text>
              <Text style={[styles.featureSubtitle, { color: p.textMuted }]}>
                Planeje conquistas com progresso visual e estimativas.
              </Text>
            </View>
          </View>

          <View style={[styles.featureItem, { backgroundColor: p.bgTop, borderColor: p.surfaceBorder }]}>
            <View style={[styles.featureIcon, { backgroundColor: p.surface }]}>
              <Lock size={18} color={p.accent} />
            </View>
            <View style={styles.featureTextWrapper}>
              <Text style={[styles.featureTitle, { color: p.text }]}>Segurança Bancária</Text>
              <Text style={[styles.featureSubtitle, { color: p.textMuted }]}>
                Dados criptografados e proteção integral de privacidade.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Botão de ação principal */}
      <View style={styles.buttonWrapper}>
        <AuthButton
          title="Acessar minha conta"
          onPress={handleGoToLogin}
        />
      </View>

      {/* Link de retorno */}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleGoToLogin}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.loginLink}
      >
        <Text style={[styles.loginLinkText, { color: p.link }]}>
          Ir para a tela de login
        </Text>
        <ArrowRight size={14} color={p.link} />
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 6,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 180,
  },
  verifiedTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  featuresList: {
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  featureSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 4,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
