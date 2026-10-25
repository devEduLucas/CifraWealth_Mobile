import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Placeholder pulsante usado enquanto a API responde (sem dados fictícios).
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceSubtle, opacity }, style]}
    />
  );
}
