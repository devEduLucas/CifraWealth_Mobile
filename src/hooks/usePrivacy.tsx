import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { storage } from '../services/storage';
import { formatCurrency } from '../utils/format';

const MASK = 'R$ ••••••';

interface PrivacyContextData {
  hidden: boolean;
  toggleHidden: () => void;
  // Formata um valor em reais, ou a máscara quando "ocultar valores" está ativo
  money: (value: number) => string;
}

const PrivacyContext = createContext<PrivacyContextData>({
  hidden: false,
  toggleHidden: () => {},
  money: formatCurrency,
});

// Modo privacidade compartilhado entre as telas; a escolha fica salva no aparelho.
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    storage.getHideValues().then(setHidden);
  }, []);

  const toggleHidden = useCallback(() => {
    setHidden((current) => {
      storage.setHideValues(!current);
      return !current;
    });
  }, []);

  const value = useMemo(
    () => ({ hidden, toggleHidden, money: (v: number) => (hidden ? MASK : formatCurrency(v)) }),
    [hidden, toggleHidden]
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export const PRIVACY_MASK = MASK;
