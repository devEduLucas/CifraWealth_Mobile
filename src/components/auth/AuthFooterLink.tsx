import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthTheme } from '../../theme/authTheme';

interface AuthFooterLinkProps {
  prompt: string;
  linkLabel: string;
  onPress: () => void;
}

export function AuthFooterLink({ prompt, linkLabel, onPress }: AuthFooterLinkProps) {
  const { palette: p } = useAuthTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.prompt, { color: p.textMuted }]}>{prompt} </Text>
      <TouchableOpacity
        accessibilityRole="link"
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <Text style={[styles.link, { color: p.link }]}>{linkLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 },
  prompt: { fontSize: 14 },
  link: { fontWeight: '700', fontSize: 14 },
});
