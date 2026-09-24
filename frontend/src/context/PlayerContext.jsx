// Owns the single <audio> element and the play queue.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';

const PlayerContext = createContext(null);

function shuffled(list, keepFirst) {
  const rest = list.filter((s) => s !== keepFirst);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return keepFirst ? [keepFirst, ...rest] : rest;
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [original, setOriginal] = useState([]); // queue order before shuffling
  const [index, setIndex] = useState(-1);
  const [startKey, setStartKey] = useState(0); // bumped whenever a track should (re)start from the top
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [context, setContext] = useState(null); // e.g. "playlist:3", so pages can show which list is playing

  const current = queue[index] || null;

  const goTo = useCallback((i) => {
    setIndex(i);
    setStartKey((k) => k + 1);
  }, []);

  // Load and start the current track. Reordering the queue (shuffle) doesn't restart it.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.streamUrl;
    audio.currentTime = 0;
    audio.play().catch(() => setPlaying(false));
    api(`/songs/${current.id}/play`, { method: 'POST' }).catch(() => {});
    document.title = `${current.title} · ${current.artist.displayName}`;
  }, [startKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const playList = useCallback((songs, startIndex = 0, ctx = null) => {
    if (!songs.length) return;
    const start = songs[startIndex];
    setOriginal(songs);
    setQueue(shuffle ? shuffled(songs, start) : songs);
    goTo(shuffle ? 0 : startIndex);
    setContext(ctx);
  }, [shuffle, goTo]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback((auto = false) => {
    if (!queue.length) return;
    if (auto && repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    if (index < queue.length - 1) goTo(index + 1);
    else if (repeat !== 'off' || !auto) goTo(0);
    else setPlaying(false);
  }, [queue.length, index, repeat, goTo]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // Like most players: restart the song unless we're right at its beginning.
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else if (index > 0) goTo(index - 1);
    else if (audio) audio.currentTime = 0;
  }, [index, goTo]);

  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setVolume = useCallback((v) => setVolumeState(Math.min(1, Math.max(0, v))), []);

  const toggleShuffle = useCallback(() => {
    const song = queue[index];
    const nextQueue = shuffle ? original : shuffled(original, song);
    setQueue(nextQueue);
    setIndex(Math.max(0, nextQueue.indexOf(song)));
    setShuffle(!shuffle);
  }, [shuffle, queue, index, original]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  // Space bar toggles playback unless the user is typing.
  useEffect(() => {
    function onKey(e) {
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const value = {
    current, queue, index, playing, time, duration, volume, shuffle, repeat, context,
    playList, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => next(true)}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
