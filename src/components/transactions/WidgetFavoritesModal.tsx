import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pencil, Plus, Star, Trash2, X } from 'lucide-react-native';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { spacing, radii, useColors, ThemeColors } from '../../theme';
import { api, ApiError } from '../../services/api';
import { Category, WidgetFavorite, WidgetFavoriteInput } from '../../types';
import { setCifraWidgetFavorites } from '../../../modules/cifra-widget';

interface WidgetFavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
}

export function WidgetFavoritesModal({ visible, onClose, categories }: WidgetFavoritesModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [favorites, setFavorites] = useState<WidgetFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.tipo === type),
    [categories, type]
  );

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id_categoria === categoryId)) {
      setCategoryId(filteredCategories[0]?.id_categoria ?? null);
    }
  }, [filteredCategories, categoryId]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    api.listWidgetFavorites()
      .then(setFavorites)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os favoritos.'))
      .finally(() => setLoading(false));
  }, [visible]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setAmount('');
    setType('despesa');
    setCategoryId(null);
    setError(null);
  }

  function editFavorite(favorite: WidgetFavorite) {
    setEditingId(favorite.id_widget_favorite);
    setTitle(favorite.titulo);
    setDescription(favorite.descricao);
    setAmount(favorite.valor.toFixed(2).replace('.', ','));
    setType(favorite.tipo);
    setCategoryId(favorite.id_categoria);
    setError(null);
  }

  async function syncFavorites(next: WidgetFavorite[]) {
    setFavorites(next);
    await setCifraWidgetFavorites(next);
  }

  async function saveFavorite() {
    const parsedAmount = Number(amount.trim().replace(/\./g, '').replace(',', '.'));
    if (!title.trim()) {
      setError('Informe um nome para o favorito.');
      return;
    }
    if (!description.trim()) {
      setError('Informe a descrição que será registrada na transação.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || Math.round(parsedAmount * 100) !== parsedAmount * 100) {
      setError('Informe um valor válido com até duas casas decimais.');
      return;
    }
    if (!categoryId) {
      setError('Crie ou selecione uma categoria para este tipo de movimentação.');
      return;
    }

    const payload: WidgetFavoriteInput = {
      titulo: title.trim(),
      descricao: description.trim(),
      valor: parsedAmount,
      tipo: type,
      id_categoria: categoryId,
    };

    try {
      setSaving(true);
      setError(null);
      if (editingId !== null) {
        await api.updateWidgetFavorite(editingId, payload);
      } else {
        await api.createWidgetFavorite(payload);
      }
      const next = await api.listWidgetFavorites();
      await syncFavorites(next);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o favorito.');
    } finally {
      setSaving(false);
    }
  }

  async function removeFavorite(id: number) {
    try {
      setSaving(true);
      setError(null);
      await api.deleteWidgetFavorite(id);
      const next = await api.listWidgetFavorites();
      await syncFavorites(next);
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover o favorito.');
    } finally {
      setSaving(false);
    }
  }

  const formatAmount = (value: string) => value.replace(/[^0-9,]/g, '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Star size={20} color={colors.primary} />
              <Text style={styles.title}>Favoritos do widget</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Toque em um favorito na tela inicial para registrar essa movimentação sem abrir o CifraWealth.
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Seus favoritos ({favorites.length}/4)</Text>
                </View>

                {favorites.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum favorito configurado. Crie o primeiro abaixo.</Text>
                ) : (
                  favorites.map((favorite) => (
                    <View key={favorite.id_widget_favorite} style={styles.favoriteRow}>
                      <View style={styles.favoriteInfo}>
                        <Text style={styles.favoriteTitle}>{favorite.titulo}</Text>
                        <Text style={styles.favoriteMeta}>
                          {favorite.tipo === 'despesa' ? 'Despesa' : 'Receita'} · {favorite.categoria_nome} · R$ {favorite.valor.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${favorite.titulo}`}
                        style={styles.smallIconButton}
                        onPress={() => editFavorite(favorite)}
                      >
                        <Pencil size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir ${favorite.titulo}`}
                        style={styles.smallIconButton}
                        disabled={saving}
                        onPress={() => removeFavorite(favorite.id_widget_favorite)}
                      >
                        <Trash2 size={16} color={colors.negative} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <View style={styles.formHeader}>
                  <Text style={styles.sectionTitle}>{editingId ? 'Editar favorito' : 'Adicionar favorito'}</Text>
                  {editingId !== null ? (
                    <TouchableOpacity onPress={resetForm}>
                      <Text style={styles.cancelEdit}>Cancelar edição</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeButton, type === 'despesa' && styles.expenseSelected]}
                    onPress={() => setType('despesa')}
                  >
                    <Text style={[styles.typeText, type === 'despesa' && styles.expenseText]}>Despesa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, type === 'receita' && styles.incomeSelected]}
                    onPress={() => setType('receita')}
                  >
                    <Text style={[styles.typeText, type === 'receita' && styles.incomeText]}>Receita</Text>
                  </TouchableOpacity>
                </View>

                <Input label="Nome no widget" value={title} onChangeText={setTitle} placeholder="Ex.: Café" maxLength={30} />
                <Input label="Descrição da transação" value={description} onChangeText={setDescription} placeholder="Ex.: Café da manhã" maxLength={120} />
                <Input
                  label="Valor fixo (R$)"
                  value={amount}
                  onChangeText={(value) => setAmount(formatAmount(value))}
                  placeholder="Ex.: 12,50"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>CATEGORIA</Text>
                <View style={styles.categoryWrap}>
                  {filteredCategories.map((category) => {
                    const selected = category.id_categoria === categoryId;
                    return (
                      <TouchableOpacity
                        key={category.id_categoria}
                        style={[styles.categoryChip, selected && styles.categorySelected]}
                        onPress={() => setCategoryId(category.id_categoria)}
                      >
                        <Text style={[styles.categoryText, selected && styles.categorySelectedText]}>{category.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {filteredCategories.length === 0 ? (
                  <Text style={styles.emptyText}>Não há categorias de {type === 'despesa' ? 'despesa' : 'receita'}. Crie uma antes de configurar o favorito.</Text>
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button
                  title={saving ? 'Salvando...' : editingId ? 'Atualizar favorito' : 'Adicionar ao widget'}
                  onPress={saveFavorite}
                  loading={saving}
                  disabled={saving || loading || favorites.length >= 4 && editingId === null}
                  icon={<Plus size={18} color={colors.textInverse} />}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.xl, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, paddingVertical: spacing.sm },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  favoriteInfo: { flex: 1, gap: 3 },
  favoriteTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  favoriteMeta: { color: colors.textMuted, fontSize: 11 },
  smallIconButton: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  formHeader: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelEdit: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeButton: {
    flex: 1, height: 40, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  expenseSelected: { backgroundColor: colors.negativeBg, borderColor: colors.negative },
  incomeSelected: { backgroundColor: colors.positiveBg, borderColor: colors.positive },
  typeText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  expenseText: { color: colors.negative },
  incomeText: { color: colors.positive },
  fieldLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '800', letterSpacing: 0.6 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  categorySelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  categoryText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  categorySelectedText: { color: colors.primary, fontWeight: '800' },
  error: { color: colors.negative, fontSize: 12, lineHeight: 18 },
});
