'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionKeys } from '@/features/institutions/use-institutions';
import { societyKeys } from '@/features/societies/use-societies';
import { blocksApi } from './blocks-api';
import type { BlockSectionBody, BlockTarget } from './types';

export const blockKeys = {
  all: ['access-blocks'] as const,
  society: (societyId: string) => [...blockKeys.all, 'society', societyId] as const,
};

/** The most a Society can hold: one for its Owners and two for each Institution. PLT-44 answers up to 100 a page. */
const SOCIETY_BLOCKS_LIMIT = 100;

/** The active blocks of one Society, for the reasons shown beside each blocked section. */
export function useSocietyBlocks(societyId: string) {
  return useQuery({
    queryKey: blockKeys.society(societyId),
    queryFn: () => blocksApi.list({ societyId, limit: SOCIETY_BLOCKS_LIMIT }),
  });
}

/** A block or an unblock changes what the Society, Institution and block lists show, even when it is refused. */
function useBlockWrite<Input, Output>(write: (input: Input) => Promise<Output>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSettled: async () => {
      await Promise.all(
        [blockKeys.all, societyKeys.all, institutionKeys.all].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const useBlockSection = () => useBlockWrite((body: BlockSectionBody) => blocksApi.block(body));

export const useUnblockSection = () => useBlockWrite((target: BlockTarget) => blocksApi.unblock(target));
