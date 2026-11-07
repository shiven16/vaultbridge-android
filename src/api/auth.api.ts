import client from './client';
import type { MeResponse, LoginUrlResponse, CallbackResponse } from '../types/api.types';

export async function getLoginUrl(
  type: 'source' | 'destination',
  pairId?: string,
): Promise<string> {
  const res = await client.get<LoginUrlResponse>('/auth/login', {
    params: { type, ...(pairId ? { pairId } : {}) },
  });
  return res.data.url;
}

export async function checkPairSession(pairId: string): Promise<string | null> {
  try {
    const res = await client.get<{ status: string; token?: string }>('/auth/pair', {
      params: { pairId },
      validateStatus: (status) => status === 200 || status === 202 || status === 404,
    });
    if (res.status === 200 && res.data.token) {
      return res.data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function handleCallback(
  code: string,
  state: string | null,
  type: 'source' | 'destination',
): Promise<CallbackResponse> {
  const res = await client.get<CallbackResponse>('/auth/callback', {
    params: { code, state, type },
  });
  const data = res.data;
  if (!data.token && res.headers && res.headers['set-cookie']) {
    const cookies = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'].join(';')
      : String(res.headers['set-cookie']);
    const match = cookies.match(/token=([^;]+)/);
    if (match) {
      data.token = match[1];
    }
  }
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const res = await client.get<MeResponse>('/auth/me');
  return res.data;
}

export async function disconnectAccount(type: 'source' | 'destination'): Promise<void> {
  await client.post('/auth/disconnect', { type });
}
