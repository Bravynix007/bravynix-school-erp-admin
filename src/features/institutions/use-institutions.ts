'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { institutionsApi, type InstitutionListQuery } from './institutions-api';

export const institutionKeys = {
  all: ['institutions'] as const,
  list: (query: InstitutionListQuery) => [...institutionKeys.all, 'list', query] as const,
};

export function useInstitutionList(query: InstitutionListQuery) {
  return useQuery({
    queryKey: institutionKeys.list(query),
    queryFn: () => institutionsApi.list(query),
    placeholderData: keepPreviousData,
  });
}
