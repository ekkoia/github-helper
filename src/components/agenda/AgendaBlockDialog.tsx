import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Ban } from 'lucide-react';
import { format } from 'date-fns';
import type { CreateBlockData } from '@/hooks/useAgendaBlocks';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  usersMap: Record<string, string>;
  onSave: (data: CreateBlockData) => Promise<boolean>;
}

export function AgendaBlockDialog({ open, onOpenChange, defaultDate, usersMap, onSave }: Props) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';

  const [blockDate, setBlockDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBlockDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setAllDay(true);
      setStartTime('08:00');
      setEndTime('18:00');
      setReason('');
      setUserId(user?.id || '');
    }
  }, [open, defaultDate, user]);

  const handleSubmit = async () => {
    if (!blockDate) return;
    setSaving(true);

    const data: CreateBlockData = {
      user_id: userId || user?.id || '',
      block_date: blockDate,
      all_day: allDay,
      start_time: allDay ? null : startTime,
      end_time: allDay ? null : endTime,
      reason: reason.trim(),
    };

    const ok = await onSave(data);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Bloquear Agenda
          </DialogTitle>
          <DialogDescription>
            Marque um dia ou período como indisponível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className="dark:[color-scheme:dark]"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            <Label>Dia inteiro</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="dark:[color-scheme:dark]"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Motivo (opcional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Férias, folga, reunião externa..."
            />
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
          <Button variant="destructive" onClick={handleSubmit} disabled={saving || !blockDate}>
            {saving ? 'Salvando...' : 'Bloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
