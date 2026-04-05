import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LabCatalog({ token }) {
  const [labs, setLabs] = useState([]);
  const [categories, setCategories] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState({});

  useEffect(() => {
    fetch('/api/labs')
      .then(r => r.json())
      .then(data => {
        setLabs(data.labs || []);
        setCategories(data.categories || {});
      });

    if (token) {
      fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const map = {};
          (Array.isArray(data) ? data : []).forEach(p => { map[p.lab_id] = p; });
          setProgress(map);
        });
    }
  }, [token]);

  const filtered = labs.filter(lab => {
    if (filter !== 'all' && lab.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        lab.title.toLowerCase().includes(q) ||
        lab.description.toLowerCase().includes(q) ||
        (lab.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (labId) => {
    const p = progress[labId];
    if (!p) return null;
    if (p.status === 'completed') return <span className="badge badge-success">Terminé</span>;
    if (p.status === 'in_progress') return <span className="badge badge-warning">En cours</span>;
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Catalogue des Labs</h1>
        <p>{labs.length} labs de cybersécurité disponibles en français</p>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Rechercher un lab (ex: buffer overflow, iptables, DNS...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font)',
            fontSize: '15px',
          }}
        />
      </div>

      {/* Filtres par catégorie */}
      <div className="category-filters">
        <button
          className={`category-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tous ({labs.length})
        </button>
        {Object.entries(categories).map(([key, cat]) => {
          const count = labs.filter(l => l.category === key).length;
          return (
            <button
              key={key}
              className={`category-chip ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
              style={filter === key ? { borderColor: cat.color, color: cat.color } : {}}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Grille de labs */}
      <div className="lab-grid">
        {filtered.map(lab => (
          <Link key={lab.id} to={`/labs/${lab.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card lab-card" style={{ '--card-accent': lab.categoryInfo?.color }}>
              <div className="card-header">
                <div className="lab-card-category" style={{
                  background: `${lab.categoryInfo?.color || 'var(--accent)'}20`,
                  color: lab.categoryInfo?.color || 'var(--accent)'
                }}>
                  {lab.categoryInfo?.name || lab.category}
                </div>
                {getStatusBadge(lab.id)}
              </div>

              <h3>{lab.title}</h3>
              <p>{lab.description}</p>

              <div className="tag-list" style={{ marginBottom: '16px' }}>
                {(lab.tags || []).slice(0, 4).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>

              <div className="lab-card-footer">
                <div className="lab-meta">
                  <span>{lab.duration}</span>
                </div>
                <div className="difficulty">
                  {[1, 2, 3].map(i => (
                    <span
                      key={i}
                      className={`difficulty-dot ${i <= lab.difficulty ? 'active' : ''} ${lab.difficulty >= 3 ? 'hard' : lab.difficulty === 2 ? 'medium' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {progress[lab.id] && (
                <div className="progress-bar" style={{ marginTop: '12px' }}>
                  <div className="progress-bar-fill" style={{ width: `${progress[lab.id].score || 0}%` }} />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>Aucun lab trouvé</p>
          <p>Essayez un autre filtre ou terme de recherche</p>
        </div>
      )}
    </div>
  );
}
