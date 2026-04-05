import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

// Icones SVG inline pour les noeuds (style Packet Tracer)
const ICONS = {
  pc: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="8" y="4" width="48" height="34" rx="3" fill="#1a1a2e" stroke="#00e676" stroke-width="2"/>
    <rect x="12" y="8" width="40" height="26" rx="1" fill="#0a2a0a"/>
    <text x="32" y="26" text-anchor="middle" fill="#00e676" font-family="monospace" font-size="12">&gt;_</text>
    <rect x="24" y="40" width="16" height="4" fill="#00e676" opacity="0.5"/>
    <rect x="18" y="44" width="28" height="3" rx="1" fill="#00e676" opacity="0.7"/>
  </svg>`,

  server: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="12" y="2" width="40" height="60" rx="4" fill="#1a1a2e" stroke="#9b59b6" stroke-width="2"/>
    <rect x="16" y="6" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#9b59b6" stroke-width="1" opacity="0.5"/>
    <circle cx="42" cy="13" r="2.5" fill="#00e676"/><rect x="20" y="11" width="14" height="2" rx="1" fill="#9b59b6" opacity="0.4"/>
    <rect x="16" y="24" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#9b59b6" stroke-width="1" opacity="0.5"/>
    <circle cx="42" cy="31" r="2.5" fill="#ffab40"/><rect x="20" y="29" width="14" height="2" rx="1" fill="#9b59b6" opacity="0.4"/>
    <rect x="16" y="42" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#9b59b6" stroke-width="1" opacity="0.5"/>
    <circle cx="42" cy="49" r="2.5" fill="#ff5252"/><rect x="20" y="47" width="14" height="2" rx="1" fill="#9b59b6" opacity="0.4"/>
  </svg>`,

  router: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="#1a1a2e" stroke="#f39c12" stroke-width="2"/>
    <line x1="12" y1="32" x2="52" y2="32" stroke="#f39c12" stroke-width="2.5"/>
    <line x1="32" y1="12" x2="32" y2="52" stroke="#f39c12" stroke-width="2.5"/>
    <polygon points="52,32 46,27 46,37" fill="#f39c12"/>
    <polygon points="12,32 18,27 18,37" fill="#f39c12"/>
    <polygon points="32,12 27,18 37,18" fill="#f39c12"/>
    <polygon points="32,52 27,46 37,46" fill="#f39c12"/>
    <circle cx="32" cy="32" r="6" fill="#f39c12" opacity="0.3"/>
  </svg>`,

  firewall: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="4" y="4" width="56" height="56" rx="4" fill="#1a1a2e" stroke="#e74c3c" stroke-width="2"/>
    <rect x="28" y="8" width="8" height="48" rx="2" fill="#e74c3c" opacity="0.8"/>
    <rect x="8"  y="10" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
    <rect x="38" y="10" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
    <rect x="8"  y="26" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
    <rect x="38" y="26" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
    <rect x="8"  y="42" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
    <rect x="38" y="42" width="18" height="10" rx="2" fill="#e74c3c" opacity="0.2" stroke="#e74c3c" stroke-width="1"/>
  </svg>`,

  attacker: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="8" y="4" width="48" height="34" rx="3" fill="#1a1a2e" stroke="#e74c3c" stroke-width="2"/>
    <rect x="12" y="8" width="40" height="26" rx="1" fill="#1a0a0a"/>
    <text x="32" y="20" text-anchor="middle" fill="#e74c3c" font-size="10">&#9760;</text>
    <text x="32" y="30" text-anchor="middle" fill="#e74c3c" font-family="monospace" font-size="7">MITM</text>
    <rect x="24" y="40" width="16" height="4" fill="#e74c3c" opacity="0.5"/>
    <rect x="18" y="44" width="28" height="3" rx="1" fill="#e74c3c" opacity="0.7"/>
  </svg>`,

  dns: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="12" y="2" width="40" height="60" rx="4" fill="#1a1a2e" stroke="#3498db" stroke-width="2"/>
    <rect x="16" y="6" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#3498db" stroke-width="1" opacity="0.5"/>
    <text x="32" y="16" text-anchor="middle" fill="#3498db" font-family="monospace" font-size="8" font-weight="bold">DNS</text>
    <rect x="16" y="24" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#3498db" stroke-width="1" opacity="0.5"/>
    <circle cx="42" cy="31" r="2.5" fill="#00e676"/>
    <rect x="16" y="42" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#3498db" stroke-width="1" opacity="0.5"/>
    <circle cx="42" cy="49" r="2.5" fill="#00e676"/>
  </svg>`,

  web: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="12" y="2" width="40" height="60" rx="4" fill="#1a1a2e" stroke="#e67e22" stroke-width="2"/>
    <rect x="16" y="6" width="32" height="14" rx="2" fill="#0d0d1a" stroke="#e67e22" stroke-width="1" opacity="0.5"/>
    <text x="32" y="16" text-anchor="middle" fill="#e67e22" font-family="monospace" font-size="7" font-weight="bold">HTTP</text>
    <circle cx="42" cy="13" r="2.5" fill="#00e676"/>
    <rect x="16" y="24" width="32" height="14" rx="2" fill="#0d0d1a"/>
    <circle cx="42" cy="31" r="2.5" fill="#00e676"/>
    <rect x="16" y="42" width="32" height="14" rx="2" fill="#0d0d1a"/>
    <circle cx="42" cy="49" r="2.5" fill="#ffab40"/>
  </svg>`,
};

function svgToDataUrl(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Topologies réseau pour chaque lab
const TOPOLOGIES = {
  'arp-spoof': {
    nodes: [
      { id: 'user', label: 'user\n10.10.3.10\nMAC aa:...:00:02', icon: 'pc', group: 'local', x: -200, y: -80 },
      { id: 'attacker', label: 'attacker\n10.10.3.20\nMAC aa:...:00:04', icon: 'attacker', group: 'local', x: -200, y: 80 },
      { id: 'gateway', label: 'router\n10.10.3.254\n10.10.4.254', icon: 'router', group: 'router', x: 0, y: 0 },
      { id: 'webserver', label: 'webserver\n10.10.4.10\nApache HTTP', icon: 'web', group: 'remote', x: 250, y: 0 },
    ],
    edges: [
      { from: 'user', to: 'gateway', label: 'eth0', color: '#2ecc71', dashes: false },
      { from: 'attacker', to: 'gateway', label: 'ARP spoof', color: '#e74c3c', dashes: [5, 5] },
      { from: 'attacker', to: 'user', label: 'ARP spoof', color: '#e74c3c', dashes: [5, 5] },
      { from: 'gateway', to: 'webserver', label: 'eth1', color: '#e67e22', dashes: false },
    ],
    groups: {
      local: { label: 'LOCAL_NETWORK\n10.10.3.0/24', color: '#3498db' },
      remote: { label: 'REMOTE_NETWORK\n10.10.4.0/24', color: '#e67e22' },
      router: { label: '', color: '#f39c12' },
    },
  },

  'iptables2': {
    nodes: [
      { id: 'client', label: 'client\n10.10.1.10', icon: 'pc', group: 'client_net', x: -250, y: 0 },
      { id: 'firewall', label: 'firewall\n10.10.1.254 / 10.10.2.254\niptables FORWARD', icon: 'firewall', group: 'fw', x: 0, y: 0 },
      { id: 'server', label: 'server\n10.10.2.10\nSSH+Telnet+HTTP\nmdp: gummybear', icon: 'server', group: 'server_net', x: 250, y: 0 },
    ],
    edges: [
      { from: 'client', to: 'firewall', label: 'CLIENT_NET', color: '#3498db' },
      { from: 'firewall', to: 'server', label: 'SERVER_NET', color: '#e67e22' },
    ],
    groups: {
      client_net: { label: 'CLIENT_NET 10.10.1.0/24', color: '#3498db' },
      server_net: { label: 'SERVER_NET 10.10.2.0/24', color: '#e67e22' },
      fw: { label: '', color: '#e74c3c' },
    },
  },

  'dns': {
    nodes: [
      { id: 'dns', label: 'dns (BIND9)\n10.10.5.10\nadmin/admin', icon: 'dns', group: 'lan', x: -200, y: -100 },
      { id: 'ws1', label: 'ws1\n10.10.5.11', icon: 'pc', group: 'lan', x: -300, y: 40 },
      { id: 'ws2', label: 'ws2\n10.10.5.12', icon: 'pc', group: 'lan', x: -200, y: 100 },
      { id: 'ws3', label: 'ws3\n10.10.5.13\n(pas de DNS)', icon: 'pc', group: 'lan', borderColor: '#e74c3c', x: -100, y: 100 },
      { id: 'gw', label: 'gateway\n10.10.5.254 / 10.10.6.254\nadmin/admin', icon: 'router', group: 'router', x: 80, y: 0 },
      { id: 'isp', label: 'isp\n10.10.6.10', icon: 'server', group: 'wan', x: 300, y: 0 },
    ],
    edges: [
      { from: 'ws1', to: 'dns', label: 'DNS query', color: '#3498db', dashes: [5, 5] },
      { from: 'ws2', to: 'dns', label: 'DNS query', color: '#3498db', dashes: [5, 5] },
      { from: 'ws1', to: 'gw', color: '#a0a0b8' },
      { from: 'ws2', to: 'gw', color: '#a0a0b8' },
      { from: 'ws3', to: 'gw', color: '#a0a0b8' },
      { from: 'dns', to: 'gw', color: '#a0a0b8' },
      { from: 'gw', to: 'isp', label: 'WAN', color: '#e67e22' },
    ],
    groups: {
      lan: { label: 'LAN 10.10.5.0/24', color: '#3498db' },
      wan: { label: 'WAN 10.10.6.0/24', color: '#e67e22' },
      router: { label: '', color: '#f39c12' },
    },
  },

  'sql-inject': {
    nodes: [
      { id: 'client', label: 'client\n10.10.7.20\nstudent/password123', icon: 'pc', group: 'net', x: -200, y: 0 },
      { id: 'webserver', label: 'web-server\n10.10.7.10\nApache+MySQL+PHP\nMySQL root: seedubuntu', icon: 'web', group: 'net', x: 200, y: 0 },
    ],
    edges: [
      { from: 'client', to: 'webserver', label: 'HTTP + SQL injection', color: '#e74c3c', width: 2, arrows: 'to' },
    ],
    groups: {
      net: { label: 'NETWORK 10.10.7.0/24', color: '#3498db' },
    },
  },

  'ssh-tunnel': {
    nodes: [
      { id: 'base', label: 'base\n10.10.10.10', icon: 'pc', group: 'ab', x: -400, y: 0 },
      { id: 'hosta', label: 'host-a\n10.10.10.20', icon: 'server', group: 'ab', x: -200, y: 0 },
      { id: 'hostb', label: 'host-b\n10.10.11.20', icon: 'server', group: 'bc', x: 0, y: 0 },
      { id: 'hostc', label: 'host-c\n10.10.12.20', icon: 'server', group: 'cd', x: 200, y: 0 },
      { id: 'hostd', label: 'host-d\n10.10.13.20\nfichier cible', icon: 'server', group: 'de', borderColor: '#e74c3c', x: 400, y: 0 },
    ],
    edges: [
      { from: 'base', to: 'hosta', label: 'tunnel :1111', color: '#3498db', width: 2 },
      { from: 'hosta', to: 'hostb', label: 'tunnel :2222', color: '#2ecc71', width: 2 },
      { from: 'hostb', to: 'hostc', label: 'tunnel :3333', color: '#e67e22', width: 2 },
      { from: 'hostc', to: 'hostd', label: 'SSH', color: '#e74c3c', width: 2 },
    ],
    groups: {
      ab: { label: 'NET_AB 10.10.10.0/24', color: '#3498db' },
      bc: { label: 'NET_BC 10.10.11.0/24', color: '#2ecc71' },
      cd: { label: 'NET_CD 10.10.12.0/24', color: '#e67e22' },
      de: { label: 'NET_DE 10.10.13.0/24', color: '#e74c3c' },
    },
  },

  'nmap-discovery': {
    nodes: [
      { id: 'scanner', label: 'nmap-discovery\n10.10.8.10\nnmap + ssh', icon: 'pc', group: 'net', x: -200, y: 0 },
      { id: 'target', label: 'target\n10.10.8.20\nSSH + Apache', icon: 'server', group: 'net', x: 200, y: 0 },
    ],
    edges: [
      { from: 'scanner', to: 'target', label: '1. nmap scan', color: '#3498db', dashes: [5, 5] },
      { from: 'scanner', to: 'target', label: '2. SSH', color: '#2ecc71' },
    ],
    groups: {
      net: { label: 'DISCOVERY_NET 10.10.8.0/24', color: '#3498db' },
    },
  },

  'wireshark-intro': {
    nodes: [
      { id: 'analyst', label: 'wireshark-intro\ntcpdump + tshark', icon: 'pc', group: 'net', x: -200, y: 0 },
      { id: 'pcap', label: 'telnet.pcap\nSession Telnet\nMot de passe de john', icon: 'server', group: 'net', x: 200, y: 0 },
    ],
    edges: [
      { from: 'analyst', to: 'pcap', label: 'analyse', color: '#f39c12', width: 2 },
    ],
    groups: {
      net: { label: 'Analyse de capture', color: '#f39c12' },
    },
  },

  'acl': {
    nodes: [
      { id: 'alice', label: 'alice\npassword4alice', icon: 'pc', group: 'users', x: -250, y: -80 },
      { id: 'bob', label: 'bob\npassword4bob', icon: 'pc', group: 'users', x: -250, y: 0 },
      { id: 'harry', label: 'harry\npassword4harry', icon: 'pc', group: 'users', x: -250, y: 80 },
      { id: 'accounting', label: 'accounting.txt\nowner: bob\nACL: harry rw, alice r', icon: 'server', group: 'files', x: 150, y: -40 },
      { id: 'trojan', label: 'bob/fun\ncheval de Troie', icon: 'attacker', group: 'files', x: 150, y: 60 },
    ],
    edges: [
      { from: 'alice', to: 'accounting', label: 'r (ACL)', color: '#2ecc71', dashes: [5, 5] },
      { from: 'bob', to: 'accounting', label: 'rw (owner)', color: '#3498db' },
      { from: 'harry', to: 'accounting', label: 'rw (ACL)', color: '#f39c12' },
      { from: 'alice', to: 'trojan', label: 'execute', color: '#e74c3c', dashes: [5, 5] },
    ],
    groups: {
      users: { label: 'Utilisateurs', color: '#3498db' },
      files: { label: '/shared_data/', color: '#9b59b6' },
    },
  },

  'bufoverflow': {
    nodes: [
      { id: 'stack', label: 'stack.c (SUID root)\nbuffer 24 octets\nstrcpy vulnérable', icon: 'server', group: 'vuln', borderColor: '#e74c3c', x: 0, y: 0 },
      { id: 'exploit', label: 'exploit.c\ngénère badfile', icon: 'pc', group: 'vuln', x: -250, y: 0 },
      { id: 'secret', label: '/root/.secret\nobjectif', icon: 'server', group: 'target', borderColor: '#2ecc71', x: 250, y: 0 },
    ],
    edges: [
      { from: 'exploit', to: 'stack', label: 'overflow + shellcode', color: '#e74c3c', width: 2 },
      { from: 'stack', to: 'secret', label: 'shell root', color: '#2ecc71', width: 2 },
    ],
    groups: {
      vuln: { label: 'Exploitation', color: '#e74c3c' },
      target: { label: 'Objectif', color: '#2ecc71' },
    },
  },
};

export default function NetworkTopology({ labId, onNodeClick }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const topo = TOPOLOGIES[labId];

  useEffect(() => {
    if (!topo || !containerRef.current) return;

    // Construire les noeuds vis-network avec positions fixes
    const nodes = new DataSet(topo.nodes.map(n => ({
      id: n.id,
      label: n.label,
      shape: 'image',
      image: svgToDataUrl(ICONS[n.icon] || ICONS.pc),
      size: 60,
      x: n.x,
      y: n.y,
      fixed: { x: false, y: false },
      font: {
        color: '#e8e8f0',
        size: 16,
        face: '"JetBrains Mono", monospace',
        multi: 'md',
        strokeWidth: 3,
        strokeColor: '#0f0f1a',
      },
      borderWidth: n.borderColor ? 3 : 0,
      color: {
        border: n.borderColor || 'transparent',
      },
      group: n.group,
    })));

    // Construire les arêtes
    const edges = new DataSet(topo.edges.map((e, i) => ({
      id: i,
      from: e.from,
      to: e.to,
      label: e.label || '',
      color: { color: e.color || '#a0a0b8', highlight: e.color || '#a0a0b8' },
      width: e.width || 1.5,
      dashes: e.dashes || false,
      arrows: e.arrows || '',
      font: {
        color: e.color || '#a0a0b8',
        size: 13,
        face: '"JetBrains Mono", monospace',
        strokeWidth: 3,
        strokeColor: '#0f0f1a',
        align: 'top',
      },
      smooth: { type: 'curvedCW', roundness: topo.edges.filter(x => x.from === e.from && x.to === e.to).length > 1 ? 0.2 : 0 },
    })));

    const options = {
      autoResize: true,
      height: '450px',
      physics: {
        enabled: false,
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 200,
      },
      edges: {
        smooth: { enabled: true, type: 'continuous' },
      },
      layout: {
        improvedLayout: false,
      },
    };

    // Créer le réseau
    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Ajuster la vue pour afficher tous les noeuds
    network.fit({ animation: { duration: 300 } });

    // Clic sur un noeud → basculer vers l'onglet terminal correspondant
    network.on('click', (params) => {
      if (params.nodes.length > 0 && onNodeClick) {
        onNodeClick(params.nodes[0]);
      }
    });

    return () => {
      network.destroy();
    };
  }, [topo, labId, onNodeClick]);

  if (!topo) return null;

  // Légende des sous-réseaux
  const groups = Object.entries(topo.groups).filter(([, g]) => g.label);

  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
    }}>
      <details open style={{ margin: 0 }}>
        <summary style={{
          fontSize: '12px',
          color: 'var(--accent)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          userSelect: 'none',
          marginBottom: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="3" /><circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" /><line x1="12" y1="8" x2="19" y2="16" />
          </svg>
          Topologie réseau (interactif — glisser/zoomer)
        </summary>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '450px',
            background: '#0a0a12',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        />
        {groups.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
            {groups.map(([key, g]) => (
              <span key={key} style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: g.color,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{
                  width: '10px', height: '3px',
                  background: g.color,
                  borderRadius: '2px',
                  display: 'inline-block',
                }} />
                {g.label}
              </span>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
