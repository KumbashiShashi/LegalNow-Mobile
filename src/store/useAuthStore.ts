import { create } from 'zustand';
import { setItemAsync, getItemAsync, deleteItemAsync } from '../utils/storage';
import { User, UserRole } from '../types/api';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  role: UserRole | null;
  user: User | null;
  isLoading: boolean;
  setAuthSession: (token: string, user: User) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  token: null,
  role: null,
  user: null,
  isLoading: true,

  setAuthSession: async (token: string, user: User) => {
    const role = user.role || 'citizen';
    await setItemAsync('access_token', token);
    await setItemAsync('user_role', role);
    await setItemAsync('user_data', JSON.stringify(user));
    set({
      isAuthenticated: true,
      token,
      role,
      user,
      isLoading: false,
    });
  },

  updateUser: async (patch: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    await setItemAsync('user_data', JSON.stringify(updated));
    set({ user: updated });
  },

  logout: async () => {
    await deleteItemAsync('access_token');
    await deleteItemAsync('user_role');
    await deleteItemAsync('user_data');
    set({
      isAuthenticated: false,
      token: null,
      role: null,
      user: null,
      isLoading: false,
    });
  },

  checkSession: async () => {
    try {
      const token = await getItemAsync('access_token');
      const role = (await getItemAsync('user_role')) as UserRole | null;
      const rawUser = await getItemAsync('user_data');
      let user: User | null = null;

      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {
          user = null;
        }
      }

      if (token && role) {
        set({
          isAuthenticated: true,
          token,
          role,
          user: user || { id: '', email: '', name: '', role },
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          token: null,
          role: null,
          user: null,
          isLoading: false,
        });
      }
    } catch {
      set({
        isAuthenticated: false,
        token: null,
        role: null,
        user: null,
        isLoading: false,
      });
    }
  },
}));
