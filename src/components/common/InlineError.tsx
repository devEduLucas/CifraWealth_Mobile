import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { radii, spacing, useColors, ThemeColors } from '../../theme';

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

// Erro real da API com ação de nova tentativa (nunca vira lista vazia nem saldo zero).
export function InlineError({ message, onRetry }: InlineErrorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <AlertCircle size={18} color={colors.negative} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          style={styles.retry}
          onPress={onRetry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw size={14} color={colors.negative} />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.negativeBg,
    borderWidth: 1,
    borderColor: colors.negativeBorder,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  message: {
    flex: 1,
    minWidth: 160,
    color: colors.negative,
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  retryText: {
    color: colors.negative,
    fontSize: 13,
    fontWeight: '700',
  },
});
