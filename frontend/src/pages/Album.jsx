import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import { Hero, PlayAllButton } from '../components/Hero';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { formatTotal, plural } from '../components/format';

export default function Album() {
  const { id } = useParams();
  const { data, error, loading } = useAsync(() => api(`/albums/${id}`), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  const { album } = data;
  const total = album.songs.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="page">
      <Hero image={album.coverUrl} kind="Album" title={album.title}>
        <Link to={`/artist/${album.artist.id}`} className="strong">{album.artist.displayName}</Link>
        {album.releaseDate && <span>{album.releaseDate.slice(0, 4)}</span>}
        <span>{plural(album.songs.length, 'song')}, {formatTotal(total)}</span>
      </Hero>
      <div className="actions">
        <PlayAllButton songs={album.songs} context={`album:${album.id}`} />
      </div>
      {album.songs.length
        ? <SongList songs={album.songs} context={`album:${album.id}`} showAlbum={false} showCover={false} useTrackNumbers />
        : <Empty>This album has no songs yet.</Empty>}
    </div>
  );
}
