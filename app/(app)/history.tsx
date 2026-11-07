import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserTransfers } from '../../src/hooks/useTransfers';
import TransferItem from '../../src/components/TransferItem';
import EmptyState from '../../src/components/EmptyState';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import type { TransferStatus } from '../../src/types/api.types';

type FilterTab = 'all' | TransferStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'Active' },
  { key: 'success', label: 'Done' },
  { key: 'failed', label: 'Failed' },
];

export default function HistoryScreen() {
  const { data: transfers, isLoading, isError, refetch } = useUserTransfers();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filteredTransfers = useMemo(() => {
    if (!transfers) return [];
    if (activeFilter === 'all') return transfers;
    if (activeFilter === 'in_progress') {
      return transfers.filter((t) => t.status === 'in_progress' || t.status === 'pending');
    }
    return transfers.filter((t) => t.status === activeFilter);
  }, [transfers, activeFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transfer History</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.filterRow}>
          {TABS.map((tab) => {
            const active = tab.key === activeFilter;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transfers List */}
        {isLoading ? (
          <LoadingSpinner fullScreen message="Loading history..." />
        ) : isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Unable to load transfers"
            subtitle="Please check your network connection and try again."
          />
        ) : filteredTransfers.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No transfers yet"
            subtitle={
              activeFilter === 'all'
                ? 'Your file migration history will appear here.'
                : `No transfers found under the "${activeFilter}" filter.`
            }
          />
        ) : (
          <FlatList
            data={filteredTransfers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransferItem transfer={item} />}
            contentContainerStyle={styles.listContent}
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 12,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  filterChipActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8ab0',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 20,
  },
});

