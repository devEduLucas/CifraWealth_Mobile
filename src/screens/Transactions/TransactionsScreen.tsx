import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  Eye,
  EyeOff,
  Search,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  List,
  LayoutGrid,
  Check,
  Trash2,
  FileUp,
} from 'lucide-react-native';
import { spacing, radii, useColors, ThemeColors, makeTypography } from '../../theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/format';
import { api, ApiError } from '../../services/api';
import { usePrivacy } from '../../hooks/usePrivacy';
import { Category, Transaction, CategoryType } from '../../types';
import { BankStatementImportModal } from '../../components/transactions/BankStatementImportModal';
import * as Crypto from 'expo-crypto';

interface TransactionsScreenProps {
  route?: any;
  navigation?: any;
}

type TypeFilter = 'all' | 'receita' | 'despesa';
type StatusFilter = 'all' | 'confirmada' | 'pendente';
type Sort = 'recentes' | 'antigas' | 'maior';
type ViewMode = 'compacta' | 'detalhada';
type Row = { kind: 'header'; key: string; label: string } | { kind: 'tx'; key: string; tx: Transaction };

const PAGE_SIZE = 15;
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const SORT_LABEL: Record<Sort, string> = {
  recentes: 'Mais recentes primeiro',
  antigas: 'Mais antigas primeiro',
  maior: 'Maior valor primeiro',
};

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// "2026-11-02..." -> "2 de novembro de 2026"
function dayLabel(date: string) {
  const [y, m, d] = date.split('T')[0].split('-');
  return `${parseInt(d, 10)} de ${MONTHS[parseInt(m, 10) - 1] ?? m} de ${y}`;
}

