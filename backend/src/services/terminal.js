const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { docker } = require('./docker');
const { JWT_SECRET } = require('../middleware/auth');

function setup(server, pool) {
  const wss = new WebSocketServer({ server, path: '/ws/terminal' });

  wss.on('connection', async (ws, req) => {
    // Authentification via query param
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const containerId = url.searchParams.get('container');

    if (!token || !containerId) {
      ws.send(JSON.stringify({ error: 'Token et container requis' }));
      ws.close();
      return;
    }

    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch {
      ws.send(JSON.stringify({ error: 'Token invalide' }));
      ws.close();
      return;
    }

    // Vérifier que le conteneur appartient à l'utilisateur
    let container;
    try {
      container = docker.getContainer(containerId);
      const info = await container.inspect();
      if (info.Config.Labels['cyberlab.user'] !== String(user.id)) {
        ws.send(JSON.stringify({ error: 'Accès refusé à ce conteneur' }));
        ws.close();
        return;
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: 'Conteneur introuvable' }));
      ws.close();
      return;
    }

    // Créer un exec interactif
    try {
      const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: ['TERM=xterm-256color', 'LANG=fr_FR.UTF-8'],
      });

      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
      });

      // Envoyer un message de bienvenue
      ws.send('\r\n\x1b[1;32m=== CyberLab Terminal ===\x1b[0m\r\n');
      ws.send('\x1b[33mConnecté au conteneur de lab.\x1b[0m\r\n');
      ws.send('\x1b[36mSi les outils ne sont pas encore disponibles, patientez ~30s (installation en cours).\x1b[0m\r\n');
      ws.send('\x1b[36mVérifiez avec: ls /tmp/.lab_ready\x1b[0m\r\n\r\n');

      // Stream container -> client
      stream.on('data', (chunk) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk);
        }
      });

      // Client -> container
      ws.on('message', (data) => {
        const msg = data.toString();

        // Gérer le resize du terminal
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === 'resize') {
            exec.resize({ h: parsed.rows, w: parsed.cols }).catch(() => {});
            return;
          }
        } catch {
          // Pas du JSON, c'est de l'input terminal
        }

        stream.write(data);
      });

      ws.on('close', () => {
        stream.end();
      });

      stream.on('end', () => {
        if (ws.readyState === ws.OPEN) {
          ws.send('\r\n\x1b[31mSession terminée.\x1b[0m\r\n');
          ws.close();
        }
      });

    } catch (err) {
      console.error('Erreur terminal:', err);
      ws.send(JSON.stringify({ error: 'Impossible de démarrer le terminal' }));
      ws.close();
    }
  });
}

module.exports = { setup };
