import { useEffect, useMemo, useState } from 'react';
import { api, errorText } from '../api';
import Cover from '../components/Cover';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => avatar && URL.createObjectURL(avatar), [avatar]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('displayName', displayName);
    form.append('bio', bio);
    if (avatar) form.append('avatar', avatar);
    setBusy(true);
    setError(null);
    try {
      const data = await api('/auth/me', { method: 'PATCH', form });
      setUser(data.user);
      toast('Profile saved');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel-form" onSubmit={submit}>
      <h2>Profile</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="avatar-row">
        <Cover src={preview || user.avatarUrl} title={user.displayName} size={88} round />
        <label>Profile picture<input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} /></label>
      </div>
      <label>Display name<input required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
      <label>Bio<textarea rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} /></label>
      <p className="hint">Signed in as @{user.username} ({user.email})</p>
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [fields, setFields] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: fields });
      setFields({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel-form" onSubmit={submit}>
      <h2>Change password</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label>Current password<input type="password" autoComplete="current-password" required value={fields.currentPassword} onChange={(e) => setFields({ ...fields, currentPassword: e.target.value })} /></label>
      <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={fields.newPassword} onChange={(e) => setFields({ ...fields, newPassword: e.target.value })} /></label>
      <button className="btn outline" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

export default function Settings() {
  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="studio">
        <ProfileForm />
        <PasswordForm />
      </div>
    </div>
  );
}
