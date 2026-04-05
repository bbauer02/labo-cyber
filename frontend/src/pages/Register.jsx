import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Register({ onLogin }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <svg width="60" height="60" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="#00d4ff" />
            <text x="50" y="65" fontSize="50" textAnchor="middle" fill="#0f0f1a" fontFamily="monospace" fontWeight="bold">CL</text>
          </svg>
        </div>
        <h1>Créer un compte</h1>
        <p className="subtitle">Rejoignez CyberLab et commencez vos labs</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input name="username" type="text" value={form.username} onChange={handleChange} placeholder="ex: jdupont" required autoFocus />
          </div>
          <div className="form-group">
            <label>Nom affiché</label>
            <input name="display_name" type="text" value={form.display_name} onChange={handleChange} placeholder="ex: Jean Dupont" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ex: jean@example.com" required />
          </div>
          <div className="form-group">
            <label>Mot de passe (min. 6 caractères)</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Choisissez un mot de passe" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="auth-footer">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
