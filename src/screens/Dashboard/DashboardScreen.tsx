import React, { useCallback, useRef, useState } from 'react';
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
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  MinusCircle,
  Target,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { BrandGlow } from '../../components/common/BrandGlow';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { SectionHeader } from '../../components/common/SectionHeader';
import { InlineError } from '../../components/common/InlineError';
import { formatCurrency, formatShortDate, formatTodayLong } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { DashboardData, FinancialGoal, Transaction } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface DashboardScreenProps {
  navigation: any;
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cada fonte tem seu próprio estado: null = ainda não carregou com sucesso.
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [goals, setGoals] = useState<FinancialGoal[] | null>(null);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const id = ++requestId.current;
    const [dash, txs, goalsRes] = await Promise.allSettled([
      api.getDashboard(),
      api.listTransactions({ limit: 5 }),
      api.listGoals(),
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

  const firstName = user?.nome?.trim() || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';

  const fatalError = !loading && !dashboard && dashboardError;

  // Gastos por categoria: somente despesas, maiores primeiro.
  const expenseCategories = (dashboard?.por_categoria ?? [])
    .filter((c) => c.tipo === 'despesa' && c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  // Metas em andamento primeiro; concluídas/canceladas só completam se faltar.
  const featuredGoals = [...(goals ?? [])]
    .sort((a, b) => Number(b.status === 'em_andamento') - Number(a.status === 'em_andamento'))
    .slice(0, 2);

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
          </View>
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

            {/* Saldo */}
            <Card style={styles.balanceCard}>
              <BrandGlow />
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Saldo atual</Text>
                <Wallet size={18} color={colors.primary} />
              </View>

              {loading || !dashboard ? (
                <View style={styles.balanceSkeleton}>
                  <Skeleton width={190} height={34} radius={radii.sm} />
                  <Skeleton height={44} radius={radii.md} style={{ marginTop: spacing.lg }} />
                </View>
              ) : (
                <>
                  <Text
                    style={styles.balanceAmount}
                    accessibilityLabel={`Saldo atual ${formatCurrency(dashboard.saldo)}`}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    {formatCurrency(dashboard.saldo)}
                  </Text>
                  <Text style={styles.balanceCaption}>
                    Entradas e saídas confirmadas até hoje
                  </Text>

                  {dashboard.total_receitas + dashboard.total_despesas > 0 ? (
                    <View style={styles.flowBar} accessibilityElementsHidden>
                      {dashboard.total_receitas > 0 ? (
                        <View
                          style={[
                            styles.flowSegment,
                            { flex: dashboard.total_receitas, backgroundColor: colors.positive },
                          ]}
                        />
                      ) : null}
                      {dashboard.total_despesas > 0 ? (
                        <View
                          style={[
                            styles.flowSegment,
                            { flex: dashboard.total_despesas, backgroundColor: colors.negative },
                          ]}
                        />
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIconBadge, { backgroundColor: colors.positiveBg }]}>
                        <TrendingUp size={16} color={colors.positive} />
                      </View>
                      <View style={styles.statText}>
                        <Text style={styles.statLabel}>Entradas</Text>
                        <Text
                          style={[styles.statValue, { color: colors.positive }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatCurrency(dashboard.total_receitas)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                      <View style={[styles.statIconBadge, { backgroundColor: colors.negativeBg }]}>
                        <TrendingDown size={16} color={colors.negative} />
                      </View>
                      <View style={styles.statText}>
                        <Text style={styles.statLabel}>Saídas</Text>
                        <Text
                          style={[styles.statValue, { color: colors.negative }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatCurrency(dashboard.total_despesas)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </Card>

            {/* Ações rápidas */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nova receita"
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('Transactions', { filter: 'receita', openModal: true })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.positiveBg }]}>
                  <PlusCircle size={22} color={colors.positive} />
                </View>
                <Text style={styles.quickActionText}>Nova receita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nova despesa"
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('Transactions', { filter: 'despesa', openModal: true })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.negativeBg }]}>
                  <MinusCircle size={22} color={colors.negative} />
                </View>
                <Text style={styles.quickActionText}>Nova despesa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nova meta"
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('Goals', { openModal: true })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.warningBg }]}>
                  <Target size={22} color={colors.warning} />
                </View>
                <Text style={styles.quickActionText}>Nova meta</Text>
              </TouchableOpacity>
            </View>

            {/* Últimas transações */}
            <SectionHeader
              title="Últimas transações"
              actionLabel="Ver histórico"
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
                  return (
                    <View
                      key={tx.id_transacao}
                      style={[styles.txRow, idx < arr.length - 1 && styles.rowBorder]}
                    >
                      <View
                        style={[
                          styles.txIconCircle,
                          { backgroundColor: isIncome ? colors.positiveBg : colors.negativeBg },
                        ]}
                      >
                        {isIncome ? (
                          <TrendingUp size={16} color={colors.positive} />
                        ) : (
                          <TrendingDown size={16} color={colors.negative} />
                        )}
                      </View>
                      <View style={styles.txBody}>
                        <Text style={styles.txDescription} numberOfLines={1}>
                          {tx.descricao}
                        </Text>
                        <View style={styles.txMeta}>
                          <Text style={styles.txDate}>{formatShortDate(tx.data_transacao)}</Text>
                          {tx.status === 'pendente' ? <Badge label="Pendente" variant="warning" /> : null}
                        </View>
                      </View>
                      <Text
                        style={[styles.txAmount, { color: isIncome ? colors.positive : colors.text }]}
                        numberOfLines={1}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(Math.abs(tx.valor))}
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
                            {formatCurrency(cat.total)} · {Math.round(share)}%
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
                      <Text style={styles.goalCurrent}>{formatCurrency(goal.valor_atual)}</Text>
                      <Text style={styles.goalTarget}>de {formatCurrency(goal.valor_objetivo)}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl + spacing.base,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  topHeaderText: {
    flex: 1,
  },
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
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textInverse,
  },
  fatal: {
    marginTop: spacing.sm,
  },
  fatalButton: {
    marginTop: spacing.md,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  staleText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.label,
  },
  balanceSkeleton: {
    marginTop: spacing.md,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  balanceCaption: {
    ...typography.caption,
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
  flowSegment: {
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statText: {
    flex: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionItem: {
    flex: 1,
    minHeight: 88,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  listCard: {
    paddingVertical: 0,
    paddingHorizontal: spacing.base,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
    minWidth: 0,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  categoryItem: {
    marginBottom: spacing.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
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
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  goalCard: {
    marginBottom: spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  goalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  goalPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.progress,
  },
  goalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  goalCurrent: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  goalTarget: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyButton: {
    height: 44,
    marginTop: spacing.base,
    alignSelf: 'stretch',
  },
});
