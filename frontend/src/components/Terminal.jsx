import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export default function Terminal({ containerId, token }) {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!termRef.current || !containerId || !token) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: '#0a0a0a',
        foreground: '#e8e8f0',
        cursor: '#00d4ff',
        selectionBackground: 'rgba(0, 212, 255, 0.3)',
        black: '#1a1a2e',
        red: '#ff5252',
        green: '#00e676',
        yellow: '#ffab40',
        blue: '#448aff',
        magenta: '#e040fb',
        cyan: '#00d4ff',
        white: '#e8e8f0',
      },
      scrollback: 5000,
      // Désactiver le copier-coller pour forcer les étudiants à taper
      rightClickSelectsWord: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    // Recalculer la taille quand le conteneur redevient visible (changement d'onglet)
    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch {}
    });
    resizeObserver.observe(termRef.current);

    // Bloquer le copier-coller (Ctrl+V, Ctrl+Shift+V, clic droit)
    const termElement = termRef.current;
    const blockPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Afficher un message dans le terminal
      term.write('\r\n\x1b[33m[Copier-coller désactivé — tapez la commande vous-même !]\x1b[0m\r\n');
    };
    termElement.addEventListener('paste', blockPaste, true);

    // Bloquer aussi le menu contextuel (clic droit pour coller)
    const blockContext = (e) => {
      e.preventDefault();
    };
    termElement.addEventListener('contextmenu', blockContext, true);

    // Connexion WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?token=${encodeURIComponent(token)}&container=${encodeURIComponent(containerId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      } else {
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      term.write('\r\n\x1b[31mErreur de connexion au terminal.\x1b[0m\r\n');
    };

    ws.onclose = () => {
      term.write('\r\n\x1b[33mConnexion fermée.\x1b[0m\r\n');
    };

    // Input utilisateur -> WebSocket
    // Bloquer les collages multi-caractères (plus de 1 caractère en une seule frappe = paste)
    term.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      // Un caractère tapé = 1 char (ou séquence d'échappement pour touches spéciales)
      // Un paste = plusieurs caractères d'un coup
      const isSpecialKey = data.startsWith('\x1b') || data === '\r' || data === '\x7f' || data.length === 1;

      if (isSpecialKey) {
        ws.send(data);
      } else {
        // C'est un paste (plusieurs caractères non-escape d'un coup)
        term.write('\r\n\x1b[33m[Copier-coller désactivé — tapez la commande vous-même !]\x1b[0m\r\n');
      }
    });

    // Resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
      }
    };

    term.onResize(({ rows, cols }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', rows, cols }));
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      termElement.removeEventListener('paste', blockPaste, true);
      termElement.removeEventListener('contextmenu', blockContext, true);
      ws.close();
      term.dispose();
    };
  }, [containerId, token]);

  return (
    <div
      ref={termRef}
      className="terminal-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
