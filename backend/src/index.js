const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const labRoutes = require('./routes/labs');
const progressRoutes = require('./routes/progress');
const terminalService = require('./services/terminal');

const app = express();
const server = http.createServer(app);

// Base de données
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.set('trust proxy', 1); // Derrière Nginx
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Injecter la pool DB dans les requêtes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// WebSocket pour le terminal
terminalService.setup(server, pool);

// Nettoyage automatique des labs inactifs (toutes les 30 min)
const dockerService = require('./services/docker');
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_IDLE_TIME = 2 * 60 * 60 * 1000; // 2 heures

setInterval(async () => {
  try {
    const stale = await pool.query(
      `SELECT user_id, lab_id FROM lab_sessions
       WHERE status = 'active' AND started_at < NOW() - INTERVAL '2 hours'`
    );
    for (const session of stale.rows) {
      console.log(`Nettoyage auto: lab ${session.lab_id} de l'utilisateur ${session.user_id} (inactif > 2h)`);
      await dockerService.stopLab(session.user_id, session.lab_id);
      await pool.query(
        `UPDATE lab_sessions SET status = 'stopped', ended_at = NOW()
         WHERE user_id = $1 AND lab_id = $2 AND status = 'active'`,
        [session.user_id, session.lab_id]
      );
    }
  } catch (err) {
    console.error('Erreur nettoyage auto:', err.message);
  }
}, CLEANUP_INTERVAL);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`CyberLab API démarrée sur le port ${PORT}`);
  console.log(`Nettoyage automatique des labs inactifs > 2h toutes les 30 min`);
});
