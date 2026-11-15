import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, useColors, ThemeColors, useTypography } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, rightAction }: HeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typography = useTypography();
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={typography.titleLarge}>{title}</Text>
        {subtitle ? <Text style={typography.bodyMuted}>{subtitle}</Text> : null}
      </View>
      {rightAction && <View style={styles.actionContainer}>{rightAction}</View>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  actionContainer: {
    marginLeft: spacing.md,
  },
});
