import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  ArrowUpRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Scale,
  Tag,
  AlertCircle,
} from 'lucide-react-native';
import { spacing, radii, useColors, ThemeColors, makeTypography } from '../../theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { SectionHeader } from '../../components/common/SectionHeader';
import { InlineError } from '../../components/common/InlineError';
import { formatCurrency, formatShortDate, formatTodayLong } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { storage } from '../../services/storage';
import { Category, DashboardData, FinancialGoal, MonthlyReportItem, Transaction } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface DashboardScreenProps {
  navigation: any;
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MASK = 'R$ ••••••';
const CHART_HEIGHT = 110;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

// Últimos 6 meses terminando no atual; meses sem lançamento entram zerados.
function lastSixMonths(items: MonthlyReportItem[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = items.find((m) => m.mes === key);
    return {
      key,
      label: MONTHS_SHORT[d.getMonth()],
      receitas: Number(found?.total_receitas ?? 0),
      despesas: Number(found?.total_despesas ?? 0),
      current: k === 5,
    };
  });
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  // Cada fonte tem seu próprio estado: null = ainda não carregou com sucesso.
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [goals, setGoals] = useState<FinancialGoal[] | null>(null);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthly, setMonthly] = useState<MonthlyReportItem[] | null>(null);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    storage.getHideValues().then(setHidden);
  }, []);

  function toggleHidden() {
    setHidden((v) => {
      storage.setHideValues(!v);
      return !v;
    });
  }

  const loadData = useCallback(async () => {
    const id = ++requestId.current;
    const now = new Date();
    const [dash, txs, goalsRes, cats, monthRes, prevYearRes] = await Promise.allSettled([
      api.getDashboard(),
      api.listTransactions({ limit: 5 }),
      api.listGoals(),
      api.listCategories(),
      api.getMonthlyReport(now.getFullYear()),
      // Até maio, a janela de 6 meses atravessa o ano anterior
      now.getMonth() < 5 ? api.getMonthlyReport(now.getFullYear() - 1) : Promise.resolve([] as MonthlyReportItem[]),
    ]);
    if (id !== requestId.current) return; // resposta de uma chamada mais antiga

    if (dash.status === 'fulfilled') {
      setDashboard(dash.value);
      setDashboardError(null);
    } else {
      setDashboardError(errorMessage(dash.reason, 'Não foi possível carregar o resumo financeiro.'));
    }

    if (txs.status === 'fulfilled') {
      setTransactions(txs.value);
      setTransactionsError(null);
    } else {
      setTransactionsError(errorMessage(txs.reason, 'Não foi possível carregar as transações.'));
    }

    if (goalsRes.status === 'fulfilled') {
      setGoals(goalsRes.value);
      setGoalsError(null);
    } else {
      setGoalsError(errorMessage(goalsRes.reason, 'Não foi possível carregar as metas.'));
    }

    // Categorias só enriquecem a lista (nome e cor); falha não bloqueia a tela
    if (cats.status === 'fulfilled') setCategories(cats.value);

    if (monthRes.status === 'fulfilled' && prevYearRes.status === 'fulfilled') {
      setMonthly([...prevYearRes.value, ...monthRes.value]);
      setMonthlyError(null);
    } else {
      const reason = monthRes.status === 'rejected' ? monthRes.reason : (prevYearRes as PromiseRejectedResult).reason;
      setMonthlyError(errorMessage(reason, 'Não foi possível carregar o resumo do mês.'));
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Recarrega ao focar a aba (inclui a primeira vez), para refletir lançamentos feitos em outras telas.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const money = (value: number) => (hidden ? MASK : formatCurrency(value));

  const firstName = user?.nome?.trim() || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const fatalError = !loading && !dashboard && dashboardError;

  const monthTitle = (() => {
    const text = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();
  const series = useMemo(() => lastSixMonths(monthly ?? []), [monthly]);
  const currentMonth = series[5];
  const monthResult = currentMonth.receitas - currentMonth.despesas;
  const chartMax = Math.max(...series.flatMap((m) => [m.receitas, m.despesas]), 0);
  const barHeight = (value: number) =>
    chartMax > 0 && value > 0 ? Math.max((value / chartMax) * CHART_HEIGHT, 4) : 0;

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id_categoria, c])), [categories]);

  // Gastos por categoria: somente despesas, maiores primeiro.
  const expenseCategories = (dashboard?.por_categoria ?? [])
    .filter((c) => c.tipo === 'despesa' && c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  // Metas em andamento primeiro; concluídas/canceladas só completam se faltar.
  const featuredGoals = [...(goals ?? [])]
    .sort((a, b) => Number(b.status === 'em_andamento') - Number(a.status === 'em_andamento'))
    .slice(0, 2);

  const kpi = (
    label: string,
    value: number,
    hint: string,
    tint: string,
    border: string,
    chipColor: string,
    Icon: typeof TrendingUp,
    valueColor?: string
  ) => (
    <View style={[styles.kpiCard, { backgroundColor: tint, borderColor: border }]}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View style={[styles.kpiChip, { backgroundColor: chipColor + '26' }]}>
          <Icon size={14} color={chipColor} />
        </View>
      </View>
      {loading && !monthly ? (
        <Skeleton width="70%" height={20} style={{ marginTop: spacing.sm }} />
      ) : (
        <Text
          style={[styles.kpiValue, valueColor ? { color: valueColor } : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {money(value)}
        </Text>
      )}
      <Text style={styles.kpiHint} numberOfLines={2}>
        {hint}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Cabeçalho */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderText}>
            <Text style={styles.dateText}>{formatTodayLong()}</Text>
            <Text style={styles.greeting} numberOfLines={1} accessibilityRole="header">
              {firstName ? `Olá, ${firstName}` : 'Olá'}
            </Text>
            <Text style={styles.subtitle}>Seu controle financeiro, em um só lugar.</Text>
          </View>
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
            accessibilityLabel="Abrir perfil"
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>

        {fatalError ? (
          <View style={styles.fatal}>
            <InlineError message={dashboardError as string} />
            <Button
              title="Tentar novamente"
              variant="secondary"
              onPress={() => {
                setLoading(true);
                loadData();
              }}
              style={styles.fatalButton}
            />
          </View>
        ) : (
          <>
            {dashboardError && dashboard ? (
              <View style={styles.staleBanner}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={styles.staleText}>
                  Não foi possível atualizar. Exibindo os últimos dados carregados.
                </Text>
              </View>
            ) : null}

            {/* Saldo (destaque com a cor da marca) */}
            <View style={styles.heroCard}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
                <Defs>
                  <LinearGradient id="cwHero" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#1E40AF" />
                    <Stop offset="0.6" stopColor="#2563EB" />
                    <Stop offset="1" stopColor="#0F9E8E" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#cwHero)" />
              </Svg>

              <Text style={styles.heroLabel}>Saldo acumulado dos registros</Text>

              {loading || !dashboard ? (
                <View style={styles.heroSkeleton}>
                  <Skeleton width={200} height={38} radius={radii.sm} />
                  <Skeleton height={44} radius={radii.md} style={{ marginTop: spacing.lg }} />
                </View>
              ) : (
                <>
                  <Text
                    style={styles.heroAmount}
                    accessibilityLabel={`Saldo acumulado ${hidden ? 'oculto' : formatCurrency(dashboard.saldo)}`}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    {money(dashboard.saldo)}
                  </Text>
                  <Text style={styles.heroCaption}>Receitas menos despesas confirmadas até hoje.</Text>

                  {dashboard.total_receitas + dashboard.total_despesas > 0 ? (
                    <View style={styles.flowBar} accessibilityElementsHidden>
                      {dashboard.total_receitas > 0 ? (
                        <View style={[styles.flowSegment, { flex: dashboard.total_receitas, backgroundColor: '#6EE7B7' }]} />
                      ) : null}
                      {dashboard.total_despesas > 0 ? (
                        <View style={[styles.flowSegment, { flex: dashboard.total_despesas, backgroundColor: '#FCA5A5' }]} />
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <View style={styles.statIconBadge}>
                        <TrendingUp size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.statText}>
                        <Text style={styles.statLabel}>Entradas</Text>
                        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                          {money(dashboard.total_receitas)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <View style={styles.statIconBadge}>
                        <TrendingDown size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.statText}>
                        <Text style={styles.statLabel}>Saídas</Text>
                        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                          {money(dashboard.total_despesas)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ expanded: explainOpen }}
                    onPress={() => setExplainOpen((v) => !v)}
                    style={styles.explainToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.explainToggleText}>Entenda este saldo</Text>
                    {explainOpen ? <ChevronUp size={14} color="#FFFFFF" /> : <ChevronDown size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  {explainOpen ? (
                    <Text style={styles.explainText}>
                      O saldo soma as receitas e subtrai as despesas confirmadas até hoje, de todo o histórico.
                      Lançamentos pendentes não entram na conta.
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            {/* Ações rápidas */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Registrar receita"
                style={[styles.quickCard, { backgroundColor: colors.positiveBg, borderColor: colors.positive + '40' }]}
                onPress={() => navigation.navigate('Transactions', { filter: 'receita', openModal: true })}
              >
                <View style={[styles.quickChip, { backgroundColor: colors.positive + '26' }]}>
                  <Plus size={16} color={colors.positive} />
                </View>
                <Text style={styles.quickText} numberOfLines={2}>Registrar receita</Text>
                <ArrowUpRight size={14} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Registrar despesa"
                style={[styles.quickCard, { backgroundColor: colors.negativeBg, borderColor: colors.negativeBorder }]}
                onPress={() => navigation.navigate('Transactions', { filter: 'despesa', openModal: true })}
              >
                <View style={[styles.quickChip, { backgroundColor: colors.negative + '26' }]}>
                  <Minus size={16} color={colors.negative} />
                </View>
                <Text style={styles.quickText} numberOfLines={2}>Registrar despesa</Text>
                <ArrowUpRight size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Resumo do mês */}
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle} accessibilityRole="header">{monthTitle}</Text>
              <Text style={styles.monthCaption}>Registros confirmados até hoje</Text>
            </View>
            {monthlyError && !monthly ? (
              <InlineError message={monthlyError} onRetry={loadData} />
            ) : (
              <>
                <View style={styles.kpiRow}>
                  {kpi('Receitas', currentMonth.receitas, 'Entradas do mês', colors.positiveBg, colors.positive + '40', colors.positive, TrendingUp)}
                  {kpi('Despesas', currentMonth.despesas, 'Saídas do mês', colors.negativeBg, colors.negativeBorder, colors.negative, TrendingDown)}
                </View>
                <View style={styles.kpiRowSingle}>
                  {kpi('Resultado do mês', monthResult, 'Receitas menos despesas deste mês', colors.infoBg, colors.info + '40', colors.info, Scale, monthResult < 0 ? colors.negative : undefined)}
                </View>

                {/* Receitas x Despesas */}
                <Card style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View style={styles.chartHeaderText}>
                      <Text style={styles.chartTitle}>Receitas x Despesas</Text>
                      <Text style={styles.chartSubtitle}>Últimos 6 meses · mês atual até hoje</Text>
                    </View>
                    <View style={styles.legend}>
                      <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
                      <View style={[styles.legendDot, { backgroundColor: colors.negative }]} />
                    </View>
                  </View>
                  {chartMax === 0 && !loading ? (
                    <Text style={styles.chartEmpty}>Sem movimentações confirmadas neste período.</Text>
                  ) : (
                    <View style={styles.chartRow} accessibilityElementsHidden>
                      {series.map((m) => (
                        <View key={m.key} style={styles.chartCol}>
                          <View style={styles.bars}>
                            <View style={[styles.bar, { height: barHeight(m.receitas), backgroundColor: colors.positive }]} />
                            <View style={[styles.bar, { height: barHeight(m.despesas), backgroundColor: colors.negative }]} />
                          </View>
                          <Text style={[styles.chartLabel, m.current && styles.chartLabelCurrent]}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              </>
            )}

            {/* Últimas movimentações */}
            <SectionHeader
              title="Últimas movimentações"
              actionLabel="Ver todas"
              onActionPress={() => navigation.navigate('Transactions')}
            />
            {loading ? (
              <Card style={styles.listCard}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.txRow, i < 2 && styles.rowBorder]}>
                    <Skeleton width={36} height={36} radius={radii.full} />
                    <View style={styles.txBody}>
                      <Skeleton width="60%" height={14} />
                      <Skeleton width="30%" height={11} style={{ marginTop: 6 }} />
                    </View>
                    <Skeleton width={70} height={14} />
                  </View>
                ))}
              </Card>
            ) : transactionsError && !transactions ? (
              <InlineError message={transactionsError} onRetry={loadData} />
            ) : transactions && transactions.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhuma transação registrada</Text>
                <Text style={styles.emptyText}>
                  Registre sua primeira movimentação para acompanhar o saldo.
                </Text>
                <Button
                  title="Cadastrar movimentação"
                  variant="secondary"
                  onPress={() => navigation.navigate('Transactions', { openModal: true })}
                  style={styles.emptyButton}
                />
              </Card>
            ) : (
              <Card style={styles.listCard}>
                {(transactions ?? []).map((tx, idx, arr) => {
                  const isIncome = tx.tipo === 'receita';
                  const category = categoryById.get(tx.id_categoria);
                  const tone = category?.cor && HEX.test(category.cor) ? category.cor : isIncome ? colors.positive : colors.negative;
                  return (
                    <View key={tx.id_transacao} style={[styles.txRow, idx < arr.length - 1 && styles.rowBorder]}>
                      <View style={[styles.txIconCircle, { backgroundColor: tone + '26' }]}>
                        <Tag size={16} color={tone} />
                      </View>
                      <View style={styles.txBody}>
                        <Text style={styles.txDescription} numberOfLines={1}>
                          {tx.descricao}
                        </Text>
                        <View style={styles.txMeta}>
                          <Text style={styles.txDate} numberOfLines={1}>
                            {category?.nome ? `${category.nome} · ` : ''}
                            {formatShortDate(tx.data_transacao)}
                          </Text>
                          {tx.status === 'pendente' ? <Badge label="Pendente" variant="warning" /> : null}
                        </View>
                      </View>
                      <Text
                        style={[styles.txAmount, { color: isIncome ? colors.positive : colors.negative }]}
                        numberOfLines={1}
                      >
                        {hidden ? MASK : `${isIncome ? '+' : '-'} ${formatCurrency(Math.abs(tx.valor))}`}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Gastos por categoria */}
            {expenseCategories.length > 0 && dashboard ? (
              <>
                <SectionHeader
                  title="Gastos por categoria"
                  actionLabel="Gerenciar"
                  onActionPress={() => navigation.navigate('Categories')}
                />
                <Card>
                  {expenseCategories.map((cat, idx) => {
                    const share =
                      dashboard.total_despesas > 0
                        ? Math.min(100, (cat.total / dashboard.total_despesas) * 100)
                        : 0;
                    return (
                      <View
                        key={cat.id_categoria}
                        style={idx < expenseCategories.length - 1 ? styles.categoryItem : undefined}
                      >
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName} numberOfLines={1}>
                            {cat.nome}
                          </Text>
                          <Text style={styles.categoryAmount}>
                            {money(cat.total)} · {Math.round(share)}%
                          </Text>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${share}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {/* Metas */}
            <SectionHeader
              title="Metas financeiras"
              actionLabel={goals && goals.length > 0 ? 'Ver todas' : undefined}
              onActionPress={() => navigation.navigate('Goals')}
            />
            {loading ? (
              <Card>
                <Skeleton width="50%" height={14} />
                <Skeleton height={6} radius={radii.full} style={{ marginVertical: spacing.md }} />
                <Skeleton width="40%" height={12} />
              </Card>
            ) : goalsError && !goals ? (
              <InlineError message={goalsError} onRetry={loadData} />
            ) : goals && goals.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhuma meta criada</Text>
                <Text style={styles.emptyText}>
                  Defina um objetivo e acompanhe o progresso por aqui.
                </Text>
                <Button
                  title="Criar meta"
                  variant="secondary"
                  onPress={() => navigation.navigate('Goals', { openModal: true })}
                  style={styles.emptyButton}
                />
              </Card>
            ) : (
              featuredGoals.map((goal) => {
                const percent =
                  goal.valor_objetivo > 0
                    ? Math.min(100, Math.round((goal.valor_atual / goal.valor_objetivo) * 100))
                    : 0;
                return (
                  <Card key={goal.id_meta} style={styles.goalCard}>
                    <View style={styles.goalTop}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        {goal.titulo}
                      </Text>
                      <Text style={styles.goalPercent}>{percent}%</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.progress }]} />
                    </View>
                    <View style={styles.goalBottom}>
                      <Text style={styles.goalCurrent}>{money(goal.valor_atual)}</Text>
                      <Text style={styles.goalTarget}>de {money(goal.valor_objetivo)}</Text>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl + spacing.base,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    topHeaderText: { flex: 1 },
    dateText: {
      ...typography.label,
      textTransform: 'none',
      letterSpacing: 0.2,
      color: colors.textSubtle,
      fontSize: 13,
    },
    greeting: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      marginTop: 2,
    },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
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
    avatarButton: {
      width: 44,
      height: 44,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 17, fontWeight: '700', color: colors.textInverse },
    fatal: { marginTop: spacing.sm },
    fatalButton: { marginTop: spacing.md },
    staleBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warningBg,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    staleText: { flex: 1, color: colors.warning, fontSize: 13 },

    heroCard: {
      borderRadius: radii.xl,
      overflow: 'hidden',
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    heroLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
    heroSkeleton: { marginTop: spacing.md },
    heroAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.8,
      marginTop: spacing.sm,
      fontVariant: ['tabular-nums'],
    },
    heroCaption: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
      marginBottom: spacing.base,
    },
    flowBar: {
      flexDirection: 'row',
      height: 6,
      borderRadius: radii.full,
      overflow: 'hidden',
      gap: 2,
      marginBottom: spacing.base,
    },
    flowSegment: { height: '100%' },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.22)',
      paddingTop: spacing.md,
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    statText: { flex: 1 },
    statIconBadge: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.75)',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.22)',
      marginHorizontal: spacing.sm,
    },
    explainToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: spacing.base,
    },
    explainToggleText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    explainText: {
      fontSize: 12,
      lineHeight: 18,
      color: 'rgba(255,255,255,0.85)',
      marginTop: spacing.sm,
    },

    quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    quickCard: {
      flex: 1,
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    quickChip: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },

    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    monthTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    monthCaption: { fontSize: 11, color: colors.textSubtle },
    kpiRow: { flexDirection: 'row', gap: spacing.sm },
    kpiRowSingle: { marginTop: spacing.sm, marginBottom: spacing.md },
    kpiCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kpiLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    kpiChip: {
      width: 28,
      height: 28,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiValue: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.sm,
      fontVariant: ['tabular-nums'],
    },
    kpiHint: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },

    chartCard: { marginTop: 0 },
    chartHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    chartHeaderText: { flex: 1 },
    chartTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    chartSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    legend: { flexDirection: 'row', gap: 6, paddingTop: 4 },
    legendDot: { width: 8, height: 8, borderRadius: radii.full },
    chartEmpty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
    },
    chartCol: { flex: 1, alignItems: 'center' },
    bars: {
      height: CHART_HEIGHT,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
    },
    bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    chartLabel: { fontSize: 11, color: colors.textSubtle, marginTop: 6 },
    chartLabelCurrent: { color: colors.text, fontWeight: '700' },

    listCard: { paddingVertical: 0, paddingHorizontal: spacing.base },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    txIconCircle: {
      width: 38,
      height: 38,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txBody: { flex: 1, minWidth: 0 },
    txDescription: { fontSize: 14, fontWeight: '600', color: colors.text },
    txMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    txDate: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
    txAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

    categoryItem: { marginBottom: spacing.md },
    categoryInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: 6,
    },
    categoryName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
    categoryAmount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 6,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.full,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: radii.full },

    goalCard: { marginBottom: spacing.sm },
    goalTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    goalTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    goalPercent: { fontSize: 13, fontWeight: '700', color: colors.progress },
    goalBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    goalCurrent: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    goalTarget: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },

    emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    emptyButton: { height: 44, marginTop: spacing.base, alignSelf: 'stretch' },
  });
};
