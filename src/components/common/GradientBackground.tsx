import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

interface DecorCircle {
  /** posição do centro e raio como fração da largura/altura do card */
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface GradientBackgroundProps {
  id: string;
  /** [posição 0..1, cor] */
  stops: [number, string][];
  circles?: DecorCircle[];
}

// Fundo em degradê que mede o próprio tamanho. No Android, <Svg width="100%" height="100%">
// dentro de um card com altura automática não preenche tudo e corta o cartão.
export function GradientBackground({ id, stops, circles = [] }: GradientBackgroundProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {stops.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#${id})`} />
          {circles.map((c, i) => (
            <Circle
              key={i}
              cx={c.cx * size.w}
              cy={c.cy * size.h}
              r={c.r * size.w}
              fill={c.fill ?? 'none'}
              stroke={c.stroke}
              strokeWidth={c.strokeWidth}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
