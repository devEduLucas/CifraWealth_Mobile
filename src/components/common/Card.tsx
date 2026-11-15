import React, { ReactNode, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { radii, spacing, useColors, ThemeColors } from '../../theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
});
