import type {
  AuditEntry,
  CompanySummary,
  Contact,
  ContactEvent,
  ContactSyncStatus,
  ContactUpdate,
  Diagnostics,
  ExportPreview,
  GhlStatus,
  Health,
  JobStatus,
  Me,
  Paginated,
  ProvisioningStatus,
  RemoteContactPage,
  SyncDirection,
  SyncJob,
  SyncJobDetail,
} from '@/types';
import { api, patch, post } from './api-client';

const qs = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const authApi = {
  login: (email: string, password: string) => post<{ expiresAt: string }>('/auth/login', { email, password }),
  logout: () => post<{ ok: true }>('/auth/logout'),
  me: () => api<Me>('/auth/me'),
  ghlContext: (encryptedData: string, locationName?: string) => post<{ expiresAt: string }>('/auth/ghl-context', { encryptedData, ...(locationName ? { locationName } : {}) }),
};

export const companyApi = {
  summary: () => api<CompanySummary>('/companies/current/summary'),
};

export type ContactQuery = { q?: string; status?: ContactSyncStatus | ''; page?: number; limit?: number; sort?: 'updatedAt' | 'lastName' | 'lastSyncedAt' };
export const contactsApi = {
  list: (q: ContactQuery) => api<Paginated<Contact>>(`/contacts${qs(q)}`),
  get: (id: string) => api<Contact>(`/contacts/${id}`),
  history: (id: string) => api<ContactEvent[]>(`/contacts/${id}/history`),
  update: (id: string, body: ContactUpdate) => patch<Contact>(`/contacts/${id}`, body),
};

export const syncApi = {
  import: (body: { ghlContactIds?: string[]; overwriteLocalChanges?: boolean }, key: string) => post<SyncJobDetail>('/sync/import', body, key),
  preview: (contactIds: string[]) => post<ExportPreview>('/sync/export/preview', { contactIds }),
  export: (body: { contactIds: string[]; confirmed: true; previewToken: string; overwriteConflicts?: boolean }, key: string) => post<SyncJobDetail>('/sync/export', body, key),
  jobs: (q: { page?: number; limit?: number; direction?: SyncDirection; status?: JobStatus }) => api<Paginated<SyncJob>>(`/sync/jobs${qs(q)}`),
  job: (id: string) => api<SyncJobDetail>(`/sync/jobs/${id}`),
};

export const ghlApi = {
  status: () => api<GhlStatus>('/integrations/ghl/status'),
  remoteContacts: (q: { page?: number; limit?: number; q?: string }) => api<RemoteContactPage>(`/integrations/ghl/contacts${qs(q)}`),
  startOAuth: () => post<{ authorizationUrl: string }>('/integrations/ghl/oauth/start'),
  disconnect: () => post<{ ok: true }>('/integrations/ghl/disconnect'),
  provisioning: () => api<ProvisioningStatus>('/integrations/ghl/provisioning'),
  retryProvisioning: () => post<{ executionId: string | null; alreadyActive: boolean }>('/integrations/ghl/provisioning/retry'),
  simulateRemoteEdit: (ghlContactId: string) => post<{ ghlContactId: string }>('/integrations/ghl/mock/remote-edit', { ghlContactId }),
};

export const systemApi = {
  health: () => api<Health>('/health'),
  diagnostics: () => api<Diagnostics>('/diagnostics'),
  audit: (q: { page?: number; limit?: number }) => api<Paginated<AuditEntry>>(`/audit${qs(q)}`),
};
