import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Introduce un correo válido').max(254),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
});
export type LoginForm = z.infer<typeof loginSchema>;

/** Campos editables de un contacto (mismas reglas que el DTO del backend; el backend valida de nuevo). */
export const contactFormSchema = z.object({
  firstName: z.string().trim().max(100, 'Máximo 100 caracteres'),
  lastName: z.string().trim().max(100, 'Máximo 100 caracteres'),
  email: z.union([z.literal(''), z.email('Correo no válido').max(254)]),
  phone: z.union([z.literal(''), z.string().regex(/^\+?[0-9 ()\-.]{5,40}$/, 'Teléfono no válido')]),
});
export type ContactForm = z.infer<typeof contactFormSchema>;

/** Convierte el formulario en un PATCH mínimo: sólo campos que cambiaron; vacío → null (borrar). */
export function toContactPatch(initial: ContactForm, values: ContactForm) {
  const patch: Partial<Record<keyof ContactForm, string | null>> = {};
  for (const key of Object.keys(values) as (keyof ContactForm)[]) {
    const v = values[key].trim();
    if (v !== initial[key].trim()) patch[key] = v === '' ? null : v;
  }
  return patch;
}
