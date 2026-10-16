import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { session, APP_NAME } from './api.js';
import Home from './pages/Home.jsx';
import Listing from './pages/Listing.jsx';
import { Login, Register, Verify } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import Manage from './pages/Manage.jsx';
import './styles.css';

function Shell() {
  const [user, setUser] = useState(session.user);
  const nav = useNavigate();
  const onAuth = (s) => { session.set(s); setUser(s.user); };
  const logout = () => { session.clear(); setUser(null); nav('/'); };

  return (
    <>
      <header className="top">
        <Link to="/" className="brand">{APP_NAME}</Link>
        <nav>
          {user ? (
            <>
              <Link to="/account">{user.name}</Link>
              <button className="link" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn small">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/b/:slug" element={<Listing user={user} />} />
          <Route path="/b/:slug/manage" element={<Manage />} />
          <Route path="/login" element={<Login onAuth={onAuth} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify onAuth={onAuth} />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
      <footer>CS5224 Team 17 prototype — non-food home-based businesses in Singapore</footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter><Shell /></BrowserRouter>
  </React.StrictMode>,
);
