import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AccountInfo {
  email: string;
  name: string;
  picture: string | null;
}

interface AuthState {
  token: string | null;
  sourceAccount: AccountInfo | null;
  destAccount: AccountInfo | null;
  isLoading: boolean;

  // Actions
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<string | null>;
  setAccounts: (source: AccountInfo | null, dest: AccountInfo | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  sourceAccount: null,
  destAccount: null,
  isLoading: true,

  setToken: async (token) => {
    await SecureStore.setItemAsync('jwt_token', token);
    set({ token });
  },

  clearToken: async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    set({ token: null, sourceAccount: null, destAccount: null });
  },

  loadToken: async () => {
    const token = await SecureStore.getItemAsync('jwt_token');
    set({ token });
    return token;
  },

  setAccounts: (sourceAccount, destAccount) => set({ sourceAccount, destAccount }),

  setLoading: (isLoading) => set({ isLoading }),
}));

