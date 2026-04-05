import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState({ completed: 0, in_progress: 0, total: 0, avg_score: 0 });
  const [progress, setProgress] = useState([]);
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/progress/stats/summary', { headers }).then(r => r.json()),
      fetch('/api/progress', { headers }).then(r => r.json()),
      fetch('/api/labs').then(r => r.json()),
    ]).then(([s, p, l]) => {
      setStats(s);
      setProgress(Array.isArray(p) ? p : []);
      setLabs(l.labs || []);
    }).catch(() => {});
  }, [token]);

  const recentLabs = progress
    .filter(p => p.status === 'in_progress')
    .slice(0, 4)
    .map(p => {
      const lab = labs.find(l => l.id === p.lab_id);
      return { ...p, lab };
    });

  const completedLabs = progress
    .filter(p => p.status === 'completed')
    .slice(0, 4)
    .map(p => {
      const lab = labs.find(l => l.id === p.lab_id);
      return { ...p, lab };
    });

  const totalLabs = labs.length || 21;
  const pct = totalLabs > 0 ? Math.round((Number(stats.completed) / totalLabs) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <p>Suivez votre progression dans les labs de cybersécurité</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{stats.completed || 0}</div>
          <div className="stat-label">Labs terminés</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.in_progress || 0}</div>
          <div className="stat-label">En cours</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{Math.round(stats.avg_score || 0)}%</div>
          <div className="stat-label">Score moyen</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{pct}%</div>
          <div className="stat-label">Progression globale</div>
          <div className="progress-bar" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {recentLabs.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Continuer vos labs</h2>
          <div className="lab-grid">
            {recentLabs.map(item => (
              <Link key={item.lab_id} to={`/labs/${item.lab_id}`} style={{ textDecoration: 'none' }}>
                <div className="card lab-card">
                  <span className="badge badge-warning">En cours</span>
                  <h3 style={{ marginTop: '8px' }}>{item.lab?.title || item.lab_id}</h3>
                  <p>{item.lab?.description || ''}</p>
                  <div className="progress-bar" style={{ marginTop: '8px' }}>
                    <div className="progress-bar-fill" style={{ width: `${item.score || 0}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {completedLabs.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Labs terminés</h2>
          <div className="lab-grid">
            {completedLabs.map(item => (
              <Link key={item.lab_id} to={`/labs/${item.lab_id}`} style={{ textDecoration: 'none' }}>
                <div className="card lab-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-success">Terminé</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{item.score}%</span>
                  </div>
                  <h3 style={{ marginTop: '8px' }}>{item.lab?.title || item.lab_id}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>Labs recommandés</h2>
          <Link to="/labs" className="btn btn-secondary btn-sm">Voir tout le catalogue</Link>
        </div>
        <div className="lab-grid">
          {labs.filter(l => l.difficulty === 1).slice(0, 3).map(lab => (
            <Link key={lab.id} to={`/labs/${lab.id}`} style={{ textDecoration: 'none' }}>
              <div className="card lab-card" style={{ '--card-accent': lab.categoryInfo?.color }}>
                <div className="lab-card-category" style={{ background: `${lab.categoryInfo?.color}20`, color: lab.categoryInfo?.color }}>
                  {lab.categoryInfo?.name || lab.category}
                </div>
                <h3>{lab.title}</h3>
                <p>{lab.description}</p>
                <div className="lab-card-footer">
                  <div className="lab-meta">
                    <span>{lab.duration}</span>
                    <span>
                      <span className="difficulty">
                        {[1,2,3].map(i => (
                          <span key={i} className={`difficulty-dot ${i <= lab.difficulty ? 'active' : ''} ${lab.difficulty >= 3 ? 'hard' : lab.difficulty === 2 ? 'medium' : ''}`} />
                        ))}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
