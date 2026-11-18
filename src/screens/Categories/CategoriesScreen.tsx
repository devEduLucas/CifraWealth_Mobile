import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  Plus,
  Tag,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Calendar,
} from 'lucide-react-native';
import { spacing, radii, useColors, ThemeColors } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InlineError } from '../../components/common/InlineError';
import { CategoryIcon, CATEGORY_ICONS } from '../../components/common/CategoryIcon';
import { api, ApiError } from '../../services/api';
import { usePrivacy } from '../../hooks/usePrivacy';
import { formatDate } from '../../utils/format';
import { Category, CategoryType, Transaction } from '../../types';

type Tab = 'minhas' | 'analise';
type ViewKind = 'ambos' | 'receita' | 'despesa';
type Period = 'mes' | 'mes_passado' | '30d' | 'ano' | 'tudo';
type RankMode = 'valor' | 'quantidade';

const COLOR_OPTIONS = [
  { name: 'Azul', value: '#2563EB' },
  { name: 'Verde-água', value: '#0D9488' },
  { name: 'Verde', value: '#16A34A' },
  { name: 'Laranja', value: '#EA580C' },
  { name: 'Vermelho', value: '#DC2626' },
  { name: 'Roxo', value: '#9333EA' },
  { name: 'Rosa', value: '#DB2777' },
  { name: 'Cinza', value: '#64748B' },
];

const VIEW_OPTIONS: { value: ViewKind; label: string }[] = [
  { value: 'ambos', label: 'Receitas x despesas' },
  { value: 'receita', label: 'Somente receitas' },
  { value: 'despesa', label: 'Somente despesas' },
];

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'ano', label: 'Este ano' },
  { value: 'tudo', label: 'Todo o período' },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function periodRange(period: Period): { start?: string; end?: string } {
  const now = new Date();
  if (period === 'mes') return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
  if (period === 'mes_passado') {
    return {
      start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (period === '30d') return { start: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), end: iso(now) };
  if (period === 'ano') return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) };
  return {};
}

