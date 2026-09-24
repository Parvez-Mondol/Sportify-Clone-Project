import { Link, useNavigate } from 'react-router-dom';
import Cover from './Cover';
import Icon from './Icons';
import LikeButton from './LikeButton';
import Menu from './Menu';
import { useToast } from './Toast';
import { formatTime } from './format';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { errorText } from '../api';

// Track list used by albums, playlists, search results and the library.
// `context` identifies the list so the playing row can be highlighted.
export default function SongList({ songs, context, showAlbum = true, showCover = true, useTrackNumbers = false, onRemove, onMove }) {
  const player = usePlayer();
  const { user } = useAuth();
  const { playlists, addToPlaylist } = useLibrary();
  const toast = useToast();
  const navigate = useNavigate();

  const ownPlaylists = playlists.filter((p) => p.owner.id === user?.id);
  const isCurrentList = player.context === context;

  function play(i) {
    const song = songs[i];
    if (isCurrentList && player.current?.id === song.id) player.toggle();
    else player.playList(songs, i, context);
  }

  async function add(playlist, song) {
    try {
      await addToPlaylist(playlist.id, song.id);
      toast(`Added to ${playlist.name}`);
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <div className={`song-list ${showAlbum ? '' : 'no-album'}`} role="table" aria-label="Songs">
      <div className="song-row head" role="row">
        <span className="c-num">#</span>
        <span>Title</span>
        {showAlbum && <span className="c-album">Album</span>}
        <span />
        <span className="c-dur"><Icon name="clock" title="Duration" /></span>
        <span />
      </div>
      {songs.map((song, i) => {
        const active = isCurrentList && player.current?.id === song.id;
        return (
          <div key={`${song.id}-${i}`} className={`song-row ${active ? 'active' : ''}`} role="row" onDoubleClick={() => play(i)}>
            <span className="c-num">
              <span className="num">{active && player.playing ? <span className="eq"><i /><i /><i /></span> : (useTrackNumbers && song.trackNumber) || i + 1}</span>
              <button className="icon-btn row-play" aria-label={active && player.playing ? `Pause ${song.title}` : `Play ${song.title}`} onClick={() => play(i)}>
                <Icon name={active && player.playing ? 'pause' : 'play'} />
              </button>
            </span>
            <span className="c-title">
              {showCover && <Cover src={song.coverUrl} title={song.title} size={40} />}
              <span className="stack">
                <button className="link title" onClick={() => play(i)}>{song.title}</button>
                <Link className="sub" to={`/artist/${song.artist.id}`}>{song.artist.displayName}</Link>
              </span>
            </span>
            {showAlbum && (
              <span className="c-album sub">
                {song.album ? <Link to={`/album/${song.album.id}`}>{song.album.title}</Link> : 'Single'}
              </span>
            )}
            <span className="c-like"><LikeButton song={song} /></span>
            <span className="c-dur sub">{formatTime(song.duration)}</span>
            <span className="c-more">
              <Menu>
                {user && ownPlaylists.length > 0 && <div className="menu-label">Add to playlist</div>}
                {user && ownPlaylists.map((p) => (
                  <button key={p.id} role="menuitem" onClick={() => add(p, song)}>{p.name}</button>
                ))}
                {user && ownPlaylists.length === 0 && <div className="menu-label">Create a playlist to add songs</div>}
                {!user && <button role="menuitem" onClick={() => navigate('/login')}>Log in to add to playlists</button>}
                <hr />
                {song.album && <button role="menuitem" onClick={() => navigate(`/album/${song.album.id}`)}>Go to album</button>}
                <button role="menuitem" onClick={() => navigate(`/artist/${song.artist.id}`)}>Go to artist</button>
                {onMove && i > 0 && <button role="menuitem" onClick={() => onMove(i, i - 1)}>Move up</button>}
                {onMove && i < songs.length - 1 && <button role="menuitem" onClick={() => onMove(i, i + 1)}>Move down</button>}
                {onRemove && <button role="menuitem" className="danger" onClick={() => onRemove(song)}>Remove from this playlist</button>}
              </Menu>
            </span>
          </div>
        );
      })}
    </div>
  );
}
