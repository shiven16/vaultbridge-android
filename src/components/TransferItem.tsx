import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Transfer } from '../types/api.types';

interface Props {
  transfer: Transfer;
}

const STATUS_CONFIG = {
  pending: { color: '#a0a0b0', icon: 'time-outline' as const, label: 'Pending' },
  in_progress: { color: '#f0c060', icon: 'sync-outline' as const, label: 'In Progress' },
  success: { color: '#4ade80', icon: 'checkmark-circle-outline' as const, label: 'Done' },
  failed: { color: '#ff6b6b', icon: 'close-circle-outline' as const, label: 'Failed' },
};

const SOURCE_LABEL: Record<string, string> = {
  drive: 'Drive',
  gcs: 'Cloud Storage',
  gmail: 'Gmail',
};

export default function TransferItem({ transfer }: Props) {
  const cfg = STATUS_CONFIG[transfer.status];

  return (
    <View style={styles.row}>
      <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transfer.fileName}
        </Text>
        <Text style={styles.meta}>
          {SOURCE_LABEL[transfer.sourceType] ?? transfer.sourceType} ·{' '}
          {transfer.transferMode === 'copy' ? 'Copy' : 'Move'}
        </Text>
        {transfer.error ? (
          <Text style={styles.error} numberOfLines={2}>
            {transfer.error}
          </Text>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e30',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0f0',
  },
  meta: {
    fontSize: 12,
    color: '#6a6a9a',
  },
  error: {
    fontSize: 11,
    color: '#ff6b6b',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

