import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMimeIcon } from '../utils/mimeIcon';
import { formatBytes } from '../utils/formatBytes';
import type { DriveFile } from '../types/api.types';

interface Props {
  file: DriveFile;
  selected: boolean;
  onToggle: (file: DriveFile) => void;
}

export default function FileItem({ file, selected, onToggle }: Props) {
  const iconName = getMimeIcon(file.mimeType) as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() => onToggle(file)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <Ionicons name={iconName} size={20} color={selected ? '#6C63FF' : '#6a6a9a'} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        {file.subject ? (
          <Text style={styles.meta} numberOfLines={1}>
            {file.sender ? `${file.sender} · ` : ''}{file.subject}
          </Text>
        ) : (
          <Text style={styles.meta}>{formatBytes(file.size)}</Text>
        )}
      </View>

      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e30',
  },
  rowSelected: {
    backgroundColor: '#6C63FF11',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e1e30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: '#6C63FF22',
  },
  info: {
    flex: 1,
    gap: 2,
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3a3a5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
});

