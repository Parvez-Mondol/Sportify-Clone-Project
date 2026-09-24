import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import Icon from '../components/Icons';
import { Card, CardGrid } from '../components/Card';
import { ArtistCard, PlaylistCard } from '../components/cards';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { useCreatePlaylist } from '../components/Sidebar';
import { useLibrary } from '../context/LibraryContext';

const TABS = [['playlists', 'Playlists'], ['recent', 'Recently played'], ['following', 'Following']];

function Recent() {
  const { data, error, loading } = useAsync(() => api('/me/recent?limit=50'), []);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return data.songs.length ? <SongList songs={data.songs} context="recent" /> : <Empty>Nothing played yet.</Empty>;
}

function Following() {
  const { data, error, loading } = useAsync(() => api('/me/following'), []);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data.users.length) return <Empty>Follow artists to see them here.</Empty>;
  return <CardGrid>{data.users.map((u) => <ArtistCard key={u.id} artist={u} />)}</CardGrid>;
}

function Playlists() {
  const { playlists } = useLibrary();
  const createPlaylist = useCreatePlaylist();
  return (
    <CardGrid>
      <Card to="/liked" title="Liked Songs" subtitle="Your favourite tracks" image={null} />
      {playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
      <button className="card create-card" onClick={createPlaylist}>
        <div className="card-art"><div className="cover placeholder"><Icon name="plus" size="40%" /></div></div>
        <div className="card-title">Create playlist</div>
      </button>
    </CardGrid>
  );
}

export default function Library() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'playlists';
  return (
    <div className="page">
      <h1>Your Library</h1>
      <div className="chips" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`chip ${tab === key ? 'on' : ''}`} onClick={() => setParams(key === 'playlists' ? {} : { tab: key })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'recent' ? <Recent /> : tab === 'following' ? <Following /> : <Playlists />}
    </div>
  );
}
