import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar, { MobileNav } from './components/Sidebar';
import TopBar from './components/TopBar';
import PlayerBar from './components/PlayerBar';
import { Loading, Empty } from './components/Status';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Search from './pages/Search';
import Album from './pages/Album';
import Playlist from './pages/Playlist';
import Artist from './pages/Artist';
import Library from './pages/Library';
import Liked from './pages/Liked';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import { Login, Register } from './pages/Auth';

function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  // The main panel scrolls independently, so reset it on navigation.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main panel" ref={mainRef}>
        <TopBar />
        <Outlet />
      </main>
      <PlayerBar />
      <MobileNav />
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="album/:id" element={<Album />} />
        <Route path="playlist/:id" element={<Playlist />} />
        <Route path="artist/:id" element={<Artist />} />
        <Route element={<RequireAuth />}>
          <Route path="library" element={<Library />} />
          <Route path="liked" element={<Liked />} />
          <Route path="upload" element={<Upload />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<div className="page"><Empty>Page not found.</Empty></div>} />
      </Route>
    </Routes>
  );
}
