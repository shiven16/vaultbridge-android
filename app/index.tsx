import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../src/store/auth.store';
import { getMe } from '../src/api/auth.api';
import LoadingSpinner from '../src/components/LoadingSpinner';

export default function IndexScreen() {
  const { setAccounts, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('jwt_token');
        if (!token) {
          if (isMounted) router.replace('/(auth)/login');
          return;
        }

        useAuthStore.setState({ token });
        const me = await getMe();

        if (isMounted) {
          setAccounts(
            me.sourceConnected
              ? { email: me.sourceEmail!, name: me.user.name, picture: me.sourcePicture }
              : null,
            me.destConnected
              ? { email: me.destEmail!, name: '', picture: me.destPicture }
              : null,
          );
          setLoading(false);

          if (me.sourceConnected && me.destConnected) {
            router.replace('/(app)/dashboard');
          } else {
            router.replace('/(auth)/login');
          }
        }
      } catch (err) {
        if (isMounted) {
          await SecureStore.deleteItemAsync('jwt_token').catch(() => {});
          useAuthStore.setState({ token: null, sourceAccount: null, destAccount: null });
          setLoading(false);
          router.replace('/(auth)/login');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [setAccounts, setLoading]);

  return (
    <View style={styles.container}>
      <Text style={styles.brandTitle}>VaultBridge</Text>
      <Text style={styles.brandSubtitle}>Cloud Migration Platform</Text>
      <LoadingSpinner size="large" message="Checking authentication..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#8a8ab0',
    marginTop: 6,
    marginBottom: 32,
  },
});

