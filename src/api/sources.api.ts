import client from './client';
import type {
  FileListResponse,
  StorageQuota,
  SourceType,
} from '../types/api.types';

export async function listSourceFiles(params: {
  sourceType: SourceType;
  pageToken?: string;
  pageSize?: number;
}): Promise<FileListResponse> {
  const res = await client.get<FileListResponse>('/sources/files', {
    params: {
      sourceType: params.sourceType,
      pageToken: params.pageToken,
      pageSize: params.pageSize ?? 20,
    },
  });
  return res.data;
}

export async function getSourceQuota(): Promise<StorageQuota> {
  const res = await client.get<StorageQuota>('/sources/quota');
  return res.data;
}

