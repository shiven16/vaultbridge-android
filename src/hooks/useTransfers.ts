import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { getUserTransfers, getTransferStatus, createBatchTransfer } from '../api/transfer.api';
import type { SourceType, TransferMode, DriveFile } from '../types/api.types';

export function useUserTransfers() {
  return useQuery({
    queryKey: ['transfers'],
    queryFn: getUserTransfers,
    select: (data) => data.transfers,
    staleTime: 10_000,
  });
}

export function useTransferPolling(transferIds: string[]) {
  return useQueries({
    queries: transferIds.map((id) => ({
      queryKey: ['transfer', id],
      queryFn: () => getTransferStatus(id),
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const status = query?.state?.data?.status;
        if (status === 'success' || status === 'failed') return false;
        return 2500;
      },
      staleTime: 0,
    })),
  });
}

export function useStartBatchTransfer() {
  const queryClient = useQueryClient();

  const startTransfer = async (params: {
    files: DriveFile[];
    sourceType: SourceType;
    transferMode: TransferMode;
  }) => {
    const result = await createBatchTransfer({
      files: params.files.map((f) => ({
        fileId: f.id,
        fileName: f.name,
        mimeType: f.mimeType,
      })),
      sourceType: params.sourceType,
      transferMode: params.transferMode,
    });
    // Invalidate history list
    await queryClient.invalidateQueries({ queryKey: ['transfers'] });
    return result.transferIds;
  };

  return { startTransfer };
}

