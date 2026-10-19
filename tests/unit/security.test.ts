import { describe, expect, it } from 'vitest';
import { isAllowedParentOrigin } from '@/hooks/use-embedded-context';
import { canRole } from '@/lib/labels';
import { contactFormSchema, loginSchema, toContactPatch } from '@/lib/schemas';
import { describeError, OAUTH_OUTCOME } from '@/lib/error-messages';

describe('Contexto incrustado: sólo se aceptan mensajes de GHL', () => {
  it.each([
    ['https://app.gohighlevel.com', true],
    ['https://agency.leadconnectorhq.com', true],
    ['https://x.msgsndr.com', true],
    ['https://app.aidaworkspace.com', true],
    ['http://app.gohighlevel.com', false],
    ['https://gohighlevel.com.evil.test', false],
    ['https://evil.test', false],
    ['nope', false],
  ])('%s → %s', (origin, ok) => expect(isAllowedParentOrigin(origin, [])).toBe(ok));
  it('acepta dominios white-label configurados explícitamente', () => {
    expect(isAllowedParentOrigin('https://crm.miagencia.test', ['https://crm.miagencia.test'])).toBe(true);
  });
});

describe('Validación de formularios', () => {
  it('login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.test', password: '12345678' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'x', password: '1' }).success).toBe(false);
  });
  it('contacto: correo y teléfono válidos o vacíos', () => {
    expect(contactFormSchema.safeParse({ firstName: 'A', lastName: '', email: '', phone: '' }).success).toBe(true);
    expect(contactFormSchema.safeParse({ firstName: 'A', lastName: '', email: 'malo', phone: '' }).success).toBe(false);
    expect(contactFormSchema.safeParse({ firstName: 'A', lastName: '', email: '', phone: '<script>' }).success).toBe(false);
  });
  it('PATCH mínimo: sólo campos cambiados y vacío → null', () => {
    const base = { firstName: 'Ana', lastName: 'Ruiz', email: 'a@b.test', phone: '+52 1' };
    expect(toContactPatch(base, { ...base, lastName: 'Gil', phone: '' })).toEqual({ lastName: 'Gil', phone: null });
    expect(toContactPatch(base, base)).toEqual({});
  });
});

describe('Roles y mensajes', () => {
  it('jerarquía de roles', () => {
    expect(canRole('owner', 'admin')).toBe(true);
    expect(canRole('editor', 'admin')).toBe(false);
    expect(canRole('viewer', 'editor')).toBe(false);
    expect(canRole(undefined, 'viewer')).toBe(false);
  });
  it('traduce códigos y conserva un mensaje del servidor si el código es desconocido', () => {
    expect(describeError('GHL_RATE_LIMITED')).toMatch(/limitó/);
    expect(describeError('ALGO_NUEVO', 'Mensaje del servidor')).toBe('Mensaje del servidor');
    expect(OAUTH_OUTCOME.invalid_state.ok).toBe(false);
  });
});
