import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border };
      case 'danger':
        return { backgroundColor: colors.negativeBg, borderWidth: 1, borderColor: colors.negativeBorder };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return { color: colors.textSecondary, fontWeight: '600' };
      case 'ghost':
        return { color: colors.textSecondary, fontWeight: '600' };
      case 'danger':
        return { color: colors.negative, fontWeight: '700' };
      default:
        return { color: colors.textInverse, fontWeight: '700' };
    }
  };

  const spinnerColor =
    variant === 'primary' ? colors.textInverse : variant === 'danger' ? colors.negative : colors.primary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, getButtonStyle(), (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, getTextStyle(), icon ? { marginLeft: spacing.sm } : undefined]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  text: {
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
