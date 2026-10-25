import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, spacing } from '../../theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={styles.action}
          onPress={onActionPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ArrowRight size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
