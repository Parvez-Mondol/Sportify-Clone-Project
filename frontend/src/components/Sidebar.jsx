import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icons';
import Cover from './Cover';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from './Toast';
import { api, errorText } from '../api';

export function useCreatePlaylist() {
  const { user } = useAuth();
  const { playlists, refreshPlaylists } = useLibrary();
  const navigate = useNavigate();
  const toast = useToast();

  return async () => {
    if (!user) return navigate('/login');
    try {
      const { playlist } = await api('/playlists', { method: 'POST', body: { name: `My Playlist #${playlists.length + 1}` } });
      await refreshPlaylists();
      navigate(`/playlist/${playlist.id}`);
    } catch (err) {
      toast(errorText(err));
    }
  };
}

export default function Sidebar() {
  const { user } = useAuth();
  const { playlists } = useLibrary();
  const { context, playing } = usePlayer();
  const createPlaylist = useCreatePlaylist();

  return (
    <aside className="sidebar">
      <nav className="panel nav">
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <span>Sportify</span>
        </NavLink>
        <NavLink to="/" end><Icon name="home" /> Home</NavLink>
        <NavLink to="/search"><Icon name="search" /> Search</NavLink>
      </nav>

      <div className="panel library">
        <div className="library-head">
          <NavLink to="/library" className="library-title"><Icon name="library" /> Your Library</NavLink>
          <button className="icon-btn" aria-label="Create playlist" title="Create playlist" onClick={createPlaylist}>
            <Icon name="plus" />
          </button>
        </div>

        {user ? (
          <ul className="library-list">
            <li>
              <NavLink to="/liked">
                <div className="cover liked-cover"><Icon name="heart" /></div>
                <span className="stack"><span className="title">Liked Songs</span><span className="sub">Playlist</span></span>
              </NavLink>
            </li>
            {playlists.map((p) => (
              <li key={p.id}>
                <NavLink to={`/playlist/${p.id}`}>
                  <Cover src={p.coverUrl} title={p.name} size={44} />
                  <span className="stack">
                    <span className={`title ${context === `playlist:${p.id}` && playing ? 'playing' : ''}`}>{p.name}</span>
                    <span className="sub">Playlist · {p.owner.displayName}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="library-cta">
            <p className="title">Create your first playlist</p>
            <p className="sub">Log in to save songs and build playlists.</p>
            <NavLink to="/login" className="btn light small">Log in</NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/" end><Icon name="home" /><span>Home</span></NavLink>
      <NavLink to="/search"><Icon name="search" /><span>Search</span></NavLink>
      <NavLink to="/library"><Icon name="library" /><span>Library</span></NavLink>
    </nav>
  );
}
