import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Moon, Sun, TrendingUp } from 'lucide-react-native';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthFooterLink } from '../../components/auth/AuthFooterLink';
import { Logo } from '../../components/common/Logo';
import { AuthPalette, neoShadow, useAuthTheme } from '../../theme/authTheme';
import { storage } from '../../services/storage';

// Boas-vindas da primeira abertura: 3 telas deslizantes com gráficos de exemplo.
// Todos os valores são fictícios, nada vem do backend.

// Progresso 0→1 que reinicia toda vez que a página fica ativa (anima os gráficos).
function useReveal(active: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) {
      setT(0);
      return;
    }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setT(value));
    Animated.timing(v, { toValue: 1, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      v.removeListener(id);
      v.stopAnimation();
    };
  }, [active]);
  return t;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function VisualCard({ p, title, width, children }: { p: AuthPalette; title: string; width: number; children: ReactNode }) {
  return (
    <View style={[styles.card, { width, backgroundColor: p.surface, borderColor: p.surfaceBorder }, neoShadow(p, 1.3)]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { color: p.text }]}>{title}</Text>
        <Text style={[styles.chip, { color: p.link, borderColor: p.surfaceBorder }]}>Exemplo ilustrativo</Text>
      </View>
      {children}
    </View>
  );
}

// 1) Gastos por categoria: rosca que se desenha aos poucos
const CATEGORIES = [
  { pct: 0.35, color: '#2563EB', label: 'Alimentação', value: 'R$ 580' },
  { pct: 0.3, color: '#14B8A6', label: 'Moradia', value: 'R$ 495' },
  { pct: 0.2, color: '#F59E0B', label: 'Transporte', value: 'R$ 330' },
  { pct: 0.15, color: '#EC4899', label: 'Lazer', value: 'R$ 245' },
];