export function TransactionsScreen({ route, navigation }: TransactionsScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hidden, toggleHidden, money } = usePrivacy();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Busca, filtros, ordenação, visualização e página
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(route?.params?.filter || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>('recentes');
  const [viewMode, setViewMode] = useState<ViewMode>('compacta');
  const [page, setPage] = useState(1);
  const [explainOpen, setExplainOpen] = useState(false);
  const [statementImportVisible, setStatementImportVisible] = useState(false);

  // Folha de filtros (edita um rascunho e aplica ao confirmar)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>('all');
  const [draftCategory, setDraftCategory] = useState<number | null>(null);
  const [draftSort, setDraftSort] = useState<Sort>('recentes');

  // Detalhes de uma transação
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // Nova transação
  const [modalVisible, setModalVisible] = useState(!!route?.params?.openModal);
  const [quickEntry, setQuickEntry] = useState(!!route?.params?.quickEntry);
  const quickRequestIdRef = useRef<string | null>(null);
  const quickRequestDateRef = useRef<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newDescricao, setNewDescricao] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newTipo, setNewTipo] = useState<CategoryType>(route?.params?.filter === 'despesa' ? 'despesa' : 'receita');
  const [newCategoriaId, setNewCategoriaId] = useState<number | null>(null);

  const listRef = useRef<FlatList<Row>>(null);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id_categoria, c])), [categories]);
  const categoryName = (id: number) => categoryById.get(id)?.nome;

  const loadData = useCallback(async () => {
    try {
      const [txs, cats] = await Promise.all([api.listTransactions(), api.listCategories()]);
      setTransactions(txs);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atalhos vindos de outras telas (ex.: "Registrar despesa" no Dashboard), mesmo com esta tela já montada
  const paramOpen = route?.params?.openModal;
  const paramFilter = route?.params?.filter;
  const paramQuickEntry = route?.params?.quickEntry;
  useEffect(() => {
    if (paramFilter) {
      setTypeFilter(paramFilter);
      setPage(1);
    }
    if (paramOpen) {
      setNewTipo(paramFilter === 'despesa' ? 'despesa' : 'receita');
      setQuickEntry(!!paramQuickEntry);
      quickRequestIdRef.current = null;
      quickRequestDateRef.current = null;
      setModalError(null);
      setModalVisible(true);
    }
    if (paramOpen || paramFilter || paramQuickEntry) {
      navigation?.setParams?.({ openModal: undefined, filter: undefined, quickEntry: undefined });
    }
  }, [paramOpen, paramFilter, paramQuickEntry, navigation]);

  // Categoria do formulário sempre do tipo escolhido
  const modalCategories = useMemo(() => categories.filter((c) => c.tipo === newTipo), [categories, newTipo]);
  useEffect(() => {
    if (!modalCategories.some((c) => c.id_categoria === newCategoriaId)) {
      // Prefer the most recently used category for this transaction type.
      const lastUsedCategory = transactions.find(
        (transaction) =>
          transaction.tipo === newTipo &&
          modalCategories.some((category) => category.id_categoria === transaction.id_categoria)
      );
      setNewCategoriaId(lastUsedCategory?.id_categoria ?? modalCategories[0]?.id_categoria ?? null);
    }
  }, [modalCategories, newCategoriaId, transactions, newTipo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Totais: só confirmadas, independente de busca e filtros
  const totals = useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    for (const tx of transactions) {
      if (tx.status !== 'confirmada') continue;
      if (tx.tipo === 'receita') receitas += Number(tx.valor);
      else despesas += Number(tx.valor);
    }
    return { receitas, despesas, resultado: receitas - despesas };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    const list = transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.tipo !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (categoryFilter !== null && tx.id_categoria !== categoryFilter) return false;
      if (q) {
        const haystack = normalize(`${tx.descricao} ${categoryById.get(tx.id_categoria)?.nome ?? ''}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const byDate = (a: Transaction, b: Transaction) =>
      b.data_transacao.localeCompare(a.data_transacao) || b.id_transacao - a.id_transacao;
    if (sort === 'antigas') list.sort((a, b) => -byDate(a, b));
    else if (sort === 'maior') list.sort((a, b) => Number(b.valor) - Number(a.valor));
    else list.sort(byDate);
    return list;
  }, [transactions, search, typeFilter, statusFilter, categoryFilter, sort, categoryById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Agrupa por dia (exceto ao ordenar por valor)
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let last = '';
    for (const tx of pageItems) {
      if (sort !== 'maior') {
        const label = dayLabel(tx.data_transacao);
        if (label !== last) {
          out.push({ kind: 'header', key: `h-${label}-${tx.id_transacao}`, label });
          last = label;
        }
      }
      out.push({ kind: 'tx', key: `t-${tx.id_transacao}`, tx });
    }
    return out;
  }, [pageItems, sort]);

  const activeFilters = Number(statusFilter !== 'all') + Number(categoryFilter !== null) + Number(sort !== 'recentes');

  function openFilters() {
    setDraftStatus(statusFilter);
    setDraftCategory(categoryFilter);
    setDraftSort(sort);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setStatusFilter(draftStatus);
    setCategoryFilter(draftCategory);
    setSort(draftSort);
    setPage(1);
    setFiltersOpen(false);
  }

  function goToPage(next: number) {
    setPage(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function closeTransactionModal() {
    setModalVisible(false);
    setQuickEntry(false);
    quickRequestIdRef.current = null;
    quickRequestDateRef.current = null;
  }

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
      // Keep the same key and date when the user retries after a network timeout.
      // Any edit to the form resets both so the new payload gets a new identity.
      const idempotencyKey = quickRequestIdRef.current ?? Crypto.randomUUID();
      quickRequestIdRef.current = idempotencyKey;
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const today = quickRequestDateRef.current ?? localToday;
      quickRequestDateRef.current = today;

      await api.createTransaction({
        descricao: newDescricao.trim(),
        valor: parsedValor,
        tipo: newTipo,
        id_categoria: newCategoriaId,
        data_transacao: today,
        status: 'confirmada',
      }, idempotencyKey);

      closeTransactionModal();
      setNewDescricao('');
      setNewValor('');
      loadData();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Falha ao salvar a transação.');
    } finally {
      setModalSaving(false);
    }
  }

  function handleDelete(tx: Transaction) {
    Alert.alert('Excluir transação', 'Tem certeza de que deseja remover esta movimentação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            setDetailBusy(true);
            await api.deleteTransaction(tx.id_transacao);
            setTransactions((prev) => prev.filter((t) => t.id_transacao !== tx.id_transacao));
            setSelected(null);
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a transação.');
          } finally {
            setDetailBusy(false);
          }
        },
      },
    ]);
  }

  async function handleConfirm(tx: Transaction) {
    try {
      setDetailBusy(true);
      const updated = await api.updateTransaction(tx.id_transacao, { status: 'confirmada' });
      const next = { ...tx, ...(updated ?? {}), status: 'confirmada' as const };
      setTransactions((prev) => prev.map((t) => (t.id_transacao === tx.id_transacao ? next : t)));
      setSelected(next);
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar a transação.');
    } finally {
      setDetailBusy(false);
    }
  }

  const summaryCard = (
    label: string,
    value: number,
    tint: string,
    border: string,
    tone: string,
    Icon: typeof TrendingUp,
    valueColor: string
  ) => (
    <View style={[styles.summaryCard, { backgroundColor: tint, borderColor: border }]}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryChip, { backgroundColor: tone + '26' }]}>
          <Icon size={14} color={tone} />
        </View>
        <Text style={styles.summaryLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.summaryValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)}
      </Text>
    </View>
  );

  const pendingCount = transactions.filter((t) => t.status === 'pendente').length;

  const listHeader = (
    <View>
      {/* Título e ações */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Transações
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Importar extrato bancário"
          style={styles.iconButton}
          onPress={() => setStatementImportVisible(true)}
        >
          <FileUp size={20} color={colors.textSecondary} />
        </TouchableOpacity>
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
          accessibilityLabel="Nova transação"
          style={styles.addButton}
          onPress={() => {
            setQuickEntry(false);
            quickRequestIdRef.current = null;
            quickRequestDateRef.current = null;
            setModalError(null);
            setModalVisible(true);
          }}
        >
          <Plus size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Totais confirmados */}
      <View style={styles.summaryRow}>
        {summaryCard('Receitas confirmadas', totals.receitas, colors.positiveBg, colors.positive + '40', colors.positive, ArrowDownLeft, colors.positive)}
        {summaryCard('Despesas confirmadas', totals.despesas, colors.negativeBg, colors.negativeBorder, colors.negative, ArrowUpRight, colors.negative)}
      </View>
      <View style={styles.summarySingle}>
        {summaryCard(
          'Resultado confirmado',
          totals.resultado,
          colors.infoBg,
          colors.info + '40',
          colors.info,
          ArrowLeftRight,
          totals.resultado < 0 ? colors.negative : colors.positive
        )}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: explainOpen }}
        onPress={() => setExplainOpen((v) => !v)}
        style={styles.explainToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.explainToggleText}>Como os totais são calculados</Text>
        {explainOpen ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
      </TouchableOpacity>
      {explainOpen ? (
        <Text style={styles.explainText}>
          Os totais somam apenas transações confirmadas e não mudam com a busca ou os filtros.
          {pendingCount > 0
            ? ` Você tem ${pendingCount} ${pendingCount === 1 ? 'transação pendente' : 'transações pendentes'}, que aparece na lista mas ainda não entra na conta.`
            : ' Transações pendentes aparecem na lista, mas não entram na conta.'}
        </Text>
      ) : null}

      {/* Busca e filtros */}
      <Card style={styles.searchCard}>
        <Text style={styles.searchTitle}>Buscar transações</Text>
        <View style={styles.searchRow}>
          <View style={[styles.searchField, searchFocused && styles.searchFieldFocused]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Buscar por descrição ou categoria"
              style={styles.searchInput}
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setPage(1);
              }}
              placeholder="Descrição ou categoria"
              placeholderTextColor={colors.textSubtle}
              selectionColor={colors.primary}
              returnKeyType="search"
              underlineColorAndroid="transparent"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
                onPress={() => {
                  setSearch('');
                  setPage(1);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.filterButton} onPress={openFilters}>
            <SlidersHorizontal size={18} color={colors.text} />
            {activeFilters > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          {([
            ['all', 'Todas'],
            ['receita', 'Receitas'],
            ['despesa', 'Despesas'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: typeFilter === value }}
              style={[styles.tab, typeFilter === value && styles.tabActive]}
              onPress={() => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <Text style={[styles.tabText, typeFilter === value && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Lista: título, visualização e ordenação */}
      <View style={styles.listHeader}>
        <View style={styles.listHeaderText}>
          <Text style={styles.listTitle} accessibilityRole="header">
            Suas movimentações
          </Text>
          <Text style={styles.listSubtitle}>
            {filtered.length} {filtered.length === 1 ? 'transação encontrada' : 'transações encontradas'} no histórico
          </Text>
        </View>
        <View style={styles.viewToggle}>
          {([
            ['compacta', List],
            ['detalhada', LayoutGrid],
          ] as const).map(([mode, Icon]) => (
            <TouchableOpacity
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={mode === 'compacta' ? 'Visualização compacta' : 'Visualização detalhada'}
              accessibilityState={{ selected: viewMode === mode }}
              style={[styles.viewOption, viewMode === mode && styles.viewOptionActive]}
              onPress={() => setViewMode(mode)}
            >
              <Icon size={16} color={viewMode === mode ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={styles.sortText}>{SORT_LABEL[sort]}</Text>
    </View>
  );

  const listFooter =
    filtered.length > 0 ? (
      <View style={styles.pagination}>
        <Text style={styles.paginationText}>
          Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + pageItems.length} de{' '}
          {filtered.length} · Página {currentPage} de {totalPages}
        </Text>
        <View style={styles.paginationButtons}>
          <Button
            title="Anterior"
            variant="secondary"
            disabled={currentPage <= 1}
            onPress={() => goToPage(currentPage - 1)}
            style={styles.pageButton}
          />
          <Button
            title="Próxima"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onPress={() => goToPage(currentPage + 1)}
            style={styles.pageButton}
          />
        </View>
      </View>
    ) : null;

  function renderRow({ item }: { item: Row }) {
    if (item.kind === 'header') {
      return <Text style={styles.dayHeader}>{item.label}</Text>;
    }
    const tx = item.tx;
    const isIncome = tx.tipo === 'receita';
    const tone = isIncome ? colors.positive : colors.negative;
    const category = categoryName(tx.id_categoria);
    const pending = tx.status === 'pendente';
    const amount = hidden ? money(0) : `${isIncome ? '+' : '-'} ${formatCurrency(Math.abs(Number(tx.valor)))}`;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${tx.descricao}, ${category ?? 'sem categoria'}, ${amount}`}
        activeOpacity={0.8}
        onPress={() => setSelected(tx)}
        style={[styles.txCard, { borderLeftColor: tone }, viewMode === 'detalhada' && styles.txCardDetailed]}
      >
        <View style={[styles.txIcon, { backgroundColor: tone + '26' }]}>
          {isIncome ? <ArrowDownLeft size={16} color={tone} /> : <ArrowUpRight size={16} color={tone} />}
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {tx.descricao}
          </Text>
          {viewMode === 'compacta' ? (
            <Text style={styles.txMeta} numberOfLines={1}>
              {category ?? 'Sem categoria'}
              {pending ? ' · Pendente' : ''}
            </Text>
          ) : (
            <View style={styles.txMetaRow}>
              <Text style={styles.txMeta} numberOfLines={1}>
                {category ?? 'Sem categoria'} · {formatDate(tx.data_transacao)}
              </Text>
              <Badge label={pending ? 'Pendente' : 'Confirmada'} variant={pending ? 'warning' : 'positive'} />
            </View>
          )}
        </View>
        <Text style={[styles.txValue, { color: tone }]} numberOfLines={1}>
          {amount}
        </Text>
        <ChevronRight size={16} color={colors.textSubtle} />
      </TouchableOpacity>
    );
  }

  const chip = (label: string, selected: boolean, onPress: () => void, key?: string | number) => (
    <TouchableOpacity
      key={key ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
              <Text style={styles.emptySubtitle}>
                {transactions.length === 0
                  ? 'Registre sua primeira transação para começar.'
                  : 'Não encontramos transações com esta busca ou filtro.'}
              </Text>
            </Card>
          }
        />
      )}

      {/* Filtros */}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setFiltersOpen(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>SITUAÇÃO</Text>
            <View style={styles.categoryChips}>
              {chip('Todas', draftStatus === 'all', () => setDraftStatus('all'))}
              {chip('Confirmadas', draftStatus === 'confirmada', () => setDraftStatus('confirmada'))}
              {chip('Pendentes', draftStatus === 'pendente', () => setDraftStatus('pendente'))}
            </View>

            <Text style={styles.fieldLabel}>CATEGORIA</Text>
            <View style={styles.categoryChips}>
              {chip('Todas', draftCategory === null, () => setDraftCategory(null), 'all')}
              {categories.map((c) =>
                chip(c.nome, draftCategory === c.id_categoria, () => setDraftCategory(c.id_categoria), c.id_categoria)
              )}
            </View>

            <Text style={styles.fieldLabel}>ORDENAR POR</Text>
            <View style={styles.categoryChips}>
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) =>
                chip(SORT_LABEL[s].replace(' primeiro', ''), draftSort === s, () => setDraftSort(s), s)
              )}
            </View>

            <View style={styles.sheetActions}>
              <Button
                title="Limpar"
                variant="secondary"
                onPress={() => {
                  setDraftStatus('all');
                  setDraftCategory(null);
                  setDraftSort('recentes');
                }}
                style={styles.sheetButton}
              />
              <Button title="Aplicar" onPress={applyFilters} style={styles.sheetButton} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Detalhes */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected ? (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setSelected(null)}>
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.detailAmount, { color: selected.tipo === 'receita' ? colors.positive : colors.negative }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {hidden ? money(0) : `${selected.tipo === 'receita' ? '+' : '-'} ${formatCurrency(Math.abs(Number(selected.valor)))}`}
              </Text>
              <Text style={styles.detailTitle}>{selected.descricao}</Text>

              <View style={styles.detailList}>
                {[
                  ['Tipo', selected.tipo === 'receita' ? 'Receita' : 'Despesa'],
                  ['Categoria', categoryName(selected.id_categoria) ?? 'Sem categoria'],
                  ['Data', formatDate(selected.data_transacao)],
                  ['Situação', selected.status === 'pendente' ? 'Pendente' : 'Confirmada'],
                ].map(([label, value], i, arr) => (
                  <View key={label} style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {selected.status === 'pendente' ? (
                <Button
                  title="Marcar como confirmada"
                  icon={<Check size={18} color={colors.textInverse} />}
                  onPress={() => handleConfirm(selected)}
                  loading={detailBusy}
                  style={styles.detailAction}
                />
              ) : null}
              <Button
                title="Excluir transação"
                variant="danger"
                icon={<Trash2 size={18} color={colors.negative} />}
                onPress={() => handleDelete(selected)}
                disabled={detailBusy}
                style={styles.detailAction}
              />
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Nova transação */}
      <Modal key={quickEntry ? 'quick-entry-modal' : 'transaction-modal'} visible={modalVisible} transparent animationType="slide" onRequestClose={closeTransactionModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{quickEntry ? 'Lançamento rápido' : 'Nova Transação'}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={closeTransactionModal}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {modalError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}

            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTipo === 'receita' && { backgroundColor: colors.positiveBg, borderColor: colors.positive },
                ]}
                onPress={() => {
                quickRequestIdRef.current = null;
                quickRequestDateRef.current = null;
                setNewTipo('receita');
              }}
              >
                <TrendingUp size={16} color={newTipo === 'receita' ? colors.positive : colors.textMuted} />
                <Text style={[styles.typeButtonText, newTipo === 'receita' && { color: colors.positive }]}>Receita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTipo === 'despesa' && { backgroundColor: colors.negativeBg, borderColor: colors.negative },
                ]}
                onPress={() => {
                quickRequestIdRef.current = null;
                quickRequestDateRef.current = null;
                setNewTipo('despesa');
              }}
              >
                <TrendingDown size={16} color={newTipo === 'despesa' ? colors.negative : colors.textMuted} />
                <Text style={[styles.typeButtonText, newTipo === 'despesa' && { color: colors.negative }]}>Despesa</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Descrição"
              placeholder="Ex: Supermercado, Salário"
              value={newDescricao}
              onChangeText={(value) => {
                quickRequestIdRef.current = null;
                quickRequestDateRef.current = null;
                setNewDescricao(value);
              }}
            />

            <Input
              label="Valor (R$)"
              placeholder="0,00"
              keyboardType="numeric"
              value={newValor}
              autoFocus={quickEntry}
              onChangeText={(value) => {
                quickRequestIdRef.current = null;
                quickRequestDateRef.current = null;
                setNewValor(value);
              }}
            />

            <Text style={styles.fieldLabel}>CATEGORIA</Text>
            <View style={styles.categoryChips}>
              {modalCategories.length === 0 ? (
                <Text style={styles.emptySubtitle}>Crie uma categoria de {newTipo} primeiro.</Text>
              ) : (
                modalCategories.map((c) =>
                  chip(c.nome, newCategoriaId === c.id_categoria, () => {
                    quickRequestIdRef.current = null;
                    quickRequestDateRef.current = null;
                    setNewCategoriaId(c.id_categoria);
                  }, c.id_categoria)
                )
              )}
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
          <BankStatementImportModal
        visible={statementImportVisible}
        onClose={() => setStatementImportVisible(false)}
        onImported={loadData}
      />
</SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.xxl },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.base,
      paddingBottom: spacing.base,
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
    addButton: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.base,
      borderRadius: radii.full,
      gap: 4,
    },
    addButtonText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },

    summaryRow: { flexDirection: 'row', gap: spacing.sm },
    summarySingle: { marginTop: spacing.sm },
    summaryCard: { flex: 1, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    summaryChip: {
      width: 26,
      height: 26,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryLabel: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
      marginTop: spacing.sm,
      fontVariant: ['tabular-nums'],
    },
    explainToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: spacing.md,
    },
    explainToggleText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    explainText: { fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: spacing.sm },

    searchCard: { marginTop: spacing.base, padding: spacing.base },
    searchTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    searchRow: { flexDirection: 'row', gap: spacing.sm },
    searchField: {
      flex: 1,
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
    },
    searchFieldFocused: { borderColor: colors.primary },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 0,
      backgroundColor: 'transparent',
      // Remove o contorno padrão do navegador (laranja/azul) no web
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null),
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textInverse },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: 3,
      marginTop: spacing.md,
    },
    tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.sm },
    tabActive: { backgroundColor: colors.surface },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.text },

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    listHeaderText: { flex: 1 },
    listTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    listSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      padding: 3,
    },
    viewOption: {
      width: 36,
      height: 32,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewOptionActive: { backgroundColor: colors.primaryLight },
    sortText: { fontSize: 12, color: colors.textSubtle, marginTop: spacing.md },
    dayHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: spacing.base,
      marginBottom: spacing.sm,
    },

    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderLeftWidth: 3,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    txCardDetailed: { paddingVertical: spacing.base },
    txIcon: {
      width: 34,
      height: 34,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txInfo: { flex: 1, minWidth: 0 },
    txTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
    txMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, flexShrink: 1 },
    txValue: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

    pagination: {
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      marginTop: spacing.base,
      paddingTop: spacing.base,
    },
    paginationText: { fontSize: 12, color: colors.textMuted },
    paginationButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    pageButton: { flex: 1, height: 44 },

    emptyCard: { alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.base },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
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
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalErrorBox: {
      backgroundColor: colors.negativeBg,
      borderColor: colors.negative,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.base,
    },
    modalErrorText: { color: colors.negative, fontSize: 12 },
    typeSwitcher: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
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
    typeButtonText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    fieldLabel: { ...typography.label, marginBottom: spacing.xs },
    categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
    categoryChip: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    categoryChipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    categoryChipText: { fontSize: 12, color: colors.textMuted },
    categoryChipTextSelected: { color: colors.primary, fontWeight: '700' },
    modalSubmitButton: { marginTop: spacing.xs },
    sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    sheetButton: { flex: 1 },

    detailAmount: {
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    detailTitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: spacing.lg,
    },
    detailList: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      paddingHorizontal: spacing.base,
      marginBottom: spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    detailLabel: { fontSize: 13, color: colors.textMuted },
    detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    detailAction: { marginTop: spacing.sm },
  });
};
