import React, { ComponentType, useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { neoShadow, useAuthTheme } from '../../theme/authTheme';

interface AuthInputProps extends TextInputProps {
  label: string; // usado como rótulo de acessibilidade (o design não exibe rótulo visível)
  icon?: ComponentType<{ size?: number; color?: string }>;
  isPassword?: boolean; // exibe o botão de mostrar/ocultar senha
  error?: string;
}

export function AuthInput({ label, icon: Icon, isPassword, error, onFocus, onBlur, style, ...props }: AuthInputProps) {
  const { palette: p } = useAuthTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.field,
          { backgroundColor: p.surface, borderColor: error ? p.error : focused ? p.accent : p.surfaceBorder },
          neoShadow(p, 0.7),
        ]}
      >
        {Icon ? <Icon size={20} color={p.icon} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={p.placeholder}
          selectionColor={p.accent}
          underlineColorAndroid="transparent"
          secureTextEntry={isPassword ? !visible : props.secureTextEntry}
          style={[
            styles.input,
            {
              color: p.text,
              backgroundColor: 'transparent',
              ...(Platform.OS === 'web'
                ? ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    backgroundColor: 'transparent',
                    WebkitBoxShadow: `0 0 0 1000px ${p.surface} inset`,
                    WebkitTextFillColor: p.text,
                    caretColor: p.text,
                  } as object)
                : null),
            },
            Icon ? styles.inputWithIcon : null,
            style,
          ]}
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
        {isPassword ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setVisible((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {visible ? <EyeOff size={20} color={p.icon} /> : <Eye size={20} color={p.icon} />}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: p.error }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  field: {
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          backgroundColor: 'transparent',
        } as object)
      : null),
  },
  inputWithIcon: { marginLeft: 14 },
  error: { fontSize: 12, marginTop: 6, marginLeft: 6 },
});
