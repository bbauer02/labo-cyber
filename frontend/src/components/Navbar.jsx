import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <svg width="32" height="32" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="20" fill="#00d4ff" />
          <text x="50" y="65" fontSize="50" textAnchor="middle" fill="#0f0f1a" fontFamily="monospace" fontWeight="bold">CL</text>
        </svg>
        <span>Cyber</span>Lab
      </Link>

      <ul className="navbar-links">
        <li>
          <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
            Tableau de bord
          </Link>
        </li>
        <li>
          <Link to="/labs" className={isActive('/labs') ? 'active' : ''}>
            Catalogue des labs
          </Link>
        </li>
      </ul>

      <div className="navbar-user">
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {user.display_name || user.username}
        </span>
        <div className="navbar-avatar">
          {(user.display_name || user.username).charAt(0).toUpperCase()}
        </div>
        <button className="btn btn-sm btn-secondary" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
