import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  X,
  Calendar,
  CheckCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatShortDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { Category, Transaction, CategoryType } from '../../types';

interface TransactionsScreenProps {
  route?: any;
}

export function TransactionsScreen({ route }: TransactionsScreenProps) {
  const initialFilter = route?.params?.filter || 'all';
  const openOnMount = route?.params?.openModal || false;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>(initialFilter);

  // New Transaction Modal State
  const [modalVisible, setModalVisible] = useState(openOnMount);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newDescricao, setNewDescricao] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newTipo, setNewTipo] = useState<CategoryType>(
    initialFilter === 'despesa' ? 'despesa' : 'receita'
  );
  const [newCategoriaId, setNewCategoriaId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [txs, cats] = await Promise.all([
        api.listTransactions(),
        api.listCategories(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      if (cats.length > 0 && !newCategoriaId) {
        setNewCategoriaId(cats[0].id_categoria);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [newCategoriaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.tipo === filterType;
  });

  const totalFiltered = filteredTransactions.reduce((acc, tx) => {
    return tx.tipo === 'receita' ? acc + tx.valor : acc - tx.valor;
  }, 0);

  async function handleCreateTransaction() {
    const parsedValor = parseFloat(newValor.replace(',', '.'));
    if (!newDescricao.trim()) {
      setModalError('Informe a descrição.');
      return;
    }
    if (isNaN(parsedValor) || parsedValor <= 0) {
      setModalError('Informe um valor válido maior que zero.');
      return;
    }
    if (!newCategoriaId) {
      setModalError('Selecione uma categoria.');
      return;
    }

    try {
      setModalSaving(true);
      setModalError(null);
      const today = new Date().toISOString().split('T')[0];
      await api.createTransaction({
        descricao: newDescricao.trim(),
        valor: parsedValor,
        tipo: newTipo,
        id_categoria: newCategoriaId,
        data: today,
        status: 'confirmada',
      });

      setModalVisible(false);
      setNewDescricao('');
      setNewValor('');
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('Falha ao salvar a transação.');
      }
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDeleteTransaction(id: number) {
    Alert.alert(
      'Excluir transação',
      'Tem certeza de que deseja remover esta movimentação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTransaction(id);
              setTransactions((prev) => prev.filter((t) => t.id_transacao !== id));
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir a transação.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transações</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTransactions.length} movimentações encontradas
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalError(null);
            setModalVisible(true);
          }}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, filterType === 'all' && styles.tabActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.tabText, filterType === 'all' && styles.tabTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterType === 'receita' && styles.tabActive]}
          onPress={() => setFilterType('receita')}
        >
          <Text style={[styles.tabText, filterType === 'receita' && styles.tabTextActive]}>
            Receitas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterType === 'despesa' && styles.tabActive]}
          onPress={() => setFilterType('despesa')}
        >
          <Text style={[styles.tabText, filterType === 'despesa' && styles.tabTextActive]}>
            Despesas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Balanço Filtrado */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLabel}>Total no filtro:</Text>
        <Text
          style={[
            styles.summaryAmount,
            { color: totalFiltered >= 0 ? colors.positive : colors.negative },
          ]}
        >
          {formatCurrency(totalFiltered)}
        </Text>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => String(item.id_transacao)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
              <Text style={styles.emptySubtitle}>
                Não encontramos transações com este filtro.
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const isIncome = item.tipo === 'receita';
            return (
              <Card style={styles.txCard}>
                <View style={styles.txRow}>
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isIncome
                          ? colors.positiveBg
                          : colors.negativeBg,
                      },
                    ]}
                  >
                    {isIncome ? (
                      <TrendingUp size={18} color={colors.positive} />
                    ) : (
                      <TrendingDown size={18} color={colors.negative} />
                    )}
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>{item.descricao}</Text>
                    <View style={styles.txMeta}>
                      <Text style={styles.txDate}>
                        {formatShortDate(item.data_transacao)}
                      </Text>
                      {item.categoria?.nome && (
                        <Text style={styles.txCategory}>
                          • {item.categoria.nome}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txValue,
                        { color: isIncome ? colors.positive : colors.text },
                      ]}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(Math.abs(item.valor))}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(item.id_transacao)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={15} color={colors.textSubtle} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal Nova Transação */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Transação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {modalError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}

            {/* Type Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTipo === 'receita' && { backgroundColor: colors.positiveBg, borderColor: colors.positive },
                ]}
                onPress={() => setNewTipo('receita')}
              >
                <TrendingUp size={16} color={newTipo === 'receita' ? colors.positive : colors.textMuted} />
                <Text style={[styles.typeButtonText, newTipo === 'receita' && { color: colors.positive }]}>
                  Receita
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTipo === 'despesa' && { backgroundColor: colors.negativeBg, borderColor: colors.negative },
                ]}
                onPress={() => setNewTipo('despesa')}
              >
                <TrendingDown size={16} color={newTipo === 'despesa' ? colors.negative : colors.textMuted} />
                <Text style={[styles.typeButtonText, newTipo === 'despesa' && { color: colors.negative }]}>
                  Despesa
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Descrição"
              placeholder="Ex: Supermercado, Salário"
              value={newDescricao}
              onChangeText={setNewDescricao}
            />

            <Input
              label="Valor (R$)"
              placeholder="0,00"
              keyboardType="numeric"
              value={newValor}
              onChangeText={setNewValor}
            />

            {/* Categoria Select */}
            <Text style={styles.fieldLabel}>CATEGORIA</Text>
            <View style={styles.categoryChips}>
              {categories.map((c) => {
                const isSelected = newCategoriaId === c.id_categoria;
                return (
                  <TouchableOpacity
                    key={c.id_categoria}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setNewCategoriaId(c.id_categoria)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {c.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Salvar movimentação"
              onPress={handleCreateTransaction}
              loading={modalSaving}
              style={styles.modalSubmitButton}
            />
          </View>
        </View>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: 4,
  },
  addButtonText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.screenPadding,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  txCategory: {
    fontSize: 12,
    color: colors.textSubtle,
    marginLeft: 4,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalErrorBox: {
    backgroundColor: colors.negativeBg,
    borderColor: colors.negative,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  modalErrorText: {
    color: colors.negative,
    fontSize: 12,
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  categoryChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalSubmitButton: {
    marginTop: spacing.xs,
  },
});
