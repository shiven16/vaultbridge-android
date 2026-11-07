import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  email: string | null;
  picture: string | null;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
  accentColor?: string;
}

export default function AccountCard({
  label,
  email,
  picture,
  connected,
  onConnect,
  onDisconnect,
  disabled,
  accentColor = '#6C63FF',
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>

      {connected && email ? (
        <View style={styles.connectedRow}>
          {picture ? (
            <Image source={{ uri: picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accentColor + '33' }]}>
              <Text style={[styles.avatarInitial, { color: accentColor }]}>
                {email.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.accountInfo}>
            <Text style={styles.connectedLabel}>Connected</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={accentColor} />
          <TouchableOpacity onPress={onDisconnect} style={styles.disconnectBtn} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.connectBtn, disabled && styles.connectBtnDisabled]}
          onPress={onConnect}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={18} color={disabled ? '#5a5a7a' : '#fff'} />
          <Text style={[styles.connectBtnText, disabled && styles.connectBtnTextDisabled]}>
            Connect {label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6a6a9a',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  connectedLabel: {
    fontSize: 11,
    color: '#6a6a9a',
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    color: '#e0e0f0',
    fontWeight: '500',
  },
  disconnectBtn: {
    padding: 2,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  connectBtnDisabled: {
    backgroundColor: '#2a2a40',
  },
  connectBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  connectBtnTextDisabled: {
    color: '#5a5a7a',
  },
});

