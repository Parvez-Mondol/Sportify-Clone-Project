import { api } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import { CardGrid, Section } from '../components/Card';
import { AlbumCard, ArtistCard, PlaylistCard } from '../components/cards';
import { Loading, ErrorMessage } from '../components/Status';
import { useAuth } from '../context/AuthContext';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const { data, error, loading } = useAsync(async () => {
    const [popular, newest, albums, artists, playlists, recent] = await Promise.all([
      api('/songs?sort=popular&limit=5'),
      api('/songs?sort=newest&limit=5'),
      api('/albums?limit=12'),
      api('/users/artists?limit=12'),
      api('/playlists?limit=12'),
      user ? api('/me/recent?limit=12') : null,
    ]);
    // History can contain repeats; show each song once.
    const seen = new Set();
    const recentSongs = (recent?.songs || []).filter((s) => !seen.has(s.id) && seen.add(s.id)).slice(0, 5);
    return { popular: popular.songs, newest: newest.songs, albums: albums.albums, artists: artists.artists, playlists: playlists.playlists, recent: recentSongs };
  }, [user?.id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="page">
      <h1 className="greeting">{greeting()}{user ? `, ${user.displayName}` : ''}</h1>

      {data.recent.length > 0 && (
        <Section title="Recently played" to="/library?tab=recent">
          <SongList songs={data.recent} context="home:recent" />
        </Section>
      )}

      <Section title="Popular right now">
        <SongList songs={data.popular} context="home:popular" />
      </Section>

      {data.albums.length > 0 && (
        <Section title="Albums">
          <CardGrid>{data.albums.map((a) => <AlbumCard key={a.id} album={a} />)}</CardGrid>
        </Section>
      )}

      {data.artists.length > 0 && (
        <Section title="Artists">
          <CardGrid>{data.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}</CardGrid>
        </Section>
      )}

      {data.playlists.length > 0 && (
        <Section title="Playlists from the community">
          <CardGrid>{data.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</CardGrid>
        </Section>
      )}

      <Section title="New releases">
        <SongList songs={data.newest} context="home:new" />
      </Section>
    </div>
  );
}
