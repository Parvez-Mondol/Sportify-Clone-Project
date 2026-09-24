import { api } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import Icon from '../components/Icons';
import { Hero, PlayAllButton } from '../components/Hero';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { plural } from '../components/format';
import { useAuth } from '../context/AuthContext';

export default function Liked() {
  const { user } = useAuth();
  const { data, error, loading } = useAsync(() => api('/me/liked?limit=100'), [user.id]);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="page">
      <Hero cover={<div className="cover hero-cover liked-cover"><Icon name="heart" /></div>} kind="Playlist" title="Liked Songs">
        <span className="strong">{user.displayName}</span>
        <span>{plural(data.total, 'song')}</span>
      </Hero>
      <div className="actions"><PlayAllButton songs={data.songs} context="liked" /></div>
      {data.songs.length
        ? <SongList songs={data.songs} context="liked" />
        : <Empty>Songs you like will appear here. Tap the heart on any song to save it.</Empty>}
    </div>
  );
}
