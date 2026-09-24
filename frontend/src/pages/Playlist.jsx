import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorText } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import Cover from '../components/Cover';
import Icon from '../components/Icons';
import Menu from '../components/Menu';
import { Hero, PlayAllButton } from '../components/Hero';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { useToast } from '../components/Toast';
import { formatTotal, plural } from '../components/format';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';

function EditDialog({ playlist, onClose, onSaved }) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [cover, setCover] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    form.append('isPublic', String(isPublic));
    if (cover) form.append('cover', cover);
    setBusy(true);
    try {
      await api(`/playlists/${playlist.id}`, { method: 'PATCH', form });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal form" onSubmit={save} role="dialog" aria-label="Edit details">
        <div className="modal-head">
          <h2>Edit details</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label>Name<input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Description<textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Cover image<input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} /></label>
        <label className="check"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public (visible on your profile and in search)</label>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}

// Lets the owner search the catalogue and add songs without leaving the page.
function FindSongs({ playlist, existing, onAdded }) {
  const [q, setQ] = useState('');
  const toast = useToast();
  const { addToPlaylist } = useLibrary();
  const { data } = useAsync(() => (q.trim() ? api(`/songs?q=${encodeURIComponent(q.trim())}&limit=8`) : Promise.resolve(null)), [q]);

  async function add(song) {
    try {
      await addToPlaylist(playlist.id, song.id);
      toast(`Added to ${playlist.name}`);
      onAdded();
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <section className="find-songs">
      <h2>Let's find something for your playlist</h2>
      <label className="search-box inline">
        <Icon name="search" />
        <input type="search" placeholder="Search for songs" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search for songs to add" />
      </label>
      {data?.songs?.map((song) => (
        <div key={song.id} className="find-row">
          <Cover src={song.coverUrl} title={song.title} size={40} />
          <span className="stack"><span className="title">{song.title}</span><span className="sub">{song.artist.displayName}</span></span>
          <button className="btn outline small" disabled={existing.has(song.id)} onClick={() => add(song)}>
            {existing.has(song.id) ? 'Added' : 'Add'}
          </button>
        </div>
      ))}
    </section>
  );
}

export default function Playlist() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refreshPlaylists } = useLibrary();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api(`/playlists/${id}`), [id, user?.id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  const { playlist } = data;
  const isOwner = user && (user.id === playlist.owner.id || user.role === 'admin');
  const context = `playlist:${playlist.id}`;

  async function run(action, message) {
    try {
      await action();
      if (message) toast(message);
      reload();
      refreshPlaylists();
    } catch (err) {
      toast(errorText(err));
    }
  }

  const remove = (song) => run(() => api(`/playlists/${playlist.id}/songs/${song.id}`, { method: 'DELETE' }), `Removed from ${playlist.name}`);

  const move = (from, to) => {
    const ids = playlist.songs.map((s) => s.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    run(() => api(`/playlists/${playlist.id}/songs/order`, { method: 'PUT', body: { songIds: ids } }));
  };

  async function destroy() {
    if (!window.confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
    try {
      await api(`/playlists/${playlist.id}`, { method: 'DELETE' });
      await refreshPlaylists();
      toast('Playlist deleted');
      navigate('/library');
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <div className="page">
      <Hero image={playlist.coverUrl} kind={playlist.isPublic ? 'Public playlist' : 'Private playlist'} title={playlist.name}>
        {playlist.description && <p className="description">{playlist.description}</p>}
        <span className="strong">{playlist.owner.displayName}</span>
        <span>{plural(playlist.songs.length, 'song')}{playlist.duration ? `, ${formatTotal(playlist.duration)}` : ''}</span>
      </Hero>
      <div className="actions">
        <PlayAllButton songs={playlist.songs} context={context} />
        {isOwner && (
          <Menu label="Playlist options">
            <button role="menuitem" onClick={() => setEditing(true)}>Edit details</button>
            <button role="menuitem" onClick={() => run(() => api(`/playlists/${playlist.id}`, { method: 'PATCH', body: { isPublic: !playlist.isPublic } }), playlist.isPublic ? 'Playlist is now private' : 'Playlist is now public')}>
              Make {playlist.isPublic ? 'private' : 'public'}
            </button>
            <hr />
            <button role="menuitem" className="danger" onClick={destroy}>Delete</button>
          </Menu>
        )}
      </div>
      {playlist.songs.length
        ? <SongList songs={playlist.songs} context={context} onRemove={isOwner ? remove : undefined} onMove={isOwner ? move : undefined} />
        : <Empty>This playlist is empty.</Empty>}
      {isOwner && <FindSongs playlist={playlist} existing={new Set(playlist.songs.map((s) => s.id))} onAdded={reload} />}
      {editing && <EditDialog playlist={playlist} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); refreshPlaylists(); }} />}
    </div>
  );
}
