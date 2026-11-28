import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertCircle, Check, Mic, MicOff, X } from 'lucide-react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Button } from '../common/Button';
import { spacing, radii, useColors } from '../../theme';
import {
  parseVoiceTransactionCommand,
  VoiceTransactionDraft,
} from '../../utils/voiceTransactionParser';

interface VoiceTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onUse: (draft: VoiceTransactionDraft) => void;
}

function recognitionErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Permissão de microfone negada. Autorize o acesso nas configurações do aparelho.';
    case 'service-not-allowed':
      return 'O serviço de reconhecimento de voz não está disponível neste aparelho.';
    case 'language-not-supported':
      return 'O reconhecimento em português não está disponível neste aparelho.';
    case 'no-speech':
      return 'Não detectamos fala. Toque no microfone e tente novamente.';
    case 'audio-capture':
      return 'Não foi possível acessar o microfone. Verifique se ele está disponível.';
    case 'network':
      return 'O serviço de reconhecimento de voz não conseguiu se conectar.';
    default:
      return 'Não foi possível reconhecer sua fala. Tente novamente.';
  }
}

export function VoiceTransactionModal({
  visible,
  onClose,
  onUse,
}: VoiceTransactionModalProps) {
  const colors = useColors();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const recognizedText = event.results?.[0]?.transcript?.trim();
    if (recognizedText) setTranscript(recognizedText);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    setError(recognitionErrorMessage(event.error));
  });

  useEffect(() => {
    if (!visible) {
      setListening(false);
      return;
    }
    setTranscript('');
    setError(null);
  }, [visible]);

  async function toggleRecognition() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      setError(null);
      setTranscript('');

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError('O aparelho não possui um serviço de reconhecimento de voz ativo.');
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError('O CifraWealth precisa da permissão do microfone para preparar o lançamento por voz.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        contextualStrings: [
          'CifraWealth',
          'PIX',
          'salário',
          'supermercado',
          'transporte',
          'alimentação',
          'conta de luz',
          'aluguel',
        ],
      });
    } catch {
      setListening(false);
      setError('Não foi possível iniciar o reconhecimento de voz. Tente novamente.');
    }
  }

  function close() {
    if (listening) ExpoSpeechRecognitionModule.abort();
    setListening(false);
    onClose();
  }

  function useTranscript() {
    const parsed = parseVoiceTransactionCommand(transcript);
    if (!parsed.success) {
      setError(parsed.message);
      return;
    }
    onUse(parsed.value);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={[styles.titleIcon, { backgroundColor: colors.primaryLight }]}>
                <Mic size={19} color={colors.primary} />
              </View>
              <View style={styles.titleTextGroup}>
                <Text style={[styles.title, { color: colors.text }]}>Lançamento por voz</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>Fale como você costuma registrar</Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar lançamento por voz"
              onPress={close}
              style={styles.closeButton}
            >
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Diga uma movimentação por vez. Por exemplo: “Gastei 32 reais no almoço” ou “Recebi mil e quinhentos reais de salário”.
          </Text>

          <View style={[styles.transcriptCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <View style={styles.transcriptHeader}>
              <Text style={[styles.transcriptLabel, { color: colors.textMuted }]}>
                {listening ? 'OUVINDO AGORA' : transcript ? 'TEXTO RECONHECIDO' : 'SUA FRASE'}
              </Text>
              {listening ? <View style={[styles.listeningDot, { backgroundColor: colors.negative }]} /> : null}
            </View>
            <Text style={[styles.transcript, { color: transcript ? colors.text : colors.textMuted }]}>
              {transcript || (listening ? 'Pode falar...' : 'Toque em “Começar a falar” e dite sua movimentação.')}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.negativeBg }]}>
              <AlertCircle size={16} color={colors.negative} />
              <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={listening ? 'Parar de ouvir' : 'Começar a falar'}
            icon={listening
              ? <MicOff size={18} color={colors.textInverse} />
              : <Mic size={18} color={colors.textInverse} />}
            onPress={toggleRecognition}
            style={styles.recordButton}
          />

          <Button
            title="Preparar lançamento"
            icon={<Check size={18} color={colors.textInverse} />}
            onPress={useTranscript}
            disabled={!transcript.trim() || listening}
            style={styles.useButton}
          />

          <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
            O reconhecimento usa o serviço de voz configurado no aparelho. O CifraWealth não envia gravações ao backend. Revise a descrição, o valor e a categoria antes de salvar.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextGroup: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12 },
  closeButton: { padding: spacing.xs },
  instruction: { fontSize: 13, lineHeight: 20 },
  transcriptCard: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transcriptLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  listeningDot: { width: 7, height: 7, borderRadius: radii.full },
  transcript: { fontSize: 15, lineHeight: 23 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  recordButton: { marginTop: 2 },
  useButton: { marginTop: -spacing.xs },
  privacyNote: { fontSize: 11, lineHeight: 16 },
});
