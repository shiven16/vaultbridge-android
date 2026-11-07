import client from './client';
import type {
  Transfer,
  CreateTransferPayload,
  BatchTransferPayload,
  TransferInitResponse,
  BatchTransferInitResponse,
  UserTransfersResponse,
} from '../types/api.types';

export async function createTransfer(
  payload: CreateTransferPayload,
): Promise<TransferInitResponse> {
  const res = await client.post<TransferInitResponse>('/transfer', payload);
  return res.data;
}

export async function createBatchTransfer(
  payload: BatchTransferPayload,
): Promise<BatchTransferInitResponse> {
  const res = await client.post<BatchTransferInitResponse>('/transfer/batch', payload);
  return res.data;
}

export async function getTransferStatus(id: string): Promise<Transfer> {
  const res = await client.get<Transfer>(`/transfer/${id}`);
  return res.data;
}

export async function getUserTransfers(): Promise<UserTransfersResponse> {
  const res = await client.get<UserTransfersResponse>('/transfer');
  return res.data;
}

