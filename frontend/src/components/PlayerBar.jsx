import { Link } from 'react-router-dom';
import { useState } from 'react';
import Icon from './Icons';
import Cover from './Cover';
import LikeButton from './LikeButton';
import { formatTime } from './format';
import { usePlayer } from '../context/PlayerContext';

function Slider({ value, max, onChange, label, className = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <input
      type="range"
      className={`slider ${className}`}
      min={0}
      max={max || 0}
      step="any"
      value={Math.min(value, max || 0)}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      style={{ '--pct': `${pct}%` }}
    />
  );
}

export default function PlayerBar() {
  const p = usePlayer();
  const [lastVolume, setLastVolume] = useState(0.8);
  const song = p.current;
  const duration = p.duration || song?.duration || 0;

  function toggleMute() {
    if (p.volume > 0) {
      setLastVolume(p.volume);
      p.setVolume(0);
    } else {
      p.setVolume(lastVolume || 0.8);
    }
  }

  return (
    <footer className={`player ${song ? '' : 'idle'}`}>
      <div className="now-playing">
        {song && (
          <>
            <Cover src={song.coverUrl} title={song.title} size={56} />
            <div className="stack">
              {song.album
                ? <Link className="title" to={`/album/${song.album.id}`}>{song.title}</Link>
                : <span className="title">{song.title}</span>}
              <Link className="sub" to={`/artist/${song.artist.id}`}>{song.artist.displayName}</Link>
            </div>
            <LikeButton song={song} />
          </>
        )}
      </div>

      <div className="controls">
        <div className="buttons">
          <button className={`icon-btn toggle ${p.shuffle ? 'on' : ''}`} aria-label="Shuffle" aria-pressed={p.shuffle} onClick={p.toggleShuffle} disabled={!song}>
            <Icon name="shuffle" />
          </button>
          <button className="icon-btn" aria-label="Previous" onClick={p.prev} disabled={!song}><Icon name="prev" /></button>
          <button className="play-btn" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.toggle} disabled={!song}>
            <Icon name={p.playing ? 'pause' : 'play'} />
          </button>
          <button className="icon-btn" aria-label="Next" onClick={() => p.next()} disabled={!song}><Icon name="next" /></button>
          <button
            className={`icon-btn toggle ${p.repeat !== 'off' ? 'on' : ''}`}
            aria-label={`Repeat: ${p.repeat}`}
            onClick={p.cycleRepeat}
            disabled={!song}
          >
            <Icon name="repeat" />
            {p.repeat === 'one' && <span className="badge">1</span>}
          </button>
        </div>
        <div className="progress">
          <span className="time">{formatTime(p.time)}</span>
          <Slider value={p.time} max={duration} onChange={p.seek} label="Seek" />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="volume">
        <button className="icon-btn" aria-label={p.volume ? 'Mute' : 'Unmute'} onClick={toggleMute}>
          <Icon name={p.volume ? 'volume' : 'mute'} />
        </button>
        <Slider value={p.volume} max={1} onChange={p.setVolume} label="Volume" />
      </div>
    </footer>
  );
}
