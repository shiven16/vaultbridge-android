// ─── Auth ───────────────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export interface MeResponse {
  user: UserInfo;
  sourceConnected: boolean;
  sourceEmail: string | null;
  sourcePicture: string | null;
  destConnected: boolean;
  destEmail: string | null;
  destPicture: string | null;
}

export interface LoginUrlResponse {
  url: string;
}

export interface CallbackResponse {
  message: string;
  token?: string;
  user: {
    id: string;
    email: string;
    name: string;
    type: string;
  };
  returnTo?: string;
}

// ─── Files ──────────────────────────────────────────────────────────────────

export type SourceType = 'drive' | 'gcs' | 'gmail';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  sender?: string;
  subject?: string;
}

export interface FileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface StorageQuota {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInDriveTrash: string;
}

// ─── Transfers ──────────────────────────────────────────────────────────────

export type TransferStatus = 'pending' | 'in_progress' | 'success' | 'failed';
export type TransferMode = 'copy' | 'move';

export interface Transfer {
  id: string;
  userId: string;
  sourceFileId: string;
  fileName: string;
  mimeType: string | null;
  sourceType: SourceType;
  transferMode: TransferMode;
  status: TransferStatus;
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface CreateTransferPayload {
  fileId: string;
  fileName: string;
  mimeType?: string;
  sourceType: SourceType;
  transferMode: TransferMode;
}

export interface BatchTransferPayload {
  files: Array<{ fileId: string; fileName: string; mimeType?: string }>;
  sourceType: SourceType;
  transferMode: TransferMode;
}

export interface TransferInitResponse {
  message: string;
  transferId: string;
}

export interface BatchTransferInitResponse {
  message: string;
  transferIds: string[];
}

export interface UserTransfersResponse {
  transfers: Transfer[];
}

