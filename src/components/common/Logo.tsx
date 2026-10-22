import React, { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Text as SvgText, TSpan } from 'react-native-svg';
import { colors } from '../../theme';

interface LogoProps {
  size?: number;        // altura do desenho em px
  showSymbol?: boolean; // símbolo (infinito)
  showText?: boolean;   // "CIFRA Wealth"
  textColor?: string;   // cor de "CIFRA" (o "Wealth" usa o gradiente da marca)
}

const FONT_FAMILY = Platform.select({
  web: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

// Símbolo e gradiente idênticos ao Logo do FrontEnd (azul #2563EB → teal #14B8A6).
export function Logo({ size = 40, showSymbol = true, showText = true, textColor = colors.text }: LogoProps) {
  // IDs únicos por instância: o Stack mantém a tela anterior montada e IDs repetidos
  // fariam o url(#id) apontar para o gradiente de uma tela oculta (ícone e "Wealth" somem).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const iconGradient = `cwIcon${uid}`;
  const textGradient = `cwText${uid}`;

  const textStart = showSymbol ? 60 : 0;
  const viewWidth = showText ? textStart + 200 : 48;

  return (
    <Svg width={(size * viewWidth) / 48} height={size} viewBox={`0 0 ${viewWidth} 48`}>
      <Defs>
        <LinearGradient id={iconGradient} x1="0" y1="24" x2="48" y2="24" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.brandBlue} />
          <Stop offset="1" stopColor={colors.brandTeal} />
        </LinearGradient>
        <LinearGradient
          id={textGradient}
          x1={textStart + 96}
          y1="0"
          x2={textStart + 186}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={colors.brandBlue} />
          <Stop offset="1" stopColor={colors.brandTeal} />
        </LinearGradient>
      </Defs>
      {showSymbol && (
        <Path
          d="M13 15C7.477 15 3 19.477 3 25s4.477 10 10 10c4.2 0 7.8-2.6 9.3-6.3l3.4-8.4c1.5-3.7 5.1-6.3 9.3-6.3 5.523 0 10 4.477 10 10s-4.477 10-10 10c-4.2 0-7.8-2.6-9.3-6.3l-3.4-8.4C21.3 15.6 17.7 13 13.5 13"
          stroke={`url(#${iconGradient})`}
          strokeWidth={3.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {showText && (
        <SvgText x={textStart} y="33" fontSize="26" fontWeight="700" fontFamily={FONT_FAMILY}>
          <TSpan fill={textColor}>CIFRA </TSpan>
          <TSpan fill={`url(#${textGradient})`}>Wealth</TSpan>
        </SvgText>
      )}
    </Svg>
  );
}
