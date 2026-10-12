import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : dateTime.format(d);
}

export function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

/** Genera una Idempotency-Key por operación iniciada por el usuario. */
export function newIdempotencyKey() {
  return crypto.randomUUID();
}
