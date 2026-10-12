'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Download, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorAlert, SyncStatusBadge, TableSkeleton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox, Input } from '@/components/ui/form-controls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fullName } from '@/lib/utils';
import { ghlApi } from '@/services/endpoints';

const PAGE = 20;

/** Selector de contactos de la subcuenta GHL (lectura) para importar sólo los elegidos. */
export function RemotePickerDialog({ open, onOpenChange, onImport, importing }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (ids: string[]) => void; importing: boolean }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const remote = useQuery({ queryKey: ['remote-contacts', page, search], queryFn: () => ghlApi.remoteContacts({ page, limit: PAGE, q: search || undefined }), enabled: open, placeholderData: keepPreviousData });
  const items = remote.data?.items ?? [];
  const toggle = (id: string, on: boolean) => setSelected(s => (on ? [...new Set([...s, id])] : s.filter(x => x !== id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Elegir contactos de GoHighLevel</DialogTitle>
          <DialogDescription>Consulta de sólo lectura. Selecciona hasta 100 contactos para importarlos a PostgreSQL.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en GHL…" aria-label="Buscar en GHL" />
          <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
            <Search />
          </Button>
        </form>
        <ErrorAlert error={remote.error} />
        <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
          {remote.isLoading ? (
            <TableSkeleton />
          ) : items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Contacto</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>ID GHL</TableHead>
                  <TableHead>Estado local</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(c => (
                  <TableRow key={c.ghlContactId} data-state={selected.includes(c.ghlContactId) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox checked={selected.includes(c.ghlContactId)} onCheckedChange={v => toggle(c.ghlContactId, v === true)} aria-label={`Seleccionar ${fullName(c)}`} />
                    </TableCell>
                    <TableCell>{fullName(c)}</TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{c.ghlContactId}</TableCell>
                    <TableCell>{c.localStatus ? <SyncStatusBadge status={c.localStatus} /> : <span className="text-[11px] text-muted-foreground">No importado</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState>Sin resultados en GHL.</EmptyState>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {selected.length} seleccionados{remote.data?.total != null ? ` · ${remote.data.total} en GHL` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ArrowLeft /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!remote.data?.hasMore} onClick={() => setPage(p => p + 1)}>
              Siguiente <ArrowRight />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!selected.length || selected.length > 100 || importing} onClick={() => onImport(selected)}>
            <Download /> {importing ? 'Importando…' : `Importar ${selected.length} seleccionados`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
