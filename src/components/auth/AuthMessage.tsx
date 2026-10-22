import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthTheme } from '../../theme/authTheme';

interface AuthMessageProps {
  type: 'error' | 'success';
  message: string;
}

export function AuthMessage({ type, message }: AuthMessageProps) {
  const { palette: p } = useAuthTheme();
  const isError = type === 'error';
  const color = isError ? p.error : p.success;
  return (
    <View
      accessibilityRole={isError ? 'alert' : undefined}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      style={[styles.box, { backgroundColor: isError ? p.errorBg : p.successBg, borderColor: color }]}
    >
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  text: { fontSize: 13, lineHeight: 18 },
});
