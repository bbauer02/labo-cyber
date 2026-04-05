-- CyberLab - Schema de base de données

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE lab_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lab_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    container_id VARCHAR(100),
    notes TEXT,
    UNIQUE(user_id, lab_id)
);

CREATE TABLE lab_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lab_id VARCHAR(100) NOT NULL,
    container_ids TEXT[], -- Array de container IDs actifs
    network_ids TEXT[],
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'error'))
);

CREATE TABLE grading_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lab_id VARCHAR(100) NOT NULL,
    goal_id VARCHAR(100) NOT NULL,
    achieved BOOLEAN DEFAULT FALSE,
    details TEXT,
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_progress_user ON lab_progress(user_id);
CREATE INDEX idx_progress_lab ON lab_progress(lab_id);
CREATE INDEX idx_sessions_user ON lab_sessions(user_id);
CREATE INDEX idx_sessions_active ON lab_sessions(status) WHERE status = 'active';

-- Utilisateur admin par défaut (mot de passe: admin123 - à changer!)
-- Hash généré par bcrypt avec 10 rounds
INSERT INTO users (username, email, password_hash, display_name, role)
VALUES ('admin', 'admin@cyberlab.local', '$2b$10$ZOh/bw2BNH1sZP1eJLgSkeyrJReLO7n/td9DrTH/XBnwSl8SrHAq.', 'Administrateur', 'admin');
