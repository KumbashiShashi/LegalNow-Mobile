import { create } from 'zustand';
import { getItemAsync, setItemAsync } from '../utils/storage';

const BIOMETRIC_KEY = 'legalnow_biometric_enabled';

interface SecurityState {
  isBiometricEnabled: boolean;
  isLocked: boolean;
  initializeSecurity: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isBiometricEnabled: false,
  isLocked: false,

  initializeSecurity: async () => {
    try {
      const stored = await getItemAsync(BIOMETRIC_KEY);
      const enabled = stored === 'true';
      set({ isBiometricEnabled: enabled, isLocked: enabled });
    } catch {
      set({ isBiometricEnabled: false, isLocked: false });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    try {
      await setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
      set({ isBiometricEnabled: enabled, isLocked: false });
    } catch {
      // Storage failure fallback
    }
  },

  unlock: () => set({ isLocked: false }),
  lock: () => set({ isLocked: true }),
}));
