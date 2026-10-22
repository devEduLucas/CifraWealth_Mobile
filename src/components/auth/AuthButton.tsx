import React, { useId } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { useAuthTheme } from '../../theme/authTheme';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

// Botão em pílula com gradiente da marca (azul → teal), brilho de vidro e seta em círculo.
export function AuthButton({ title, onPress, loading, disabled, style }: AuthButtonProps) {
  const { palette: p } = useAuthTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fillId = `fill${uid}`;
  const glossId = `gloss${uid}`;
  const inactive = disabled || loading;

  const glow: ViewStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 24px rgba(37, 99, 235, 0.35)' } as ViewStyle)
      : { shadowColor: p.gradientStart, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      activeOpacity={0.88}
      disabled={inactive}
      onPress={onPress}
      style={[styles.shell, glow, inactive && styles.inactive, style]}
    >
      <View style={styles.clip}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={p.gradientStart} />
              <Stop offset="1" stopColor={p.gradientEnd} />
            </LinearGradient>
            <LinearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${fillId})`} />
          <Rect width="100%" height="55%" fill={`url(#${glossId})`} />
        </Svg>

        <View style={styles.row}>
          <View style={styles.spacer} />
          <Text style={styles.label}>{title}</Text>
          <View style={styles.badge}>
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ArrowRight size={20} color="#FFFFFF" />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: { height: 56, borderRadius: 28, marginTop: 8 },
  clip: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9 },
  spacer: { width: 40 },
  label: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: { opacity: 0.6 },
});
