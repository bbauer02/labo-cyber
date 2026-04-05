const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const dockerService = require('../services/docker');

const router = express.Router();
const LABTAINERS_PATH = process.env.LABTAINERS_PATH || '/labtainers';

// Catalogue des labs avec traduction française
const LAB_CATALOG = {
  'bufoverflow': {
    title: 'Débordement de tampon (Buffer Overflow)',
    category: 'exploitation',
    difficulty: 3,
    duration: '90 min',
    description: 'Apprenez à exploiter les vulnérabilités de débordement de tampon sur la pile. Vous modifierez un programme C vulnérable pour rediriger le flux d\'exécution.',
    objectives: [
      'Comprendre l\'organisation de la mémoire (pile, tas)',
      'Identifier les fonctions C vulnérables (strcpy, gets, sprintf)',
      'Construire un payload pour écraser l\'adresse de retour',
      'Exécuter du shellcode via un buffer overflow'
    ],
    prerequisites: ['Bases du langage C', 'Notions d\'assembleur x86'],
    tags: ['exploitation', 'mémoire', 'shellcode', 'C']
  },
  'iptables': {
    title: 'Pare-feu avec iptables',
    category: 'reseau',
    difficulty: 2,
    duration: '60 min',
    description: 'Configurez un pare-feu Linux avec iptables. Vous apprendrez à filtrer le trafic réseau en créant des règles de filtrage par port, protocole et adresse IP.',
    objectives: [
      'Comprendre les chaînes INPUT, OUTPUT et FORWARD',
      'Créer des règles de filtrage par port et protocole',
      'Configurer le NAT et le masquerading',
      'Tester les règles avec des outils réseau'
    ],
    prerequisites: ['Bases TCP/IP', 'Ligne de commande Linux'],
    tags: ['firewall', 'réseau', 'iptables', 'sécurité']
  },
  'iptables2': {
    title: 'Pare-feu iptables avancé',
    category: 'reseau',
    difficulty: 3,
    duration: '90 min',
    description: 'Configuration avancée d\'iptables avec des topologies multi-réseaux, incluant le forwarding, le logging et les règles stateful.',
    objectives: [
      'Configurer le filtrage entre plusieurs sous-réseaux',
      'Mettre en place des règles stateful avec conntrack',
      'Activer et analyser les logs iptables',
      'Protéger un serveur contre les attaques courantes'
    ],
    prerequisites: ['Lab iptables (niveau 1)', 'Notions de routage'],
    tags: ['firewall', 'réseau', 'iptables', 'avancé']
  },
  'dns': {
    title: 'Configuration DNS',
    category: 'reseau',
    difficulty: 2,
    duration: '75 min',
    description: 'Explorez le protocole DNS en configurant des serveurs de noms, des zones et des enregistrements. Lab multi-conteneurs avec topologie réseau complète.',
    objectives: [
      'Configurer un serveur DNS BIND',
      'Créer des zones directes et inverses',
      'Comprendre la résolution récursive et itérative',
      'Analyser le trafic DNS avec tcpdump'
    ],
    prerequisites: ['Bases réseau', 'Ligne de commande Linux'],
    tags: ['DNS', 'réseau', 'BIND', 'protocoles']
  },
  'sql-inject': {
    title: 'Injection SQL',
    category: 'web',
    difficulty: 2,
    duration: '60 min',
    description: 'Découvrez les attaques par injection SQL sur une application web vulnérable. Apprenez à extraire des données et à contourner l\'authentification.',
    objectives: [
      'Identifier les points d\'injection SQL',
      'Exploiter les injections pour contourner l\'authentification',
      'Extraire des données avec UNION SELECT',
      'Comprendre les contre-mesures (requêtes paramétrées)'
    ],
    prerequisites: ['Bases SQL', 'Bases HTTP'],
    tags: ['web', 'SQL', 'injection', 'OWASP']
  },
  'wireshark-intro': {
    title: 'Introduction à Wireshark',
    category: 'analyse',
    difficulty: 1,
    duration: '45 min',
    description: 'Apprenez à capturer et analyser le trafic réseau avec Wireshark. Filtrage de paquets, analyse de protocoles et détection d\'anomalies.',
    objectives: [
      'Capturer du trafic réseau',
      'Utiliser les filtres d\'affichage Wireshark',
      'Analyser les en-têtes des protocoles TCP/IP',
      'Suivre un flux TCP et identifier les données échangées'
    ],
    prerequisites: ['Bases TCP/IP'],
    tags: ['analyse', 'wireshark', 'paquets', 'réseau']
  },
  'arp-spoof': {
    title: 'Attaque ARP Spoofing',
    category: 'reseau',
    difficulty: 3,
    duration: '75 min',
    description: 'Réalisez une attaque Man-in-the-Middle par empoisonnement ARP. Lab avec 4 conteneurs simulant un réseau local avec attaquant.',
    objectives: [
      'Comprendre le protocole ARP et ses faiblesses',
      'Réaliser un empoisonnement du cache ARP',
      'Intercepter le trafic entre deux machines',
      'Mettre en place des contre-mesures (ARP statique, détection)'
    ],
    prerequisites: ['Bases réseau', 'Protocole ARP'],
    tags: ['réseau', 'MITM', 'ARP', 'attaque']
  },
  'acl': {
    title: 'Listes de contrôle d\'accès (ACL)',
    category: 'systeme',
    difficulty: 1,
    duration: '45 min',
    description: 'Maîtrisez les ACL Linux pour contrôler finement les permissions d\'accès aux fichiers et répertoires au-delà du modèle classique owner/group/other.',
    objectives: [
      'Comprendre les permissions POSIX standard',
      'Configurer les ACL avec setfacl et getfacl',
      'Définir des ACL par défaut sur les répertoires',
      'Résoudre des conflits de permissions'
    ],
    prerequisites: ['Bases Linux'],
    tags: ['système', 'permissions', 'ACL', 'Linux']
  },
  'ssh-tunnel': {
    title: 'Tunnels SSH',
    category: 'reseau',
    difficulty: 2,
    duration: '60 min',
    description: 'Créez des tunnels SSH pour sécuriser le trafic réseau. Port forwarding local, distant et dynamique (proxy SOCKS).',
    objectives: [
      'Créer un tunnel SSH local (-L)',
      'Configurer un tunnel distant (-R)',
      'Mettre en place un proxy SOCKS dynamique (-D)',
      'Comprendre les cas d\'usage des tunnels SSH'
    ],
    prerequisites: ['Bases SSH', 'Bases réseau'],
    tags: ['SSH', 'tunnel', 'réseau', 'chiffrement']
  },
  'nmap-discovery': {
    title: 'Découverte réseau avec Nmap',
    category: 'analyse',
    difficulty: 2,
    duration: '60 min',
    description: 'Utilisez Nmap pour scanner et cartographier un réseau. Découverte d\'hôtes, scan de ports, détection de services et d\'OS.',
    objectives: [
      'Scanner un réseau pour découvrir les hôtes actifs',
      'Identifier les ports ouverts et les services',
      'Utiliser les scripts NSE de Nmap',
      'Détecter les systèmes d\'exploitation à distance'
    ],
    prerequisites: ['Bases TCP/IP', 'Ports et services'],
    tags: ['scan', 'nmap', 'réseau', 'reconnaissance']
  },
  'metasploit': {
    title: 'Introduction à Metasploit',
    category: 'exploitation',
    difficulty: 3,
    duration: '90 min',
    description: 'Découvrez le framework Metasploit pour les tests d\'intrusion. Exploitation de vulnérabilités, utilisation de payloads et post-exploitation.',
    objectives: [
      'Naviguer dans la console Metasploit (msfconsole)',
      'Rechercher et sélectionner des exploits',
      'Configurer et lancer un exploit avec payload',
      'Réaliser des actions de post-exploitation'
    ],
    prerequisites: ['Bases réseau', 'Notions de vulnérabilités'],
    tags: ['pentest', 'metasploit', 'exploitation', 'framework']
  },
  'snort': {
    title: 'Détection d\'intrusion avec Snort',
    category: 'defense',
    difficulty: 2,
    duration: '75 min',
    description: 'Configurez le système de détection d\'intrusion Snort. Écriture de règles, analyse d\'alertes et réponse aux incidents.',
    objectives: [
      'Installer et configurer Snort en mode IDS',
      'Écrire des règles de détection personnalisées',
      'Analyser les alertes générées',
      'Comprendre la différence entre IDS et IPS'
    ],
    prerequisites: ['Bases TCP/IP', 'Analyse de paquets'],
    tags: ['IDS', 'snort', 'détection', 'défense']
  },
  'xsite': {
    title: 'Cross-Site Scripting (XSS)',
    category: 'web',
    difficulty: 2,
    duration: '60 min',
    description: 'Exploitez les vulnérabilités XSS dans une application web. XSS réfléchi, stocké et DOM-based.',
    objectives: [
      'Identifier les différents types de XSS',
      'Injecter du JavaScript malveillant',
      'Voler des cookies de session',
      'Implémenter des protections (CSP, échappement)'
    ],
    prerequisites: ['Bases HTML/JavaScript', 'Bases HTTP'],
    tags: ['web', 'XSS', 'JavaScript', 'OWASP']
  },
  'onewayhash': {
    title: 'Fonctions de hachage',
    category: 'crypto',
    difficulty: 1,
    duration: '45 min',
    description: 'Explorez les fonctions de hachage cryptographiques : MD5, SHA-1, SHA-256. Propriétés, collisions et applications pratiques.',
    objectives: [
      'Comprendre les propriétés des fonctions de hachage',
      'Utiliser md5sum, sha1sum, sha256sum',
      'Observer l\'effet avalanche',
      'Comprendre les attaques par collision'
    ],
    prerequisites: ['Aucun'],
    tags: ['crypto', 'hachage', 'MD5', 'SHA']
  },
  'pubkey': {
    title: 'Cryptographie à clé publique',
    category: 'crypto',
    difficulty: 2,
    duration: '60 min',
    description: 'Implémentez et utilisez la cryptographie asymétrique : génération de clés RSA, chiffrement, signature et certificats.',
    objectives: [
      'Générer des paires de clés RSA avec OpenSSL',
      'Chiffrer et déchiffrer avec clé publique/privée',
      'Signer et vérifier des documents',
      'Comprendre les certificats X.509'
    ],
    prerequisites: ['Bases de la cryptographie'],
    tags: ['crypto', 'RSA', 'PKI', 'certificats']
  },
  'ssl': {
    title: 'Protocole SSL/TLS',
    category: 'crypto',
    difficulty: 2,
    duration: '60 min',
    description: 'Comprenez le fonctionnement de SSL/TLS. Configuration de serveurs HTTPS, analyse du handshake et gestion des certificats.',
    objectives: [
      'Analyser le handshake TLS avec Wireshark',
      'Créer une autorité de certification locale',
      'Configurer un serveur HTTPS avec certificat',
      'Identifier les faiblesses des anciennes versions SSL'
    ],
    prerequisites: ['Bases crypto', 'Bases réseau'],
    tags: ['crypto', 'SSL', 'TLS', 'HTTPS']
  },
  'tcpip': {
    title: 'Protocoles TCP/IP',
    category: 'reseau',
    difficulty: 1,
    duration: '60 min',
    description: 'Étudiez en profondeur la suite de protocoles TCP/IP. Analyse de trames Ethernet, paquets IP, segments TCP et datagrammes UDP.',
    objectives: [
      'Analyser les en-têtes Ethernet, IP, TCP et UDP',
      'Comprendre le three-way handshake TCP',
      'Observer la fragmentation IP',
      'Différencier TCP et UDP en pratique'
    ],
    prerequisites: ['Aucun'],
    tags: ['réseau', 'TCP', 'IP', 'protocoles']
  },
  'routing-basics': {
    title: 'Bases du routage',
    category: 'reseau',
    difficulty: 2,
    duration: '60 min',
    description: 'Configurez le routage IP entre plusieurs sous-réseaux. Tables de routage, passerelles et routage statique.',
    objectives: [
      'Lire et interpréter une table de routage',
      'Configurer des routes statiques',
      'Mettre en place le forwarding IP',
      'Diagnostiquer les problèmes de routage avec traceroute'
    ],
    prerequisites: ['Bases TCP/IP'],
    tags: ['réseau', 'routage', 'IP', 'sous-réseaux']
  },
  'vpnlab': {
    title: 'Réseaux privés virtuels (VPN)',
    category: 'reseau',
    difficulty: 3,
    duration: '90 min',
    description: 'Configurez un VPN avec OpenVPN. Tunnel chiffré, authentification par certificats et routage du trafic.',
    objectives: [
      'Installer et configurer un serveur OpenVPN',
      'Générer les certificats serveur et client',
      'Établir un tunnel VPN',
      'Vérifier le chiffrement du trafic'
    ],
    prerequisites: ['Bases réseau', 'Bases crypto'],
    tags: ['VPN', 'OpenVPN', 'tunnel', 'chiffrement']
  },
  'pass-crack': {
    title: 'Cassage de mots de passe',
    category: 'exploitation',
    difficulty: 2,
    duration: '60 min',
    description: 'Apprenez les techniques de cassage de mots de passe : attaque par dictionnaire, force brute, rainbow tables et bonnes pratiques.',
    objectives: [
      'Comprendre le stockage des mots de passe (/etc/shadow)',
      'Utiliser John the Ripper et Hashcat',
      'Réaliser une attaque par dictionnaire',
      'Évaluer la robustesse d\'un mot de passe'
    ],
    prerequisites: ['Bases Linux', 'Notion de hachage'],
    tags: ['mots de passe', 'cracking', 'john', 'hashcat']
  },
  'capabilities': {
    title: 'Capabilities Linux',
    category: 'systeme',
    difficulty: 2,
    duration: '45 min',
    description: 'Explorez le mécanisme des capabilities Linux comme alternative granulaire au bit SUID et aux privilèges root.',
    objectives: [
      'Comprendre les capabilities Linux vs SUID',
      'Attribuer des capabilities avec setcap',
      'Auditer les capabilities avec getcap',
      'Identifier les risques de sécurité liés aux capabilities'
    ],
    prerequisites: ['Bases Linux', 'Permissions Unix'],
    tags: ['système', 'capabilities', 'Linux', 'privilèges']
  }
};

