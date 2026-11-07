import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { getSourceQuota } from '../../src/api/sources.api';
import { useUserTransfers } from '../../src/hooks/useTransfers';
import StorageBar from '../../src/components/StorageBar';
import type { StorageQuota, SourceType } from '../../src/types/api.types';

export default function DashboardScreen() {
  const { sourceAccount, destAccount, isFullyConnected, logout, refreshAuth } = useAuth();
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: transfers, refetch: refetchTransfers } = useUserTransfers();

  const loadData = async () => {
    try {
      await refreshAuth();
      const quotaData = await getSourceQuota();
      setQuota(quotaData);
      await refetchTransfers();
    } catch {
      // quota might fail if source not drive or not connected
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const navigateToSource = (sourceType: SourceType) => {
    router.push({
      pathname: '/(app)/files',
      params: { initialSource: sourceType },
    });
  };

  const activeTransfersCount =
    transfers?.filter((t) => t.status === 'in_progress' || t.status === 'pending').length ?? 0;
  const completedTransfersCount =
    transfers?.filter((t) => t.status === 'success').length ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>VaultBridge</Text>
            <Text style={styles.subtitle}>Dashboard</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>

        {/* Transfer Pipeline Card */}
        <View style={styles.pipelineCard}>
          <Text style={styles.cardHeader}>Connected Pipeline</Text>
          <View style={styles.pipelineRow}>
            {/* Source Account */}
            <View style={styles.endpoint}>
              {sourceAccount?.picture ? (
                <Image source={{ uri: sourceAccount.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.sourceAvatarBg]}>
                  <Text style={styles.avatarInitial}>
                    {sourceAccount?.email.charAt(0).toUpperCase() ?? 'S'}
                  </Text>
                </View>
              )}
              <Text style={styles.endpointLabel}>Source</Text>
              <Text style={styles.endpointEmail} numberOfLines={1}>
                {sourceAccount?.email ?? 'Not connected'}
              </Text>
            </View>

            {/* Bridge Icon */}
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={18} color="#6C63FF" />
            </View>

            {/* Destination Account */}
            <View style={styles.endpoint}>
              {destAccount?.picture ? (
                <Image source={{ uri: destAccount.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.destAvatarBg]}>
                  <Text style={styles.avatarInitial}>
                    {destAccount?.email.charAt(0).toUpperCase() ?? 'D'}
                  </Text>
                </View>
              )}
              <Text style={styles.endpointLabel}>Destination</Text>
              <Text style={styles.endpointEmail} numberOfLines={1}>
                {destAccount?.email ?? 'Not connected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Storage Quota */}
        {quota ? (
          <StorageBar
            limitBytes={parseInt(quota.limit, 10) || 0}
            usageBytes={parseInt(quota.usage, 10) || 0}
          />
        ) : null}

        {/* Transfer Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{activeTransfersCount}</Text>
            <Text style={styles.statLabel}>Active Transfers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{completedTransfersCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Cloud Sources Section */}
        <View style={styles.sourcesSection}>
          <Text style={styles.sectionTitle}>Select Cloud Source</Text>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => navigateToSource('drive')}
            activeOpacity={0.7}
          >
            <View style={[styles.sourceIconBox, { backgroundColor: '#4285F422' }]}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>Google Drive</Text>
              <Text style={styles.sourceDesc}>Migrate files, folders and docs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6a6a9a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => navigateToSource('gmail')}
            activeOpacity={0.7}
          >
            <View style={[styles.sourceIconBox, { backgroundColor: '#EA433522' }]}>
              <Ionicons name="mail" size={24} color="#EA4335" />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>Gmail Attachments</Text>
              <Text style={styles.sourceDesc}>Extract email file attachments</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6a6a9a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => navigateToSource('gcs')}
            activeOpacity={0.7}
          >
            <View style={[styles.sourceIconBox, { backgroundColor: '#34A85322' }]}>
              <Ionicons name="cloud" size={24} color="#34A853" />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>Google Cloud Storage</Text>
              <Text style={styles.sourceDesc}>Bucket objects and cloud blobs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6a6a9a" />
          </TouchableOpacity>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(app)/files')}
          activeOpacity={0.8}
        >
          <Ionicons name="folder-open" size={18} color="#fff" />
          <Text style={styles.ctaButtonText}>Browse All Files</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  container: {
    padding: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  pipelineCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endpoint: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sourceAvatarBg: {
    backgroundColor: '#6C63FF33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destAvatarBg: {
    backgroundColor: '#4ade8033',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  endpointLabel: {
    fontSize: 11,
    color: '#8a8ab0',
    fontWeight: '600',
  },
  endpointEmail: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27273f',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#8a8ab0',
    fontWeight: '500',
  },
  sourcesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
    gap: 2,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  sourceDesc: {
    fontSize: 12,
    color: '#8a8ab0',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 4,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

