import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { getMe, disconnectAccount as apiDisconnect } from '../api/auth.api';

export function useAuth() {
  const { token, sourceAccount, destAccount, setToken, clearToken, setAccounts, setLoading } =
    useAuthStore();

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMe();
      setAccounts(
        data.sourceConnected
          ? { email: data.sourceEmail!, name: data.user.name, picture: data.sourcePicture }
          : null,
        data.destConnected
          ? { email: data.destEmail!, name: '', picture: data.destPicture }
          : null,
      );
    } catch {
      setAccounts(null, null);
    } finally {
      setLoading(false);
    }
  }, [setAccounts, setLoading]);

  const logout = useCallback(async () => {
    await clearToken();
    router.replace('/(auth)/login');
  }, [clearToken]);

  const disconnect = useCallback(
    async (type: 'source' | 'destination') => {
      await apiDisconnect(type);
      if (type === 'source') {
        await clearToken();
        router.replace('/(auth)/login');
      } else {
        await refreshAuth();
      }
    },
    [clearToken, refreshAuth],
  );

  const isFullyConnected = !!sourceAccount && !!destAccount;

  return {
    token,
    sourceAccount,
    destAccount,
    isFullyConnected,
    setToken,
    clearToken,
    logout,
    disconnect,
    refreshAuth,
  };
}

