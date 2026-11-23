import React, { ComponentType, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import {
  Banknote,
  CircleDollarSign,
  Coins,
  DollarSign,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useColors, ThemeColors } from '../../theme';
import { GradientBackground } from '../common/GradientBackground';

interface SplashIntroProps {
  /** true quando o app terminou de restaurar a sessão; a saída só começa depois disso */
  ready: boolean;
  onFinish: () => void;
  /** chamado quando a saída começa: o app só é montado aqui, nunca antes da intro */
  onExitStart?: () => void;
}

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// Segura o splash nativo (logo no azul da marca) até a intro estar desenhada na tela.
SplashScreen.preventAutoHideAsync().catch(() => {});

const BRAND_MID = '#1D8EC8'; // meio do degradê azul → teal; igual ao fundo do splash nativo
const WHITE = '#FFFFFF';
const MINT = '#99F6E4'; // teal claro da marca
const SKY = '#BFDBFE'; // azul claro da marca

const HOLD_MS = 4400; // tempo até começar a sair (+ 600 ms de saída = 5 s no total)
const PACE = 1.3; // dilata os atrasos e traços da entrada para ocupar melhor os 5 s
const MAX_LAYOUT_WIDTH = 520; // evita elementos espalhados demais em telas largas (web)

const after = (ms: number, animation: Animated.CompositeAnimation) =>
  Animated.sequence([Animated.delay(ms * PACE), animation]);

// ---------- Logo ----------
const LOGO_PATH =
  'M13 15C7.477 15 3 19.477 3 25s4.477 10 10 10c4.2 0 7.8-2.6 9.3-6.3l3.4-8.4c1.5-3.7 5.1-6.3 9.3-6.3 5.523 0 10 4.477 10 10s-4.477 10-10 10c-4.2 0-7.8-2.6-9.3-6.3l-3.4-8.4C21.3 15.6 17.7 13 13.5 13';
const LOGO_SIZE = 120;

// ---------- Nome ----------
const WORD = 'CifraWealth';
const BOLD_CHARS = 5; // "Cifra" em negrito, "Wealth" mais leve

// ---------- Ícones que surgem ao redor ----------
interface IconSpec {
  Icon: IconComponent;
  x: number;
  y: number;
  size: number;
  rotate: number;
  tint: string;
  delay: number;
}
const ICONS: IconSpec[] = [
  { Icon: PiggyBank, x: 0.17, y: 0.13, size: 34, rotate: -10, tint: WHITE, delay: 0 },
  { Icon: DollarSign, x: 0.52, y: 0.07, size: 26, rotate: 8, tint: MINT, delay: 110 },
  { Icon: Coins, x: 0.84, y: 0.14, size: 32, rotate: 12, tint: WHITE, delay: 220 },
  { Icon: Banknote, x: 0.9, y: 0.32, size: 34, rotate: -8, tint: SKY, delay: 330 },
  { Icon: Wallet, x: 0.88, y: 0.6, size: 30, rotate: 10, tint: WHITE, delay: 440 },
  { Icon: CircleDollarSign, x: 0.1, y: 0.58, size: 34, rotate: -12, tint: SKY, delay: 550 },
  { Icon: TrendingUp, x: 0.09, y: 0.33, size: 32, rotate: 8, tint: WHITE, delay: 660 },
];

// ---------- Chuva de moedas ----------
interface CoinSpec {
  x: number;
  size: number;
  delay: number;
  duration: number;
  tint: string;
  spin: number;
}
const COINS: CoinSpec[] = [
  { x: 0.08, size: 26, delay: 0, duration: 2300, tint: WHITE, spin: 620 },
  { x: 0.22, size: 20, delay: 350, duration: 2000, tint: MINT, spin: 540 },
  { x: 0.36, size: 30, delay: 120, duration: 2500, tint: WHITE, spin: 700 },
  { x: 0.5, size: 22, delay: 620, duration: 2100, tint: SKY, spin: 580 },
  { x: 0.64, size: 28, delay: 240, duration: 2400, tint: WHITE, spin: 660 },
  { x: 0.78, size: 20, delay: 500, duration: 2000, tint: MINT, spin: 520 },
  { x: 0.92, size: 26, delay: 80, duration: 2300, tint: SKY, spin: 600 },
  { x: 0.15, size: 18, delay: 900, duration: 1900, tint: WHITE, spin: 500 },
  { x: 0.7, size: 24, delay: 1000, duration: 2000, tint: WHITE, spin: 640 },
  { x: 0.42, size: 18, delay: 1150, duration: 1800, tint: MINT, spin: 560 },
];

// ---------- Gráfico de crescimento ----------
const BAR_HEIGHTS = [26, 40, 34, 58, 50, 80];
const BAR_WIDTH = 14;
const BAR_GAP = 10;
const CHART_W = BAR_HEIGHTS.length * BAR_WIDTH + (BAR_HEIGHTS.length - 1) * BAR_GAP; // 134
const CHART_H = 100;
const TREND_PATH = 'M7 64 L31 50 L55 56 L79 32 L103 40 L127 10';

const PROGRESS_W = 140;

// Todas as animações usam só transform/opacity com driver nativo (rodam na thread da UI, sem depender
// da thread JS ocupada na abertura do app). Logo, nome e lema ficam visíveis desde o primeiro quadro:
// se alguma animação não rodar, a marca continua aparecendo.

// Abertura da marca: fundo azul sólido, logo grande desenhada em branco com ondas, nome letra
// por letra, ícones de dinheiro surgindo, chuva de moedas e um gráfico que cresce.
export function SplashIntro({ ready, onFinish, onExitStart }: SplashIntroProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false); // intro já desenhada; o relógio só começa aqui
  const layoutDone = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish; // evita reiniciar a saída se o pai re-renderizar
  const exitStartRef = useRef(onExitStart);
  exitStartRef.current = onExitStart;

  const [v] = useState(() => ({
    logo: new Animated.Value(0),
    glow: new Animated.Value(0),
    ripples: [0, 1, 2].map(() => new Animated.Value(0)),
    chars: WORD.split('').map(() => new Animated.Value(0)),
    tagline: new Animated.Value(0),
    icons: ICONS.map(() => ({ pop: new Animated.Value(0), float: new Animated.Value(0) })),
    coins: COINS.map(() => ({ fall: new Animated.Value(0), spin: new Animated.Value(0) })),
    bars: BAR_HEIGHTS.map(() => new Animated.Value(0)),
    trend: new Animated.Value(0),
    progress: new Animated.Value(0),
    exit: new Animated.Value(0),
  }));

  // Respeita "reduzir movimento" do sistema
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => alive && setReduceMotion(enabled))
      .catch(() => alive && setReduceMotion(false));
    return () => {
      alive = false;
    };
  }, []);

  // Troca splash nativo -> intro sem corte: esconde o nativo só depois do primeiro layout
  const handleLayout = useCallback(() => {
    if (layoutDone.current) return;
    layoutDone.current = true;
    requestAnimationFrame(() => {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setVisible(true));
    });
  }, []);

  // Garantia: se o layout/hideAsync falhar, a intro começa mesmo assim
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setVisible(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Entrada
  useEffect(() => {
    if (reduceMotion === null || !visible) return;

    if (reduceMotion) {
      v.logo.setValue(1);
      v.chars.forEach((c) => c.setValue(1));
      v.tagline.setValue(1);
      v.icons.forEach((i) => i.pop.setValue(1));
      v.bars.forEach((b) => b.setValue(1));
      v.trend.setValue(1);
      v.progress.setValue(1);
      const timer = setTimeout(() => setHeld(true), 2500);
      return () => clearTimeout(timer);
    }

    const running: Animated.CompositeAnimation[] = [];
    const run = (animation: Animated.CompositeAnimation) => {
      running.push(animation);
      animation.start();
    };

    // ondas saindo da logo e brilho pulsando
    v.ripples.forEach((r, i) =>
      run(
        after(
          i * 700,
          Animated.loop(
            Animated.timing(r, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
          )
        )
      )
    );
    run(
      Animated.loop(
        Animated.sequence([
          Animated.timing(v.glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v.glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
    );

    // logo entra com um pulo suave
    run(after(100, Animated.spring(v.logo, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true })));

    // nome letra por letra
    v.chars.forEach((c, i) =>
      run(after(900 + i * 65, Animated.spring(c, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })))
    );
    run(after(1750, Animated.timing(v.tagline, { toValue: 1, duration: 600, useNativeDriver: true })));

    // ícones surgem em sequência e depois flutuam
    ICONS.forEach((spec, i) => {
      run(after(900 + spec.delay, Animated.spring(v.icons[i].pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true })));
      const d = 1400 + i * 120;
      run(
        after(
          1700 + spec.delay,
          Animated.loop(
            Animated.sequence([
              Animated.timing(v.icons[i].float, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(v.icons[i].float, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
          )
        )
      );
    });

    // moedas caem girando
    COINS.forEach((spec, i) => {
      run(
        after(
          300 + spec.delay,
          // a chuva de moedas segue caindo em ciclos até a saída
          Animated.loop(
            Animated.timing(v.coins[i].fall, { toValue: 1, duration: spec.duration, easing: Easing.in(Easing.quad), useNativeDriver: true })
          )
        )
      );
      run(
        Animated.loop(
          Animated.timing(v.coins[i].spin, { toValue: 1, duration: spec.spin, easing: Easing.linear, useNativeDriver: true })
        )
      );
    });

    // barras crescem e a linha de tendência é traçada
    v.bars.forEach((b, i) =>
      run(after(1600 + i * 120, Animated.spring(b, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true })))
    );
    run(after(2250, Animated.timing(v.trend, { toValue: 1, duration: 700 * PACE, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })));

    // barra de progresso até o fim da espera
    run(Animated.timing(v.progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: true }));

    const timer = setTimeout(() => setHeld(true), HOLD_MS);
    return () => {
      clearTimeout(timer);
      running.forEach((a) => a.stop());
    };
  }, [reduceMotion, visible, v]);

  // Saída: só depois do tempo mínimo E com o app pronto
  useEffect(() => {
    if (!held || !ready) return;
    exitStartRef.current?.();
    const exit = Animated.timing(v.exit, {
      toValue: 1,
      duration: reduceMotion ? 250 : 600,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    });
    exit.start(({ finished }) => {
      if (finished) finishRef.current();
    });
    return () => exit.stop();
  }, [held, ready, reduceMotion, v]);

  const layoutWidth = Math.min(width, MAX_LAYOUT_WIDTH);
  const offsetX = (width - layoutWidth) / 2;
  const logoCenterY = height * 0.3;

  const rootOpacity = v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const contentScale = v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowScale = v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const logoScale = v.logo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const progressScale = v.progress.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] });
  const progressShift = v.progress.interpolate({ inputRange: [0, 1], outputRange: [-PROGRESS_W / 2, 0] });

  return (
    <Animated.View
      accessible
      accessibilityLabel="Cifra Wealth"
      onLayout={handleLayout}
      style={[styles.root, { opacity: rootOpacity }]}
    >
      <StatusBar style="light" />
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ scale: contentScale }] }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <GradientBackground id="introBg" stops={[[0, colors.brandBlue], [1, colors.brandTeal]]} />

        {/* Chuva de moedas (ao fundo, discreta) */}
        {COINS.map((spec, i) => {
          const { fall, spin } = v.coins[i];
          return (
            <Animated.View
              key={`coin-${i}`}
              style={[
                styles.coin,
                {
                  width: spec.size,
                  height: spec.size,
                  borderRadius: spec.size / 2,
                  borderColor: spec.tint,
                  left: offsetX + spec.x * layoutWidth - spec.size / 2,
                  transform: [
                    { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-80, height + 80] }) },
                    { scaleX: spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.15, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={[styles.coinText, { color: spec.tint, fontSize: spec.size * 0.55 }]}>$</Text>
            </Animated.View>
          );
        })}

        {/* Ícones de dinheiro ao redor */}
        {ICONS.map((spec, i) => {
          const bubble = spec.size * 1.75;
          const { pop, float } = v.icons[i];
          return (
            <Animated.View
              key={`icon-${i}`}
              style={[
                styles.bubble,
                {
                  width: bubble,
                  height: bubble,
                  borderRadius: bubble / 2,
                  left: offsetX + spec.x * layoutWidth - bubble / 2,
                  top: spec.y * height - bubble / 2,
                  opacity: pop,
                  transform: [
                    { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
                    { scale: pop },
                    { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', `${spec.rotate}deg`] }) },
                  ],
                },
              ]}
            >
              <spec.Icon size={spec.size} color={spec.tint} strokeWidth={2} />
            </Animated.View>
          );
        })}

        {/* Logo com brilho e ondas */}
        <View style={[styles.logoArea, { top: logoCenterY - 130 }]} pointerEvents="none">
          {v.ripples.map((r, i) => (
            <Animated.View
              key={`ripple-${i}`}
              style={[
                styles.ripple,
                {
                  opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                  transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.1] }) }],
                },
              ]}
            />
          ))}
          <Animated.View style={[styles.glow, { transform: [{ scale: glowScale }] }]} />
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 48 48">
              <Path d={LOGO_PATH} stroke={WHITE} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>

        {/* Nome letra por letra + lema */}
        <View style={[styles.nameArea, { top: height * 0.44 }]} pointerEvents="none">
          <View style={styles.wordRow}>
            {WORD.split('').map((char, i) => (
              <Animated.Text
                key={`char-${i}`}
                style={[
                  styles.char,
                  i < BOLD_CHARS ? styles.charBold : styles.charLight,
                  {
                    opacity: v.chars[i].interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                    transform: [
                      { translateY: v.chars[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                      { scale: v.chars[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                    ],
                  },
                ]}
              >
                {char}
              </Animated.Text>
            ))}
          </View>
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: v.tagline.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ translateY: v.tagline.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              },
            ]}
          >
            CONTROLE  •  PLANEJE  •  CRESÇA
          </Animated.Text>
        </View>

        {/* Gráfico de crescimento */}
        <View style={[styles.chartArea, { top: height * 0.69 }]} pointerEvents="none">
          <View style={styles.chartBox}>
          <View style={styles.bars}>
            {BAR_HEIGHTS.map((h, i) => (
              <Animated.View
                key={`bar-${i}`}
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: i === BAR_HEIGHTS.length - 1 ? MINT : WHITE,
                    opacity: i === BAR_HEIGHTS.length - 1 ? 1 : 0.85,
                    transform: [
                      { translateY: v.bars[i].interpolate({ inputRange: [0, 1], outputRange: [h / 2, 0] }) },
                      { scaleY: v.bars[i] },
                    ],
                  },
                ]}
              />
            ))}
          </View>
          <Animated.View style={[styles.trendSvg, { opacity: v.trend }]}>
            <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
              <Path d={TREND_PATH} stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M127 10 h0.01" stroke={WHITE} strokeWidth={11} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
          </View>
        </View>

        {/* Progresso de carregamento */}
        <View style={[styles.progressTrack, { top: height * 0.92, left: (width - PROGRESS_W) / 2 }]}>
          <Animated.View style={[styles.progressFill, { width: PROGRESS_W, transform: [{ translateX: progressShift }, { scaleX: progressScale }] }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_MID,
    zIndex: 1000,
    elevation: 1000,
    overflow: 'hidden',
  },
  coin: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    opacity: 0.6,
  },
  coinText: { fontWeight: '800' },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  logoArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: WHITE,
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nameArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wordRow: { flexDirection: 'row', alignItems: 'baseline' },
  char: { fontSize: 44, color: WHITE, letterSpacing: -1 },
  charBold: { fontWeight: '800' },
  charLight: { fontWeight: '400' },
  tagline: {
    marginTop: 14,
    fontSize: 12,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.85)',
  },
  chartArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    height: CHART_H,
  },
  chartBox: { width: CHART_W, height: CHART_H },
  trendSvg: { position: 'absolute', left: 0, top: 0 },
  bars: {
    width: CHART_W,
    height: CHART_H,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
  },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  progressTrack: {
    position: 'absolute',
    width: PROGRESS_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: WHITE },
});