import React, { useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  rightIconLabel?: string; // rótulo de acessibilidade do botão do ícone direito
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  rightIconLabel,
  isPassword,
  style,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, style]}
          selectionColor={colors.primary}
          underlineColorAndroid="transparent"
          secureTextEntry={isPassword ? true : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={rightIconLabel}
            disabled={!onRightIconPress}
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radii.md,
    minHeight: 52,
    paddingHorizontal: spacing.base,
  },
  inputFocused: {
    borderColor: colors.primary,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 0 3px rgba(96, 165, 250, 0.2)' } as object) : null),
  },
  inputError: {
    borderColor: colors.negative,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null),
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  errorText: {
    color: colors.negative,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
