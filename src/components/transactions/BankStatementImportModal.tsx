import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileUp, X } from 'lucide-react-native';
import { File } from 'expo-file-system';
import { useColors } from '../../theme';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const STATEMENT_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/x-ofx',
  'application/octet-stream',
];

function normalizeStatementFileName(name: string, mimeType: string): string {
  if (/\.(pdf|ofx|csv)$/i.test(name)) return name;

  const mime = mimeType.toLowerCase();
  if (mime.includes('pdf')) return `${name}.pdf`;
  if (mime.includes('ofx')) return `${name}.ofx`;
  if (mime.includes('csv')) return `${name}.csv`;
  return name;
}

export function BankStatementImportModal({ visible, onClose, onImported }: Props) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; total: number } | null>(null);

  async function chooseFile() {
    try {
      setBusy(true);
      setResult(null);

      // Use the native Expo File picker. On Android it returns a File backed by
      // the system picker permission, avoiding a second read through a copied URI.
      const selection = await File.pickFileAsync({
        mimeTypes: STATEMENT_MIME_TYPES,
        multipleFiles: false,
      });
      if (selection.canceled) return;

      const document = selection.result;
      const fileName = normalizeStatementFileName(document.name, document.type);
      const fileSize = document.size;

      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        throw new Error('Não foi possível acessar o arquivo selecionado. Tente escolher o extrato novamente.');
      }
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error('O arquivo excede o limite de 2 MB.');
      }

      const isPdf = fileName.toLowerCase().endsWith('.pdf') || document.type.toLowerCase().includes('pdf');
      const response = isPdf
        ? await api.importBankStatementPdf(fileName, await document.base64())
        : await api.importBankStatement(fileName, await document.text());

      setResult(response);
      onImported();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Não foi possível importar o extrato. Confira o arquivo e tente novamente.';
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
            As movimentações serão registradas como confirmadas na categoria Importação bancária e contabilizadas no dashboard, relatórios e gráficos. Lançamentos repetidos são ignorados.
          </Text>
          {result ? (
            <View style={[styles.result, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>Extrato processado</Text>
              <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                {result.imported} confirmadas • {result.duplicates} duplicadas ignoradas • {result.total} encontradas
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
