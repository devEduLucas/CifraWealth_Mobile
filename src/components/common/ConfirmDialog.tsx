import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Platform } from 'react-native';
import { spacing, radii, useColors, ThemeColors } from '../../theme';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  // Se informado, o botão só habilita depois de digitar esta palavra
  confirmWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmação em modal próprio: Alert.alert não funciona no web, então não depende dele.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  loading,
  error,
  confirmWord,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (visible) setTyped('');
  }, [visible]);

  const locked = !!confirmWord && typed.trim().toUpperCase() !== confirmWord.toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {confirmWord ? (
            <>
              <Text style={styles.hint}>
                Digite <Text style={styles.hintWord}>{confirmWord}</Text> para confirmar.
              </Text>
              <TextInput
                style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={confirmWord}
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
            </>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onCancel} disabled={loading} style={styles.button} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              disabled={locked || loading}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    message: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginTop: spacing.sm },
    hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.base },
    hintWord: { fontWeight: '800', color: colors.text },
    input: {
      height: 48,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.base,
      color: colors.text,
      fontSize: 15,
      marginTop: spacing.sm,
    },
    errorBox: {
      backgroundColor: colors.negativeBg,
      borderColor: colors.negative,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginTop: spacing.base,
    },
    errorText: { color: colors.negative, fontSize: 12 },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    button: { flex: 1 },
  });
