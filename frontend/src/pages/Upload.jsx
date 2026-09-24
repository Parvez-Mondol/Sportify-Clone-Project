import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api';
import useAsync from '../components/useAsync';
import Cover from '../components/Cover';
import Icon from '../components/Icons';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { useToast } from '../components/Toast';
import { formatTime } from '../components/format';
import { useAuth } from '../context/AuthContext';

// Read the track length in the browser so the artist doesn't have to type it.
function readDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(audio.duration) || 0); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    audio.src = url;
  });
}

function SongForm({ albums, onDone }) {
  const toast = useToast();
  const [fields, setFields] = useState({ title: '', genre: '', albumId: '', trackNumber: '' });
  const [audio, setAudio] = useState(null);
  const [duration, setDuration] = useState(0);
  const [cover, setCover] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setFields({ ...fields, [f]: e.target.value });

  async function pickAudio(file) {
    setAudio(file);
    if (!file) return;
    if (!fields.title) setFields((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));
    setDuration(await readDuration(file));
  }

  async function submit(e) {
    e.preventDefault();
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
    form.append('duration', String(duration));
    form.append('audio', audio);
    if (cover) form.append('cover', cover);
    setBusy(true);
    setError(null);
    try {
      await api('/songs', { method: 'POST', form });
      toast('Song uploaded');
      e.target.reset();
      setFields({ title: '', genre: '', albumId: fields.albumId, trackNumber: '' });
      setAudio(null);
      setCover(null);
      setDuration(0);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel-form" onSubmit={submit}>
      <h2>Upload a song</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label>Audio file <span className="hint">(MP3, WAV, OGG, FLAC, AAC, M4A)</span>
        <input type="file" accept="audio/*" required onChange={(e) => pickAudio(e.target.files[0])} />
      </label>
      {audio && duration > 0 && <p className="hint">Length: {formatTime(duration)}</p>}
      <label>Title<input required maxLength={200} value={fields.title} onChange={set('title')} /></label>
      <div className="row">
        <label>Genre<input maxLength={50} value={fields.genre} onChange={set('genre')} placeholder="e.g. Pop" /></label>
        <label>Album
          <select value={fields.albumId} onChange={set('albumId')}>
            <option value="">Single (no album)</option>
            {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </label>
        {fields.albumId && <label>Track #<input type="number" min={1} max={999} value={fields.trackNumber} onChange={set('trackNumber')} /></label>}
      </div>
      <label>Cover image <span className="hint">(optional; album cover is used otherwise)</span>
        <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} />
      </label>
      <button className="btn primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload song'}</button>
    </form>
  );
}

function AlbumForm({ onDone }) {
  const toast = useToast();
  const [fields, setFields] = useState({ title: '', genre: '', releaseDate: '' });
  const [cover, setCover] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setFields({ ...fields, [f]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
    if (cover) form.append('cover', cover);
    setBusy(true);
    setError(null);
    try {
      await api('/albums', { method: 'POST', form });
      toast('Album created');
      e.target.reset();
      setFields({ title: '', genre: '', releaseDate: '' });
      setCover(null);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel-form" onSubmit={submit}>
      <h2>Create an album</h2>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label>Title<input required maxLength={200} value={fields.title} onChange={set('title')} /></label>
      <div className="row">
        <label>Genre<input maxLength={50} value={fields.genre} onChange={set('genre')} /></label>
        <label>Release date<input type="date" value={fields.releaseDate} onChange={set('releaseDate')} /></label>
      </div>
      <label>Cover image<input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} /></label>
      <button className="btn outline" disabled={busy}>{busy ? 'Creating…' : 'Create album'}</button>
    </form>
  );
}

export default function Upload() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(async () => {
    const [songs, albums] = await Promise.all([api(`/users/${user.id}/songs?sort=newest&limit=100`), api(`/users/${user.id}/albums`)]);
    return { songs: songs.songs, albums: albums.albums };
  }, [user.id]);

  if (user.role !== 'artist' && user.role !== 'admin') {
    return <div className="page"><Empty>Only artist accounts can upload music. Create an artist account to share your songs.</Empty></div>;
  }
  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  async function remove(kind, item) {
    const name = item.title;
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api(`/${kind}/${item.id}`, { method: 'DELETE' });
      toast(`Deleted ${name}`);
      reload();
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <div className="page">
      <h1>Artist studio</h1>
      <div className="studio">
        <SongForm albums={data.albums} onDone={reload} />
        <AlbumForm onDone={reload} />
      </div>

      <h2>Your albums</h2>
      {data.albums.length ? (
        <ul className="manage-list">
          {data.albums.map((a) => (
            <li key={a.id}>
              <Cover src={a.coverUrl} title={a.title} size={40} />
              <Link to={`/album/${a.id}`} className="title">{a.title}</Link>
              <span className="sub">{a.songCount} songs</span>
              <button className="icon-btn" aria-label={`Delete ${a.title}`} onClick={() => remove('albums', a)}><Icon name="trash" /></button>
            </li>
          ))}
        </ul>
      ) : <Empty>No albums yet.</Empty>}

      <h2>Your songs</h2>
      {data.songs.length ? (
        <ul className="manage-list">
          {data.songs.map((s) => (
            <li key={s.id}>
              <Cover src={s.coverUrl} title={s.title} size={40} />
              <span className="title">{s.title}</span>
              <span className="sub">{s.album?.title || 'Single'} · {s.playCount} plays</span>
              <button className="icon-btn" aria-label={`Delete ${s.title}`} onClick={() => remove('songs', s)}><Icon name="trash" /></button>
            </li>
          ))}
        </ul>
      ) : <Empty>No songs yet. Upload your first one above.</Empty>}
    </div>
  );
}
