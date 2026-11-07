import { useInfiniteQuery } from '@tanstack/react-query';
import { listSourceFiles } from '../api/sources.api';
import type { SourceType } from '../types/api.types';

export function useFiles(sourceType: SourceType) {
  return useInfiniteQuery({
    queryKey: ['files', sourceType],
    queryFn: ({ pageParam }) =>
      listSourceFiles({ sourceType, pageToken: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 60_000,
  });
}

