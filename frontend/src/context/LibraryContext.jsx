// The signed-in user's playlists (shown in the sidebar and "add to playlist" menus)
// and like state shared across every song list and the player bar.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [likeOverrides, setLikeOverrides] = useState({});

  const refreshPlaylists = useCallback(async () => {
    if (!user) return setPlaylists([]);
    const data = await api('/me/playlists');
    setPlaylists(data.playlists);
  }, [user]);

  useEffect(() => {
    setLikeOverrides({});
    refreshPlaylists().catch(() => {});
  }, [refreshPlaylists]);

  const isLiked = useCallback((song) => likeOverrides[song.id] ?? Boolean(song.liked), [likeOverrides]);

  const toggleLike = useCallback(async (song) => {
    const next = !isLiked(song);
    setLikeOverrides((o) => ({ ...o, [song.id]: next }));
    try {
      await api(`/songs/${song.id}/like`, { method: next ? 'POST' : 'DELETE' });
    } catch (err) {
      setLikeOverrides((o) => ({ ...o, [song.id]: !next }));
      throw err;
    }
  }, [isLiked]);

  const addToPlaylist = useCallback(async (playlistId, songId) => {
    await api(`/playlists/${playlistId}/songs`, { method: 'POST', body: { songId } });
    refreshPlaylists().catch(() => {});
  }, [refreshPlaylists]);

  return (
    <LibraryContext.Provider value={{ playlists, refreshPlaylists, isLiked, toggleLike, addToPlaylist }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
