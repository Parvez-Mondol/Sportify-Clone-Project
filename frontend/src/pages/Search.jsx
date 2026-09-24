import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import { CardGrid, Section } from '../components/Card';
import { AlbumCard, ArtistCard, PlaylistCard } from '../components/cards';
import { Loading, ErrorMessage, Empty } from '../components/Status';

const TILE_COLORS = ['#dc148c', '#006450', '#8400e7', '#1e3264', '#e8115b', '#27856a', '#e91429', '#503750', '#148a08', '#bc5900'];

function Browse() {
  const { data, error, loading } = useAsync(() => api('/songs/genres'), []);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return (
    <Section title="Browse all">
      {data.genres.length === 0 ? <Empty>No genres yet.</Empty> : (
        <div className="genre-grid">
          {data.genres.map((g, i) => (
            <Link key={g.genre} to={`/search?genre=${encodeURIComponent(g.genre)}`} className="genre-tile" style={{ background: TILE_COLORS[i % TILE_COLORS.length] }}>
              <span>{g.genre}</span>
              <small>{g.count} songs</small>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

function Genre({ genre }) {
  const { data, error, loading } = useAsync(() => api(`/songs?genre=${encodeURIComponent(genre)}&sort=popular&limit=50`), [genre]);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return (
    <Section title={genre}>
      <SongList songs={data.songs} context={`genre:${genre}`} />
    </Section>
  );
}

function Results({ q }) {
  const { data, error, loading } = useAsync(() => api(`/search?q=${encodeURIComponent(q)}&limit=12`), [q]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  const nothing = !data.songs.length && !data.albums.length && !data.artists.length && !data.playlists.length;
  if (nothing) return <Empty>No results found for “{q}”. Check the spelling or try another word.</Empty>;
  return (
    <>
      {data.songs.length > 0 && <Section title="Songs"><SongList songs={data.songs} context={`search:${q}`} /></Section>}
      {data.artists.length > 0 && <Section title="Artists"><CardGrid>{data.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}</CardGrid></Section>}
      {data.albums.length > 0 && <Section title="Albums"><CardGrid>{data.albums.map((a) => <AlbumCard key={a.id} album={a} />)}</CardGrid></Section>}
      {data.playlists.length > 0 && <Section title="Playlists"><CardGrid>{data.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</CardGrid></Section>}
    </>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q');
  const genre = params.get('genre');
  return (
    <div className="page">
      {q ? <Results q={q} /> : genre ? <Genre genre={genre} /> : <Browse />}
    </div>
  );
}
