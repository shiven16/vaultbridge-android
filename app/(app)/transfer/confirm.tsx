import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';
import { useStartBatchTransfer } from '../../../src/hooks/useTransfers';
import { formatBytes } from '../../../src/utils/formatBytes';
import { getMimeIcon } from '../../../src/utils/mimeIcon';
import LoadingSpinner from '../../../src/components/LoadingSpinner';
import type { DriveFile, SourceType, TransferMode } from '../../../src/types/api.types';

export default function TransferConfirmScreen() {
  const params = useLocalSearchParams<{ sourceType: SourceType; filesJson: string }>();
  const { destAccount } = useAuth();
  const { startTransfer } = useStartBatchTransfer();

  const initialFiles: DriveFile[] = useMemo(() => {
    try {
      return JSON.parse(params.filesJson ?? '[]');
    } catch {
      return [];
    }
  }, [params.filesJson]);

  const [files, setFiles] = useState<DriveFile[]>(initialFiles);
  const [transferMode, setTransferMode] = useState<TransferMode>('copy');
  const [submitting, setSubmitting] = useState(false);

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (parseInt(f.size, 10) || 0), 0);
  }, [files]);

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    if (updated.length === 0) {
      router.back();
    } else {
      setFiles(updated);
    }
  };

  const handleStartTransfer = async () => {
    if (files.length === 0) return;

    try {
      setSubmitting(true);
      const transferIds = await startTransfer({
        files,
        sourceType: params.sourceType ?? 'drive',
        transferMode,
      });

      // Navigate to live progress screen
      router.replace({
        pathname: '/(app)/transfer/progress',
        params: {
          transferIdsJson: JSON.stringify(transferIds),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate transfer';
      Alert.alert('Transfer Error', msg);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Transfer</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Destination Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Destination Target</Text>
            <View style={styles.destRow}>
              <View style={styles.destIconBox}>
                <Ionicons name="cloud-upload" size={20} color="#4ade80" />
              </View>
              <View style={styles.destInfo}>
                <Text style={styles.destTitle}>Google Drive</Text>
                <Text style={styles.destEmail} numberOfLines={1}>
                  {destAccount?.email ?? 'Destination Account'}
                </Text>
              </View>
            </View>
          </View>

          {/* Transfer Mode Toggle */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Transfer Mode</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeOption, transferMode === 'copy' && styles.modeOptionActive]}
                onPress={() => setTransferMode('copy')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color={transferMode === 'copy' ? '#fff' : '#8a8ab0'}
                />
                <Text
                  style={[styles.modeText, transferMode === 'copy' && styles.modeTextActive]}
                >
                  Copy (Safe)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeOption, transferMode === 'move' && styles.modeOptionActive]}
                onPress={() => setTransferMode('move')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="cut-outline"
                  size={18}
                  color={transferMode === 'move' ? '#fff' : '#8a8ab0'}
                />
                <Text
                  style={[styles.modeText, transferMode === 'move' && styles.modeTextActive]}
                >
                  Move (Delete source)
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modeHint}>
              {transferMode === 'copy'
                ? 'Files will remain intact on the source account.'
                : 'Files will be migrated to destination and then removed from source.'}
            </Text>
          </View>

          {/* Files Summary */}
          <View style={styles.filesSection}>
            <View style={styles.filesHeader}>
              <Text style={styles.cardLabel}>Files to Transfer ({files.length})</Text>
              <Text style={styles.totalSizeText}>Total: {formatBytes(totalBytes)}</Text>
            </View>

            <View style={styles.fileListCard}>
              {files.map((file) => {
                const iconName = getMimeIcon(file.mimeType) as keyof typeof Ionicons.glyphMap;
                return (
                  <View key={file.id} style={styles.fileRow}>
                    <Ionicons name={iconName} size={18} color="#6C63FF" />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFile(file.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          {submitting ? (
            <LoadingSpinner size="small" message="Initiating migration..." />
          ) : (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartTransfer}
              activeOpacity={0.8}
            >
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={styles.startBtnText}>
                Start Transfer ({files.length} {files.length === 1 ? 'file' : 'files'})
              </Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8a8ab0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  destIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4ade8022',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destInfo: {
    flex: 1,
  },
  destTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  destEmail: {
    fontSize: 12,
    color: '#8a8ab0',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f0f1a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeOptionActive: {
    backgroundColor: '#6C63FF',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a8ab0',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  modeHint: {
    fontSize: 12,
    color: '#8a8ab0',
    lineHeight: 16,
  },
  filesSection: {
    gap: 8,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSizeText: {
    fontSize: 12,
    color: '#c0c0d8',
    fontWeight: '600',
  },
  fileListCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a40',
    overflow: 'hidden',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202038',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  fileSize: {
    fontSize: 11,
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
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

