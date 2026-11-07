import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '../utils/formatBytes';

interface Props {
  limitBytes: number;
  usageBytes: number;
}

export default function StorageBar({ limitBytes, usageBytes }: Props) {
  if (limitBytes <= 0) return null;

  const usedPercent = Math.min(Math.round((usageBytes / limitBytes) * 100), 100);
  const isHigh = usedPercent > 85;
  const isMedium = usedPercent > 70;
  const barColor = isHigh ? '#ff6b6b' : isMedium ? '#f0c060' : '#6C63FF';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="cloud-outline" size={16} color="#8a8ab0" />
          <Text style={styles.title}>Cloud Storage</Text>
        </View>
        <Text style={styles.percentText}>{usedPercent}% used</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${usedPercent}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.usageText}>
          {formatBytes(usageBytes)} of {formatBytes(limitBytes)}
        </Text>
        <Text style={styles.freeText}>
          {formatBytes(Math.max(limitBytes - usageBytes, 0))} free
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e0e0f0',
  },
  track: {
    height: 7,
    backgroundColor: '#27273f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageText: {
    fontSize: 12,
    color: '#c0c0d8',
    fontWeight: '500',
  },
  freeText: {
    fontSize: 12,
    color: '#6a6a9a',
  },
});

