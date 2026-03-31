import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFunilEtapas } from '@/hooks/useFunilEtapas';
import { Bell, AlertTriangle, User, Target } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AgendaEvent, CreateEventData } from '@/hooks/useAgendaEvents';
import type { AgendaBlock } from '@/hooks/useAgendaBlocks';

interface LeadOption {
  id: string;
  nome_completo: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: AgendaEvent | null;
  defaultDate?: Date | null;
  usersMap: Record<string, string>;
  onSave: (data: CreateEventData) => Promise<boolean | undefined>;
  onUpdate: (id: string, data: Partial<CreateEventData>) => Promise<boolean | undefined>;
  blockedDays?: Record<string, AgendaBlock[]>;
  leads?: LeadOption[];
  defaultTime?: string | null;
}

export function AgendaEventDialog({ open, onOpenChange, event, defaultDate, usersMap, onSave, onUpdate, blockedDays = {}, leads = [], defaultTime }: Props) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';
  const { etapas, coresMap } = useFunilEtapas();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [userId, setUserId] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [leadId, setLeadId] = useState<string>('');
  const [etapaFunil, setEtapaFunil] = useState<string>('');
  const [leadSearch, setLeadSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStartDate(format(new Date(event.start_at), 'yyyy-MM-dd'));
      setStartTime(format(new Date(event.start_at), 'HH:mm'));
      setEndTime(event.end_at ? format(new Date(event.end_at), 'HH:mm') : '10:00');
      setAllDay(event.all_day || false);
      setUserId(event.user_id);
      setReminderMinutes((event as any).reminder_minutes ?? 30);
      setLeadId(event.lead_id || '');
      setEtapaFunil((event.metadata as any)?.etapa_funil || '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setUserId(user?.id || '');
      setReminderMinutes(30);
      setLeadId('');
      setEtapaFunil('');
    }
    setLeadSearch('');
  }, [event, defaultDate, user, open]);

  const filteredLeads = leads.filter(l =>
    !leadSearch || l.nome_completo.toLowerCase().includes(leadSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) return;
    setSaving(true);

    const startAt = allDay
      ? new Date(`${startDate}T00:00`).toISOString()
      : new Date(`${startDate}T${startTime}`).toISOString();
    const endAt = allDay ? undefined : new Date(`${startDate}T${endTime}`).toISOString();

    const metadata: Record<string, any> = {};
    if (etapaFunil) metadata.etapa_funil = etapaFunil;

    const data: CreateEventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_at: startAt,
      end_at: endAt,
      all_day: allDay,
      user_id: userId || user?.id || '',
      reminder_minutes: reminderMinutes,
      lead_id: leadId || null,
      metadata,
    };

    let ok: boolean | undefined;
    if (event) {
      ok = await onUpdate(event.id, data);
    } else {
      ok = await onSave(data);
    }

    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          <DialogDescription>
            {event ? 'Atualize as informações do evento.' : 'Preencha os dados para criar um novo evento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião com lead" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            <Label>Dia inteiro</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="dark:[color-scheme:dark]" />
            </div>
            {!allDay && (
              <div>
                <Label>Início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="dark:[color-scheme:dark]" />
              </div>
            )}
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div />
              <div>
                <Label>Fim</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="dark:[color-scheme:dark]" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Lembrete
            </Label>
            <Select value={String(reminderMinutes)} onValueChange={(v) => setReminderMinutes(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem lembrete</SelectItem>
                <SelectItem value="15">15 minutos antes</SelectItem>
                <SelectItem value="30">30 minutos antes</SelectItem>
                <SelectItem value="60">1 hora antes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lead selector */}
          {leads.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Lead vinculado
              </Label>
              <Select value={leadId || '_none'} onValueChange={(v) => setLeadId(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum lead" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-1.5">
                    <Input
                      placeholder="Buscar lead..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <SelectItem value="_none">Nenhum lead</SelectItem>
                  {filteredLeads.slice(0, 50).map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>{lead.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Funnel stage selector */}
          {etapas.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Etapa do funil
              </Label>
              <Select value={etapaFunil || '_none'} onValueChange={(v) => setEtapaFunil(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma etapa</SelectItem>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.nome}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: coresMap[etapa.nome] || '#6b7280' }}
                        />
                        {etapa.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdmin && Object.keys(usersMap).length > 0 && (
            <div>
              <Label>Assessor</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(usersMap).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Block conflict warning */}
          {startDate && (() => {
            const dayBlocks = blockedDays[startDate] || [];
            if (dayBlocks.length === 0) return null;
            const hasAllDayBlock = dayBlocks.some(b => b.all_day);
            const hasTimeConflict = !allDay && dayBlocks.some(b => {
              if (b.all_day) return true;
              if (!b.start_time || !b.end_time) return false;
              const bStart = b.start_time.slice(0, 5);
              const bEnd = b.end_time.slice(0, 5);
              return startTime < bEnd && endTime > bStart;
            });
            if (!hasAllDayBlock && !hasTimeConflict) return null;
            return (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                  {hasAllDayBlock
                    ? 'Este dia está marcado como indisponível.'
                    : 'Este horário conflita com um bloqueio de agenda.'}
                  {dayBlocks[0]?.reason && ` Motivo: ${dayBlocks[0].reason}`}
                </AlertDescription>
              </Alert>
            );
          })()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? 'Salvando...' : event ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
