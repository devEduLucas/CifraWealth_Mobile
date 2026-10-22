import React, { useId } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { neoShadow, useAuthTheme } from '../../theme/authTheme';

interface AuthCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function AuthCheckbox({ label, checked, onChange }: AuthCheckboxProps) {
  const { palette: p } = useAuthTheme();
  const gradientId = `cb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      activeOpacity={0.85}
      onPress={() => onChange(!checked)}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          checked ? styles.boxChecked : { backgroundColor: p.surface, borderColor: p.surfaceBorder },
          !checked && neoShadow(p, 0.5),
        ]}
      >
        {checked ? (
          <>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={p.gradientStart} />
                  <Stop offset="1" stopColor={p.gradientEnd} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
            </Svg>
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </>
        ) : null}
      </View>
      <Text style={[styles.label, { color: p.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  boxChecked: { borderColor: 'transparent' },
  label: { marginLeft: 12, fontSize: 14 },
});
