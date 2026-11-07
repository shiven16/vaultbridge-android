import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFiles } from '../../src/hooks/useFiles';
import FileItem from '../../src/components/FileItem';
import EmptyState from '../../src/components/EmptyState';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import type { DriveFile, SourceType } from '../../src/types/api.types';

const SOURCES: { key: SourceType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'drive', label: 'Drive', icon: 'logo-google' },
  { key: 'gmail', label: 'Gmail', icon: 'mail-outline' },
  { key: 'gcs', label: 'GCS', icon: 'cloud-outline' },
];

export default function FilesScreen() {
  const params = useLocalSearchParams<{ initialSource?: SourceType }>();
  const [sourceType, setSourceType] = useState<SourceType>(params.initialSource ?? 'drive');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);

  useEffect(() => {
    if (params.initialSource && params.initialSource !== sourceType) {
      setSourceType(params.initialSource);
    }
  }, [params.initialSource]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFiles(sourceType);

  // Clear selections when switching source provider
  const handleSourceChange = (newSource: SourceType) => {
    if (newSource !== sourceType) {
      setSourceType(newSource);
      setSelectedFiles([]);
      setSearchQuery('');
    }
  };

  // Flatten paginated pages
  const allFiles = useMemo(() => {
    return data?.pages.flatMap((page) => page.files) ?? [];
  }, [data]);

  // Client-side search filtering
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allFiles;
    const q = searchQuery.toLowerCase();
    return allFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.subject && f.subject.toLowerCase().includes(q)) ||
        (f.sender && f.sender.toLowerCase().includes(q)),
    );
  }, [allFiles, searchQuery]);

  const toggleSelectFile = (file: DriveFile) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.id === file.id);
      if (exists) {
        return prev.filter((f) => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles([...filteredFiles]);
    }
  };

  const handleProceedTransfer = () => {
    if (selectedFiles.length === 0) return;

    // Navigate to confirmation with selected files encoded
    router.push({
      pathname: '/(app)/transfer/confirm',
      params: {
        sourceType,
        filesJson: JSON.stringify(selectedFiles),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Browse Files</Text>
          {filteredFiles.length > 0 && (
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>
                {selectedFiles.length === filteredFiles.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Source Provider Tabs */}
        <View style={styles.tabsContainer}>
          {SOURCES.map((tab) => {
            const active = tab.key === sourceType;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => handleSourceChange(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? '#ffffff' : '#6a6a9a'}
                />
                <Text style={[styles.tabText, active && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#6a6a9a" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${sourceType.toUpperCase()} files...`}
            placeholderTextColor="#5a5a7a"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#6a6a9a" />
            </TouchableOpacity>
          )}
        </View>

        {/* File List */}
        {isLoading ? (
          <LoadingSpinner fullScreen message="Loading files..." />
        ) : isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Failed to load files"
            subtitle={error instanceof Error ? error.message : 'Please check your connection and account credentials.'}
          />
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No files found"
            subtitle={
              searchQuery
                ? `No files matching "${searchQuery}"`
                : `No items present in this ${sourceType} account.`
            }
          />
        ) : (
          <FlatList
            data={filteredFiles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedFiles.some((f) => f.id === item.id);
              return (
                <FileItem
                  file={item}
                  selected={isSelected}
                  onToggle={toggleSelectFile}
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.listFooter}>
                  <ActivityIndicator size="small" color="#6C63FF" />
                </View>
              ) : null
            }
            refreshing={isLoading}
            onRefresh={refetch}
          />
        )}

        {/* Bottom Floating Action Bar for Selected Files */}
        {selectedFiles.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionCount}>
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
              </Text>
            </View>

            <TouchableOpacity
              style={styles.transferBtn}
              onPress={handleProceedTransfer}
              activeOpacity={0.8}
            >
              <Text style={styles.transferBtnText}>Transfer</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  activeTab: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a6a9a',
  },
  activeTabText: {
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingBottom: 90,
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a3a5c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
  },
  transferBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

