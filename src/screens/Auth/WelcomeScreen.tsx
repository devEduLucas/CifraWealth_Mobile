import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { storage } from '../../services/storage';

interface WelcomeScreenProps {
  navigation: any;
}

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  async function continueToLogin() {
    await storage.setOnboarded();
    navigation.replace('Login');
  }

  async function continueToRegister() {
    await storage.setOnboarded();
    navigation.navigate('Register');
  }

  return (
    <AuthLayout
      title="Bem-vindo ao CifraWealth"
      subtitle="Tenha suas finanças organizadas em um só lugar."
      description="Acompanhe receitas, despesas e metas com mais clareza."
    >
      <View style={styles.content}>
        <AuthButton title="Entrar na minha conta" onPress={() => void continueToLogin()} />
        <AuthFooterLink
          prompt="Ainda não tem uma conta?"
          linkLabel="Criar conta"
          onPress={() => void continueToRegister()}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 12,
  },
});