export function CategoriesScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hidden, toggleHidden, money } = usePrivacy();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('minhas');
  const [section, setSection] = useState<CategoryType | null>(null);

  // Análise
  const [viewKind, setViewKind] = useState<ViewKind>('ambos');
  const [period, setPeriod] = useState<Period>('mes');
  const [rankMode, setRankMode] = useState<RankMode>('valor');
  const [picker, setPicker] = useState<'view' | 'period' | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisId = useRef(0);

  // Nova categoria
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newNome, setNewNome] = useState('');
  const [newTipo, setNewTipo] = useState<CategoryType>('despesa');
  const [newIcone, setNewIcone] = useState('tag');
  const [newCor, setNewCor] = useState(COLOR_OPTIONS[0].value);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadAnalysis = useCallback(async () => {
    const id = ++analysisId.current;
    const { start, end } = periodRange(period);
    try {
      setAnalysisLoading(true);
      const data = await api.listTransactions({ status: 'confirmada', data_inicio: start, data_fim: end });
      if (id !== analysisId.current) return;
      setTxs(data);
      setAnalysisError(null);
    } catch (err) {
      if (id !== analysisId.current) return;
      setAnalysisError(err instanceof ApiError ? err.message : 'Não foi possível carregar a análise.');
    } finally {
      if (id === analysisId.current) setAnalysisLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (tab === 'analise') loadAnalysis();
  }, [tab, loadAnalysis]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
    if (tab === 'analise') loadAnalysis();
  };

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id_categoria, c])), [categories]);
  const toneOf = (c?: Category, fallback?: string) => (c?.cor && HEX.test(c.cor) ? c.cor : fallback ?? colors.primary);

  // Totais e ranking por categoria (somente confirmadas no período)
  const analysis = useMemo(() => {
    const totals = { receita: 0, despesa: 0 };
    const byCat = new Map<number, { id: number; tipo: CategoryType; total: number; count: number }>();
    for (const tx of txs) {
      const value = Number(tx.valor);
      totals[tx.tipo] += value;
      const entry = byCat.get(tx.id_categoria) ?? { id: tx.id_categoria, tipo: tx.tipo, total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      byCat.set(tx.id_categoria, entry);
    }
    const rank = (tipo: CategoryType) =>
      [...byCat.values()]
        .filter((e) => e.tipo === tipo)
        .sort((a, b) => (rankMode === 'valor' ? b.total - a.total : b.count - a.count || b.total - a.total))
        .slice(0, 5)
        .map((e) => ({ ...e, share: totals[tipo] > 0 ? (e.total / totals[tipo]) * 100 : 0 }));
    return { totals, despesas: rank('despesa'), receitas: rank('receita') };
  }, [txs, rankMode]);

  function openCreate(tipo?: CategoryType) {
    setModalError(null);
    setNewNome('');
    setNewIcone('tag');
    setNewCor(COLOR_OPTIONS[0].value);
    setNewTipo(tipo ?? section ?? 'despesa');
    setModalVisible(true);
  }

  async function handleCreateCategory() {
    if (!newNome.trim()) {
      setModalError('Informe o nome da categoria.');
      return;
    }
    try {
      setModalSaving(true);
      setModalError(null);
      await api.createCategory({ nome: newNome.trim(), tipo: newTipo, icone: newIcone, cor: newCor });
      setModalVisible(false);
      loadCategories();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar a categoria.');
    } finally {
      setModalSaving(false);
    }
  }

  function handleDeleteCategory(cat: Category) {
    Alert.alert('Excluir categoria', `Tem certeza que deseja excluir "${cat.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCategory(cat.id_categoria);
            setCategories((prev) => prev.filter((c) => c.id_categoria !== cat.id_categoria));
          } catch (err) {
            Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível excluir a categoria.');
          }
        },
      },
    ]);
  }

  // ---------- Cartão grande por tipo (Minhas categorias) ----------
  const typeCard = (tipo: CategoryType) => {
    const isExpense = tipo === 'despesa';
    const list = categories.filter((c) => c.tipo === tipo);
    const visible = list.slice(0, 6);
    const extra = list.length - visible.length;
    const stops = isExpense ? ['#5B1D31', '#7C2D32', '#98462B'] : ['#0A3F3A', '#0B5A47', '#17795C'];
    const gid = `cwCat-${tipo}`;
    const title = isExpense ? 'Despesas' : 'Receitas';

    return (
      <TouchableOpacity
        key={tipo}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${title.toLowerCase()}, ${list.length} categorias`}
        activeOpacity={0.9}
        onPress={() => setSection(tipo)}
        style={styles.typeCard}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={stops[0]} />
              <Stop offset="0.55" stopColor={stops[1]} />
              <Stop offset="1" stopColor={stops[2]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
          <Circle cx="88%" cy="18%" r="52%" fill="rgba(255,255,255,0.05)" />
          <Circle cx="88%" cy="18%" r="34%" fill="rgba(255,255,255,0.05)" />
        </Svg>

        <View style={styles.typeTop}>
          <View style={styles.typeChip}>
            {isExpense ? <ArrowUpRight size={22} color="#FFFFFF" /> : <ArrowDownLeft size={22} color="#FFFFFF" />}
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {list.length} {list.length === 1 ? 'categoria' : 'categorias'}
            </Text>
          </View>
        </View>

        <Text style={styles.typeTitle}>{title}</Text>
        <Text style={styles.typeSubtitle}>{isExpense ? 'Para onde vai seu dinheiro' : 'De onde vem seu dinheiro'}</Text>

        {list.length === 0 ? (
          <Text style={styles.typeEmpty}>Nenhuma categoria ainda</Text>
        ) : (
          <View style={styles.pills}>
            {visible.map((c) => (
              <View key={c.id_categoria} style={styles.pill}>
                <CategoryIcon name={c.icone} size={15} color="#FFFFFF" />
                <Text style={styles.pillText} numberOfLines={1}>
                  {c.nome}
                </Text>
              </View>
            ))}
            {extra > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.typeFooter}>
          <Text style={styles.typeFooterText}>{isExpense ? 'Ver despesas' : 'Ver receitas'}</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- Lista de um tipo ----------
  const sectionView = (tipo: CategoryType) => {
    const list = categories.filter((c) => c.tipo === tipo);
    return list.length === 0 ? (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Nenhuma categoria de {tipo}</Text>
        <Text style={styles.emptySubtitle}>Crie uma categoria para classificar seus lançamentos.</Text>
        <Button title="Nova categoria" variant="secondary" onPress={() => openCreate(tipo)} style={styles.emptyButton} />
      </Card>
    ) : (
      <Card style={styles.listCard}>
        {list.map((c, idx) => {
          const tone = toneOf(c);
          return (
            <View key={c.id_categoria} style={[styles.catRow, idx < list.length - 1 && styles.catRowBorder]}>
              <View style={[styles.catIcon, { backgroundColor: tone + '26' }]}>
                <CategoryIcon name={c.icone} size={18} color={tone} />
              </View>
              <Text style={styles.catName} numberOfLines={1}>
                {c.nome}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${c.nome}`}
                onPress={() => handleDeleteCategory(c)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color={colors.negative} />
              </TouchableOpacity>
            </View>
          );
        })}
      </Card>
    );
  };

  // ---------- Análise ----------
  const range = periodRange(period);
  const rangeLabel = range.start && range.end ? `${formatDate(range.start)} a ${formatDate(range.end)}` : 'Todo o histórico';
  const showReceitas = viewKind !== 'despesa';
  const showDespesas = viewKind !== 'receita';
  const maxTotal = Math.max(analysis.totals.receita, analysis.totals.despesa, 0);
  const barWidth = (v: number) => (maxTotal > 0 ? `${Math.max((v / maxTotal) * 100, v > 0 ? 3 : 0)}%` : '0%');
  const result = analysis.totals.receita - analysis.totals.despesa;

  const select = (label: string, onPress: () => void, icon?: React.ReactNode) => (
    <TouchableOpacity accessibilityRole="button" style={styles.selectPill} onPress={onPress}>
      {icon}
      <Text style={styles.selectText} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const rankCard = (tipo: CategoryType) => {
    const isExpense = tipo === 'despesa';
    const items = isExpense ? analysis.despesas : analysis.receitas;
    return (
      <Card style={styles.rankCard}>
        <View style={styles.rankHeader}>
          <View style={styles.rankHeaderText}>
            <Text style={styles.rankTitle}>{isExpense ? 'Onde você mais gasta' : 'Onde você mais recebe'}</Text>
            <Text style={styles.rankSubtitle}>{isExpense ? 'Top 5 despesas' : 'Top 5 receitas'}</Text>
          </View>
          <View style={styles.modeToggle}>
            {(['valor', 'quantidade'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: rankMode === m }}
                style={[styles.modeOption, rankMode === m && styles.modeOptionActive]}
                onPress={() => setRankMode(m)}
              >
                <Text style={[styles.modeText, rankMode === m && styles.modeTextActive]}>
                  {m === 'valor' ? 'Por valor' : 'Por qtd.'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.rankEmpty}>
            <BarChart3 size={28} color={colors.textSubtle} />
            <Text style={styles.rankEmptyText}>
              Nenhuma {isExpense ? 'despesa' : 'receita'} confirmada neste período.
            </Text>
          </View>
        ) : (
          items.map((item, idx) => {
            const cat = categoryById.get(item.id);
            const tone = toneOf(cat, isExpense ? colors.negative : colors.positive);
            return (
              <View key={item.id} style={idx > 0 ? styles.rankItem : undefined}>
                <View style={styles.rankLine}>
                  <View style={[styles.rankIcon, { backgroundColor: tone + '26' }]}>
                    <CategoryIcon name={cat?.icone} size={18} color={tone} />
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {idx + 1}. {cat?.nome ?? 'Sem categoria'}
                  </Text>
                  <Text style={styles.rankValue} numberOfLines={1}>
                    {money(item.total)}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(item.share, 100)}%`, backgroundColor: tone }]} />
                </View>
                <View style={styles.rankMeta}>
                  <Text style={styles.rankMetaText}>
                    {item.count} {item.count === 1 ? 'lançamento confirmado' : 'lançamentos confirmados'}
                  </Text>
                  <Text style={styles.rankMetaText}>{Math.round(item.share)}% do valor</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>
    );
  };

  const analysisView = (
    <View>
      <View style={styles.selectRow}>
        {select(VIEW_OPTIONS.find((o) => o.value === viewKind)!.label, () => setPicker('view'))}
        {select(PERIOD_OPTIONS.find((o) => o.value === period)!.label, () => setPicker('period'), <Calendar size={16} color={colors.textMuted} />)}
      </View>

      <View style={styles.rangeRow}>
        <Text style={styles.sectionTitle}>Receitas x despesas</Text>
        <Text style={styles.rangeText}>{rangeLabel}</Text>
      </View>

      {analysisError && txs.length === 0 ? (
        <InlineError message={analysisError} onRetry={loadAnalysis} />
      ) : analysisLoading && txs.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            {showReceitas ? (
              <View style={styles.summaryItem}>
                <View style={styles.summaryTop}>
                  <View style={styles.summaryLabelRow}>
                    <ArrowDownLeft size={16} color={colors.positive} />
                    <Text style={styles.summaryLabel}>Receitas</Text>
                  </View>
                  <Text style={styles.summaryValue}>{money(analysis.totals.receita)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: barWidth(analysis.totals.receita) as any, backgroundColor: colors.positive }]} />
                </View>
              </View>
            ) : null}
            {showDespesas ? (
              <View style={styles.summaryItem}>
                <View style={styles.summaryTop}>
                  <View style={styles.summaryLabelRow}>
                    <ArrowUpRight size={16} color={colors.negative} />
                    <Text style={styles.summaryLabel}>Despesas</Text>
                  </View>
                  <Text style={styles.summaryValue}>{money(analysis.totals.despesa)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: barWidth(analysis.totals.despesa) as any, backgroundColor: colors.negative }]} />
                </View>
              </View>
            ) : null}
            {viewKind === 'ambos' ? (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Resultado do período</Text>
                <Text style={[styles.resultValue, { color: result < 0 ? colors.negative : colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                  {money(result)}
                </Text>
              </View>
            ) : null}
          </Card>

          {showDespesas ? rankCard('despesa') : null}
          {showReceitas ? rankCard('receita') : null}
        </>
      )}
    </View>
  );

  const headerTitle = section ? (section === 'despesa' ? 'Despesas' : 'Receitas') : 'Categorias';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        {section ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar para categorias"
            style={styles.iconButton}
            onPress={() => setSection(null)}
          >
            <ChevronLeft size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {headerTitle}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          style={styles.iconButton}
          onPress={toggleHidden}
        >
          {hidden ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Nova categoria" style={styles.addButton} onPress={() => openCreate()}>
          <Plus size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {!section ? (
        <View style={styles.tabs}>
          {([
            ['minhas', 'Minhas categorias', Tag],
            ['analise', 'Análise', BarChart3],
          ] as const).map(([value, label, Icon]) => {
            const active = tab === value;
            return (
              <TouchableOpacity
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setTab(value)}
              >
                <Icon size={16} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loadError && categories.length === 0 ? (
            <InlineError message={loadError} onRetry={loadCategories} />
          ) : section ? (
            sectionView(section)
          ) : tab === 'minhas' ? (
            <>
              {typeCard('despesa')}
              {typeCard('receita')}
            </>
          ) : (
            analysisView
          )}
        </ScrollView>
      )}

      {/* Seletor (tipo de análise / período) */}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{picker === 'view' ? 'Exibir' : 'Período'}</Text>
            {(picker === 'view' ? VIEW_OPTIONS : PERIOD_OPTIONS).map((opt) => {
              const selected = picker === 'view' ? viewKind === opt.value : period === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={styles.optionRow}
                  onPress={() => {
                    if (picker === 'view') setViewKind(opt.value as ViewKind);
                    else setPeriod(opt.value as Period);
                    setPicker(null);
                  }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label}</Text>
                  {selected ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Nova categoria */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nova categoria</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {modalError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Nome da categoria</Text>
              <TextInput
                style={[styles.nameInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={newNome}
                onChangeText={setNewNome}
                placeholder="Ex: Alimentação"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                maxLength={40}
                underlineColorAndroid="transparent"
              />

              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeSwitcher}>
                {([
                  ['despesa', 'Despesa', colors.negative, colors.negativeBg],
                  ['receita', 'Receita', colors.positive, colors.positiveBg],
                ] as const).map(([value, label, tone, bg]) => {
                  const active = newTipo === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.typeOption, active && { backgroundColor: bg, borderColor: tone }]}
                      onPress={() => setNewTipo(value)}
                    >
                      <Text style={[styles.typeOptionText, active && { color: tone }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.preview}>
                <View style={[styles.previewIcon, { backgroundColor: newCor + '26' }]}>
                  <CategoryIcon name={newIcone} size={20} color={newCor} />
                </View>
                <View style={styles.previewText}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {newNome.trim() || 'Sua categoria'}
                  </Text>
                  <Text style={styles.previewMeta}>{newTipo === 'despesa' ? 'Despesa' : 'Receita'} · prévia</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Ícone</Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICONS.map(({ key, label }) => {
                  const active = newIcone === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: active }}
                      style={[styles.iconOption, active && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                      onPress={() => setNewIcone(key)}
                    >
                      <CategoryIcon name={key} size={20} color={active ? colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Cor da categoria</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((c) => {
                  const active = newCor === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      accessibilityRole="button"
                      accessibilityLabel={c.name}
                      accessibilityState={{ selected: active }}
                      style={[styles.colorOption, active && { borderColor: colors.text }]}
                      onPress={() => setNewCor(c.value)}
                    >
                      <View style={[styles.colorDot, { backgroundColor: c.value }]}>
                        {active ? <Check size={16} color="#FFFFFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sheetActions}>
                <Button title="Cancelar" variant="secondary" onPress={() => setModalVisible(false)} style={styles.sheetButton} />
                <Button title="Salvar" onPress={handleCreateCategory} loading={modalSaving} style={styles.sheetButton} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    centerBox: { paddingVertical: spacing.xl, alignItems: 'center' },
    content: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },

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
    addButton: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.base,
      borderRadius: radii.full,
    },
    addButtonText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },

    tabs: {
      flexDirection: 'row',
      marginHorizontal: spacing.screenPadding,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    tabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      marginRight: spacing.lg,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -1,
    },
    tabItemActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.primary },

    // Cartão por tipo
    typeCard: {
      borderRadius: radii.xl,
      overflow: 'hidden',
      padding: spacing.lg,
      marginBottom: spacing.base,
    },
    typeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    typeChip: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPill: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    countPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
    typeTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: spacing.lg, letterSpacing: -0.4 },
    typeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    typeEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: spacing.base },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.base },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '100%',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    pillText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },
    typeFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.22)',
      marginTop: spacing.base,
      paddingTop: spacing.base,
    },
    typeFooterText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

    // Lista de um tipo
    listCard: { paddingVertical: 0, paddingHorizontal: spacing.base },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    catRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
    catIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    catName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    emptyButton: { height: 44, marginTop: spacing.base, alignSelf: 'stretch' },

    // Análise
    selectRow: { flexDirection: 'row', gap: spacing.sm },
    selectPill: {
      flex: 1,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
    },
    selectText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    rangeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    rangeText: { fontSize: 12, color: colors.textMuted },
    summaryCard: { padding: spacing.base },
    summaryItem: { marginBottom: spacing.base },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    summaryValue: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    track: { height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radii.full, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radii.full },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: spacing.base,
    },
    resultLabel: { fontSize: 14, color: colors.textMuted },
    resultValue: { flexShrink: 1, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },

    rankCard: { padding: spacing.base },
    rankHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.base },
    rankHeaderText: { flex: 1 },
    rankTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    rankSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: 3,
    },
    modeOption: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.sm },
    modeOptionActive: { backgroundColor: colors.surface },
    modeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    modeTextActive: { color: colors.primary },
    rankItem: { marginTop: spacing.base },
    rankLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    rankIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    rankName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    rankValue: { fontSize: 14, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    rankMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: spacing.sm },
    rankMetaText: { fontSize: 11, color: colors.textMuted },
    rankEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    rankEmptyText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },

    // Modais
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '92%',
    },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
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
    modalErrorBox: {
      backgroundColor: colors.negativeBg,
      borderColor: colors.negative,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.base,
    },
    modalErrorText: { color: colors.negative, fontSize: 12 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.base, marginBottom: spacing.sm },
    nameInput: {
      height: 50,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.base,
      color: colors.text,
      fontSize: 15,
    },
    typeSwitcher: { flexDirection: 'row', gap: spacing.sm },
    typeOption: {
      flex: 1,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    typeOptionText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginTop: spacing.base,
    },
    previewIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    previewText: { flex: 1 },
    previewName: { fontSize: 15, fontWeight: '700', color: colors.text },
    previewMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    iconOption: {
      width: '15.5%',
      aspectRatio: 1,
      minWidth: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDot: { width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    sheetButton: { flex: 1 },
  });
