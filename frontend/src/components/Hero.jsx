import Cover from './Cover';
import Icon from './Icons';
import { usePlayer } from '../context/PlayerContext';

// Big header used by album, playlist, artist and liked-songs pages.
export function Hero({ image, cover, kind, title, children, round = false }) {
  return (
    <div className="hero">
      {cover || <Cover src={image} title={title} round={round} className="hero-cover" />}
      <div className="hero-text">
        <span className="kind">{kind}</span>
        <h1 className={title.length > 24 ? 'long' : ''}>{title}</h1>
        <div className="meta">{children}</div>
      </div>
    </div>
  );
}

// The big green play button; pauses when this list is the one playing.
export function PlayAllButton({ songs, context }) {
  const player = usePlayer();
  const isThis = player.context === context && player.current;
  const playing = isThis && player.playing;
  return (
    <button
      className="play-fab big"
      aria-label={playing ? 'Pause' : 'Play'}
      disabled={!songs.length}
      onClick={() => (isThis ? player.toggle() : player.playList(songs, 0, context))}
    >
      <Icon name={playing ? 'pause' : 'play'} />
    </button>
  );
}
