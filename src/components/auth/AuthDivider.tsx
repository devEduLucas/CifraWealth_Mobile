import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthTheme } from '../../theme/authTheme';

// Divisor "OU CONTINUE COM" (linha – texto espaçado – linha).
export function AuthDivider({ label = 'OU CONTINUE COM' }: { label?: string }) {
  const { palette: p } = useAuthTheme();
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.line, { backgroundColor: p.divider }]} />
      <Text style={[styles.label, { color: p.textMuted }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: p.divider }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 20 },
  line: { flex: 1, height: 1 },
  label: { fontSize: 11, letterSpacing: 2.5, marginHorizontal: 14 },
});
