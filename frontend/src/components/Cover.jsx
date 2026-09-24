// Cover art, or a colored placeholder derived from the title when there is no image.
const PALETTE = ['#e13300', '#1e3264', '#8d67ab', '#148a08', '#bc5900', '#e8115b', '#27856a', '#503750', '#0d73ec', '#7358ff'];

function colorFor(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Cover({ src, title = '', round = false, size, className = '' }) {
  const style = size ? { width: size, height: size } : undefined;
  const cls = `cover ${round ? 'round' : ''} ${className}`;
  if (src) return <img className={cls} src={src} alt="" style={style} loading="lazy" />;
  return (
    <div className={`${cls} placeholder`} style={{ ...style, background: `linear-gradient(135deg, ${colorFor(title)}, #121212)` }}>
      <span>{title.trim().charAt(0).toUpperCase() || '♪'}</span>
    </div>
  );
}
