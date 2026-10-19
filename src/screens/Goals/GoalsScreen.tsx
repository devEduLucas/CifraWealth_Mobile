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
import { Plus, Target, DollarSign, Calendar, Trash2, X } from 'lucide-react-native';
import { colors, spacing, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { FinancialGoal } from '../../types';

interface GoalsScreenProps {
  route?: any;
}

export function GoalsScreen({ route }: GoalsScreenProps) {
  const openOnMount = route?.params?.openModal || false;

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Goal Modal
  const [newModalVisible, setNewModalVisible] = useState(openOnMount);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [dataLimite, setDataLimite] = useState('');
  const [descricao, setDescricao] = useState('');

  // Contribute Modal
  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeSaving, setContributeSaving] = useState(false);
  const [contributeError, setContributeError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const data = await api.listGoals();
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

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
    if (!dataLimite.trim()) {
      setNewError('Informe a data limite (AAAA-MM-DD).');
      return;
    }

    try {
      setNewSaving(true);
      setNewError(null);
      await api.createGoal({
        titulo: titulo.trim(),
        valor_objetivo: alvo,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: dataLimite.trim(),
        descricao: descricao.trim() || undefined,
      });

      setNewModalVisible(false);
      setTitulo('');
      setValorAlvo('');
      setDataLimite('');
      setDescricao('');
      loadGoals();
    } catch (err) {
      if (err instanceof ApiError) {
        setNewError(err.message);
      } else {
        setNewError('Falha ao criar meta.');
      }
    } finally {
      setNewSaving(false);
    }
  }

  async function handleContribute() {
    if (!selectedGoal) return;
    const amount = parseFloat(contributeAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setContributeError('Informe um valor de aporte válido.');
      return;
    }

    try {
      setContributeSaving(true);
      setContributeError(null);
      await api.contributeGoal(selectedGoal.id_meta, amount);

      setContributeModalVisible(false);
      setContributeAmount('');
      setSelectedGoal(null);
      loadGoals();
    } catch (err) {
      if (err instanceof ApiError) {
        setContributeError(err.message);
      } else {
        setContributeError('Falha ao registrar aporte.');
      }
    } finally {
      setContributeSaving(false);
    }
  }

  async function handleDeleteGoal(id: number, goalTitle: string) {
    Alert.alert('Excluir Meta', `Deseja realmente remover a meta "${goalTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGoal(id);
            setGoals((prev) => prev.filter((g) => g.id_meta !== id));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a meta.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Metas</Text>
          <Text style={styles.headerSubtitle}>
            Acompanhe a realização dos seus sonhos
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setNewError(null);
            setNewModalVisible(true);
          }}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova Meta</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => String(item.id_meta)}
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
              <Target size={36} color={colors.warning} />
              <Text style={styles.emptyTitle}>Nenhuma meta ativa</Text>
              <Text style={styles.emptySubtitle}>
                Defina objetivos financeiros como reserva de emergência, viagens ou investimentos.
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const percent =
              item.valor_objetivo > 0
                ? Math.min(100, Math.round((item.valor_atual / item.valor_objetivo) * 100))
                : 0;

            return (
              <Card style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleContainer}>
                    <Text style={styles.goalTitle}>{item.titulo}</Text>
                    {item.descricao ? (
                      <Text style={styles.goalDesc}>{item.descricao}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(item.id_meta, item.titulo)}
                    style={styles.deleteGoalBtn}
                  >
                    <Trash2 size={16} color={colors.textSubtle} />
                  </TouchableOpacity>
                </View>

                {/* Barra de Progresso */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTop}>
                    <Text style={styles.progressLabel}>Progresso</Text>
                    <Text style={styles.progressPercent}>{percent}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percent}%`,
                          backgroundColor:
                            percent >= 100 ? colors.positive : colors.progress,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Detalhes de Valores */}
                <View style={styles.valuesRow}>
                  <View>
                    <Text style={styles.valueMetaLabel}>Acumulado</Text>
                    <Text style={styles.valueCurrent}>
                      {formatCurrency(item.valor_atual)}
                    </Text>
                  </View>
                  <View style={styles.valueRight}>
                    <Text style={styles.valueMetaLabel}>Objetivo</Text>
                    <Text style={styles.valueTarget}>
                      {formatCurrency(item.valor_objetivo)}
                    </Text>
                  </View>
                </View>

                {/* Footer do Card com Ação de Aporte */}
                <View style={styles.cardFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={13} color={colors.textMuted} />
                    <Text style={styles.dateText}>
                      Prazo: {item.data_fim ? formatDate(item.data_fim) : 'Sem prazo'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.contributeButton}
                    onPress={() => {
                      setSelectedGoal(item);
                      setContributeError(null);
                      setContributeAmount('');
                      setContributeModalVisible(true);
                    }}
                  >
                    <DollarSign size={14} color={colors.primary} />
                    <Text style={styles.contributeButtonText}>Aportar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal Nova Meta */}
      <Modal
        visible={newModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Nova Meta</Text>
              <TouchableOpacity onPress={() => setNewModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {newError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{newError}</Text>
              </View>
            )}

            <Input
              label="Título do Objetivo"
              placeholder="Ex: Reserva de Emergência"
              value={titulo}
              onChangeText={setTitulo}
            />

            <Input
              label="Valor Alvo (R$)"
              placeholder="Ex: 10000,00"
              keyboardType="numeric"
              value={valorAlvo}
              onChangeText={setValorAlvo}
            />

            <Input
              label="Data Limite (AAAA-MM-DD)"
              placeholder="Ex: 2026-12-31"
              value={dataLimite}
              onChangeText={setDataLimite}
            />

            <Input
              label="Descrição (Opcional)"
              placeholder="Ex: 6 meses de custo fixo guardados"
              value={descricao}
              onChangeText={setDescricao}
            />

            <Button
              title="Salvar Meta"
              onPress={handleCreateGoal}
              loading={newSaving}
              style={styles.modalSubmitButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Aporte */}
      <Modal
        visible={contributeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContributeModalVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.contributeCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aportar na Meta</Text>
              <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedGoal && (
              <Text style={styles.contributeSubtitle}>
                Adicione saldo para &quot;{selectedGoal.titulo}&quot;
              </Text>
            )}

            {contributeError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{contributeError}</Text>
              </View>
            )}

            <Input
              label="Valor do Aporte (R$)"
              placeholder="Ex: 250,00"
              keyboardType="numeric"
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />

            <Button
              title="Confirmar Aporte"
              onPress={handleContribute}
              loading={contributeSaving}
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
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCard: {
    marginBottom: spacing.md,
    padding: spacing.base,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  goalDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteGoalBtn: {
    padding: spacing.xs,
  },
  progressContainer: {
    marginVertical: spacing.md,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  progressTrack: {
    height: 7,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  valueMetaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  valueCurrent: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  valueRight: {
    alignItems: 'flex-end',
  },
  valueTarget: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 2,
  },
  contributeButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
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
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  contributeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  contributeSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.base,
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
  modalSubmitButton: {
    marginTop: spacing.sm,
  },
});
