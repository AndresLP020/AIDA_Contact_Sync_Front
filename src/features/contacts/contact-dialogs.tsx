'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Pencil } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorAlert, SyncStatusBadge } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/form-controls';
import { useSession } from '@/hooks/use-session';
import { describeError } from '@/lib/error-messages';
import { FIELD_LABEL, OPERATION_LABEL } from '@/lib/labels';
import { type ContactForm, contactFormSchema, toContactPatch } from '@/lib/schemas';
import { formatDateTime, fullName } from '@/lib/utils';
import { contactsApi, ghlApi } from '@/services/endpoints';
import type { Contact } from '@/types';

const toForm = (c: Contact): ContactForm => ({ firstName: c.firstName ?? '', lastName: c.lastName ?? '', email: c.email ?? '', phone: c.phone ?? '' });

export function ContactDetailDialog({ contact, onClose, onEdit }: { contact: Contact | null; onClose: () => void; onEdit: (c: Contact) => void }) {
  const qc = useQueryClient();
  const { can } = useSession();
  const ghl = useQuery({ queryKey: ['ghl-status'], queryFn: ghlApi.status });
  const history = useQuery({ queryKey: ['contact-history', contact?.id], queryFn: () => contactsApi.history(contact!.id), enabled: !!contact });
  const simulate = useMutation({
    mutationFn: () => ghlApi.simulateRemoteEdit(contact!.ghlContactId),
    onSuccess: () => {
      toast.info('Simulación: el contacto se editó en GHL. Si lo exportas tras modificarlo localmente se detectará un conflicto.');
      void qc.invalidateQueries({ queryKey: ['remote-contacts'] });
    },
  });
  if (!contact) return null;
  const rows: [string, React.ReactNode][] = [
    [FIELD_LABEL.firstName, contact.firstName ?? '—'],
    [FIELD_LABEL.lastName, contact.lastName ?? '—'],
    [FIELD_LABEL.email, contact.email ?? '—'],
    [FIELD_LABEL.phone, contact.phone ?? '—'],
    ['ID GHL', <span key="id" className="font-mono text-[11px]">{contact.ghlContactId}</span>],
    ['ID local', <span key="lid" className="font-mono text-[11px]">{contact.id}</span>],
    ['Estado', <SyncStatusBadge key="st" status={contact.syncStatus} />],
    ['Origen del último valor', contact.origin === 'local' ? 'Edición local exportada' : 'GoHighLevel'],
    ['Fuente', contact.source],
    ['Última sincronización', formatDateTime(contact.lastSyncedAt)],
    ['Última modificación en GHL', formatDateTime(contact.lastRemoteUpdate)],
    ['Última actualización local', formatDateTime(contact.updatedAt)],
  ];
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{fullName(contact)}</DialogTitle>
          <DialogDescription>Detalle del contacto almacenado en PostgreSQL</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[minmax(0,180px)_1fr] gap-x-4 gap-y-2 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="mb-2 text-xs font-semibold">Historial de sincronización</h3>
          {history.data?.length ? (
            <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border text-[11px]">
              {history.data.map(e => (
                <li key={e.id} className="flex justify-between gap-2 px-3 py-1.5">
                  <span>{OPERATION_LABEL[e.operation] ?? e.operation}</span>
                  <span className={e.status === 'failed' ? 'text-rose-300' : 'text-emerald-300'}>{e.errorCode ? describeError(e.errorCode) : 'OK'}</span>
                  <span className="text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">Sin eventos.</p>
          )}
        </div>
        {ghl.data?.simulated && can('editor') && (
          <Alert variant="warning">
            <FlaskConical />
            <div className="grid gap-2">
              <span>Modo simulado: puedes simular una edición hecha directamente en GHL para probar la detección de conflictos.</span>
              <Button size="sm" variant="secondary" className="w-fit" disabled={simulate.isPending} onClick={() => simulate.mutate()}>
                Simular edición en GHL (demo)
              </Button>
            </div>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {can('editor') && (
            <Button onClick={() => onEdit(contact)}>
              <Pencil /> Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContactEditDialog({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm<ContactForm>({ resolver: zodResolver(contactFormSchema) });
  useEffect(() => {
    if (contact) form.reset(toForm(contact));
  }, [contact, form]);

  const update = useMutation({
    mutationFn: (values: ContactForm) => contactsApi.update(contact!.id, { ...toContactPatch(toForm(contact!), values), expectedUpdatedAt: contact!.updatedAt }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contacts'] });
      void qc.invalidateQueries({ queryKey: ['summary'] });
      toast.success('Contacto actualizado localmente. Queda pendiente de exportar a GHL.');
      onClose();
    },
  });
  if (!contact) return null;
  const { errors, isDirty } = form.formState;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
          <DialogDescription>Sólo se pueden modificar nombre, apellido, correo y teléfono. Los cambios no se envían a GHL hasta que los exportes y confirmes.</DialogDescription>
        </DialogHeader>
        <form id="contact-form" className="grid gap-3" onSubmit={form.handleSubmit(v => update.mutate(v))} noValidate>
          {(['firstName', 'lastName', 'email', 'phone'] as const).map(key => (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={key}>{FIELD_LABEL[key]}</Label>
              <Input id={key} aria-invalid={!!errors[key]} {...form.register(key)} />
              {errors[key] && <p className="text-[11px] text-rose-300">{errors[key]?.message}</p>}
            </div>
          ))}
          {contact.syncStatus === 'conflict' && <Alert variant="warning">Este contacto está en conflicto con GHL. Revisa la vista previa antes de exportar.</Alert>}
          <ErrorAlert error={update.error} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="contact-form" disabled={!isDirty || update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
