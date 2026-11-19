import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  Plus,
  Target,
  Eye,
  EyeOff,
  X,
  Trash2,
  PiggyBank,
  ArrowUpRight,
  LayoutGrid,
  List,
  Plane,
  Home,
  Car,
  ShieldCheck,
  GraduationCap,
  Smartphone,
  HeartPulse,
  TrendingUp,
  Gift,
  Minus,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { spacing, radii, useColors, ThemeColors } from '../../theme';
import { Button } from '../../components/common/Button';
import { InlineError } from '../../components/common/InlineError';
import { formatDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { usePrivacy } from '../../hooks/usePrivacy';
import { FinancialGoal } from '../../types';

interface GoalsScreenProps {
  route?: any;
  navigation?: any;
}

type Filter = 'todas' | 'em_andamento' | 'concluida';
type ViewMode = 'cartoes' | 'lista';
type AmountMode = 'guardar' | 'retirar';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

// Ícone da meta inferido do título (o backend não guarda ícone)
const ICON_RULES: { test: RegExp; Icon: IconComponent }[] = [
  { test: /viag|f[eé]rias|passagem|intercâmbio|intercambio/i, Icon: Plane },
  { test: /casa|apart|im[oó]vel|moradia|reforma/i, Icon: Home },
  { test: /carro|moto|ve[ií]culo|bike/i, Icon: Car },
  { test: /reserva|emerg[eê]ncia|seguran/i, Icon: ShieldCheck },
  { test: /estud|curso|faculdade|educa|escola/i, Icon: GraduationCap },
  { test: /celular|notebook|computador|eletr[oô]n|\bpc\b|iphone/i, Icon: Smartphone },
  { test: /sa[uú]de|cirurgia|plano de sa/i, Icon: HeartPulse },
  { test: /invest|aposent|futuro/i, Icon: TrendingUp },
  { test: /presente|casamento|festa|anivers/i, Icon: Gift },
];
const goalIcon = (titulo: string): IconComponent => ICON_RULES.find((r) => r.test.test(titulo))?.Icon ?? Target;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluídas' },
];

const IDEAS: { titulo: string; Icon: IconComponent }[] = [
  { titulo: 'Viagem', Icon: Plane },
  { titulo: 'Reserva de emergência', Icon: ShieldCheck },
  { titulo: 'Carro', Icon: Car },
  { titulo: 'Casa própria', Icon: Home },
  { titulo: 'Educação', Icon: GraduationCap },
  { titulo: 'Eletrônicos', Icon: Smartphone },
];

const DEADLINES = [
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 ano', months: 12 },
  { label: '2 anos', months: 24 },
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addMonthsISO = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return iso(d);
};

const percentOf = (g: FinancialGoal) =>
  Number(g.valor_objetivo) > 0 ? Math.min(100, Math.round((Number(g.valor_atual) / Number(g.valor_objetivo)) * 100)) : 0;

// Dias até a data_fim (negativo = vencida)
function daysLeft(g: FinancialGoal): number | null {
  if (!g.data_fim) return null;
  const [y, m, d] = g.data_fim.split('T')[0].split('-').map(Number);
  const end = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 86400000);
}

