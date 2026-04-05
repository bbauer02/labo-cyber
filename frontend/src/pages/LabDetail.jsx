import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NetworkTopology from '../components/NetworkTopology';

export default function LabDetail({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/labs/${id}`).then(r => r.json()),
      fetch(`/api/progress/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([labData, prog]) => {
      setLab(labData);
      setProgress(prog);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, token]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/labs/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        navigate(`/labs/${id}/workspace`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!lab) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Lab introuvable</div>;

  const difficultyLabels = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };

  return (
    <div className="lab-detail">
      <div className="lab-detail-main">
        <div className="lab-card-category" style={{
          background: `${lab.categoryInfo?.color || 'var(--accent)'}20`,
          color: lab.categoryInfo?.color || 'var(--accent)',
          marginBottom: '16px'
        }}>
          {lab.categoryInfo?.name || lab.category}
        </div>

        <h1>{lab.title}</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '16px 0 24px' }}>
          {lab.description}
        </p>

        {/* Objectifs */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--accent)' }}>
            Objectifs d'apprentissage
          </h2>
          <ul className="objectives-list">
            {(lab.objectives || []).map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>

        {/* Prérequis */}
        {lab.prerequisites && lab.prerequisites.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Prérequis</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lab.prerequisites.map((p, i) => (
                <li key={i} style={{ padding: '6px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  &bull; {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Schéma réseau visuel */}
        <NetworkTopology labId={id} />

        {/* Topologie textuelle */}
        {lab.topology && lab.topology.containers.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Conteneurs et réseaux</h2>
            <div className="topology-view">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {lab.topology.containers.length} conteneur(s) &bull; {lab.topology.networks.length} réseau(x)
              </p>
              {lab.topology.containers.map((c, i) => (
                <div key={i} className="topology-container">
                  <span className="dot" />
                  <span>{c.name}</span>
                  {c.user && <span style={{ color: 'var(--text-muted)' }}>({c.user})</span>}
                  {c.terminals !== undefined && <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{c.terminals} terminal(s)</span>}
                </div>
              ))}
              {lab.topology.networks.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {lab.topology.networks.map((n, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}>
                      Réseau: {n.name} {n.subnet && `(${n.subnet})`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Objectifs d'évaluation */}
        {lab.goals && lab.goals.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Critères d'évaluation</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {lab.goals.length} objectif(s) à valider pour compléter ce lab
            </p>
            {lab.goals.map((g, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '6px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)'
              }}>
                {g.id}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="lab-detail-sidebar">
        <div className="card" style={{ position: 'sticky', top: 'calc(var(--navbar-height) + 32px)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Difficulté</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{difficultyLabels[lab.difficulty] || 'Inconnu'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Durée estimée</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{lab.duration}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Conteneurs</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{lab.topology?.containers?.length || 1}</span>
            </div>
          </div>

          {progress && progress.status === 'completed' && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0, 230, 118, 0.1)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{progress.score}%</div>
              <div style={{ fontSize: '12px', color: 'var(--success)' }}>Complété</div>
            </div>
          )}

          {progress && progress.status === 'in_progress' && (
            <div style={{ marginBottom: '20px' }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress.score || 0}%` }} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>En cours</p>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Démarrage...' :
              progress?.status === 'in_progress' ? 'Reprendre le lab' :
              progress?.status === 'completed' ? 'Refaire le lab' :
              'Démarrer le lab'}
          </button>

          {progress?.status === 'in_progress' && (
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate(`/labs/${id}/workspace`)}
            >
              Ouvrir l'espace de travail
            </button>
          )}

          {/* Comptes utilisateurs réels */}
          {lab.credentials && lab.credentials.length > 0 && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '10px' }}>Identifiants de connexion</h4>
              {lab.credentials.map((cred, i) => (
                <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{cred.container}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>user:</span> <span style={{ color: 'var(--success)' }}>{cred.user}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>pass:</span> <span style={{ color: 'var(--warning)' }}>{cred.password}</span></div>
                  {cred.extra_users && cred.extra_users.length > 0 && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Comptes additionnels :</div>
                      {cred.extra_users.map((u, j) => (
                        <div key={j}>
                          <span style={{ color: 'var(--success)' }}>{u.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}> / </span>
                          <span style={{ color: 'var(--warning)' }}>{u.password}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="tag-list" style={{ marginTop: '20px' }}>
            {(lab.tags || []).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
