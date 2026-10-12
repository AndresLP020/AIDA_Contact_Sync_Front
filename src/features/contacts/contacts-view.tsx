'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Eye, Pencil, Search, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorAlert, PageHeader, SyncStatusBadge, TableSkeleton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Input, NativeSelect } from '@/components/ui/form-controls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportPreviewDialog } from '@/features/synchronization/export-preview-dialog';
import { useSession } from '@/hooks/use-session';
import { SYNC_STATUS_LABEL } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { type ContactQuery, contactsApi } from '@/services/endpoints';
import type { Contact, ContactSyncStatus } from '@/types';
import { ContactDetailDialog, ContactEditDialog } from './contact-dialogs';

const PAGE_SIZE = 10;
const MAX_EXPORT = 50;

export function ContactsView() {
  const { can } = useSession();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState<ContactQuery>({ q: '', status: '', page: 1, limit: PAGE_SIZE, sort: 'updatedAt' });
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const contacts = useQuery({ queryKey: ['contacts', query], queryFn: () => contactsApi.list(query), placeholderData: keepPreviousData });
  const items = contacts.data?.items ?? [];
  const pageIds = items.map(c => c.id);
  const allOnPage = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
  const someOnPage = pageIds.some(id => selected.includes(id));
  const set = (patch: Partial<ContactQuery>) => setQuery(q => ({ ...q, page: 1, ...patch }));

  return (
    <>
      <PageHeader
        eyebrow="Directorio"
        title="Contactos"
        description="Contactos almacenados para la empresa activa. El acceso está aislado por empresa."
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <form
              className="flex gap-2"
              role="search"
              onSubmit={e => {
                e.preventDefault();
                set({ q: input.trim() });
              }}
            >
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Buscar nombre, correo, teléfono o ID GHL…" className="sm:w-80" aria-label="Buscar contactos" />
              <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
                <Search />
              </Button>
              {query.q && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    setInput('');
                    set({ q: '' });
                  }}
                >
                  <X />
                </Button>
              )}
            </form>
            <NativeSelect value={query.status} onChange={e => set({ status: e.target.value as ContactSyncStatus | '' })} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              {(['synced', 'pending', 'conflict', 'failed'] as const).map(s => (
                <option key={s} value={s}>
                  {SYNC_STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={query.sort} onChange={e => set({ sort: e.target.value as ContactQuery['sort'] })} aria-label="Ordenar">
              <option value="updatedAt">Más recientes</option>
              <option value="lastName">Apellido (A-Z)</option>
              <option value="lastSyncedAt">Última sincronización</option>
            </NativeSelect>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground" data-testid="selected-count">
              {selected.length} seleccionados
            </span>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Limpiar
              </Button>
            )}
            {can('editor') && (
              <Button size="sm" disabled={!selected.length || selected.length > MAX_EXPORT} onClick={() => setExportOpen(true)}>
                <Upload /> Exportar a GHL
              </Button>
            )}
          </div>
        </div>

        <ErrorAlert error={contacts.error} className="m-4 w-auto" />
        {contacts.isLoading ? (
          <TableSkeleton rows={6} />
        ) : items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Seleccionar página"
                    checked={allOnPage ? true : someOnPage ? 'indeterminate' : false}
                    onCheckedChange={v => setSelected(s => (v === true ? [...new Set([...s, ...pageIds])] : s.filter(id => !pageIds.includes(id))))}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>ID GHL</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última actualización</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(c => (
                <TableRow key={c.id} data-state={selected.includes(c.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox aria-label={`Seleccionar ${c.firstName ?? ''} ${c.lastName ?? ''}`} checked={selected.includes(c.id)} onCheckedChange={v => setSelected(s => (v === true ? [...s, c.id] : s.filter(id => id !== c.id)))} />
                  </TableCell>
                  <TableCell className="font-medium text-white">{c.firstName ?? '—'}</TableCell>
                  <TableCell>{c.lastName ?? '—'}</TableCell>
                  <TableCell className="max-w-56 truncate">{c.email ?? '—'}</TableCell>
                  <TableCell>{c.phone ?? '—'}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{c.ghlContactId}</TableCell>
                  <TableCell>
                    <SyncStatusBadge status={c.syncStatus} />
                  </TableCell>
                  <TableCell>{formatDateTime(c.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Ver ${c.firstName ?? ''}`} onClick={() => setDetail(c)}>
                        <Eye />
                      </Button>
                      {can('editor') && (
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${c.firstName ?? ''}`} onClick={() => setEditing(c)}>
                          <Pencil />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>{query.q || query.status ? 'No hay contactos que coincidan con el filtro.' : 'Aún no hay contactos. Importa desde GHL en la sección Sincronización.'}</EmptyState>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
          <span data-testid="pagination-info">
            {contacts.data?.total ?? 0} contactos · página {contacts.data?.page ?? 1} de {contacts.data?.pages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={(query.page ?? 1) <= 1} onClick={() => setQuery(q => ({ ...q, page: (q.page ?? 1) - 1 }))}>
              <ArrowLeft /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={(query.page ?? 1) >= (contacts.data?.pages ?? 1)} onClick={() => setQuery(q => ({ ...q, page: (q.page ?? 1) + 1 }))}>
              Siguiente <ArrowRight />
            </Button>
          </div>
        </div>
      </Card>

      <ContactDetailDialog
        contact={detail}
        onClose={() => setDetail(null)}
        onEdit={c => {
          setDetail(null);
          setEditing(c);
        }}
      />
      <ContactEditDialog contact={editing} onClose={() => setEditing(null)} />
      <ExportPreviewDialog
        open={exportOpen}
        contactIds={selected}
        onOpenChange={o => {
          setExportOpen(o);
          if (!o) setSelected([]);
        }}
      />
    </>
  );
}
