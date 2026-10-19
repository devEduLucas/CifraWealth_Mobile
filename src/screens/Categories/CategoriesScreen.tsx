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
import { Plus, Tag, Trash2, X, Check } from 'lucide-react-native';
import { colors, spacing, radii } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { api, ApiError } from '../../services/api';
import { Category, CategoryType } from '../../types';

export function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryType>('despesa');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newNome, setNewNome] = useState('');
  const [newTipo, setNewTipo] = useState<CategoryType>('despesa');
  const [selectedColor, setSelectedColor] = useState('#10B981');

  const COLOR_OPTIONS = [
    '#10B981', '#3B82F6', '#EF4444', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ];

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.listCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const filteredCategories = categories.filter((c) => c.tipo === activeTab);

  async function handleCreateCategory() {
    if (!newNome.trim()) {
      setModalError('Informe o nome da categoria.');
      return;
    }

    try {
      setModalSaving(true);
      setModalError(null);
      await api.createCategory({
        nome: newNome.trim(),
        tipo: newTipo,
        cor: selectedColor,
      });

      setModalVisible(false);
      setNewNome('');
      loadCategories();
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(err.message);
      } else {
        setModalError('Não foi possível cadastrar a categoria.');
      }
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    Alert.alert(
      'Excluir Categoria',
      `Tem certeza que deseja excluir a categoria "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCategory(id);
              setCategories((prev) => prev.filter((c) => c.id_categoria !== id));
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Categorias</Text>
          <Text style={styles.headerSubtitle}>
            Organize suas despesas e receitas
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalError(null);
            setNewTipo(activeTab);
            setModalVisible(true);
          }}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Type Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'despesa' && styles.tabActive]}
          onPress={() => setActiveTab('despesa')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'despesa' && styles.tabTextActive,
            ]}
          >
            Categorias de Despesa ({categories.filter((c) => c.tipo === 'despesa').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'receita' && styles.tabActive]}
          onPress={() => setActiveTab('receita')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'receita' && styles.tabTextActive,
            ]}
          >
            Categorias de Receita ({categories.filter((c) => c.tipo === 'receita').length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => String(item.id_categoria)}
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
              <Text style={styles.emptyTitle}>Nenhuma categoria encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Crie uma categoria para classificar seus lançamentos.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.catCard}>
              <View style={styles.catRow}>
                <View
                  style={[
                    styles.catColorCircle,
                    { backgroundColor: item.cor || colors.primary },
                  ]}
                >
                  <Tag size={16} color="#FFFFFF" />
                </View>

                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{item.nome}</Text>
                  <Text style={styles.catType}>
                    {item.tipo === 'receita' ? 'Entrada' : 'Saída'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteCategory(item.id_categoria, item.nome)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      {/* Modal Nova Categoria */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Categoria</Text>
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
                  newTipo === 'despesa' && { backgroundColor: colors.negativeBg, borderColor: colors.negative },
                ]}
                onPress={() => setNewTipo('despesa')}
              >
                <Text style={[styles.typeButtonText, newTipo === 'despesa' && { color: colors.negative }]}>
                  Despesa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTipo === 'receita' && { backgroundColor: colors.positiveBg, borderColor: colors.positive },
                ]}
                onPress={() => setNewTipo('receita')}
              >
                <Text style={[styles.typeButtonText, newTipo === 'receita' && { color: colors.positive }]}>
                  Receita
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Nome da Categoria"
              placeholder="Ex: Alimentação, Transporte"
              value={newNome}
              onChangeText={setNewNome}
            />

            <Text style={styles.colorLabel}>COR IDENTIFICADORA</Text>
            <View style={styles.colorPalette}>
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }]}
                    onPress={() => setSelectedColor(c)}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Cadastrar Categoria"
              onPress={handleCreateCategory}
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
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
  catCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catColorCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  catType: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
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
    alignItems: 'center',
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
  colorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitButton: {
    marginTop: spacing.xs,
  },
});
