import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { ThemeProvider, useTheme } from '../theme';
import { PrivacyProvider } from '../hooks/usePrivacy';
import { SplashIntro } from '../components/splash/SplashIntro';

const linking = {
  // Links https do site abrem o app quando ele está instalado (Android App Links)
  prefixes: ['cifrawealth://', 'https://cifrawealth.vercel.app', 'http://localhost:8081', 'http://localhost:5173'],
  config: {
    screens: {
      VerifyEmail: 'verify-email',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};

export function RootNavigator() {
  return (
    <ThemeProvider>
      <PrivacyProvider>
        <RootContent />
      </PrivacyProvider>
    </ThemeProvider>
  );
}

function RootContent() {
  const { isAuthenticated, loading } = useAuth();
  const { name, colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const [revealed, setRevealed] = useState(false); // app só monta quando a intro começa a sair

  // Fundo das transições do React Navigation segue o tema (evita flash branco no escuro)
  const navTheme = {
    ...(name === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(name === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.borderSubtle,
      primary: colors.primary,
    },
  };

  const content = !revealed ? null : loading ? (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  ) : (
    <NavigationContainer linking={linking} theme={navTheme}>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={name === 'light' ? 'dark' : 'light'} />
      {content}
      {/* Abertura da marca: cobre o app até terminar e depois se dissolve revelando a tela inicial */}
      {!splashDone && <SplashIntro ready={!loading} onExitStart={() => setRevealed(true)} onFinish={() => setSplashDone(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
