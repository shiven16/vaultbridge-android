import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'large', message, fullScreen = false }: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color="#6C63FF" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  message: {
    color: '#a0a0b0',
    fontSize: 14,
    marginTop: 8,
  },
});

