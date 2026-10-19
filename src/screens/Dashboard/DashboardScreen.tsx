import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  MinusCircle,
  Target,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { formatCurrency, formatShortDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { DashboardData, FinancialGoal, Transaction } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [dashData, txs, goalsData] = await Promise.all([
        api.getDashboard(),
        api.listTransactions({ limit: 5 }),
        api.listGoals().catch(() => []),
      ]);
      setDashboard(dashData);
      setRecentTransactions(txs);
      setGoals(goalsData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível carregar os dados financeiros.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const userName = user?.nome || 'Usuário';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando suas finanças...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header com saudação */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greeting}>Olá, {userName} 👋</Text>
            <Text style={styles.subGreeting}>Visão geral do seu patrimônio</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={colors.negative} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Saldo Principal Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>SALDO ATUAL DISPONÍVEL</Text>
            <Wallet size={18} color={colors.primary} />
          </View>

          <Text style={styles.balanceAmount}>
            {formatCurrency(dashboard?.saldo ?? 0)}
          </Text>

          <View style={styles.statsRow}>
            {/* Receitas */}
            <View style={styles.statItem}>
              <View style={[styles.statIconBadge, { backgroundColor: colors.positiveBg }]}>
                <TrendingUp size={16} color={colors.positive} />
              </View>
              <View>
                <Text style={styles.statLabel}>Entradas</Text>
                <Text style={[styles.statValue, { color: colors.positive }]}>
                  {formatCurrency(dashboard?.total_receitas ?? 0)}
                </Text>
              </View>
            </View>

            {/* Divisor */}
            <View style={styles.statDivider} />

            {/* Despesas */}
            <View style={styles.statItem}>
              <View style={[styles.statIconBadge, { backgroundColor: colors.negativeBg }]}>
                <TrendingDown size={16} color={colors.negative} />
              </View>
              <View>
                <Text style={styles.statLabel}>Saídas</Text>
                <Text style={[styles.statValue, { color: colors.negative }]}>
                  {formatCurrency(dashboard?.total_despesas ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Ações Rápidas */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Transactions', { filter: 'receita', openModal: true })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.positiveBg }]}>
              <PlusCircle size={22} color={colors.positive} />
            </View>
            <Text style={styles.quickActionText}>Nova Receita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Transactions', { filter: 'despesa', openModal: true })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.negativeBg }]}>
              <MinusCircle size={22} color={colors.negative} />
            </View>
            <Text style={styles.quickActionText}>Nova Despesa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Goals', { openModal: true })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.warningBg }]}>
              <Target size={22} color={colors.warning} />
            </View>
            <Text style={styles.quickActionText}>Nova Meta</Text>
          </TouchableOpacity>
        </View>

        {/* Metas em Destaque */}
        {goals.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metas Financeiras</Text>
            <TouchableOpacity
              style={styles.sectionAction}
              onPress={() => navigation.navigate('Goals')}
            >
              <Text style={styles.sectionActionText}>Ver todas</Text>
              <ArrowRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {goals.slice(0, 2).map((goal) => {
          const percent = goal.valor_alvo > 0
            ? Math.min(100, Math.round((goal.valor_atual / goal.valor_alvo) * 100))
            : 0;

          return (
            <Card key={goal.id_meta} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <Text style={styles.goalTitle}>{goal.titulo}</Text>
                <Text style={styles.goalPercent}>{percent}%</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
              </View>

              <View style={styles.goalBottom}>
                <Text style={styles.goalCurrent}>
                  {formatCurrency(goal.valor_atual)}
                </Text>
                <Text style={styles.goalTarget}>
                  de {formatCurrency(goal.valor_alvo)}
                </Text>
              </View>
            </Card>
          );
        })}

        {/* Categorias - Distribuição do Backend */}
        {dashboard?.por_categoria && dashboard.por_categoria.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
                <Text style={styles.sectionActionText}>Gerenciar</Text>
              </TouchableOpacity>
            </View>

            <Card>
              {dashboard.por_categoria.slice(0, 4).map((cat) => (
                <View key={cat.id_categoria} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{cat.nome}</Text>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.total)}
                    </Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${Math.min(
                            100,
                            dashboard.total_despesas > 0
                              ? (cat.total / dashboard.total_despesas) * 100
                              : 0
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Últimas Transações */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimas Transações</Text>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => navigation.navigate('Transactions')}
          >
            <Text style={styles.sectionActionText}>Ver histórico</Text>
            <ArrowRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma transação registrada ainda.</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Transactions', { openModal: true })}
            >
              <Text style={styles.emptyAction}>Cadastrar primeira movimentação</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.transactionsCard}>
            {recentTransactions.map((tx, idx) => {
              const isIncome = tx.tipo === 'receita';
              return (
                <View
                  key={tx.id_transacao}
                  style={[
                    styles.txRow,
                    idx < recentTransactions.length - 1 && styles.txBorder,
                  ]}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconCircle,
                        {
                          backgroundColor: isIncome
                            ? colors.positiveBg
                            : colors.negativeBg,
                        },
                      ]}
                    >
                      {isIncome ? (
                        <TrendingUp size={16} color={colors.positive} />
                      ) : (
                        <TrendingDown size={16} color={colors.negative} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.txDescription} numberOfLines={1}>
                        {tx.descricao}
                      </Text>
                      <Text style={styles.txDate}>
                        {formatShortDate(tx.data_transacao)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      { color: isIncome ? colors.positive : colors.text },
                    ]}
                  >
                    {isIncome ? '+' : '-'} {formatCurrency(Math.abs(tx.valor))}
                  </Text>
                </View>
              );
            })}
          </Card>
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: 14,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subGreeting: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  avatarButton: {
    width: 42,
    height: 42,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.negativeBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  errorBannerText: {
    color: colors.negative,
    fontSize: 13,
    flex: 1,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.label,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
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
  sectionContainer: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  goalCard: {
    marginBottom: spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  goalPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: radii.full,
  },
  goalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  goalCurrent: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  goalTarget: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryItem: {
    marginBottom: spacing.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  categoryTrack: {
    height: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  transactionsCard: {
    paddingVertical: 0,
    paddingHorizontal: spacing.base,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  txBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 180,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyAction: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: spacing.sm,
  },
});
