'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { institutionsApi, type InstitutionListQuery } from './institutions-api';

export const institutionKeys = {
  all: ['institutions'] as const,
  detail: (id: string) => [...institutionKeys.all, 'detail', id] as const,
  list: (query: InstitutionListQuery) => [...institutionKeys.all, 'list', query] as const,
};

export function useInstitutionList(query: InstitutionListQuery, enabled = true) {
  return useQuery({
    queryKey: institutionKeys.list(query),
    queryFn: () => institutionsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInstitution(id: string | null) {
  return useQuery({
    queryKey: institutionKeys.detail(id ?? ''),
    queryFn: () => institutionsApi.get(id ?? ''),
    enabled: id !== null,
  });
}
