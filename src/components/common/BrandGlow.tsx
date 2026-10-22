import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../theme';

// Brilho sutil azul → teal para cards de destaque. O card pai precisa de overflow: 'hidden'.
export function BrandGlow() {
  const gradientId = `cwGlow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.brandBlue} stopOpacity={0.28} />
          <Stop offset="1" stopColor={colors.brandTeal} stopOpacity={0.06} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
}