// Catégories avec traduction
const CATEGORIES = {
  reseau: { name: 'Réseau', icon: '🌐', color: '#3498db', description: 'Protocoles réseau, firewall, routage, VPN' },
  exploitation: { name: 'Exploitation', icon: '💥', color: '#e74c3c', description: 'Buffer overflow, pentest, exploitation de vulnérabilités' },
  web: { name: 'Sécurité Web', icon: '🕸️', color: '#e67e22', description: 'XSS, injection SQL, sécurité des applications web' },
  crypto: { name: 'Cryptographie', icon: '🔐', color: '#9b59b6', description: 'Chiffrement, hachage, PKI, SSL/TLS' },
  analyse: { name: 'Analyse & Forensique', icon: '🔍', color: '#2ecc71', description: 'Wireshark, Nmap, analyse de trafic' },
  defense: { name: 'Défense', icon: '🛡️', color: '#1abc9c', description: 'IDS/IPS, détection d\'intrusion, monitoring' },
  systeme: { name: 'Système', icon: '⚙️', color: '#34495e', description: 'ACL, permissions, capabilities, administration Linux' },
};

// GET /api/labs - Liste de tous les labs
router.get('/', (req, res) => {
  const labs = Object.entries(LAB_CATALOG).map(([id, lab]) => ({
    id,
    ...lab,
    categoryInfo: CATEGORIES[lab.category] || {},
  }));
  res.json({ labs, categories: CATEGORIES });
});

