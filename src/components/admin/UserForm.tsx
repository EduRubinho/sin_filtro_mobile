import { useState } from 'react';
import type { AdminUser } from '../../types/admin';
import { createUser, editUser } from '../../services/admin';
import { useAdminTask } from '../../hooks/useAdminTask';
import { Button } from '../ui/Button';
import { Field, Notice, Sheet } from '../ui/FormControls';

export function UserForm({ token, user, onClose, onSaved }: { token: string; user?: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { busy, error, run } = useAdminTask();
  const save = () => run(async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Ingresa un correo válido.');
    if ((!user || password) && (password.length < 8 || password.length > 64)) throw new Error('La contraseña debe tener entre 8 y 64 caracteres.');
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
    if (user) await editUser(token, user.id, { email: normalized, ...(password ? { password } : {}) });
    else await createUser(token, { email: normalized, password });
    setPassword(''); setConfirmation(''); onSaved();
  });
  return <Sheet title={user ? 'Editar usuario' : 'Crear usuario'} onClose={onClose} busy={busy}>
    <Notice text={user ? 'Puedes actualizar su correo o restablecer su contraseña. Su perfil se conserva.' : 'La nueva cuenta tendrá rol de usuario. Podrá personalizar su perfil al iniciar sesión.'} />
    <Field label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
    <Field label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={64} editable={!busy} autoComplete="new-password" />
    <Field label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={64} editable={!busy} />
    {user && <Notice text="Deja ambas contraseñas vacías para conservar la actual. Cambiarla cerrará las sesiones de esa cuenta." />}
    {error && <Notice text={error} error />}
    <Button title={busy ? 'Guardando…' : user ? 'Guardar cambios' : 'Crear usuario'} disabled={busy} onPress={save} />
  </Sheet>;
}
