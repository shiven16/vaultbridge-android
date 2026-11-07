import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { getLoginUrl, handleCallback, checkPairSession } from '../../src/api/auth.api';
import AccountCard from '../../src/components/AccountCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const {
    sourceAccount,
    destAccount,
    isFullyConnected,
    setToken,
    refreshAuth,
    disconnect,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [connectingType, setConnectingType] = useState<'source' | 'destination' | null>(null);

  // Manual code entry fallback modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    async function checkExisting() {
      const stored = await SecureStore.getItemAsync('jwt_token');
      if (stored) {
        refreshAuth();
      }
    }
    checkExisting();

    const handleUrl = async (urlStr: string) => {
      try {
        const parsed = Linking.parse(urlStr);
        const token = (parsed.queryParams?.token as string) || null;
        const code = (parsed.queryParams?.code as string) || null;
        const type = (parsed.queryParams?.type as 'source' | 'destination') || 'source';

        if (token) {
          await setToken(token);
          await refreshAuth();
          Alert.alert('Connected', `${type === 'source' ? 'Source' : 'Destination'} account connected successfully!`);
        } else if (code) {
          await exchangeCode(code, null, type);
        }
      } catch (e) {
        console.error('Deep link error:', e);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [refreshAuth]);

  const handleConnect = async (type: 'source' | 'destination') => {
    let pollInterval: any = null;
    try {
      setLoading(true);
      setConnectingType(type);

      // Generate a unique pairing ID for this login attempt
      const pairId = 'p_' + Math.random().toString(36).slice(2, 10);

      const authUrl = await getLoginUrl(type, pairId);

      // Extract the redirect_uri that the backend configured Google to use,
      // so Chrome Custom Tabs / system browser intercepts it and returns to the app
      let redirectUri = 'https://vaultbridge-eight.vercel.app/auth/callback';
      try {
        const parsed = new URL(authUrl);
        const targetRedirect = parsed.searchParams.get('redirect_uri');
        if (targetRedirect) {
          redirectUri = targetRedirect;
        }
      } catch {}

      // Start background polling for pairing token
      let sessionFinished = false;
      pollInterval = setInterval(async () => {
        if (sessionFinished) return;
        const pairedToken = await checkPairSession(pairId);
        if (pairedToken) {
          sessionFinished = true;
          if (pollInterval) clearInterval(pollInterval);
          try {
            await WebBrowser.dismissAuthSession();
          } catch {}
          await setToken(pairedToken);
          await refreshAuth();
          Alert.alert('Success', `${type === 'source' ? 'Source' : 'Destination'} account connected!`);
        }
      }, 2000);

      // Open auth in Chrome Custom Tabs / system browser with matching redirectUri
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
      );

      if (result.type === 'success' && result.url) {
        sessionFinished = true;
        if (pollInterval) clearInterval(pollInterval);
        await processCallbackUrl(result.url, type);
      } else {
        // User closed or switched back from browser
        // Check pairing session in case it just succeeded
        const pairedToken = await checkPairSession(pairId);
        if (pairedToken) {
          sessionFinished = true;
          if (pollInterval) clearInterval(pollInterval);
          await setToken(pairedToken);
          await refreshAuth();
          Alert.alert('Success', `${type === 'source' ? 'Source' : 'Destination'} account connected!`);
        } else {
          // Keep polling for another 10 seconds in case backend is still processing
          setTimeout(async () => {
            if (!sessionFinished) {
              const lateToken = await checkPairSession(pairId);
              if (lateToken) {
                sessionFinished = true;
                if (pollInterval) clearInterval(pollInterval);
                await setToken(lateToken);
                await refreshAuth();
                Alert.alert('Success', `${type === 'source' ? 'Source' : 'Destination'} account connected!`);
              }
            }
          }, 3000);
        }
      }
    } catch (err: unknown) {
      if (pollInterval) clearInterval(pollInterval);
      const msg = err instanceof Error ? err.message : 'Failed to initialize login';
      Alert.alert(
        'Connection Issue',
        `${msg}\n\nWould you like to enter the auth code or token manually?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enter Code', onPress: () => setShowManualModal(true) },
        ],
      );
    } finally {
      setLoading(false);
      setConnectingType(null);
    }
  };

  const processCallbackUrl = async (urlStr: string, type: 'source' | 'destination') => {
    try {
      setLoading(true);
      const url = new URL(urlStr);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        throw new Error('No authorization code found in redirect URL');
      }

      await exchangeCode(code, state, type);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      Alert.alert('Auth Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const exchangeCode = async (
    code: string,
    state: string | null,
    type: 'source' | 'destination',
  ) => {
    const res = await handleCallback(code, state, type);
    if (res.token) {
      await setToken(res.token);
    }
    await refreshAuth();
    Alert.alert('Success', `${type === 'source' ? 'Source' : 'Destination'} account connected!`);
  };

  const handleManualCodeSubmit = async () => {
    const input = manualCode.trim();
    if (!input) return;
    try {
      setLoading(true);
      setShowManualModal(false);

      // 1. Direct JWT token paste
      if (input.startsWith('eyJ')) {
        await setToken(input);
        await refreshAuth();
        Alert.alert('Success', 'Session authenticated successfully!');
        setManualCode('');
        return;
      }

      // 2. Auth code or redirect URL paste
      const targetType = connectingType || 'source';
      let codeToUse = input;
      let stateToUse: string | null = null;
      if (codeToUse.includes('code=')) {
        try {
          const parsed = new URL(codeToUse.startsWith('http') ? codeToUse : `https://x.com/${codeToUse}`);
          codeToUse = parsed.searchParams.get('code') || codeToUse;
          stateToUse = parsed.searchParams.get('state');
        } catch {}
      }
      await exchangeCode(codeToUse, stateToUse, targetType);
      setManualCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code or token';
      Alert.alert('Auth Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>VaultBridge</Text>
          <Text style={styles.brandTagline}>Cross-Cloud Migration Platform</Text>
          <Text style={styles.instructions}>
            Connect both your source and destination accounts to migrate files securely.
          </Text>
        </View>

        {loading ? (
          <LoadingSpinner
            message={`Connecting ${connectingType ?? ''} account...`}
          />
        ) : null}

        <View style={styles.cardsContainer}>
          <AccountCard
            label="1. Source Account"
            email={sourceAccount?.email ?? null}
            picture={sourceAccount?.picture ?? null}
            connected={!!sourceAccount}
            onConnect={() => handleConnect('source')}
            onDisconnect={() => disconnect('source')}
            accentColor="#6C63FF"
          />

          <AccountCard
            label="2. Destination Account"
            email={destAccount?.email ?? null}
            picture={destAccount?.picture ?? null}
            connected={!!destAccount}
            onConnect={() => handleConnect('destination')}
            onDisconnect={() => disconnect('destination')}
            disabled={!sourceAccount}
            accentColor="#4ade80"
          />

          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => setShowManualModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={16} color="#8a8ab0" />
            <Text style={styles.manualEntryText}>Manual Code or Token Entry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              !isFullyConnected && styles.continueBtnDisabled,
            ]}
            disabled={!isFullyConnected}
            onPress={() => router.replace('/(app)/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>
              {isFullyConnected ? 'Proceed to Dashboard' : 'Connect Both Accounts to Continue'}
            </Text>
            {isFullyConnected && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manual Code Modal Fallback */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Auth Code or Token</Text>
            <Text style={styles.modalSubtitle}>
              Paste the code, full redirect URL, or session token:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="4/0A... or eyJhbGci..."
              placeholderTextColor="#5a5a7a"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleManualCodeSubmit}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  container: {
    padding: 24,
    gap: 24,
  },
  header: {
    gap: 8,
    marginTop: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructions: {
    fontSize: 14,
    color: '#8a8ab0',
    lineHeight: 20,
    marginTop: 4,
  },
  cardsContainer: {
    gap: 16,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  manualEntryText: {
    fontSize: 13,
    color: '#8a8ab0',
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 12,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  continueBtnDisabled: {
    backgroundColor: '#1e1e30',
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8a8ab0',
  },
  modalInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a5c',
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#8a8ab0',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '700',
  },
});