// GET /api/labs/:id - Détails d'un lab
router.get('/:id', (req, res) => {
  const lab = LAB_CATALOG[req.params.id];
  if (!lab) {
    return res.status(404).json({ error: 'Lab introuvable' });
  }

  // Lire la config Labtainers
  const config = dockerService.parseStartConfig(req.params.id);
  const goals = dockerService.getLabGoals(req.params.id);

  // Vérifier si un PDF d'instructions existe
  const docsPath = path.join(LABTAINERS_PATH, 'labs', req.params.id, 'docs');
  let hasInstructions = false;
  if (fs.existsSync(docsPath)) {
    const files = fs.readdirSync(docsPath);
    hasInstructions = files.some(f => f.endsWith('.pdf'));
  }

  // Extraire les comptes utilisateurs réels pour l'affichage
  const credentials = config ? config.containers.map(c => ({
    container: c.name,
    user: c.user || 'ubuntu',
    password: c.password || 'ubuntu',
    terminals: c.terminals !== undefined ? c.terminals : 1,
    extra_users: c.extra_users || [],
  })).filter(c => c.terminals > 0) : [];

  res.json({
    id: req.params.id,
    ...lab,
    categoryInfo: CATEGORIES[lab.category] || {},
    topology: config,
    goals,
    hasInstructions,
    credentials,
  });
});

