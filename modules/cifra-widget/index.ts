import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type NativeCifraWidget = {
  setSessionToken(token: string): Promise<void>;
  setFavorites(json: string): Promise<void>;
  clearAccess(): Promise<void>;
};

const native = Platform.OS === 'android'
  ? requireOptionalNativeModule<NativeCifraWidget>('CifraWidget')
  : null;

export const isCifraWidgetAvailable = native !== null;

export async function setCifraWidgetSessionToken(token: string): Promise<void> {
  if (!native) return;
  await native.setSessionToken(token);
}

export async function setCifraWidgetFavorites(favorites: unknown): Promise<void> {
  if (!native) return;
  await native.setFavorites(JSON.stringify(favorites));
}

export async function clearCifraWidgetAccess(): Promise<void> {
  if (!native) return;
  await native.clearAccess();
}
