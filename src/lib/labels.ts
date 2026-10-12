import type { ContactSyncStatus, JobStatus, MemberRole, SyncableField } from '@/types';

export const SYNC_STATUS_LABEL: Record<ContactSyncStatus, string> = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  conflict: 'Conflicto',
  failed: 'Error',
  local_only: 'Sólo local',
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pendiente',
  running: 'En curso',
  completed: 'Completado',
  partially_failed: 'Parcial',
  failed: 'Fallido',
};

export const ROLE_LABEL: Record<MemberRole, string> = { owner: 'Propietario', admin: 'Administrador', editor: 'Editor', viewer: 'Lectura' };

export const FIELD_LABEL: Record<SyncableField, string> = { firstName: 'Nombre', lastName: 'Apellido', email: 'Correo', phone: 'Teléfono' };

export const OPERATION_LABEL: Record<string, string> = {
  'import.created': 'Creado',
  'import.updated': 'Actualizado',
  'import.unchanged': 'Sin cambios',
  'import.skipped': 'Omitido',
  'import.fetch': 'Lectura remota',
  'import.write': 'Escritura local',
  'export.update': 'Envío a GHL',
  'export.unchanged': 'Ya alineado',
  'export.aborted': 'Abortado',
};

const ROLE_RANK: Record<MemberRole, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };
export const canRole = (role: MemberRole | undefined, min: MemberRole) => !!role && ROLE_RANK[role] >= ROLE_RANK[min];