// POST /api/labs/:id/start - Démarrer un lab
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const labId = req.params.id;
    const lab = LAB_CATALOG[labId];
    if (!lab) {
      return res.status(404).json({ error: 'Lab introuvable' });
    }

    // Arrêter automatiquement tout lab actif de cet utilisateur
    const activeSessions = await req.db.query(
      `SELECT lab_id FROM lab_sessions WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );
    for (const session of activeSessions.rows) {
      if (session.lab_id !== labId) {
        console.log(`Auto-stop du lab ${session.lab_id} pour l'utilisateur ${req.user.id}`);
        await dockerService.stopLab(req.user.id, session.lab_id);
        await req.db.query(
          `UPDATE lab_sessions SET status = 'stopped', ended_at = NOW()
           WHERE user_id = $1 AND lab_id = $2 AND status = 'active'`,
          [req.user.id, session.lab_id]
        );
      }
    }

    // Utiliser startFullLab qui gère réseaux + conteneurs avec les vrais comptes
    const result = await dockerService.startFullLab(req.user.id, labId);

    // Mettre à jour la progression
    await req.db.query(
      `INSERT INTO lab_progress (user_id, lab_id, status, started_at)
       VALUES ($1, $2, 'in_progress', NOW())
       ON CONFLICT (user_id, lab_id) DO UPDATE SET status = 'in_progress', started_at = NOW()`,
      [req.user.id, labId]
    );

    // Enregistrer la session
    await req.db.query(
      `INSERT INTO lab_sessions (user_id, lab_id, container_ids, network_ids, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [
        req.user.id,
        labId,
        result.containers.map(c => c.id),
        result.networks.map(n => n.id),
      ]
    );

    // Renvoyer les conteneurs avec les infos de connexion (user/password)
    res.json({
      containers: result.containers.map(c => ({
        id: c.id,
        name: c.name,
        containerLabel: c.containerLabel,
        user: c.user,
        password: c.password,
        status: c.status,
      })),
      networks: result.networks,
    });
  } catch (err) {
    console.error('Erreur démarrage lab:', err);
    res.status(500).json({ error: 'Erreur lors du démarrage du lab: ' + err.message });
  }
});

// POST /api/labs/:id/stop - Arrêter un lab
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const results = await dockerService.stopLab(req.user.id, req.params.id);

    await req.db.query(
      `UPDATE lab_sessions SET status = 'stopped', ended_at = NOW()
       WHERE user_id = $1 AND lab_id = $2 AND status = 'active'`,
      [req.user.id, req.params.id]
    );

    res.json({ results });
  } catch (err) {
    console.error('Erreur arrêt lab:', err);
    res.status(500).json({ error: 'Erreur lors de l\'arrêt du lab' });
  }
});

// GET /api/labs/:id/status - Vérifier si le setup est terminé
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const containers = await dockerService.getUserContainers(req.user.id);
    const labContainers = containers.filter(c => c.lab === req.params.id && c.state === 'running');
    const statuses = [];
    for (const c of labContainers) {
      try {
        const output = await dockerService.execInContainer(c.id, 'test -f /tmp/.lab_ready && echo READY || echo INSTALLING');
        statuses.push({ container: c.container, ready: output.includes('READY') });
      } catch {
        statuses.push({ container: c.container, ready: false });
      }
    }
    const allReady = statuses.length > 0 && statuses.every(s => s.ready);
    res.json({ ready: allReady, containers: statuses });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/labs/:id/containers - Conteneurs actifs d'un lab
router.get('/:id/containers', authenticateToken, async (req, res) => {
  try {
    const containers = await dockerService.getUserContainers(req.user.id);
    const labContainers = containers.filter(c => c.lab === req.params.id);
    res.json(labContainers);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/labs/:id/grade - Évaluer un lab
router.post('/:id/grade', authenticateToken, async (req, res) => {
  try {
    const labId = req.params.id;
    const goals = dockerService.getLabGoals(labId);

    if (goals.length === 0) {
      return res.json({ message: 'Pas d\'objectifs définis pour ce lab', score: 0 });
    }

    const containers = await dockerService.getUserContainers(req.user.id);
    const labContainers = containers.filter(c => c.lab === labId && c.state === 'running');

    if (labContainers.length === 0) {
      return res.status(400).json({ error: 'Aucun conteneur actif pour ce lab' });
    }

    // Évaluation simplifiée : exécuter le script de pre-grading si disponible
    const preGradePath = path.join(LABTAINERS_PATH, 'labs', labId, 'instr_config', 'pregrade.sh');
    let gradeResults = [];

    for (const goal of goals) {
      gradeResults.push({
        goal: goal.id,
        expression: goal.expression,
        status: 'pending',
      });
    }

    // Enregistrer les résultats
    const score = Math.round((gradeResults.filter(g => g.status === 'achieved').length / goals.length) * 100);

    await req.db.query(
      `UPDATE lab_progress SET score = $1, status = CASE WHEN $1 >= 70 THEN 'completed' ELSE 'in_progress' END,
       completed_at = CASE WHEN $1 >= 70 THEN NOW() ELSE NULL END
       WHERE user_id = $2 AND lab_id = $3`,
      [score, req.user.id, labId]
    );

    res.json({ goals: gradeResults, score, total: goals.length });
  } catch (err) {
    console.error('Erreur grading:', err);
    res.status(500).json({ error: 'Erreur lors de l\'évaluation' });
  }
});

module.exports = router;
