// Ready-made cards for each resource type, with play buttons that fetch the songs on demand.
import { Card } from './Card';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';

export function AlbumCard({ album }) {
  const { playList } = usePlayer();
  const year = album.releaseDate?.slice(0, 4);
  return (
    <Card
      to={`/album/${album.id}`}
      image={album.coverUrl}
      title={album.title}
      subtitle={[year, album.artist.displayName].filter(Boolean).join(' · ')}
      onPlay={async () => {
        const { album: full } = await api(`/albums/${album.id}`);
        playList(full.songs, 0, `album:${album.id}`);
      }}
    />
  );
}

export function PlaylistCard({ playlist }) {
  const { playList } = usePlayer();
  return (
    <Card
      to={`/playlist/${playlist.id}`}
      image={playlist.coverUrl}
      title={playlist.name}
      subtitle={`By ${playlist.owner.displayName}`}
      onPlay={async () => {
        const { playlist: full } = await api(`/playlists/${playlist.id}`);
        playList(full.songs, 0, `playlist:${playlist.id}`);
      }}
    />
  );
}

export function ArtistCard({ artist }) {
  const { playList } = usePlayer();
  return (
    <Card
      to={`/artist/${artist.id}`}
      image={artist.avatarUrl}
      title={artist.displayName}
      subtitle="Artist"
      round
      onPlay={async () => {
        const { songs } = await api(`/users/${artist.id}/songs?limit=20`);
        playList(songs, 0, `artist:${artist.id}`);
      }}
    />
  );
}
