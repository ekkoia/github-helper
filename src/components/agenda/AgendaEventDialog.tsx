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
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import type { AgendaEvent, CreateEventData } from '@/hooks/useAgendaEvents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: AgendaEvent | null;
  defaultDate?: Date | null;
  usersMap: Record<string, string>;
  onSave: (data: CreateEventData) => Promise<boolean | undefined>;
  onUpdate: (id: string, data: Partial<CreateEventData>) => Promise<boolean | undefined>;
}

export function AgendaEventDialog({ open, onOpenChange, event, defaultDate, usersMap, onSave, onUpdate }: Props) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [userId, setUserId] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(30);
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
    } else {
      setTitle('');
      setDescription('');
      setStartDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setUserId(user?.id || '');
      setReminderMinutes(30);
    }
  }, [event, defaultDate, user, open]);

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) return;
    setSaving(true);

    const startAt = allDay
      ? new Date(`${startDate}T00:00`).toISOString()
      : new Date(`${startDate}T${startTime}`).toISOString();
    const endAt = allDay ? undefined : new Date(`${startDate}T${endTime}`).toISOString();

    const data: CreateEventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_at: startAt,
      end_at: endAt,
      all_day: allDay,
      user_id: userId || user?.id || '',
      reminder_minutes: reminderMinutes,
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
      <DialogContent className="sm:max-w-md">
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
              <>
                <div>
                  <Label>Início</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="dark:[color-scheme:dark]" />
                </div>
              </>
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

          <div>
            <Label className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Lembrete</Label>
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
