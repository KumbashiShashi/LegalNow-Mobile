import { create } from 'zustand';

interface NetworkState {
  isOffline: boolean;
  lastError: string | null;
  setOffline: (offline: boolean, error?: string | null) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  lastError: null,
  setOffline: (offline: boolean, error: string | null = null) =>
    set({ isOffline: offline, lastError: error }),
}));

