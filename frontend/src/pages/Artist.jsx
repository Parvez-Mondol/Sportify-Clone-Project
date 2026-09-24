import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorText } from '../api';
import useAsync from '../components/useAsync';
import SongList from '../components/SongList';
import { Hero, PlayAllButton } from '../components/Hero';
import { CardGrid, Section } from '../components/Card';
import { AlbumCard, PlaylistCard } from '../components/cards';
import { Loading, ErrorMessage, Empty } from '../components/Status';
import { useToast } from '../components/Toast';
import { plural } from '../components/format';
import { useAuth } from '../context/AuthContext';

export default function Artist() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const { data, error, loading, reload } = useAsync(async () => {
    const [profile, songs, albums, playlists] = await Promise.all([
      api(`/users/${id}`),
      api(`/users/${id}/songs?limit=50`),
      api(`/users/${id}/albums`),
      api(`/users/${id}/playlists`),
    ]);
    return { user: profile.user, songs: songs.songs, albums: albums.albums, playlists: playlists.playlists };
  }, [id, user?.id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  const artist = data.user;
  const isMe = user?.id === artist.id;
  const isArtist = artist.role === 'artist';

  async function toggleFollow() {
    if (!user) return navigate('/login');
    try {
      await api(`/users/${artist.id}/follow`, { method: artist.isFollowing ? 'DELETE' : 'POST' });
      reload();
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <div className="page">
      <Hero image={artist.avatarUrl} kind={isArtist ? 'Artist' : 'Profile'} title={artist.displayName} round>
        <span>{plural(artist.followers, 'follower')}</span>
        {isArtist && <span>{plural(artist.songs, 'song')}</span>}
        {!isArtist && <span>{artist.following} following</span>}
      </Hero>
      {artist.bio && <p className="bio">{artist.bio}</p>}
      <div className="actions">
        {data.songs.length > 0 && <PlayAllButton songs={data.songs} context={`artist:${artist.id}`} />}
        {!isMe && (
          <button className="btn outline" onClick={toggleFollow}>{artist.isFollowing ? 'Following' : 'Follow'}</button>
        )}
        {isMe && <button className="btn outline" onClick={() => navigate('/settings')}>Edit profile</button>}
      </div>

      {data.songs.length > 0 && (
        <Section title="Popular">
          <SongList songs={showAll ? data.songs : data.songs.slice(0, 5)} context={`artist:${artist.id}`} />
          {data.songs.length > 5 && (
            <button className="link show-more" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'See more'}</button>
          )}
        </Section>
      )}
      {data.albums.length > 0 && (
        <Section title="Discography"><CardGrid>{data.albums.map((a) => <AlbumCard key={a.id} album={a} />)}</CardGrid></Section>
      )}
      {data.playlists.length > 0 && (
        <Section title="Public playlists"><CardGrid>{data.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</CardGrid></Section>
      )}
      {isArtist && !data.songs.length && !data.albums.length && <Empty>No music yet.</Empty>}
    </div>
  );
}
