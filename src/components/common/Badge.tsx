import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'positive':
        return { bg: colors.positiveBg, text: colors.positive };
      case 'negative':
        return { bg: colors.negativeBg, text: colors.negative };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning };
      case 'info':
        return { bg: colors.infoBg, text: colors.info };
      default:
        return { bg: colors.surfaceElevated, text: colors.textMuted };
    }
  };

  const { bg, text } = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
