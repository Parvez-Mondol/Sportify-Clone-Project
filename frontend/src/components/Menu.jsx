import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

// A "..." button that opens a small popover of actions.
export default function Menu({ label = 'More options', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="more" />
      </button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
