import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Share,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  Check,
  X,
  Share2,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  BarChart3,
  RefreshCw,
  Plus,
} from 'lucide-react-native';
import { spacing, radii, useColors, ThemeColors } from '../../theme';
import { Button } from '../../components/common/Button';
import { InlineError } from '../../components/common/InlineError';
import { formatDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { usePrivacy } from '../../hooks/usePrivacy';
import { DetailedReportResponse } from '../../types';

interface ReportsScreenProps {
  navigation?: any;
}

type Tab = 'geral' | 'detalhe';
type PeriodKey = 'mes' | 'mes_passado' | '3m' | '6m' | 'ano' | 'ano_passado' | 'custom';
type TypeFilter = 'all' | 'receita' | 'despesa';

const PERIODS: { value: Exclude<PeriodKey, 'custom'>; label: string }[] = [
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'ano', label: 'Este ano' },
  { value: 'ano_passado', label: 'Ano passado' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'receita', label: 'Receitas' },
  { value: 'despesa', label: 'Despesas' },
];

const PAGE_SIZE = 10;
const CHART_HEIGHT = 150;
const FALLBACK_PALETTE = ['#F97316', '#2563EB', '#16A34A', '#9333EA', '#DB2777', '#0D9488', '#EAB308', '#64748B'];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rangeOf(key: Exclude<PeriodKey, 'custom'>): { start: string; end: string } {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth();
  switch (key) {
    case 'mes_passado':
      return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
    case '3m':
      return { start: iso(new Date(y, m - 2, 1)), end: iso(n) };
    case '6m':
      return { start: iso(new Date(y, m - 5, 1)), end: iso(n) };
    case 'ano':
      return { start: iso(new Date(y, 0, 1)), end: iso(n) };
    case 'ano_passado':
      return { start: iso(new Date(y - 1, 0, 1)), end: iso(new Date(y - 1, 11, 31)) };
    default:
      return { start: iso(new Date(y, m, 1)), end: iso(n) };
  }
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// "2026-11" -> "nov/26"; qualquer outro formato volta como veio
const monthLabel = (mes: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(mes ?? '');
  return m ? `${MONTHS_SHORT[Number(m[2]) - 1] ?? m[2]}/${m[1].slice(2)}` : mes;
};

const pct = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}%`;

export function ReportsScreen({ navigation }: ReportsScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hidden, toggleHidden, money } = usePrivacy();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('mes');
  const [custom, setCustom] = useState<{ start: string; end: string; label: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('geral');

  const [report, setReport] = useState<DetailedReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Visão geral
  const [valuesOpen, setValuesOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  // Detalhamento
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(1);

  const range = periodKey === 'custom' && custom ? custom : rangeOf(periodKey === 'custom' ? 'mes' : periodKey);
  const periodLabel =
    periodKey === 'custom' && custom ? custom.label : PERIODS.find((p) => p.value === periodKey)?.label ?? 'Este mês';

  const loadReport = useCallback(async () => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      const data = await api.getDetailedReport(range.start, range.end);
      if (id !== requestId.current) return;
      setReport(data);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o relatório.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [range.start, range.end]);

  useEffect(() => {
    loadReport();
    setPage(1);
  }, [loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const summary = report?.summary;
  const num = (v: unknown) => Number(v ?? 0);

  // ---------- KPIs ----------
  const kpi = (
    label: string,
    value: string,
    tint: string,
    border: string,
    tone: string,
    Icon: typeof TrendingUp,
    variation: number | null | undefined,
    higherIsBetter: boolean
  ) => {
    const v = variation == null ? null : Number(variation);
    const good = v == null || v === 0 ? null : higherIsBetter ? v > 0 : v < 0;
    const vColor = good == null ? colors.textMuted : good ? colors.positive : colors.negative;
    return (
      <View key={label} style={[styles.kpiCard, { backgroundColor: tint, borderColor: border }]}>
        <View style={styles.kpiTop}>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {label}
          </Text>
          <View style={[styles.kpiChip, { backgroundColor: tone + '26' }]}>
            <Icon size={14} color={tone} />
          </View>
        </View>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {v != null ? (
          <View style={styles.kpiVar}>
            {v > 0 ? <ArrowUp size={11} color={vColor} /> : v < 0 ? <ArrowDown size={11} color={vColor} /> : null}
            <Text style={[styles.kpiVarText, { color: vColor }]}>{pct(Math.abs(Math.round(v * 10) / 10))}</Text>
            <Text style={styles.kpiVarHint}>vs. período anterior</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ---------- Gráfico de barras com eixo zero ----------
  const groups = useMemo(() => {
    if (!report) return [];
    const evo = report.evolution ?? [];
    if (evo.length > 1) {
      return evo.map((e) => ({
        label: monthLabel(e.mes),
        bars: [
          { value: num(e.receitas), color: colors.positive },
          { value: num(e.despesas), color: colors.negative },
          { value: num(e.saldo), color: colors.primary },
        ],
      }));
    }
    const s = report.summary;
    return [
      { label: 'Receitas', bars: [{ value: num(s.receitas), color: colors.positive }] },
      { label: 'Despesas', bars: [{ value: num(s.despesas), color: colors.negative }] },
      { label: 'Saldo', bars: [{ value: num(s.saldo), color: colors.primary }] },
    ];
  }, [report, colors]);

  const barChart = () => {
    const all = groups.flatMap((g) => g.bars.map((b) => b.value));
    const maxPos = Math.max(0, ...all);
    const maxNeg = Math.max(0, ...all.map((v) => -v));
    const total = maxPos + maxNeg;
    const scale = total > 0 ? CHART_HEIGHT / total : 0;
    const zeroY = maxPos * scale;
    const groupWidth = Math.max(64, chartWidth > 0 ? chartWidth / groups.length : 64);
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} onLayout={(e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width)}>
        <View>
          <View style={[styles.chartArea, { height: CHART_HEIGHT, width: groupWidth * groups.length }]}>
            <View style={[styles.zeroLine, { top: zeroY }]} />
            {groups.map((g, gi) => (
              <View key={g.label + gi} style={[styles.chartGroup, { left: gi * groupWidth, width: groupWidth }]}>
                {g.bars.map((b, bi) => {
                  const h = Math.max(Math.abs(b.value) * scale, b.value !== 0 ? 3 : 0);
                  const x = (groupWidth - (g.bars.length * 14 + (g.bars.length - 1) * 4)) / 2 + bi * 18;
                  return (
                    <View
                      key={bi}
                      style={{
                        position: 'absolute',
                        left: x,
                        width: 14,
                        height: h,
                        top: b.value >= 0 ? zeroY - h : zeroY,
                        backgroundColor: b.color,
                        borderTopLeftRadius: b.value >= 0 ? 4 : 0,
                        borderTopRightRadius: b.value >= 0 ? 4 : 0,
                        borderBottomLeftRadius: b.value < 0 ? 4 : 0,
                        borderBottomRightRadius: b.value < 0 ? 4 : 0,
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', width: groupWidth * groups.length }}>
            {groups.map((g, gi) => (
              <Text key={g.label + gi} style={[styles.chartLabel, { width: groupWidth }]} numberOfLines={1}>
                {g.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ---------- Rosca por categoria ----------
  const donut = () => {
    const cats = (report?.categoryBreakdown ?? []).filter((c) => num(c.total) > 0);
    const sum = cats.reduce((s, c) => s + num(c.total), 0);
    const size = 168;
    const stroke = 26;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let acc = 0;
    return (
      <View>
        <View style={styles.donutWrap}>
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceElevated} strokeWidth={stroke} fill="none" />
              {cats.map((cat, i) => {
                const frac = sum > 0 ? num(cat.total) / sum : 0;
                const len = c * frac;
                const node = (
                  <Circle
                    key={cat.id ?? i}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={HEX.test(cat.cor ?? '') ? cat.cor : FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${Math.max(len - (cats.length > 1 ? 2 : 0), 0)} ${c}`}
                    strokeDashoffset={-acc}
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                  />
                );
                acc += len;
                return node;
              })}
            </Svg>
            <Text style={styles.donutLabel}>Total</Text>
            <Text style={styles.donutValue} numberOfLines={1} adjustsFontSizeToFit>
              {money(sum)}
            </Text>
          </View>
        </View>
        {cats.map((cat, i) => (
          <View key={cat.id ?? i} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: HEX.test(cat.cor ?? '') ? cat.cor : FALLBACK_PALETTE[i % FALLBACK_PALETTE.length] },
              ]}
            />
            <View style={styles.legendText}>
              <Text style={styles.legendName} numberOfLines={1}>
                {cat.nome}
              </Text>
              <Text style={styles.legendValue}>{money(num(cat.total))}</Text>
            </View>
            <Text style={styles.legendPct}>{Math.round(num(cat.percentual))}%</Text>
          </View>
        ))}
      </View>
    );
  };

  // ---------- Detalhamento ----------
  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (report?.transactions ?? [])
      .filter((t) => (typeFilter === 'all' || t.tipo === typeFilter) && (!q || `${t.descricao} ${t.categoria}`.toLowerCase().includes(q)))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [report, search, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredTx.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTx = filteredTx.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function viewMonth(periodo: string, id: string) {
    const m = id.match(/(\d{4})-(\d{2})/);
    if (!m) return;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    setCustom({ start: `${m[1]}-${m[2]}-01`, end: iso(new Date(y, mo, 0)), label: periodo });
    setPeriodKey('custom');
    setTab('geral');
  }

  async function exportCsv() {
    if (!report) return;
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      `Relatório CifraWealth;${formatDate(range.start)} a ${formatDate(range.end)}`,
      '',
      'Data;Descrição;Categoria;Tipo;Valor',
      ...report.transactions.map(
        (t) =>
          `${formatDate(t.data)};${esc(t.descricao)};${esc(t.categoria)};${t.tipo === 'receita' ? 'Receita' : 'Despesa'};${num(t.valor).toFixed(2).replace('.', ',')}`
      ),
    ];
    try {
      await Share.share({ title: 'Relatório CifraWealth', message: lines.join('\n') });
    } catch {
      // usuário cancelou
    }
  }

  const insightIcon = (tipo: string) =>
    tipo === 'positivo' ? (
      <CheckCircle2 size={18} color={colors.positive} />
    ) : tipo === 'negativo' ? (
      <AlertTriangle size={18} color={colors.negative} />
    ) : (
      <Info size={18} color={colors.info} />
    );

  const hasData =
    !!report && (num(summary?.receitas) > 0 || num(summary?.despesas) > 0 || (report.transactions?.length ?? 0) > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Relatórios
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          style={styles.iconButton}
          onPress={toggleHidden}
        >
          {hidden ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Exportar CSV"
          style={[styles.iconButton, !report && styles.disabled]}
          disabled={!report}
          onPress={exportCsv}
        >
          <Share2 size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Período */}
        <TouchableOpacity accessibilityRole="button" style={styles.periodPill} onPress={() => setPickerOpen(true)}>
          <Calendar size={16} color={colors.textMuted} />
          <Text style={styles.periodText}>{periodLabel}</Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.periodRow}>
          <Text style={styles.periodApplied} numberOfLines={1}>
            Período: {formatDate(range.start)} a {formatDate(range.end)}
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.refreshLink} onPress={loadReport} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={13} color={colors.primary} />}
            <Text style={styles.refreshText}>Atualizar</Text>
          </TouchableOpacity>
        </View>

        {/* Abas */}
        <View style={styles.tabs}>
          {([
            ['geral', 'Visão geral'],
            ['detalhe', 'Detalhamento'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === value }}
              style={[styles.tabOption, tab === value && styles.tabOptionActive]}
              onPress={() => setTab(value)}
            >
              <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && !report ? (
          <InlineError message={error} onRetry={loadReport} />
        ) : !report ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={loading ? styles.dim : undefined}>
            {/* KPIs */}
            <View style={styles.kpiGrid}>
              {kpi('Receitas', money(num(summary?.receitas)), colors.positiveBg, colors.positive + '40', colors.positive, TrendingUp, summary?.variacaoReceitas, true)}
              {kpi('Despesas', money(num(summary?.despesas)), colors.negativeBg, colors.negativeBorder, colors.negative, TrendingDown, summary?.variacaoDespesas, false)}
              {kpi('Saldo do período', money(num(summary?.saldo)), colors.infoBg, colors.info + '40', colors.info, Wallet, summary?.variacaoSaldo, true)}
              {kpi('Taxa de economia', pct(num(summary?.taxaEconomiaPercentual)), colors.primaryLight, colors.primary + '40', colors.purple, PieChart, summary?.variacaoTaxaEconomia, true)}
            </View>

            {!hasData ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <BarChart3 size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Sem movimentações neste período</Text>
                <Text style={styles.emptyText}>
                  Troque o período ou registre uma transação para ver gráficos, insights e comparativos aqui.
                </Text>
                <Button
                  title="Registrar transação"
                  icon={<Plus size={18} color={colors.textInverse} />}
                  onPress={() => navigation?.navigate('Transactions', { openModal: true })}
                  style={styles.emptyButton}
                />
              </View>
            ) : tab === 'geral' ? (
              <>
                {/* Insights */}
                {(report.insights ?? []).length > 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Insights do período</Text>
                    {report.insights.map((ins, i) => (
                      <View key={ins.id ?? i} style={[styles.insightRow, i > 0 && styles.insightBorder]}>
                        {insightIcon(ins.tipo)}
                        <Text style={styles.insightText}>{ins.mensagem}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Receitas, despesas e saldo */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Receitas, despesas e saldo</Text>
                  <Text style={styles.cardSubtitle}>{groups.length > 3 || (report.evolution ?? []).length > 1 ? 'Totais por mês · R$' : 'Totais do mês · R$'}</Text>
                  <View style={styles.legend}>
                    {[
                      ['Receitas', colors.positive],
                      ['Despesas', colors.negative],
                      ['Saldo', colors.primary],
                    ].map(([l, c]) => (
                      <View key={l} style={styles.legendItem}>
                        <View style={[styles.legendLine, { backgroundColor: c }]} />
                        <Text style={styles.legendItemText}>{l}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.chartBox}>{barChart()}</View>
                  <View style={styles.totalsBox}>
                    {[
                      ['Receitas', num(summary?.receitas), colors.text],
                      ['Despesas', num(summary?.despesas), colors.text],
                      ['Saldo', num(summary?.saldo), num(summary?.saldo) < 0 ? colors.negative : colors.text],
                    ].map(([l, v, c]) => (
                      <View key={l as string} style={styles.totalsItem}>
                        <Text style={styles.totalsLabel}>{l as string}</Text>
                        <Text style={[styles.totalsValue, { color: c as string }]} numberOfLines={1} adjustsFontSizeToFit>
                          {money(v as number)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity accessibilityRole="button" style={styles.valuesToggle} onPress={() => setValuesOpen((v) => !v)}>
                    <Text style={styles.valuesToggleText}>{valuesOpen ? '▾' : '▸'} Ver valores do gráfico</Text>
                  </TouchableOpacity>
                  {valuesOpen
                    ? (report.evolution ?? []).map((e) => (
                        <View key={e.mes} style={styles.valuesRow}>
                          <Text style={styles.valuesMonth}>{monthLabel(e.mes)}</Text>
                          <Text style={styles.valuesText}>
                            {money(num(e.receitas))} · {money(num(e.despesas))} · {money(num(e.saldo))}
                          </Text>
                        </View>
                      ))
                    : null}
                </View>

                {/* Despesas por categoria */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Despesas por categoria</Text>
                  {(report.categoryBreakdown ?? []).some((c) => num(c.total) > 0) ? (
                    donut()
                  ) : (
                    <Text style={styles.mutedCenter}>Nenhuma despesa confirmada neste período.</Text>
                  )}
                </View>

                {/* Metas */}
                {(report.goals ?? []).length > 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Metas</Text>
                    {report.goals.slice(0, 3).map((g, i) => {
                      const p = num(g.valorAlvo) > 0 ? Math.min(100, (num(g.valorAtual) / num(g.valorAlvo)) * 100) : 0;
                      return (
                        <View key={g.id ?? i} style={i > 0 ? styles.goalItem : undefined}>
                          <View style={styles.goalTop}>
                            <Text style={styles.goalName} numberOfLines={1}>
                              {g.nome}
                            </Text>
                            <Text style={styles.goalPct}>{Math.round(p)}%</Text>
                          </View>
                          <View style={styles.track}>
                            <View style={[styles.fill, { width: `${p}%`, backgroundColor: colors.progress }]} />
                          </View>
                          <Text style={styles.goalMeta}>
                            {money(num(g.valorAtual))} de {money(num(g.valorAlvo))}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {/* Transações detalhadas */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Transações detalhadas</Text>
                  <Text style={styles.cardSubtitle}>
                    Transações confirmadas que compõem o relatório. A busca abaixo filtra somente esta lista.
                  </Text>
                  <View style={[styles.searchField, searchFocused && styles.searchFieldFocused]}>
                    <Search size={18} color={colors.textMuted} />
                    <TextInput
                      accessibilityLabel="Buscar descrição ou categoria"
                      style={[styles.searchInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                      value={search}
                      onChangeText={(t) => {
                        setSearch(t);
                        setPage(1);
                      }}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Buscar descrição ou categoria"
                      placeholderTextColor={colors.textSubtle}
                      selectionColor={colors.primary}
                      underlineColorAndroid="transparent"
                    />
                  </View>
                  <View style={styles.typeTabs}>
                    {TYPE_OPTIONS.map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: typeFilter === o.value }}
                        style={[styles.typeOption, typeFilter === o.value && styles.typeOptionActive]}
                        onPress={() => {
                          setTypeFilter(o.value);
                          setPage(1);
                        }}
                      >
                        <Text style={[styles.typeText, typeFilter === o.value && styles.typeTextActive]}>{o.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {pageTx.length === 0 ? (
                    <Text style={styles.mutedCenter}>Nenhuma transação encontrada.</Text>
                  ) : (
                    pageTx.map((t, i) => {
                      const income = t.tipo === 'receita';
                      return (
                        <View key={t.id} style={[styles.txRow, i < pageTx.length - 1 && styles.txBorder]}>
                          <View style={styles.txInfo}>
                            <Text style={styles.txTitle} numberOfLines={1}>
                              {t.descricao}
                            </Text>
                            <Text style={styles.txMeta} numberOfLines={1}>
                              {formatDate(t.data)} · {t.categoria} · {income ? 'Receita' : 'Despesa'}
                            </Text>
                          </View>
                          <Text style={[styles.txValue, { color: income ? colors.positive : colors.negative }]} numberOfLines={1}>
                            {money(num(t.valor))}
                          </Text>
                        </View>
                      );
                    })
                  )}

                  <View style={styles.pagination}>
                    <Text style={styles.paginationText}>
                      {filteredTx.length} {filteredTx.length === 1 ? 'transação' : 'transações'} · Página {currentPage} de {totalPages}
                    </Text>
                    <View style={styles.paginationButtons}>
                      <Button title="Anterior" variant="secondary" disabled={currentPage <= 1} onPress={() => setPage(currentPage - 1)} style={styles.pageButton} />
                      <Button title="Próxima" variant="secondary" disabled={currentPage >= totalPages} onPress={() => setPage(currentPage + 1)} style={styles.pageButton} />
                    </View>
                  </View>
                </View>

                {/* Resumo mensal */}
                {(report.history ?? []).length > 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionCaps}>RESUMO MENSAL DO PERÍODO</Text>
                    {report.history.map((h, i) => {
                      const v = h.variacaoPercentual == null ? null : Number(h.variacaoPercentual);
                      const canOpen = /(\d{4})-(\d{2})/.test(h.id ?? '');
                      return (
                        <View key={h.id ?? i} style={[styles.historyRow, i > 0 && styles.historyBorder]}>
                          <View style={styles.historyTop}>
                            <Text style={styles.historyPeriod}>{h.periodo}</Text>
                            {v != null ? (
                              <Text style={[styles.historyVar, { color: v >= 0 ? colors.positive : colors.negative }]}>
                                {v >= 0 ? '▲' : '▼'} {pct(Math.abs(Math.round(v * 10) / 10))}
                              </Text>
                            ) : (
                              <Text style={styles.historyVar}>—</Text>
                            )}
                          </View>
                          <View style={styles.historyValues}>
                            <View style={styles.historyCol}>
                              <Text style={styles.historyLabel}>Receitas</Text>
                              <Text style={[styles.historyValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                                {money(num(h.receitas))}
                              </Text>
                            </View>
                            <View style={styles.historyCol}>
                              <Text style={styles.historyLabel}>Despesas</Text>
                              <Text style={[styles.historyValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit>
                                {money(num(h.despesas))}
                              </Text>
                            </View>
                            <View style={styles.historyCol}>
                              <Text style={styles.historyLabel}>Saldo</Text>
                              <Text style={[styles.historyValue, { color: colors.info }]} numberOfLines={1} adjustsFontSizeToFit>
                                {money(num(h.saldo))}
                              </Text>
                            </View>
                          </View>
                          {canOpen ? (
                            <TouchableOpacity accessibilityRole="button" style={styles.viewButton} onPress={() => viewMonth(h.periodo, h.id)}>
                              <Text style={styles.viewButtonText}>Visualizar mês</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Seletor de período */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Período</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setPickerOpen(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {PERIODS.map((p) => {
              const selected = periodKey === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={styles.optionRow}
                  onPress={() => {
                    setPeriodKey(p.value);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{p.label}</Text>
                  {selected ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    centerBox: { paddingVertical: spacing.xxl, alignItems: 'center' },
    dim: { opacity: 0.55 },
    disabled: { opacity: 0.4 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.base,
      paddingBottom: spacing.md,
    },
    headerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
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

    periodPill: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      paddingHorizontal: spacing.base,
    },
    periodText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md },
    periodApplied: { flex: 1, fontSize: 12, color: colors.textMuted },
    refreshLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    refreshText: { fontSize: 12, fontWeight: '700', color: colors.primary },

    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      padding: 3,
      marginTop: spacing.base,
      marginBottom: spacing.base,
    },
    tabOption: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: radii.sm },
    tabOptionActive: { backgroundColor: colors.primaryLight },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.primary },

    // KPIs
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    kpiCard: { width: '48.5%', flexGrow: 1, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    kpiLabel: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    kpiChip: { width: 26, height: 26, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    kpiValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
    kpiVar: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, flexWrap: 'wrap' },
    kpiVarText: { fontSize: 11, fontWeight: '800' },
    kpiVarHint: { fontSize: 10, color: colors.textSubtle },

    // Cards
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.xl,
      padding: spacing.base,
      marginTop: spacing.base,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
    sectionCaps: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
    mutedCenter: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

    insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
    insightBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
    insightText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textSecondary },

    legend: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 14, height: 3, borderRadius: 2 },
    legendItemText: { fontSize: 12, color: colors.textMuted },
    chartBox: { marginTop: spacing.base },
    chartArea: { position: 'relative' },
    zeroLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
    chartGroup: { position: 'absolute', top: 0, bottom: 0 },
    chartLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
    totalsBox: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.base,
    },
    totalsItem: { flex: 1 },
    totalsLabel: { fontSize: 11, color: colors.textMuted },
    totalsValue: { fontSize: 13, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
    valuesToggle: { marginTop: spacing.md },
    valuesToggleText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    valuesRow: { marginTop: spacing.sm },
    valuesMonth: { fontSize: 12, fontWeight: '700', color: colors.text },
    valuesText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

    donutWrap: { alignItems: 'center', paddingVertical: spacing.lg },
    donutLabel: { fontSize: 11, color: colors.textMuted },
    donutValue: { fontSize: 15, fontWeight: '800', color: colors.text, maxWidth: 100, textAlign: 'center' },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: radii.full },
    legendText: { flex: 1 },
    legendName: { fontSize: 14, fontWeight: '600', color: colors.text },
    legendValue: { fontSize: 12, color: colors.textMuted, marginTop: 1, fontVariant: ['tabular-nums'] },
    legendPct: { fontSize: 14, fontWeight: '800', color: colors.text },

    goalItem: { marginTop: spacing.base },
    goalTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
    goalName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    goalPct: { fontSize: 13, fontWeight: '800', color: colors.progress },
    goalMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
    track: { height: 7, backgroundColor: colors.surfaceElevated, borderRadius: radii.full, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radii.full },

    // Detalhamento
    searchField: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      marginTop: spacing.base,
    },
    searchFieldFocused: { borderColor: colors.primary },
    searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0, backgroundColor: 'transparent' },
    typeTabs: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radii.md, padding: 3, marginTop: spacing.md },
    typeOption: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.sm },
    typeOptionActive: { backgroundColor: colors.surface },
    typeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    typeTextActive: { color: colors.text },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    txBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    txInfo: { flex: 1, minWidth: 0 },
    txTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    txMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    txValue: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    pagination: { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: spacing.sm, paddingTop: spacing.md },
    paginationText: { fontSize: 12, color: colors.textMuted },
    paginationButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    pageButton: { flex: 1, height: 44 },

    historyRow: { paddingVertical: spacing.md },
    historyBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyPeriod: { fontSize: 15, fontWeight: '800', color: colors.text },
    historyVar: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
    historyValues: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    historyCol: { flex: 1 },
    historyLabel: { fontSize: 11, color: colors.textMuted },
    historyValue: { fontSize: 13, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
    viewButton: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      marginTop: spacing.md,
    },
    viewButtonText: { fontSize: 12, fontWeight: '700', color: colors.text },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.xl,
      padding: spacing.xl,
      marginTop: spacing.base,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: radii.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.base, textAlign: 'center' },
    emptyText: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
    emptyButton: { alignSelf: 'stretch', marginTop: spacing.lg },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.base,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    optionText: { fontSize: 15, color: colors.text },
    optionTextSelected: { color: colors.primary, fontWeight: '700' },
  });
