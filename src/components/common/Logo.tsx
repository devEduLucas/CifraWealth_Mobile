import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText, TSpan } from 'react-native-svg';
import { colors } from '../../theme';

interface LogoProps {
  size?: number;      // altura do símbolo em px
  showText?: boolean; // exibe "CIFRA Wealth" ao lado do símbolo
}

// Símbolo e gradiente idênticos ao Logo do FrontEnd (azul #2563EB → teal #14B8A6).
export function Logo({ size = 40, showText = true }: LogoProps) {
  const viewWidth = showText ? 250 : 48;
  return (
    <Svg width={(size * viewWidth) / 48} height={size} viewBox={`0 0 ${viewWidth} 48`}>
      <Defs>
        <LinearGradient id="cwIcon" x1="0" y1="24" x2="48" y2="24" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.brandBlue} />
          <Stop offset="1" stopColor={colors.brandTeal} />
        </LinearGradient>
        <LinearGradient id="cwText" x1="150" y1="0" x2="236" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.brandBlue} />
          <Stop offset="1" stopColor={colors.brandTeal} />
        </LinearGradient>
      </Defs>
      <Path
        d="M13 15C7.477 15 3 19.477 3 25s4.477 10 10 10c4.2 0 7.8-2.6 9.3-6.3l3.4-8.4c1.5-3.7 5.1-6.3 9.3-6.3 5.523 0 10 4.477 10 10s-4.477 10-10 10c-4.2 0-7.8-2.6-9.3-6.3l-3.4-8.4C21.3 15.6 17.7 13 13.5 13"
        stroke="url(#cwIcon)"
        strokeWidth={3.6}
        strokeLinecap="round"
        fill="none"
      />
      {showText && (
        <SvgText x="60" y="33" fontSize="26" fontWeight="700">
          <TSpan fill={colors.text}>CIFRA </TSpan>
          <TSpan fill="url(#cwText)">Wealth</TSpan>
        </SvgText>
      )}
    </Svg>
  );
}
