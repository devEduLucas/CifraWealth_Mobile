import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileUp, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useColors } from '../../theme';
import { Button } from '../../components/common/Button';
import { api, ApiError } from '../../services/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function BankStatementImportModal({ visible, onClose, onImported }: Props) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; total: number } | null>(null);

  async function chooseFile() {
    try {
      setBusy(true);
      setResult(null);
      const selection = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/plain', 'application/x-ofx', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selection.canceled) return;

      const asset = selection.assets[0];
      if (asset.size && asset.size > 2 * 1024 * 1024) {
        throw new Error('O arquivo excede o limite de 2 MB.');
      }

      const isPdf = asset.name.toLowerCase().endsWith('.pdf');
      const response = isPdf
        ? await api.importBankStatementPdf(
            asset.name,
            await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
          )
        : await api.importBankStatement(
            asset.name,
            await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 })
          );
      setResult(response);
      onImported();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível importar o extrato. Confira o arquivo e tente novamente.';
      Alert.alert('Falha na importação', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Importar extrato bancário</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Selecione um extrato da sua conta bancária em PDF, OFX ou CSV. PDFs escaneados como imagem ainda não são aceitos.
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            As movimentações serão adicionadas como pendentes para você revisar. O sistema ignora lançamentos repetidos.
          </Text>
          {result ? (
            <View style={[styles.result, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>Extrato processado</Text>
              <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                {result.imported} importadas • {result.duplicates} duplicadas ignoradas • {result.total} encontradas
              </Text>
            </View>
          ) : null}
          <Button
            title={busy ? 'Processando...' : 'Selecionar arquivo PDF/OFX/CSV'}
            icon={busy ? <ActivityIndicator color={colors.textInverse} /> : <FileUp size={18} color={colors.textInverse} />}
            onPress={chooseFile}
            loading={busy}
            disabled={busy}
            style={styles.action}
          />
          <Button title="Fechar" variant="secondary" onPress={onClose} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 12 },
  description: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18 },
  result: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  resultText: { fontSize: 12, lineHeight: 18 },
  action: { marginTop: 4 },
});
