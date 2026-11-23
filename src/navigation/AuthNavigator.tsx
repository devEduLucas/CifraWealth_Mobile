import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { storage } from '../services/storage';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/Auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';
import { VerifyEmailScreen } from '../screens/Auth/VerifyEmailScreen';
import { EmailConfirmedScreen } from '../screens/Auth/EmailConfirmedScreen';
import { AuthThemeProvider } from '../theme/authTheme';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    storage.getOnboarded().then(setOnboarded);
  }, []);
  if (onboarded === null) return null;

  return (
    <AuthThemeProvider>
    <Stack.Navigator initialRouteName={onboarded ? 'Login' : 'Welcome'} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="EmailConfirmed" component={EmailConfirmedScreen} />
    </Stack.Navigator>
    </AuthThemeProvider>
  );
}