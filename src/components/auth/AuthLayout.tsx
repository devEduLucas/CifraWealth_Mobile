import React, { ReactNode, useId } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { Moon, Sun } from 'lucide-react-native';
import { Logo } from '../common/Logo';
import { neoShadow, useAuthTheme, AuthPalette } from '../../theme/authTheme';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  description?: string;
  children: ReactNode;
}

function Background({ p }: { p: AuthPalette }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `bg${uid}`;
  const ring = `ring${uid}`;
  const orb = `orb${uid}`;
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 736 1307"
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.bgTop} />
          <Stop offset="1" stopColor={p.bgBottom} />
        </LinearGradient>
        <LinearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={p.ringA} />
          <Stop offset="1" stopColor={p.ringB} />
        </LinearGradient>
        <LinearGradient id={orb} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={p.orbA} />
          <Stop offset="1" stopColor={p.orbB} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="736" height="1307" fill={`url(#${bg})`} />
      {/* canto superior esquerdo */}
      <Circle cx="-30" cy="-40" r="250" fill={`url(#${ring})`} />
      <Circle cx="-30" cy="-40" r="212" fill={p.decoFill} stroke={p.decoStroke} strokeWidth="5" />
      {/* esfera à direita */}
      <Circle cx="740" cy="335" r="118" fill={`url(#${orb})`} stroke={p.decoStroke} strokeWidth="4" />
      {/* canto inferior esquerdo */}
      <Circle cx="-10" cy="1360" r="215" fill={`url(#${ring})`} />
      <Circle cx="-10" cy="1360" r="182" fill={p.decoFill} stroke={p.decoStroke} strokeWidth="5" />
      {/* canto inferior direito */}
      <Circle cx="800" cy="1420" r="335" fill={`url(#${ring})`} />
      <Circle cx="800" cy="1420" r="292" fill={p.decoFill} stroke={p.decoStroke} strokeWidth="5" />
    </Svg>
  );
}

// Estrutura única das telas de autenticação (login, cadastro, recuperação, confirmação).
export function AuthLayout({ title, subtitle, description, children }: AuthLayoutProps) {
  const { palette: p, toggleTheme } = useAuthTheme();
  const insets = useSafeAreaInsets();
  const isLight = p.name === 'light';
  const ToggleIcon = isLight ? Moon : Sun;
  const toggleLabel = isLight ? 'Ativar modo escuro' : 'Ativar modo claro';

  return (
    <View style={[styles.root, { backgroundColor: p.bgTop }]}>
      <StatusBar style={p.statusBar} />
      <Background p={p} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo em bloco de vidro */}
          <View
            style={[
              styles.tile,
              { backgroundColor: p.surface, borderColor: p.surfaceBorder },
              neoShadow(p, 1.6),
            ]}
          >
            <Logo size={64} showText={false} />
            <View style={styles.wordmark}>
              <Logo size={22} showSymbol={false} textColor={p.text} />
            </View>
          </View>

          <Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>
            {title}
          </Text>
          {subtitle ? <Text style={[styles.subtitle, { color: p.textMuted }]}>{subtitle}</Text> : null}
          {description ? <Text style={[styles.description, { color: p.textMuted }]}>{description}</Text> : null}

          <View style={styles.content}>{children}</View>

          <Text style={[styles.tagline, { color: p.textMuted }]}>CONTROLE  •  PLANEJE  •  CRESÇA</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        onPress={toggleTheme}
        activeOpacity={0.85}
        style={[
          styles.toggle,
          { top: insets.top + 12, backgroundColor: p.surface, borderColor: p.surfaceBorder },
          neoShadow(p, 0.8),
        ]}
      >
        <ToggleIcon size={22} color={p.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  tile: {
    width: 156,
    height: 168,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { marginTop: 8 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 2.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    marginTop: 28,
  },
  tagline: {
    fontSize: 10,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 32,
  },
  cornerBlock: {
    alignSelf: 'flex-end',
    marginTop: 16,
    maxWidth: 400,
  },
  cornerText: {
    fontSize: 9,
    letterSpacing: 2.5,
    lineHeight: 14,
    opacity: 0.8,
  },
  cornerDash: { width: 18, height: 2, marginTop: 8, opacity: 0.6 },
  toggle: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
