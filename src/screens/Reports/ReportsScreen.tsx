import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { formatCurrency } from '../../utils/format';
import { api } from '../../services/api';
import { MonthlyReportItem } from '../../types';

export function ReportsScreen() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getMonthlyReport(selectedYear);
      setMonthlyData(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const totalYearReceitas = monthlyData.reduce((acc, m) => acc + m.total_receitas, 0);
  const totalYearDespesas = monthlyData.reduce((acc, m) => acc + m.total_despesas, 0);
  const saldoAnual = totalYearReceitas - totalYearDespesas;
  const taxaPoupanca =
    totalYearReceitas > 0 ? Math.round((saldoAnual / totalYearReceitas) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
          <Text style={styles.headerSubtitle}>
            Evolução e desempenho financeiro
          </Text>
        </View>

        {/* Year Selector */}
        <View style={styles.yearBadge}>
          <TouchableOpacity
            onPress={() => setSelectedYear((y) => y - 1)}
            style={styles.yearArrow}
          >
            <Text style={styles.yearArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear((y) => y + 1)}
            style={styles.yearArrow}
          >
            <Text style={styles.yearArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Card Anual Resumo */}
        <Card style={styles.annualCard}>
          <Text style={styles.annualLabel}>BALANÇO ACUMULADO EM {selectedYear}</Text>
          <Text
            style={[
              styles.annualTotal,
              { color: saldoAnual >= 0 ? colors.positive : colors.negative },
            ]}
          >
            {formatCurrency(saldoAnual)}
          </Text>

          <View style={styles.annualGrid}>
            <View style={styles.annualCol}>
              <Text style={styles.colLabel}>Total Recebido</Text>
              <Text style={[styles.colValue, { color: colors.positive }]}>
                {formatCurrency(totalYearReceitas)}
              </Text>
            </View>
            <View style={styles.colDivider} />
            <View style={styles.annualCol}>
              <Text style={styles.colLabel}>Total Gasto</Text>
              <Text style={[styles.colValue, { color: colors.negative }]}>
                {formatCurrency(totalYearDespesas)}
              </Text>
            </View>
            <View style={styles.colDivider} />
            <View style={styles.annualCol}>
              <Text style={styles.colLabel}>Taxa Poupança</Text>
              <Text style={[styles.colValue, { color: colors.warning }]}>
                {taxaPoupanca}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Lista Mensal Real */}
        <Text style={styles.sectionTitle}>Histórico Mês a Mês</Text>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : monthlyData.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BarChart2 size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>Sem dados registrados</Text>
            <Text style={styles.emptySubtitle}>
              Nenhuma movimentação encontrada para o ano de {selectedYear}.
            </Text>
          </Card>
        ) : (
          monthlyData.map((item) => {
            const [y, mStr] = item.mes.split('-');
            const mIndex = parseInt(mStr, 10) - 1;
            const monthName = MONTH_NAMES[mIndex] || item.mes;
            const balance = item.total_receitas - item.total_despesas;

            return (
              <Card key={item.mes} style={styles.monthCard}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthName}>{monthName}</Text>
                  <Text
                    style={[
                      styles.monthBalance,
                      { color: balance >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {formatCurrency(balance)}
                  </Text>
                </View>

                <View style={styles.monthBars}>
                  <View style={styles.barRow}>
                    <Text style={styles.barTextLabel}>Receitas</Text>
                    <Text style={[styles.barTextValue, { color: colors.positive }]}>
                      {formatCurrency(item.total_receitas)}
                    </Text>
                  </View>

                  <View style={styles.barRow}>
                    <Text style={styles.barTextLabel}>Despesas</Text>
                    <Text style={[styles.barTextValue, { color: colors.negative }]}>
                      {formatCurrency(item.total_despesas)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  yearArrow: {
    paddingHorizontal: spacing.sm,
  },
  yearArrowText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  annualCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  annualLabel: {
    ...typography.label,
  },
  annualTotal: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: spacing.md,
  },
  annualGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  annualCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  colValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  colDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  centerContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  monthCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  monthBalance: {
    fontSize: 14,
    fontWeight: '700',
  },
  monthBars: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTextLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  barTextValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
