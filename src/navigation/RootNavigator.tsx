import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { colors } from '../theme';
import { SplashIntro } from '../components/splash/SplashIntro';

const linking = {
  prefixes: ['cifrawealth://', 'http://localhost:8081', 'http://localhost:5173'],
  config: {
    screens: {
      VerifyEmail: 'verify-email',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
    },
  },
};

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  const content = loading ? (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  ) : (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );

  return (
    <View style={styles.root}>
      {content}
      {/* Abertura da marca: cobre o app até terminar e depois se dissolve revelando a tela inicial */}
      {!splashDone && <SplashIntro ready={!loading} onFinish={() => setSplashDone(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
