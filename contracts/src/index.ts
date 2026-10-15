/**
 * Contratos de la API propia de AIDA Contact Sync (/api/v1). Reflejan las respuestas del backend NestJS
 * (ver Swagger en /api/docs). No describen la API oficial de GoHighLevel.
 * Las fechas viajan como cadenas ISO-8601.
 */

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ContactSyncStatus = 'local_only' | 'synced' | 'pending' | 'conflict' | 'failed';
export type SyncDirection = 'import' | 'export';
export type JobStatus = 'pending' | 'running' | 'completed' | 'partially_failed' | 'failed';
export type SyncableField = 'firstName' | 'lastName' | 'email' | 'phone';
export type ConflictReason = 'NO_BASELINE' | 'REMOTE_CHANGED';

export type ApiErrorBody = { statusCode: number; code: string; message: string; correlationId: string; retryAfterSeconds?: number };

export type Paginated<T> = { items: T[]; page: number; limit: number; total: number; pages: number };

export type Me = {
  user: { id: string; email: string; displayName: string };
  company: { id: string; name: string | null };
  role: MemberRole;
  session: { expiresAt: string; method: 'password' | 'ghl_context' };
};

/** name es null si la empresa se registró automáticamente y GHL no permitió verificar su nombre. */
export type Company = { id: string; name: string | null; ghlLocationId: string | null; status: string; createdAt: string; role: MemberRole };

export type CompanySummary = {
  contacts: { total: number; synced: number; pending: number; conflict: number; failed: number };
  jobs: { running: number; failedLast7Days: number };
  lastSync: { id: string; direction: SyncDirection; status: JobStatus; finishedAt: string } | null;
};

export type Contact = {
  id: string;
  ghlContactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  origin: string;
  syncStatus: ContactSyncStatus;
  lastSyncedAt: string | null;
  lastRemoteUpdate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactUpdate = Partial<Record<SyncableField, string | null>> & { expectedUpdatedAt?: string };

export type ContactEvent = { id: string; operation: string; status: 'success' | 'failed'; errorCode: string | null; createdAt: string; syncJobId: string };

export type SyncEvent = {
  id: string;
  contactId: string | null;
  ghlContactId: string | null;
  operation: string;
  status: 'success' | 'failed';
  errorCode: string | null;
  createdAt: string;
  contact: { firstName: string | null; lastName: string | null } | null;
};

export type SyncJob = {
  id: string;
  companyId: string;
  requestedById: string | null;
  direction: SyncDirection;
  status: JobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errorCode: string | null;
  createdAt: string;
};
export type SyncJobDetail = SyncJob & { events: SyncEvent[] };

export type FieldChange = { field: SyncableField; local: string | null; remote: string | null };
export type ExportPreviewItem = {
  contactId: string;
  ghlContactId: string;
  name: string;
  syncStatus: ContactSyncStatus;
  changes: FieldChange[];
  conflict: ConflictReason | null;
  remoteTouched: boolean;
  remoteDateUpdated: string | null;
  error: string | null;
};
export type ExportPreview = {
  items: ExportPreviewItem[];
  summary: { total: number; withChanges: number; conflicts: number; errors: number };
  previewToken: string;
  expiresAt: string;
};

export type RemoteContact = {
  ghlContactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  dateUpdated: string | null;
  localId: string | null;
  localStatus: ContactSyncStatus | null;
};
export type RemoteContactPage = { items: RemoteContact[]; page: number; limit: number; total: number | null; hasMore: boolean };

export type GhlStatus = {
  mode: 'mock' | 'real';
  simulated: boolean;
  connected: boolean;
  status: 'simulated' | 'not_connected' | 'pending' | 'active' | 'revoked' | 'error';
  locationId: string | null;
  scopes: string[];
  requestedScopes: string[];
  credential: { present: boolean; expiresAt: string | null; tokenVersion: number | null };
  installedAt: string | null;
  revokedAt?: string | null;
  lastCommunicationAt: string | null;
  lastErrorCode: string | null;
};

export type Health = { status: 'ok' | 'degraded'; service: string; database: 'ok' | 'error'; timestamp: string };

export type Diagnostics = {
  backend: { status: 'ok'; environment: string };
  database: { status: 'ok' | 'error'; latencyMs: number | null };
  ghl: { mode: 'mock' | 'real'; apiBase: string | null; apiVersion: string; installationStatus: string; lastCommunicationAt: string | null; lastErrorCode: string | null };
  lastError: { code: string | null; source: string; at: string; jobId: string } | null;
  correlationId: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  correlationId: string;
  createdAt: string;
  actor: { id: string; displayName: string } | null;
};

export type ConfigurationStatus = 'pending' | 'running' | 'ready' | 'requires_action' | 'cancelled';
export type ProvisioningStepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'requires_action' | 'ambiguous' | 'cancelled';

export type ProvisionedResourceStatus = {
  resourceKey: string;
  resourceType: 'custom_field' | 'custom_value';
  displayName: string;
  required: boolean;
  policy: 'create_only' | 'app_managed_value';
  origin: 'created' | 'adopted' | null;
  status: 'missing' | 'creating' | 'pending_reconciliation' | 'active' | 'conflict';
  remoteKey: string | null;
  remoteName: string | null;
  lastVerifiedAt: string | null;
  step: { status: ProvisioningStepStatus; outcome: string | null; errorCode: string | null; attempts: number; finishedAt: string | null } | null;
};

/** Estado de la configuración automática de la subcuenta (GET /integrations/ghl/provisioning). Nunca incluye tokens. */
export type ProvisioningStatus = {
  mode: 'mock' | 'real';
  simulated: boolean;
  manifestVersion: number;
  installation: { locationId: string; status: 'pending' | 'active' | 'revoked' | 'error'; generation: number; source: string } | null;
  configurationStatus: ConfigurationStatus | null;
  execution: {
    id: string;
    status: ConfigurationStatus;
    trigger: string;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    lastAttemptAt: string;
    lastErrorCode: string | null;
    manifestVersion: number;
  } | null;
  resources: ProvisionedResourceStatus[];
  missingScopes: string[];
  canRetry: boolean;
};