function Donut({ p, t }: { p: AuthPalette; t: number }) {
  const size = 160;
  const r = 58;
  const C = 2 * Math.PI * r;
  let start = 0;
  return (
    <View style={styles.donutRow}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.divider} strokeWidth={22} fill="none" />
            {CATEGORIES.map((c) => {
              const len = clamp(t - start) > 0 ? Math.min(c.pct, t - start) * C : 0;
              const seg = (
                <Circle
                  key={c.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={c.color}
                  strokeWidth={22}
                  fill="none"
                  strokeDasharray={`${len} ${C}`}
                  strokeDashoffset={-start * C}
                />
              );
              start += c.pct;
              return seg;
            })}
          </G>
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={[styles.donutValue, { color: p.text }]}>R$ {Math.round(1650 * clamp(t)).toLocaleString('pt-BR')}</Text>
          <Text style={[styles.tiny, { color: p.textMuted }]}>gastos no mês</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {CATEGORIES.map((c) => (
          <View key={c.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={[styles.legendLabel, { color: p.textMuted }]}>{c.label}</Text>
            <Text style={[styles.legendValue, { color: p.text }]}>{c.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 2) Receitas x despesas mês a mês: barras que crescem
const MONTHS = [
  { m: 'Jun', inc: 3.2, exp: 2.1 },
  { m: 'Jul', inc: 3.8, exp: 2.4 },
  { m: 'Ago', inc: 4.0, exp: 1.9 },
  { m: 'Set', inc: 3.6, exp: 2.6 },
  { m: 'Out', inc: 4.2, exp: 1.8 },
  { m: 'Nov', inc: 4.0, exp: 1.65 },
];

function Bars({ p, t }: { p: AuthPalette; t: number }) {
  const H = 120;
  return (
    <View>
      <View style={styles.balanceRow}>
        <TrendingUp size={18} color={p.success} />
        <Text style={[styles.balanceText, { color: p.success }]}>+ R$ 2.350,00 acumulados</Text>
      </View>
      <View style={[styles.bars, { height: H + 22 }]}>
        {MONTHS.map((x, i) => {
          const k = clamp(t * 1.4 - i * 0.08);
          return (
            <View key={x.m} style={styles.barCol}>
              <View style={[styles.barPair, { height: H }]}>
                <View style={[styles.bar, { height: (x.inc / 5) * H * k, backgroundColor: p.success }]} />
                <View style={[styles.bar, { height: (x.exp / 5) * H * k, backgroundColor: p.error }]} />
              </View>
              <Text style={[styles.tiny, { color: p.textMuted }]}>{x.m}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.barLegend}>
        <View style={[styles.dot, { backgroundColor: p.success }]} />
        <Text style={[styles.tiny, { color: p.textMuted }]}>Receitas</Text>
        <View style={[styles.dot, { backgroundColor: p.error, marginLeft: 14 }]} />
        <Text style={[styles.tiny, { color: p.textMuted }]}>Despesas</Text>
      </View>
    </View>
  );
}

// 3) Metas: anel de progresso + barras
function Goals({ p, t }: { p: AuthPalette; t: number }) {
  const size = 104;
  const r = 40;
  const C = 2 * Math.PI * r;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const others = [
    { label: 'Reserva de emergência', pct: 0.45 },
    { label: 'Notebook novo', pct: 0.82 },
  ];
  return (
    <View>
      <View style={styles.donutRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={p.gradientStart} />
                <Stop offset="1" stopColor={p.gradientEnd} />
              </LinearGradient>
            </Defs>
            <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.divider} strokeWidth={12} fill="none" />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={`url(#g${id})`}
                strokeWidth={12}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${0.68 * clamp(t) * C} ${C}`}
              />
            </G>
          </Svg>
          <View style={styles.donutCenter} pointerEvents="none">
            <Text style={[styles.donutValue, { color: p.text }]}>{Math.round(68 * clamp(t))}%</Text>
          </View>
        </View>
        <View style={styles.legend}>
          <Text style={[styles.goalTitle, { color: p.text }]}>Viagem para a praia</Text>
          <Text style={[styles.tiny, { color: p.textMuted }]}>R$ 3.400 de R$ 5.000</Text>
        </View>
      </View>
      {others.map((g) => (
        <View key={g.label} style={styles.goalRow}>
          <View style={styles.goalHead}>
            <Text style={[styles.tiny, { color: p.textMuted }]}>{g.label}</Text>
            <Text style={[styles.tiny, { color: p.text }]}>{Math.round(g.pct * 100 * clamp(t))}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: p.divider }]}>
            <View style={[styles.fill, { width: `${g.pct * 100 * clamp(t)}%`, backgroundColor: p.gradientStart }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function WelcomeScreen({ navigation }: { navigation: any }) {
  const { palette: p, toggleTheme } = useAuthTheme();
  const insets = useSafeAreaInsets();
  const { width: W} = useWindowDimensions();
  const cardWidth = Math.min(W - 32, 400);
  const [page, setPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const t = [useReveal(page === 0), useReveal(page === 1), useReveal(page === 2)];
  const isLight = p.name === 'light';
  const ToggleIcon = isLight ? Moon : Sun;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [pagerH, setPagerH] = useState(0);

    // Web: html/body/#root sem altura/cor deixam faixa branca
    useEffect(() => {
    if (Platform.OS !== 'web') return;
    const els = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean) as HTMLElement[];
    const prev = els.map((el) => [el.style.height, el.style.backgroundColor]);
    els.forEach((el) => {
        el.style.height = '100%';
        el.style.backgroundColor = p.bgBottom;
    });
    return () => els.forEach((el, i) => { el.style.height = prev[i][0]; el.style.backgroundColor = prev[i][1]; });
    }, [p.bgBottom]);

  const slides = [
    { title: 'Veja para onde vai seu dinheiro', desc: 'Seus gastos organizados por categoria, em um gráfico fácil de entender.', card: 'Gastos de novembro', body: <Donut p={p} t={t[0]} /> },
    { title: 'Receitas e despesas lado a lado', desc: 'Acompanhe mês a mês se está sobrando ou faltando.', card: 'Últimos 6 meses', body: <Bars p={p} t={t[1]} /> },
    { title: 'Transforme planos em metas', desc: 'Defina quanto quer juntar e acompanhe o progresso até chegar lá.', card: 'Minhas metas', body: <Goals p={p} t={t[2]} /> },
  ];

  async function go(screen: 'Register' | 'Login') {
    await storage.setOnboarded();
    // replace: voltar do login/cadastro não reabre a boas-vindas
    navigation.replace(screen);
  }

  return (
    <View style={[styles.root, { backgroundColor: p.bgTop}]}>
      <StatusBar style={p.statusBar} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.bgTop} />
            <Stop offset="1" stopColor={p.bgBottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#bg${uid})`} />
      </Svg>

      {/* Esfera de fundo que desliza em câmera lenta junto com as páginas */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            backgroundColor: p.orbA,
            borderColor: p.decoStroke,
            transform: [{ translateX: scrollX.interpolate({ inputRange: [0, W * 2], outputRange: [0, -140], extrapolate: 'clamp' }), }],
          },
        ]}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Logo size={30} textColor={p.text} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
          onPress={toggleTheme}
          activeOpacity={0.85}
          style={[styles.toggle, { backgroundColor: p.surface, borderColor: p.surfaceBorder }, neoShadow(p, 0.8)]}
        >
          <ToggleIcon size={22} color={p.text} />
        </TouchableOpacity>
      </View>

        <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={styles.pager}
        >
        {slides.map((s, i) => {
          const range = [(i - 1) * W, i * W, (i + 1) * W];
          return (
            <View key={s.title} style={{ width: W, height: pagerH }} accessible={false}>
              <Animated.View
                style={[
                  styles.slide,
                  {
                    opacity: scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                    transform: [
                    { scale: scrollX.interpolate({ inputRange: range, outputRange: [0.88, 1, 0.88], extrapolate: 'clamp' }) },
                    { translateX: scrollX.interpolate({ inputRange: range, outputRange: [W * 0.2, 0, -W * 0.2], extrapolate: 'clamp' }) },
                    ],
                  },
                ]}
              >
                <VisualCard p={p} title={s.card} width={cardWidth}>
                  {s.body}
                </VisualCard>
                <Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>
                  {s.title}
                </Text>
                <Text style={[styles.desc, { color: p.textMuted }]}>{s.desc}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => {
            const range = [(i - 1) * W, i * W, (i + 1) * W];
            return (
              <Animated.View
                key={s.title}
                style={[
                  styles.pip,
                  {
                    backgroundColor: p.gradientStart,
                    width: scrollX.interpolate({ inputRange: range, outputRange: [8, 26, 8], extrapolate: 'clamp' }),
                    opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.actions}>
          <AuthButton title="Criar conta gratuita" onPress={() => go('Register')} />
          <AuthFooterLink prompt="Já tem conta?" linkLabel="Entrar" onPress={() => go('Login')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },

  orb: {
    position: 'absolute',
    top: -60,
    right: -150,
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 3,
    opacity: 0.55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  toggle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pager: {
    flex: 1,
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  // Card principal
  card: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 21,
    minHeight: 290,
    justifyContent: 'space-between',
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
  },

  chip: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Título e descrição
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginTop: 30,
    maxWidth: 340,
    lineHeight: 34,
  },

  desc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 330,
  },

  // Gráfico de gastos
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
  },

  donutCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  tiny: {
    fontSize: 12,
  },

  legend: {
    flex: 1,
    gap: 11,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  legendLabel: {
    flex: 1,
    fontSize: 15,
  },

  legendValue: {
    fontSize: 13,
    fontWeight: '800',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  // Gráfico de receitas e despesas
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  balanceText: {
    fontSize: 16,
    fontWeight: '800',
  },

  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  barCol: {
    alignItems: 'center',
    gap: 8,
  },

  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },

  bar: {
    width: 14,
    borderRadius: 7,
  },

  barLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },

  // Gráfico de metas
  goalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  goalRow: {
    marginTop: 15,
  },

  goalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  track: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
  },

  fill: {
    height: 9,
    borderRadius: 5,
  },

  // Rodapé e navegação
  footer: {
    paddingHorizontal: 28,
  },

  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },

  pip: {
    height: 9,
    borderRadius: 5,
  },

  actions: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
});