'use client';
import { useQuery } from '@tanstack/react-query';
import { canRole } from '@/lib/labels';
import { ApiError } from '@/services/api-client';
import { authApi } from '@/services/endpoints';
import type { MemberRole } from '@/types';

export const SESSION_KEY = ['me'] as const;

export function useSession() {
  const query = useQuery({ queryKey: SESSION_KEY, queryFn: authApi.me, retry: false, staleTime: 60_000 });
  const unauthenticated = query.error instanceof ApiError && query.error.status === 401;
  return {
    ...query,
    me: query.data,
    unauthenticated,
    can: (role: MemberRole) => canRole(query.data?.role, role),
  };
}
