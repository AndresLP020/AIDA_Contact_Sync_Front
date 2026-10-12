/** Mensajes en español para los códigos de error estables del backend y de los resultados OAuth. */
const MESSAGES: Record<string, string> = {
  SESSION_REQUIRED: 'Tu sesión no está activa. Inicia sesión de nuevo.',
  SESSION_INVALID: 'Tu sesión expiró o fue revocada. Inicia sesión de nuevo.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  INSUFFICIENT_ROLE: 'Tu rol no permite realizar esta operación.',
  CSRF_ORIGIN_REJECTED: 'La solicitud fue bloqueada por origen no permitido.',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  VALIDATION_FAILED: 'Algunos datos no son válidos.',
  CONTACT_NOT_FOUND: 'El contacto no existe en esta empresa.',
  STALE_CONTACT: 'El contacto cambió mientras lo editabas. Recarga y vuelve a intentarlo.',
  SYNC_IN_PROGRESS: 'Ya hay una sincronización en curso para esta empresa.',
  PREVIEW_STALE: 'La vista previa expiró o los contactos cambiaron. Genera una nueva vista previa.',
  IDEMPOTENCY_KEY_REUSED: 'La operación ya se registró con otra configuración.',
  GHL_NOT_CONNECTED: 'La empresa no tiene una instalación GHL activa.',
  GHL_UNAUTHORIZED: 'GHL rechazó las credenciales. Reconecta la integración.',
  GHL_REFRESH_REJECTED: 'GHL rechazó la renovación del token. Reconecta la integración.',
  GHL_FORBIDDEN: 'GHL denegó la operación: revisa los scopes autorizados.',
  GHL_NOT_FOUND: 'El contacto ya no existe en GHL.',
  GHL_RATE_LIMITED: 'GHL limitó las solicitudes. Inténtalo más tarde.',
  GHL_UNAVAILABLE: 'GHL no está disponible temporalmente.',
  GHL_NETWORK: 'No se pudo conectar con GHL.',
  GHL_INVALID_RESPONSE: 'GHL devolvió una respuesta inesperada.',
  GHL_FOREIGN_LOCATION: 'GHL devolvió datos de otra subcuenta; se descartaron.',
  GHL_VALIDATION: 'GHL rechazó los datos enviados.',
  GHL_MOCK_MODE: 'OAuth sólo está disponible con GHL_MODE=real.',
  CONFLICT_REMOTE_CHANGED: 'El contacto cambió en GHL desde la última sincronización.',
  CONFLICT_NO_BASELINE: 'No hay referencia de la última sincronización; reimporta antes de enviar.',
  LOCAL_CHANGES_PENDING: 'Tiene cambios locales sin exportar; no se sobrescribió.',
  LOCAL_CHANGED_DURING_EXPORT: 'El contacto se editó durante el envío; queda pendiente.',
  REMOTE_VERIFY_FAILED: 'GHL no confirmó los valores enviados.',
  IMPORT_LIMIT_REACHED: 'Se alcanzó el límite de importación por ejecución.',
  DB_WRITE_FAILED: 'No se pudo guardar en la base de datos.',
  STALE_JOB: 'El trabajo quedó interrumpido y se cerró automáticamente.',
  NETWORK_ERROR: 'No se pudo contactar al backend.',
};

export const OAUTH_OUTCOME: Record<string, { ok: boolean; message: string }> = {
  connected: { ok: true, message: 'Subcuenta GHL conectada correctamente.' },
  denied: { ok: false, message: 'La autorización fue cancelada en GHL.' },
  invalid_request: { ok: false, message: 'GHL no devolvió un código de autorización válido.' },
  invalid_state: { ok: false, message: 'El enlace de autorización expiró o no es válido. Inicia la conexión de nuevo.' },
  exchange_failed: { ok: false, message: 'No se pudo intercambiar el código con GHL. Revisa Client ID, Secret y Redirect URI.' },
  invalid_token_response: { ok: false, message: 'GHL devolvió una respuesta de token inesperada.' },
  not_location_install: { ok: false, message: 'La instalación debe hacerse en una subcuenta (location), no a nivel agencia.' },
  missing_scopes: { ok: false, message: 'Faltan permisos (scopes) requeridos: contacts.readonly.' },
  location_mismatch: { ok: false, message: 'Esta empresa ya está vinculada a otra subcuenta GHL.' },
  location_already_linked: { ok: false, message: 'Esa subcuenta GHL ya está vinculada a otra empresa.' },
};

export function describeError(code: string | null | undefined, fallback?: string) {
  if (!code) return fallback ?? 'Error desconocido';
  return MESSAGES[code] ?? fallback ?? code;
}
