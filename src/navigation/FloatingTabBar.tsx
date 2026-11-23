import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, spacing, useColors, ThemeColors } from '../theme';

// Telas que existem no navegador mas não aparecem na barra (acesso pelo avatar)
const HIDDEN_ROUTES = ['Profile'];

// Alturas fixas: nada depende de flex/porcentagem para centralizar
const BORDER = 1;
const ROW_HEIGHT = 68;
const PILL_HEIGHT = ROW_HEIGHT + BORDER * 2;
const CIRCLE = 56;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const visible = state.routes.filter((r) => !HIDDEN_ROUTES.includes(r.name));
  const focusedKey = state.routes[state.index]?.key;
  const activeIndex = visible.findIndex((r) => r.key === focusedKey); // -1 com o Perfil aberto

  // Posição fracionária da aba ativa; só transform/opacity (thread nativa)
  const position = useRef(new Animated.Value(activeIndex)).current;
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    Animated.spring(position, {
      toValue: activeIndex,
      stiffness: 220,
      damping: 20,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, position]);

  const count = Math.max(visible.length, 1);
  const itemWidth = rowWidth / count;
  const firstX = (itemWidth - CIRCLE) / 2;

  const circleStyle =
    rowWidth > 0
      ? {
          opacity: position.interpolate({ inputRange: [-1, -0.2, 0], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            {
              translateX: position.interpolate({
                inputRange: [0, Math.max(count - 1, 1)],
                outputRange: [firstX, firstX + (count - 1) * itemWidth],
                extrapolate: 'clamp',
              }),
            },
            { scale: position.interpolate({ inputRange: [-1, 0], outputRange: [0.4, 1], extrapolate: 'clamp' }) },
          ],
        }
      : { opacity: 0 };

  function onLayout(e: LayoutChangeEvent) {
    setRowWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.pill}>
        <View style={styles.row} onLayout={onLayout}>
          {/* Círculo ativo: desliza entre as abas e carrega o ícone da aba atual */}
          <Animated.View pointerEvents="none" style={[styles.circle, circleStyle]}>
            {visible.map((route, i) => {
              const { options } = descriptors[route.key];
              const opacity = position.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View key={route.key} style={[styles.circleIcon, { opacity }]}>
                  {options.tabBarIcon?.({ focused: true, color: colors.textInverse, size: 26 })}
                </Animated.View>
              );
            })}
          </Animated.View>

          {visible.map((route, i) => {
            const { options } = descriptors[route.key];
            const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
            const focused = i === activeIndex;
            const restingOpacity = position.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [1, 0, 1],
              extrapolate: 'clamp',
            });

            function onPress() {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            }

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={focused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.item}
              >
                <Animated.View style={[styles.resting, { opacity: restingOpacity }]}>
                  {options.tabBarIcon?.({ focused: false, color: colors.textSubtle, size: 22 })}
                  <Text style={styles.label} numberOfLines={1}>
                    {label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background,
      paddingHorizontal: spacing.base,
      paddingTop: spacing.sm,
    },
    pill: {
      height: PILL_HEIGHT,
      paddingHorizontal: spacing.sm,
      justifyContent: 'center',
      backgroundColor: colors.tabBar,
      borderRadius: radii.full,
      borderWidth: BORDER,
      borderColor: colors.tabBarBorder,
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    row: {
      height: ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
    },
    circle: {
      position: 'absolute',
      left: 0,
      top: (ROW_HEIGHT - CIRCLE) / 2,
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
    },
    circleIcon: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: CIRCLE,
      height: CIRCLE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    item: {
      flex: 1,
      height: ROW_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resting: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    label: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '600',
      color: colors.textSubtle,
      includeFontPadding: false,
    },
  });