export function GoalsScreen({ route, navigation }: GoalsScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hidden, toggleHidden, money } = usePrivacy();
  const { width } = useWindowDimensions();

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('todas');
  const [viewMode, setViewMode] = useState<ViewMode>('cartoes');
  const [activeDot, setActiveDot] = useState(0);

  // Nova meta
  const [newVisible, setNewVisible] = useState(!!route?.params?.openModal);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [dataLimite, setDataLimite] = useState(addMonthsISO(12));
  const [descricao, setDescricao] = useState('');

  // Detalhes e aporte/retirada
  const [detailId, setDetailId] = useState<number | null>(null);
  const [amountGoalId, setAmountGoalId] = useState<number | null>(null);
  const [amountMode, setAmountMode] = useState<AmountMode>('guardar');
  const [amount, setAmount] = useState('');
  const [amountSaving, setAmountSaving] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const detail = goals.find((g) => g.id_meta === detailId) ?? null;
  const amountGoal = goals.find((g) => g.id_meta === amountGoalId) ?? null;

  const loadGoals = useCallback(async () => {
    try {
      setGoals(await api.listGoals());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar as metas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Atalho vindo de outras telas (ex.: "Criar meta" no Dashboard), mesmo com a tela já montada
  const paramOpen = route?.params?.openModal;
  useEffect(() => {
    if (paramOpen) {
      openNew();
      navigation?.setParams?.({ openModal: undefined });
    }
  }, [paramOpen, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const active = goals.filter((g) => g.status !== 'cancelada');
  const stats = useMemo(() => {
    const saved = active.reduce((s, g) => s + Number(g.valor_atual), 0);
    const target = active.reduce((s, g) => s + Number(g.valor_objetivo), 0);
    return {
      running: goals.filter((g) => g.status === 'em_andamento').length,
      saved,
      target,
      pct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    };
  }, [goals]);

  const visible = useMemo(
    () => goals.filter((g) => filter === 'todas' || g.status === filter),
    [goals, filter]
  );

  const cardWidth = Math.min(width * 0.78, 340);
  const cardGap = spacing.md;

  function onCarouselScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + cardGap));
    if (idx !== activeDot) setActiveDot(Math.max(0, Math.min(idx, visible.length - 1)));
  }

  function openNew(presetTitle?: string) {
    setNewError(null);
    setTitulo(presetTitle ?? '');
    setValorAlvo('');
    setDescricao('');
    setDataLimite(addMonthsISO(12));
    setNewVisible(true);
  }

  async function handleCreateGoal() {
    const alvo = parseFloat(valorAlvo.replace(',', '.'));
    if (!titulo.trim()) {
      setNewError('Informe o título da meta.');
      return;
    }
    if (isNaN(alvo) || alvo <= 0) {
      setNewError('Informe um valor alvo válido.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimite.trim())) {
      setNewError('Informe a data limite no formato AAAA-MM-DD.');
      return;
    }
    try {
      setNewSaving(true);
      setNewError(null);
      await api.createGoal({
        titulo: titulo.trim(),
        valor_objetivo: alvo,
        data_inicio: iso(new Date()),
        data_fim: dataLimite.trim(),
        descricao: descricao.trim() || undefined,
      });
      setNewVisible(false);
      loadGoals();
    } catch (err) {
      setNewError(err instanceof ApiError ? err.message : 'Falha ao criar meta.');
    } finally {
      setNewSaving(false);
    }
  }

  function openAmount(goal: FinancialGoal, mode: AmountMode) {
    setAmountError(null);
    setAmount('');
    setAmountMode(mode);
    setAmountGoalId(goal.id_meta);
  }

  async function handleAmount() {
    if (!amountGoal) return;
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setAmountError('Informe um valor válido.');
      return;
    }
    if (amountMode === 'retirar' && value > Number(amountGoal.valor_atual)) {
      setAmountError('O valor é maior do que o guardado nesta meta.');
      return;
    }
    try {
      setAmountSaving(true);
      setAmountError(null);
      const updated =
        amountMode === 'guardar'
          ? await api.contributeGoal(amountGoal.id_meta, value)
          : await api.withdrawGoal(amountGoal.id_meta, value);
      const title = amountGoal.titulo;
      setAmountGoalId(null);
      await loadGoals();
      if (amountMode === 'guardar' && updated?.status === 'concluida') {
        Alert.alert('Meta concluída!', `Você alcançou o objetivo "${title}". Parabéns!`);
      }
    } catch (err) {
      setAmountError(err instanceof ApiError ? err.message : 'Não foi possível registrar o valor.');
    } finally {
      setAmountSaving(false);
    }
  }

  function handleDelete(goal: FinancialGoal) {
    Alert.alert('Excluir meta', `Tem certeza que deseja excluir "${goal.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGoal(goal.id_meta);
            setGoals((prev) => prev.filter((g) => g.id_meta !== goal.id_meta));
            setDetailId(null);
          } catch (err) {
            Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível excluir a meta.');
          }
        },
      },
    ]);
  }

  const toneOf = (g: FinancialGoal) =>
    g.status === 'concluida' ? colors.positive : g.status === 'cancelada' ? colors.textSubtle : colors.primary;
  const statusLabel = (g: FinancialGoal) =>
    g.status === 'concluida' ? 'Concluída' : g.status === 'cancelada' ? 'Cancelada' : 'Em andamento';

  const deadlineText = (g: FinancialGoal) => {
    if (g.status === 'concluida') return 'Meta alcançada';
    const d = daysLeft(g);
    if (d === null) return 'Sem prazo';
    if (d < 0) return `Prazo vencido há ${-d} ${-d === 1 ? 'dia' : 'dias'}`;
    if (d === 0) return 'Vence hoje';
    return `Faltam ${d} ${d === 1 ? 'dia' : 'dias'}`;
  };

  // Plano: quanto guardar por mês/semana para chegar ao objetivo no prazo
  const plan = (g: FinancialGoal) => {
    const remaining = Number(g.valor_objetivo) - Number(g.valor_atual);
    const d = daysLeft(g);
    if (remaining <= 0 || d === null || d <= 0 || g.status !== 'em_andamento') return null;
    return {
      remaining,
      perMonth: remaining / Math.max(1, Math.ceil(d / 30)),
      perWeek: remaining / Math.max(1, Math.ceil(d / 7)),
    };
  };

  // Anel de progresso
  const ring = (pct: number, size: number, stroke: number, tone: string, children?: React.ReactNode) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceElevated} strokeWidth={stroke} fill="none" />
          {pct > 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={tone}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(c * pct) / 100} ${c}`}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          ) : null}
        </Svg>
        {children}
      </View>
    );
  };

  // ---------- Cartão da meta ----------
  const goalCard = (g: FinancialGoal) => {
    const tone = toneOf(g);
    const pct = percentOf(g);
    const Icon = goalIcon(g.titulo);
    return (
      <View key={g.id_meta} style={[styles.goalCard, { width: cardWidth }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setDetailId(g.id_meta)} accessibilityRole="button" accessibilityLabel={`Abrir meta ${g.titulo}`}>
          <View style={[styles.banner, { backgroundColor: tone + '1F' }]}>
            <View style={[styles.bannerRing, { borderColor: tone + '33' }]} />
            <View style={styles.bannerIcon}>
              <Icon size={26} color={tone} />
            </View>
            <ArrowUpRight size={16} color={colors.textMuted} style={styles.bannerArrow} />
          </View>
          <View style={styles.goalBody}>
            <View style={[styles.statusPill, { backgroundColor: tone + '26' }]}>
              <Text style={[styles.statusPillText, { color: tone }]}>{statusLabel(g)}</Text>
            </View>
            <Text style={styles.goalTitle} numberOfLines={1}>
              {g.titulo.toUpperCase()}
            </Text>
            <Text style={styles.goalLabel}>Valor guardado</Text>
            <Text style={styles.goalValue} numberOfLines={1} adjustsFontSizeToFit>
              {money(Number(g.valor_atual))}
            </Text>
            <Text style={styles.goalOf}>de {money(Number(g.valor_objetivo))}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{pct}% do objetivo</Text>
              <Text style={styles.progressText}>{deadlineText(g)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.goalActions}>
          <Button title="Ver meta" variant="secondary" onPress={() => setDetailId(g.id_meta)} style={styles.actionButton} />
          {g.status === 'em_andamento' ? (
            <Button
              title="Guardar"
              icon={<PiggyBank size={16} color={colors.textInverse} />}
              onPress={() => openAmount(g, 'guardar')}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      </View>
    );
  };

  // ---------- Linha (visualização em lista) ----------
  const goalRow = (g: FinancialGoal) => {
    const tone = toneOf(g);
    const pct = percentOf(g);
    const Icon = goalIcon(g.titulo);
    return (
      <TouchableOpacity key={g.id_meta} style={styles.row} activeOpacity={0.85} onPress={() => setDetailId(g.id_meta)} accessibilityRole="button">
        <View style={[styles.rowIcon, { backgroundColor: tone + '26' }]}>
          <Icon size={20} color={tone} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {g.titulo}
            </Text>
            <Text style={[styles.rowPct, { color: tone }]}>{pct}%</Text>
          </View>
          <View style={styles.trackThin}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
          </View>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {money(Number(g.valor_atual))} de {money(Number(g.valor_objetivo))} · {statusLabel(g)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- Estado vazio ----------
  const emptyState = (
    <View>
      <View style={styles.emptyHero}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="cwGoalHero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1E40AF" />
              <Stop offset="0.6" stopColor="#2563EB" />
              <Stop offset="1" stopColor="#0F9E8E" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cwGoalHero)" />
          <Circle cx="82%" cy="22%" r="60%" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" />
          <Circle cx="82%" cy="22%" r="38%" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
          <Circle cx="82%" cy="22%" r="16%" fill="rgba(255,255,255,0.14)" />
        </Svg>
        <View style={styles.emptyHeroIcon}>
          <Target size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.emptyHeroTitle}>Seu primeiro objetivo começa aqui</Text>
        <Text style={styles.emptyHeroText}>
          Defina quanto quer juntar e até quando. Calculamos quanto guardar por mês para você chegar lá.
        </Text>
        <TouchableOpacity accessibilityRole="button" style={styles.emptyCta} onPress={() => openNew()}>
          <Plus size={18} color="#1E40AF" />
          <Text style={styles.emptyCtaText}>Criar minha primeira meta</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Comece por uma ideia</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.ideasRow}>
        {IDEAS.map(({ titulo: t, Icon }) => (
          <TouchableOpacity key={t} accessibilityRole="button" style={styles.ideaCard} onPress={() => openNew(t)}>
            <View style={styles.ideaIcon}>
              <Icon size={20} color={colors.primary} />
            </View>
            <Text style={styles.ideaText} numberOfLines={2}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Como funciona</Text>
      <View style={styles.stepsCard}>
        {[
          ['Defina o objetivo', 'Escolha um nome, o valor e o prazo.'],
          ['Guarde valores', 'Registre quanto já reservou, quando quiser.'],
          ['Acompanhe a evolução', 'Veja o progresso e o plano mensal sugerido.'],
        ].map(([title, text], i, arr) => (
          <View key={title} style={[styles.step, i < arr.length - 1 && styles.stepBorder]}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepDesc}>{text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const PreviewIcon = goalIcon(titulo);
  const planInfo = detail ? plan(detail) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Metas financeiras
          </Text>
          <Text style={styles.headerSubtitle}>Defina objetivos e acompanhe sua evolução.</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          style={styles.iconButton}
          onPress={toggleHidden}
        >
          {hidden ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Nova meta" style={styles.addButton} onPress={() => openNew()}>
          <Plus size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loadError && goals.length === 0 ? (
            <InlineError message={loadError} onRetry={loadGoals} />
          ) : goals.length === 0 ? (
            emptyState
          ) : (
            <>
              {/* Resumo */}
              <View style={styles.summary}>
                {ring(
                  stats.pct,
                  88,
                  9,
                  colors.primary,
                  <Text style={styles.ringText}>{stats.pct}%</Text>
                )}
                <View style={styles.summaryStats}>
                  <Text style={styles.statLabel}>Total guardado</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                    {money(stats.saved)}
                  </Text>
                  <Text style={styles.statHint} numberOfLines={1}>
                    de {money(stats.target)} em objetivos
                  </Text>
                  <View style={styles.statChip}>
                    <Sparkles size={12} color={colors.primary} />
                    <Text style={styles.statChipText}>
                      {stats.running} {stats.running === 1 ? 'meta em andamento' : 'metas em andamento'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Filtros */}
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === f.value }}
                    style={[styles.filterOption, filter === f.value && styles.filterOptionActive]}
                    onPress={() => {
                      setFilter(f.value);
                      setActiveDot(0);
                    }}
                  >
                    <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Minhas metas */}
              <View style={styles.listHeader}>
                <View style={styles.listHeaderText}>
                  <Text style={styles.sectionTitleInline}>Minhas metas</Text>
                  <Text style={styles.listSubtitle}>
                    {visible.length} {visible.length === 1 ? 'meta encontrada' : 'metas encontradas'}
                  </Text>
                </View>
                <View style={styles.viewToggle}>
                  {([
                    ['cartoes', LayoutGrid, 'Cartões'],
                    ['lista', List, 'Lista'],
                  ] as const).map(([mode, Icon, label]) => (
                    <TouchableOpacity
                      key={mode}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: viewMode === mode }}
                      style={[styles.viewOption, viewMode === mode && styles.viewOptionActive]}
                      onPress={() => setViewMode(mode)}
                    >
                      <Icon size={16} color={viewMode === mode ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {visible.length === 0 ? (
                <View style={styles.filterEmpty}>
                  <Target size={28} color={colors.textSubtle} />
                  <Text style={styles.filterEmptyTitle}>
                    {filter === 'concluida' ? 'Nenhuma meta concluída ainda' : 'Nenhuma meta em andamento'}
                  </Text>
                  <Text style={styles.filterEmptyText}>
                    {filter === 'concluida'
                      ? 'Quando você atingir um objetivo, ele aparece aqui.'
                      : 'Crie uma nova meta para voltar a acompanhar seu progresso.'}
                  </Text>
                </View>
              ) : viewMode === 'cartoes' ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={cardWidth + cardGap}
                    decelerationRate="fast"
                    onScroll={onCarouselScroll}
                    scrollEventThrottle={16}
                    style={styles.bleed}
                    contentContainerStyle={[styles.carousel, { gap: cardGap }]}
                  >
                    {visible.map(goalCard)}
                  </ScrollView>
                  {visible.length > 1 ? (
                    <View style={styles.dots}>
                      {visible.map((g, i) => (
                        <View key={g.id_meta} style={[styles.dot, i === activeDot && styles.dotActive]} />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.listCard}>{visible.map(goalRow)}</View>
              )}
            </>
          )}

          <Text style={styles.footerNote}>
            As metas acompanham suas reservas manuais. Elas não movimentam dinheiro nem descontam valores do saldo
            automaticamente.
          </Text>
        </ScrollView>
      )}

      {/* Detalhes da meta */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetailId(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailId(null)} />
          {detail ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {detail.titulo}
                </Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setDetailId(null)}>
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailTop}>
                  {ring(
                    percentOf(detail),
                    104,
                    10,
                    toneOf(detail),
                    <View style={styles.ringCenter}>
                      {React.createElement(goalIcon(detail.titulo), { size: 22, color: toneOf(detail) })}
                      <Text style={styles.ringText}>{percentOf(detail)}%</Text>
                    </View>
                  )}
                  <View style={styles.detailTopText}>
                    <Text style={styles.goalLabel}>Valor guardado</Text>
                    <Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit>
                      {money(Number(detail.valor_atual))}
                    </Text>
                    <Text style={styles.goalOf}>de {money(Number(detail.valor_objetivo))}</Text>
                    <View style={[styles.statusPill, { backgroundColor: toneOf(detail) + '26', marginTop: spacing.sm }]}>
                      <Text style={[styles.statusPillText, { color: toneOf(detail) }]}>{statusLabel(detail)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoList}>
                  <View style={[styles.infoRow, styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>Prazo</Text>
                    <Text style={styles.infoValue}>{detail.data_fim ? formatDate(detail.data_fim) : 'Sem prazo'}</Text>
                  </View>
                  <View style={[styles.infoRow, detail.descricao ? styles.infoRowBorder : null]}>
                    <Text style={styles.infoLabel}>Situação do prazo</Text>
                    <Text style={styles.infoValue}>{deadlineText(detail)}</Text>
                  </View>
                  {detail.descricao ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Descrição</Text>
                      <Text style={[styles.infoValue, styles.infoValueWrap]}>{detail.descricao}</Text>
                    </View>
                  ) : null}
                </View>

                {planInfo ? (
                  <View style={styles.planCard}>
                    <View style={styles.planHeader}>
                      <Clock size={16} color={colors.primary} />
                      <Text style={styles.planTitle}>Plano sugerido</Text>
                    </View>
                    <Text style={styles.planText}>
                      Faltam {money(planInfo.remaining)}. Para chegar no prazo, guarde cerca de:
                    </Text>
                    <View style={styles.planRow}>
                      <View style={styles.planBox}>
                        <Text style={styles.planAmount}>{money(planInfo.perMonth)}</Text>
                        <Text style={styles.planPer}>por mês</Text>
                      </View>
                      <View style={styles.planBox}>
                        <Text style={styles.planAmount}>{money(planInfo.perWeek)}</Text>
                        <Text style={styles.planPer}>por semana</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {detail.status === 'em_andamento' ? (
                  <View style={styles.detailActions}>
                    <Button
                      title="Guardar valor"
                      icon={<PiggyBank size={18} color={colors.textInverse} />}
                      onPress={() => openAmount(detail, 'guardar')}
                      style={styles.sheetButton}
                    />
                    <Button
                      title="Retirar"
                      variant="secondary"
                      icon={<Minus size={18} color={colors.textSecondary} />}
                      disabled={Number(detail.valor_atual) <= 0}
                      onPress={() => openAmount(detail, 'retirar')}
                      style={styles.sheetButton}
                    />
                  </View>
                ) : null}
                <Button
                  title="Excluir meta"
                  variant="danger"
                  icon={<Trash2 size={18} color={colors.negative} />}
                  onPress={() => handleDelete(detail)}
                  style={styles.deleteButton}
                />
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Guardar / retirar valor */}
      <Modal visible={!!amountGoal} transparent animationType="slide" onRequestClose={() => setAmountGoalId(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAmountGoalId(null)} />
          {amountGoal ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{amountMode === 'guardar' ? 'Guardar valor' : 'Retirar valor'}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setAmountGoalId(null)}>
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.amountGoal}>
                {amountGoal.titulo} · guardado {money(Number(amountGoal.valor_atual))}
              </Text>
              {amountError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{amountError}</Text>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Valor (R$)</Text>
              <TextInput
                style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={colors.textSubtle}
                keyboardType="numeric"
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
              <View style={styles.chips}>
                {(amountMode === 'guardar' ? [50, 100, 250, 500] : [Number(amountGoal.valor_atual)]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    accessibilityRole="button"
                    style={styles.chip}
                    onPress={() => setAmount(String(v).replace('.', ','))}
                  >
                    <Text style={styles.chipText}>{amountMode === 'guardar' ? `R$ ${v}` : 'Tudo'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button
                title={amountMode === 'guardar' ? 'Guardar' : 'Retirar'}
                onPress={handleAmount}
                loading={amountSaving}
                style={styles.submit}
              />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Nova meta */}
      <Modal visible={newVisible} transparent animationType="slide" onRequestClose={() => setNewVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNewVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nova meta</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setNewVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {newError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{newError}</Text>
                </View>
              ) : null}

              <View style={styles.preview}>
                <View style={styles.previewIcon}>
                  <PreviewIcon size={22} color={colors.primary} />
                </View>
                <View style={styles.previewText}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {titulo.trim() || 'Sua meta'}
                  </Text>
                  <Text style={styles.previewMeta}>
                    {valorAlvo ? `Objetivo de R$ ${valorAlvo}` : 'Prévia'} · até{' '}
                    {/^\d{4}-\d{2}-\d{2}$/.test(dataLimite) ? formatDate(dataLimite) : '—'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Título</Text>
              <TextInput
                style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ex.: Viagem, Reserva de emergência"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                maxLength={60}
                underlineColorAndroid="transparent"
              />

              <Text style={styles.fieldLabel}>Valor do objetivo (R$)</Text>
              <TextInput
                style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={valorAlvo}
                onChangeText={setValorAlvo}
                placeholder="5000,00"
                placeholderTextColor={colors.textSubtle}
                keyboardType="numeric"
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />

              <Text style={styles.fieldLabel}>Prazo</Text>
              <View style={styles.chips}>
                {DEADLINES.map((d) => {
                  const selected = dataLimite === addMonthsISO(d.months);
                  return (
                    <TouchableOpacity
                      key={d.months}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setDataLimite(addMonthsISO(d.months))}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={dataLimite}
                onChangeText={setDataLimite}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                maxLength={10}
                underlineColorAndroid="transparent"
              />

              <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Por que esse objetivo é importante?"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                multiline
                underlineColorAndroid="transparent"
              />

              <View style={styles.sheetActions}>
                <Button title="Cancelar" variant="secondary" onPress={() => setNewVisible(false)} style={styles.sheetButton} />
                <Button title="Criar meta" onPress={handleCreateGoal} loading={newSaving} style={styles.sheetButton} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    bleed: { marginHorizontal: -spacing.screenPadding },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.base,
      paddingBottom: spacing.md,
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: radii.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.base,
      borderRadius: radii.full,
    },
    addButtonText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },

    // Resumo
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.xl,
      padding: spacing.lg,
    },
    ringText: { fontSize: 16, fontWeight: '800', color: colors.text },
    ringCenter: { alignItems: 'center', gap: 2 },
    summaryStats: { flex: 1 },
    statLabel: { fontSize: 12, color: colors.textMuted },
    statValue: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
    statHint: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      marginTop: spacing.md,
    },
    statChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },

    // Filtros
    filters: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      padding: 3,
      marginTop: spacing.base,
    },
    filterOption: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.sm },
    filterOptionActive: { backgroundColor: colors.primaryLight },
    filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    filterTextActive: { color: colors.primary },

    // Lista
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.md },
    listHeaderText: { flex: 1 },
    sectionTitleInline: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2, marginTop: spacing.xl, marginBottom: spacing.md },
    listSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      padding: 3,
    },
    viewOption: { width: 36, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
    viewOptionActive: { backgroundColor: colors.primaryLight },

    carousel: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.xs },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 18, backgroundColor: colors.primary },

    goalCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    banner: { height: 96, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    bannerRing: {
      position: 'absolute',
      top: -34,
      right: -26,
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 14,
    },
    bannerIcon: {
      width: 56,
      height: 56,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerArrow: { position: 'absolute', top: spacing.md, right: spacing.md },
    goalBody: { padding: spacing.base, paddingBottom: spacing.sm },
    statusPill: { alignSelf: 'flex-start', borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    goalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: 0.2 },
    goalLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md },
    goalValue: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
    goalOf: { fontSize: 12, color: colors.textMuted },
    track: { height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radii.full, overflow: 'hidden', marginTop: spacing.base },
    trackThin: { height: 6, backgroundColor: colors.surfaceElevated, borderRadius: radii.full, overflow: 'hidden', marginTop: 6 },
    fill: { height: '100%', borderRadius: radii.full },
    progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.sm },
    progressText: { fontSize: 11, color: colors.textMuted },
    goalActions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.base, paddingTop: spacing.sm },
    actionButton: { flex: 1, height: 44 },

    listCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.base,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    rowIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    rowPct: { fontSize: 13, fontWeight: '800' },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

    filterEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    filterEmptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    filterEmptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    footerNote: { fontSize: 11, lineHeight: 16, color: colors.textSubtle, marginTop: spacing.xl, textAlign: 'center' },

    // Estado vazio
    emptyHero: { borderRadius: radii.xl, overflow: 'hidden', padding: spacing.xl },
    emptyHeroIcon: {
      width: 56,
      height: 56,
      borderRadius: radii.lg,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.26)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyHeroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: spacing.lg, letterSpacing: -0.4 },
    emptyHeroText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.88)', marginTop: spacing.sm },
    emptyCta: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: radii.full,
      marginTop: spacing.lg,
    },
    emptyCtaText: { fontSize: 15, fontWeight: '800', color: '#1E40AF' },
    ideasRow: { paddingHorizontal: spacing.screenPadding, gap: spacing.sm },
    ideaCard: {
      width: 116,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    ideaIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ideaText: { fontSize: 13, fontWeight: '700', color: colors.text, minHeight: 34 },
    stepsCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.base,
    },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    stepNumber: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: { fontSize: 13, fontWeight: '800', color: colors.primary },
    stepText: { flex: 1 },
    stepTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    stepDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

    // Modais
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '92%',
    },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginBottom: spacing.base },
    sheetTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
    errorBox: {
      backgroundColor: colors.negativeBg,
      borderColor: colors.negative,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.base,
    },
    errorText: { color: colors.negative, fontSize: 12 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.base, marginBottom: spacing.sm },
    input: {
      height: 50,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.base,
      color: colors.text,
      fontSize: 15,
      marginTop: spacing.xs,
    },
    inputMultiline: { height: 84, paddingTop: spacing.md, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.full,
      paddingHorizontal: spacing.base,
      paddingVertical: 8,
      marginTop: spacing.sm,
    },
    chipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    chipTextSelected: { color: colors.primary, fontWeight: '700' },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    previewIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewText: { flex: 1 },
    previewName: { fontSize: 15, fontWeight: '700', color: colors.text },
    previewMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    sheetButton: { flex: 1 },
    submit: { marginTop: spacing.lg },
    amountGoal: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },

    // Detalhes
    detailTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
    detailTopText: { flex: 1 },
    detailValue: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
    infoList: { backgroundColor: colors.surfaceElevated, borderRadius: radii.md, paddingHorizontal: spacing.base },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    infoLabel: { fontSize: 13, color: colors.textMuted },
    infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    infoValueWrap: { flex: 1, textAlign: 'right' },
    planCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radii.lg,
      padding: spacing.base,
      marginTop: spacing.base,
    },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    planTitle: { fontSize: 14, fontWeight: '800', color: colors.primary },
    planText: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 19 },
    planRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    planBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
    planAmount: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    planPer: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    detailActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    deleteButton: { marginTop: spacing.md },
  });