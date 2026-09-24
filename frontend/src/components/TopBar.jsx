import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Icon from './Icons';
import Cover from './Cover';
import Menu from './Menu';
import { useAuth } from '../context/AuthContext';

function SearchBox() {
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get('q') || '');

  // Debounce so we don't search on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (value.trim() === (params.get('q') || '')) return;
      setParams(value.trim() ? { q: value.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="search-box">
      <Icon name="search" />
      <input
        autoFocus
        type="search"
        placeholder="What do you want to play?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search"
      />
    </label>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="topbar">
      <div className="history">
        <button className="icon-btn round-btn" aria-label="Go back" onClick={() => navigate(-1)}><Icon name="back" /></button>
        <button className="icon-btn round-btn" aria-label="Go forward" onClick={() => navigate(1)}><Icon name="forward" /></button>
      </div>
      {pathname === '/search' && <SearchBox />}
      <div className="spacer" />
      {user ? (
        <div className="account">
          {(user.role === 'artist' || user.role === 'admin') && (
            <Link to="/upload" className="btn outline small"><Icon name="upload" /> Upload</Link>
          )}
          <Menu label="Account">
            <div className="menu-label">{user.displayName} · {user.role}</div>
            <button role="menuitem" onClick={() => navigate(`/artist/${user.id}`)}>Profile</button>
            <button role="menuitem" onClick={() => navigate('/settings')}>Settings</button>
            <hr />
            <button role="menuitem" onClick={() => { logout(); navigate('/'); }}>Log out</button>
          </Menu>
          <Link to="/settings" aria-label="Your account"><Cover src={user.avatarUrl} title={user.displayName} size={32} round /></Link>
        </div>
      ) : (
        <div className="account">
          <Link to="/register" className="link muted-link">Sign up</Link>
          <Link to="/login" className="btn light">Log in</Link>
        </div>
      )}
    </header>
  );
}
