const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/progress - Récupérer la progression de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM lab_progress WHERE user_id = $1 ORDER BY started_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/progress/:labId
router.get('/:labId', authenticateToken, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM lab_progress WHERE user_id = $1 AND lab_id = $2',
      [req.user.id, req.params.labId]
    );
    if (result.rows.length === 0) {
      return res.json({ status: 'not_started', score: 0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/progress/:labId - Mettre à jour la progression
router.post('/:labId', authenticateToken, async (req, res) => {
  try {
    const { status, score } = req.body;
    const result = await req.db.query(
      `INSERT INTO lab_progress (user_id, lab_id, status, score, started_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, lab_id) DO UPDATE SET
         status = COALESCE($3, lab_progress.status),
         score = COALESCE($4, lab_progress.score),
         completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE lab_progress.completed_at END
       RETURNING *`,
      [req.user.id, req.params.labId, status, score || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/progress/stats/summary - Statistiques globales
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) as total,
        COALESCE(AVG(score) FILTER (WHERE status = 'completed'), 0) as avg_score
       FROM lab_progress WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
