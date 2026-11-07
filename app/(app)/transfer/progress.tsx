import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransferPolling } from '../../../src/hooks/useTransfers';
import TransferItem from '../../../src/components/TransferItem';
import type { Transfer } from '../../../src/types/api.types';

export default function TransferProgressScreen() {
  const params = useLocalSearchParams<{ transferIdsJson: string }>();

  const transferIds: string[] = useMemo(() => {
    try {
      return JSON.parse(params.transferIdsJson ?? '[]');
    } catch {
      return [];
    }
  }, [params.transferIdsJson]);

  const queryResults = useTransferPolling(transferIds);

  const transfers: Transfer[] = useMemo(() => {
    return queryResults
      .map((q) => q.data)
      .filter((t): t is Transfer => !!t);
  }, [queryResults]);

  const completedCount = transfers.filter((t) => t.status === 'success').length;
  const failedCount = transfers.filter((t) => t.status === 'failed').length;
  const inProgressCount = transfers.filter(
    (t) => t.status === 'in_progress' || t.status === 'pending',
  ).length;

  const isAllSettled =
    transfers.length === transferIds.length &&
    transfers.every((t) => t.status === 'success' || t.status === 'failed');

  const progressPercent =
    transferIds.length > 0
      ? Math.round(((completedCount + failedCount) / transferIds.length) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transfer Progress</Text>
          <Text style={styles.subtitle}>
            {isAllSettled
              ? 'Transfer batch finished'
              : 'Processing in cloud queue (up to 3 concurrent)...'}
          </Text>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Completion</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: failedCount > 0 && isAllSettled ? '#f0c060' : '#6C63FF',
                },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color="#f0c060" />
              <Text style={styles.statText}>{inProgressCount} in progress</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#4ade80" />
              <Text style={styles.statText}>{completedCount} successful</Text>
            </View>
            {failedCount > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="close-circle-outline" size={14} color="#ff6b6b" />
                <Text style={styles.statText}>{failedCount} failed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Transfers List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionHeader}>File Status</Text>

          <View style={styles.itemsCard}>
            {transfers.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#6C63FF" />
                <Text style={styles.loadingText}>Fetching transfer status...</Text>
              </View>
            ) : (
              transfers.map((t) => <TransferItem key={t.id} transfer={t} />)
            )}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          {isAllSettled ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => router.replace('/(app)/history')}
                activeOpacity={0.8}
              >
                <Text style={styles.historyBtnText}>View History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => router.replace('/(app)/dashboard')}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.runningBanner}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.runningText}>
                Transfers continue running in the background.
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#8a8ab0',
  },
  progressCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  track: {
    height: 8,
    backgroundColor: '#27273f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#c0c0d8',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a40',
    overflow: 'hidden',
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#8a8ab0',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#121224',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#202038',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  historyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5c',
  },
  historyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  runningText: {
    color: '#8a8ab0',
    fontSize: 13,
  },
});

