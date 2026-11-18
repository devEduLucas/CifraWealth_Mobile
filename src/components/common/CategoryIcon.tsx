import React from 'react';
import {
  Tag,
  Wallet,
  Briefcase,
  TrendingUp,
  Utensils,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Plane,
} from 'lucide-react-native';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

// Ícones disponíveis para categorias (a chave é o que fica salvo em `icone`)
export const CATEGORY_ICONS: { key: string; label: string; Icon: IconComponent }[] = [
  { key: 'tag', label: 'Etiqueta', Icon: Tag },
  { key: 'wallet', label: 'Carteira', Icon: Wallet },
  { key: 'briefcase', label: 'Trabalho', Icon: Briefcase },
  { key: 'chart', label: 'Investimentos', Icon: TrendingUp },
  { key: 'utensils', label: 'Alimentação', Icon: Utensils },
  { key: 'car', label: 'Transporte', Icon: Car },
  { key: 'gamepad', label: 'Lazer', Icon: Gamepad2 },
  { key: 'home', label: 'Casa', Icon: Home },
  { key: 'heart', label: 'Saúde', Icon: HeartPulse },
  { key: 'education', label: 'Educação', Icon: GraduationCap },
  { key: 'shopping', label: 'Compras', Icon: ShoppingBag },
  { key: 'travel', label: 'Viagem', Icon: Plane },
];

interface CategoryIconProps {
  name?: string | null;
  size?: number;
  color?: string;
}

// Chave desconhecida ou vazia cai na etiqueta
export function CategoryIcon({ name, size = 18, color }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS.find((i) => i.key === name)?.Icon ?? Tag;
  return <Icon size={size} color={color} />;
}
