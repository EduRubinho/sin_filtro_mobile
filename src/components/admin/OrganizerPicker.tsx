import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { listUsers } from '../../services/admin';
import type { AdminUser } from '../../types/admin';
import { useAdminTask } from '../../hooks/useAdminTask';
import { Choice, Notice, s } from '../ui/FormControls';

export function OrganizerPicker({ token, selected, onSelect, disabled }: { token: string; selected: string; onSelect: (user: AdminUser) => void; disabled: boolean }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { fail, error, clearError } = useAdminTask();
  useEffect(() => {
    let active = true;
    void listUsers(token, page * 10, 10).then(values => { if (active) setUsers(values); })
      .catch(error => { if (active) fail(error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, page, attempt, fail]);
  const move = (value: number) => { setLoading(true); clearError(); setPage(value); };
  return <View style={s.card}>
    <Text style={s.label}>Elegir organizador</Text>
    {loading ? <ActivityIndicator color="#1E5547" /> : error ? <><Notice error text={error} /><Choice label="Reintentar" onPress={() => { setLoading(true); clearError(); setAttempt(value => value + 1); }} /></> : <>
      {users.map(user => <Choice key={user.id} label={`${user.profile.displayName || user.email} · #${user.id}${user.status !== 'active' ? ' (inactivo)' : ''}`} selected={selected === user.id} onPress={() => onSelect(user)} disabled={disabled || user.status !== 'active'} />)}
      {!users.length && <Notice text="No hay usuarios en esta página. Crea una cuenta desde la sección Usuarios si aún no existe." />}
      <View style={s.row}><Choice label="Anterior" disabled={disabled || page === 0} onPress={() => move(page - 1)} /><Text style={s.meta}>Página {page + 1}</Text><Choice label="Siguiente" disabled={disabled || users.length < 10} onPress={() => move(page + 1)} /></View>
    </>}
  </View>;
}
