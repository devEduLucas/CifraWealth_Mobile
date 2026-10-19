import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, ShieldCheck, LogOut, Server, Smartphone } from 'lucide-react-native';
import { colors, spacing, radii, typography } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../services/config';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const fullName = [user?.nome, user?.sobrenome].filter(Boolean).join(' ') || 'Usuário';
  const email = user?.email || 'email@exemplo.com';

  function handleLogout() {
    Alert.alert('Sair da conta', 'Deseja realmente encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <Text style={styles.headerSubtitle}>Configurações da conta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          {user?.id_usuario && (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>ID #{user.id_usuario}</Text>
            </View>
          )}
        </Card>

        {/* Backend & Environment Info */}
        <Text style={styles.sectionTitle}>Conexão & Sistema</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Server size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Servidor Backend</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Smartphone size={18} color={colors.info} />
              <Text style={styles.infoLabel}>App Mobile</Text>
            </View>
            <Text style={styles.infoValue}>v1.0.0 (Expo React Native)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <ShieldCheck size={18} color={colors.positive} />
              <Text style={styles.infoLabel}>Autenticação</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.positive }]}>
              JWT Seguro Ativo
            </Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Encerrar Sessão"
          variant="danger"
          icon={<LogOut size={18} color={colors.negative} />}
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  userCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textInverse,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  idBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginTop: spacing.md,
  },
  idText: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 160,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
