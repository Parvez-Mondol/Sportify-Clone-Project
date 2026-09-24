import { useState } from 'react';
import { Link } from 'react-router-dom';
import Cover from './Cover';
import Icon from './Icons';

// Square tile for albums, playlists and artists. `onPlay` loads and starts the item's songs.
export function Card({ to, image, title, subtitle, round = false, onPlay }) {
  const [busy, setBusy] = useState(false);

  async function play(e) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await onPlay();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link to={to} className="card">
      <div className="card-art">
        <Cover src={image} title={title} round={round} />
        {onPlay && (
          <button className="play-fab" aria-label={`Play ${title}`} onClick={play} disabled={busy}>
            <Icon name="play" />
          </button>
        )}
      </div>
      <div className="card-title">{title}</div>
      {subtitle && <div className="card-sub">{subtitle}</div>}
    </Link>
  );
}

export function CardGrid({ children }) {
  return <div className="card-grid">{children}</div>;
}

export function Section({ title, to, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {to && <Link to={to} className="show-all">Show all</Link>}
      </div>
      {children}
    </section>
  );
}
