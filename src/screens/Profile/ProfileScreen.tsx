import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  KeyRound,
  Palette,
  Check,
  Sun,
  Moon,
} from 'lucide-react-native';
import { spacing, radii, useColors, useTheme, ThemeColors } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../services/storage';
import { ProfileStyle } from '../../types';

const PALETTE = [
  { name: 'Azul', value: '#2563EB' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Índigo', value: '#4F46E5' },
  { name: 'Violeta', value: '#7C3AED' },
  { name: 'Esmeralda', value: '#059669' },
  { name: 'Âmbar', value: '#D97706' },
  { name: 'Vinho', value: '#9F1239' },
  { name: 'Grafite', value: '#334155' },
];

const DEFAULT_STYLE: ProfileStyle = {
  banner: PALETTE[0].value,
  avatar: PALETTE[1].value,
  headline: '',
};

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '••••••••';
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

export function ProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, authMethod, logout, deleteAccount } = useAuth();
  const { name: themeName, setTheme } = useTheme();

  const [style, setStyle] = useState<ProfileStyle>(DEFAULT_STYLE);
  const [draft, setDraft] = useState<ProfileStyle>(DEFAULT_STYLE);
  const [editing, setEditing] = useState(false);
  const [emailHidden, setEmailHidden] = useState(true);
  const [dialog, setDialog] = useState<'logout' | 'delete' | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fullName = [user?.nome, user?.sobrenome].filter(Boolean).join(' ') || 'Usuário';
  const email = user?.email || '';
  const shown = editing ? draft : style;

  useEffect(() => {
    if (!user) return;
    storage.getProfileStyle(user.id_usuario).then((saved) => {
      if (saved) setStyle({ ...DEFAULT_STYLE, ...saved });
    });
  }, [user?.id_usuario]);

  function openEditor() {
    setDraft(style);
    setEditing(true);
  }

  async function saveEditor() {
    const next = { ...draft, headline: draft.headline.trim() };
    setStyle(next);
    setEditing(false);
    if (user) await storage.setProfileStyle(user.id_usuario, next);
  }

  function openDialog(kind: 'logout' | 'delete') {
    setDialogError(null);
    setDialog(kind);
  }

  async function confirmDialog() {
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog === 'logout') await logout();
      else await deleteAccount();
      // Com sucesso a sessão some e esta tela é desmontada
    } catch (e) {
      setDialogError(
        e instanceof Error && e.message
          ? e.message
          : dialog === 'delete'
            ? 'Não foi possível excluir a conta. Tente novamente.'
            : 'Não foi possível encerrar a sessão. Tente novamente.'
      );
      setDialogBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner + avatar */}
        <View style={[styles.banner, { backgroundColor: shown.banner }]}>
          <TouchableOpacity style={styles.editChip} onPress={openEditor} activeOpacity={0.85}>
            <Palette size={14} color="#FFFFFF" />
            <Text style={styles.editChipText}>Personalizar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: shown.avatar }]}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          {shown.headline ? <Text style={styles.headline}>{shown.headline}</Text> : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Mail size={18} color={colors.primary} />
                <View style={styles.rowTexts}>
                  <Text style={styles.rowLabel}>E-mail</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {emailHidden ? maskEmail(email) : email}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setEmailHidden((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={emailHidden ? 'Mostrar e-mail' : 'Ocultar e-mail'}
              >
                {emailHidden ? (
                  <Eye size={20} color={colors.textMuted} />
                ) : (
                  <EyeOff size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                {authMethod === 'google' ? (
                  <GoogleIcon size={18} />
                ) : (
                  <KeyRound size={18} color={colors.info} />
                )}
                <View style={styles.rowTexts}>
                  <Text style={styles.rowLabel}>Forma de acesso</Text>
                  <Text style={styles.rowValue}>
                    {authMethod === 'google'
                      ? 'Conta Google'
                      : authMethod === 'email'
                        ? 'E-mail e senha'
                        : 'Não identificada'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Aparência</Text>
          <Card style={styles.card}>
            <View style={styles.themeRow}>
              {([
                { value: 'light', label: 'Claro', Icon: Sun },
                { value: 'dark', label: 'Escuro', Icon: Moon },
              ] as const).map(({ value, label, Icon }) => {
                const selected = themeName === value;
                return (
                  <TouchableOpacity
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTheme(value)}
                    activeOpacity={0.85}
                    style={[styles.themeOption, selected && styles.themeOptionSelected]}
                  >
                    <Icon size={18} color={selected ? colors.textInverse : colors.textMuted} />
                    <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <Button
            title="Encerrar sessão"
            variant="secondary"
            icon={<LogOut size={18} color={colors.textSecondary} />}
            onPress={() => openDialog('logout')}
            style={styles.logoutButton}
          />

          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Zona de risco</Text>
          <Button
            title="Excluir conta"
            variant="danger"
            icon={<Trash2 size={18} color={colors.negative} />}
            onPress={() => openDialog('delete')}
          />
          <Text style={styles.dangerHint}>
            Apaga sua conta e todos os dados permanentemente.
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={dialog === 'logout'}
        title="Encerrar sessão"
        message="Deseja realmente sair da sua conta neste aparelho?"
        confirmLabel="Encerrar"
        loading={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Excluir conta"
        message="Todos os seus dados (transações, categorias e metas) serão apagados permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir conta"
        destructive
        confirmWord="EXCLUIR"
        loading={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />

      {/* Editor de personalização */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={() => setEditing(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Personalizar perfil</Text>

            <Text style={styles.fieldLabel}>Cor do banner</Text>
            <View style={styles.swatches}>
              {PALETTE.map((c) => (
                <Swatch
                  key={c.value}
                  color={c.value}
                  label={c.name}
                  selected={draft.banner === c.value}
                  onPress={() => setDraft((d) => ({ ...d, banner: c.value }))}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Cor do avatar</Text>
            <View style={styles.swatches}>
              {PALETTE.map((c) => (
                <Swatch
                  key={c.value}
                  color={c.value}
                  label={c.name}
                  selected={draft.avatar === c.value}
                  onPress={() => setDraft((d) => ({ ...d, avatar: c.value }))}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Cargo ou ocupação</Text>
            <TextInput
              style={styles.input}
              value={draft.headline}
              onChangeText={(t) => setDraft((d) => ({ ...d, headline: t }))}
              placeholder="Ex.: Analista Financeiro"
              placeholderTextColor={colors.textSubtle}
              maxLength={40}
            />

            <View style={styles.sheetActions}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setEditing(false)}
                style={styles.sheetButton}
              />
              <Button title="Salvar" onPress={saveEditor} style={styles.sheetButton} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Swatch({
  color,
  label,
  selected,
  onPress,
}: {
  color: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]}
    >
      {selected ? <Check size={18} color="#FFFFFF" /> : null}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  banner: {
    height: 120,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
    borderRadius: radii.xl,
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  editChipText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  identity: {
    alignItems: 'center',
    marginTop: -44,
    paddingHorizontal: spacing.screenPadding,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  userName: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  headline: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  body: { padding: spacing.screenPadding, marginTop: spacing.base },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  dangerTitle: { marginTop: spacing.xl },
  card: { padding: spacing.md, marginBottom: spacing.base },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  rowTexts: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: '600' },
  rowValue: { fontSize: 15, color: colors.text, fontWeight: '500', marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderSubtle },
  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeOption: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  themeOptionSelected: { backgroundColor: colors.primary },
  themeLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  themeLabelSelected: { color: colors.textInverse },
  logoutButton: { marginTop: spacing.xs },
  dangerHint: { fontSize: 12, color: colors.textSubtle, marginTop: spacing.sm, textAlign: 'center' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.base,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.base },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 2, borderColor: colors.text },
  input: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.base,
    color: colors.text,
    fontSize: 15,
  },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  sheetButton: { flex: 1 },
});
