// Inline SVG icons, sized by the surrounding font size and colored with currentColor.
const paths = {
  home: 'M12 3 3 10v11h6v-6h6v6h6V10z',
  search: 'M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.8 4.8-1.4 1.4-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
  library: 'M4 3h2v18H4zm5 0h2v18H9zm4.6.8 1.9-.7 6 16.9-1.9.7z',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M6 4h4v16H6zm8 0h4v16h-4z',
  next: 'M5 5v14l10-7zm11 0h3v14h-3z',
  prev: 'M19 5v14L9 12zM5 5h3v14H5z',
  shuffle: 'M16 3h5v5l-1.8-1.8-4.5 4.5-1.4-1.4 4.5-4.5zM3 5.4 4.4 4 20 19.6 18.6 21zM21 16v5h-5l1.8-1.8-3.3-3.3 1.4-1.4 3.3 3.3z',
  repeat: 'M7 7h10V4l4 4-4 4V9H7v4H5V9a2 2 0 0 1 2-2zm10 10H7v3l-4-4 4-4v3h10v-4h2v4a2 2 0 0 1-2 2z',
  heart: 'M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z',
  heartOutline: 'M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21zm0-2.4c2.3-1.5 6.4-4.6 7.7-7.6 1-2.2-.3-4.5-2.7-4.5-1.5 0-2.5 1-3.8 2.7L12 10.8l-1.2-1.6C9.5 7.5 8.5 6.5 7 6.5c-2.4 0-3.7 2.3-2.7 4.5 1.3 3 5.4 6.1 7.7 7.6z',
  plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
  more: 'M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  volume: 'M3 9h4l5-4v14l-5-4H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M3 9h4l5-4v14l-5-4H3zm13.6-.4L19 11l2.4-2.4 1.4 1.4-2.4 2.4 2.4 2.4-1.4 1.4L19 13.8l-2.4 2.4-1.4-1.4 2.4-2.4-2.4-2.4z',
  clock: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 3v4.6l3.2 3.2-1.4 1.4L11 12.4V7z',
  upload: 'M11 16V7.8L7.4 11.4 6 10l6-6 6 6-1.4 1.4L13 7.8V16zM4 18h16v2H4z',
  user: 'M12 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 11c4.4 0 8 2.2 8 5v2H4v-2c0-2.8 3.6-5 8-5z',
  music: 'M9 17.5V5l11-2v12.5a3 3 0 1 1-2-2.8V6.4l-7 1.3v9.8a3 3 0 1 1-2-2.8z',
  trash: 'M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z',
  up: 'M12 6l6 6-1.4 1.4L13 9.8V19h-2V9.8l-3.6 3.6L6 12z',
  down: 'M12 18l-6-6 1.4-1.4 3.6 3.6V5h2v9.2l3.6-3.6L18 12z',
  back: 'M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z',
  forward: 'M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  edit: 'M4 17.2V20h2.8L17.4 9.4l-2.8-2.8zM19.7 7.1a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0l-1.1 1.1 2.8 2.8z',
};

export default function Icon({ name, size = '1em', title, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...props}>
      {title && <title>{title}</title>}
      <path d={paths[name]} fillRule="evenodd" />
    </svg>
  );
}
