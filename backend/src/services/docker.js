const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
// Chemin INTERNE au conteneur backend (pour lire les fichiers de config)
const LABTAINERS_PATH = process.env.LABTAINERS_PATH || '/labtainers';
// Chemins HÔTE (pour les bind mounts des conteneurs de lab créés via le socket Docker)
const LABTAINERS_HOST_PATH = process.env.LABTAINERS_HOST_PATH || LABTAINERS_PATH;
const CAPTURES_HOST_PATH = process.env.CAPTURES_HOST_PATH || '/shared_captures';

// Cache des labs parsés
let labCache = null;

// ======================================================================
// Comptes utilisateurs et configurations réels extraits de start.config
// ======================================================================
// Images pré-construites — plus besoin de apt-get install à chaque démarrage
const IMAGES = {
  base: 'cyberlab-base',
  network: 'cyberlab-network',
  attacker: 'cyberlab-attacker',
  web: 'cyberlab-web',
  dns: 'cyberlab-dns',
  exploit: 'cyberlab-exploit',
  crypto: 'cyberlab-crypto',
};

const LAB_CONFIGS = {
  'bufoverflow': {
    seed: 'bufoverflow_jean_seed',
    grade_container: 'bufoverflow',
    containers: [
      { name: 'bufoverflow', image: IMAGES.exploit, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        setup: [
          'rm -f /bin/sh && ln -s /bin/zsh /bin/sh',
          'if [ -f /home/ubuntu/compile.sh ]; then cd /home/ubuntu && bash compile.sh; fi'
        ] }
    ],
    networks: [],
  },

  'iptables2': {
    seed: 'iptables_mike_master_seed',
    grade_container: 'client',
    containers: [
      { name: 'client', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'CLIENT_NET', ip: '10.10.1.10',
        extra_hosts: { 'server': '10.10.2.10' },
        setup: [] },
      { name: 'firewall', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 2,
        networks: [
          { name: 'CLIENT_NET', ip: '10.10.1.254' },
          { name: 'SERVER_NET', ip: '10.10.2.254' }
        ],
        setup: [
          'echo 1 > /proc/sys/net/ipv4/ip_forward'
        ] },
      { name: 'server', image: IMAGES.network, user: 'ubuntu', password: 'gummybear', terminals: 0,
        network: 'SERVER_NET', ip: '10.10.2.10',
        setup: [
          'route add -net 10.10.1.0/24 gw 10.10.2.254 2>/dev/null || true',
          'service ssh start 2>/dev/null || true'
        ] },
    ],
    networks: [
      { name: 'CLIENT_NET', subnet: '10.10.1.0/24', gateway: '10.10.1.1' },
      { name: 'SERVER_NET', subnet: '10.10.2.0/24', gateway: '10.10.2.1' },
    ],
  },

  'arp-spoof': {
    seed: 'user_mike_master_seed',
    grade_container: 'user',
    containers: [
      { name: 'user', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'LOCAL_NETWORK', ip: '10.10.3.10', mac: 'aa:ab:ac:ad:00:02',
        setup: ['ip route replace default via 10.10.3.254 2>/dev/null || true'] },
      { name: 'gateway', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        networks: [
          { name: 'LOCAL_NETWORK', ip: '10.10.3.254', mac: 'aa:ab:ac:ad:00:03' },
          { name: 'REMOTE_NETWORK', ip: '10.10.4.254' }
        ],
        setup: ['echo 1 > /proc/sys/net/ipv4/ip_forward'] },
      { name: 'attacker', image: IMAGES.attacker, user: 'ubuntu', password: 'ubuntu', terminals: 3,
        network: 'LOCAL_NETWORK', ip: '10.10.3.20', mac: 'aa:ab:ac:ad:00:04',
        setup: [
          'echo 1 > /proc/sys/net/ipv4/ip_forward',
          'ip route replace default via 10.10.3.254 2>/dev/null || true'
        ] },
      { name: 'webserver', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'REMOTE_NETWORK', ip: '10.10.4.10',
        setup: [
          'ip route replace default via 10.10.4.254 2>/dev/null || true',
          'service apache2 start 2>/dev/null || true'
        ] },
    ],
    networks: [
      { name: 'LOCAL_NETWORK', subnet: '10.10.3.0/24', gateway: '10.10.3.1' },
      { name: 'REMOTE_NETWORK', subnet: '10.10.4.0/24', gateway: '10.10.4.1' },
    ],
  },

  'dns': {
    seed: 'dns_mike_master_seed',
    grade_container: 'dns',
    containers: [
      { name: 'dns', image: IMAGES.dns, user: 'admin', password: 'admin', terminals: 1,
        network: 'LAN', ip: '10.10.5.10',
        setup: [
          'mkdir -p /var/named',
          'chown -R bind:bind /var/named 2>/dev/null || true',
          'service bind9 restart 2>/dev/null || true'
        ] },
      { name: 'gw', image: IMAGES.network, user: 'admin', password: 'admin', terminals: 1,
        networks: [
          { name: 'LAN', ip: '10.10.5.254' },
          { name: 'WAN', ip: '10.10.6.254' }
        ],
        setup: [
          'echo 1 > /proc/sys/net/ipv4/ip_forward',
          'echo "nameserver 10.10.6.10" > /etc/resolv.conf'
        ] },
      { name: 'ws1', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'LAN', ip: '10.10.5.11',
        setup: [
          'echo -e "search example.com\\nnameserver 10.10.5.10" > /etc/resolv.conf',
          'ip route replace default via 10.10.5.254 2>/dev/null || true'
        ] },
      { name: 'ws2', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'LAN', ip: '10.10.5.12',
        setup: [
          'echo -e "search example.com\\nnameserver 10.10.5.10" > /etc/resolv.conf',
          'ip route replace default via 10.10.5.254 2>/dev/null || true'
        ] },
      { name: 'ws3', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'LAN', ip: '10.10.5.13',
        setup: [
          'ip route replace default via 10.10.5.254 2>/dev/null || true'
        ] },
      { name: 'isp', image: IMAGES.dns, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        network: 'WAN', ip: '10.10.6.10',
        setup: ['echo 1 > /proc/sys/net/ipv4/ip_forward'] },
    ],
    networks: [
      { name: 'LAN', subnet: '10.10.5.0/24', gateway: '10.10.5.1' },
      { name: 'WAN', subnet: '10.10.6.0/24', gateway: '10.10.6.1' },
    ],
  },

  'sql-inject': {
    seed: 'sql-inject_mike_master_seed',
    grade_container: 'web-server',
    containers: [
      { name: 'web-server', image: IMAGES.web, user: 'student', password: 'password123', terminals: 1,
        network: 'some_network', ip: '10.10.7.10',
        extra_hosts: {
          'seedlabsqlinjection.com': '10.10.7.10',
          'www.seedlabsqlinjection.com': '10.10.7.10'
        },
        setup: [
          'service mysql start 2>/dev/null || service mariadb start 2>/dev/null || true',
          'service apache2 start 2>/dev/null || true',
        ],
        db_setup: {
          root_password: 'seedubuntu',
          database: 'Users',
          sql_file: 'Users.sql',
          tables: {
            credential: {
              fields: ['ID', 'Name', 'EID', 'Salary', 'birth', 'SSN', 'PhoneNumber', 'Address', 'Email', 'NickName', 'Password'],
              records: [
                { Name: 'Alice', EID: 10000, Salary: 20000, birth: '9/20', SSN: '10211002' },
                { Name: 'Boby', EID: 20000, Salary: 30000, birth: '4/20', SSN: '10213352' },
                { Name: 'Ryan', EID: 30000, Salary: 50000, birth: '6/19', SSN: '98993524' },
                { Name: 'Samy', EID: 40000, Salary: 90000, birth: '1/11', SSN: '32193525' },
                { Name: 'Ted', EID: 50000, Salary: 110000, birth: '11/3', SSN: '24343244' },
                { Name: 'Admin', EID: 99999, Salary: 400000, birth: '3/5', SSN: '43254314' },
              ]
            }
          }
        },
        web_files: {
          docroot: '/var/www/seedlabsqlinjection.com/public_html',
          vhost: 'www.SeedLabSQLInjection.com',
          files: ['index.html', 'unsafe_credential.php', 'unsafe_edit.php', 'edit.php', 'logoff.php']
        }
      },
      { name: 'client', image: IMAGES.network, user: 'student', password: 'password123', terminals: 1,
        network: 'some_network', ip: '10.10.7.20',
        extra_hosts: {
          'seedlabsqlinjection.com': '10.10.7.10',
          'www.seedlabsqlinjection.com': '10.10.7.10'
        },
        setup: [] },
    ],
    networks: [
      { name: 'some_network', subnet: '10.10.7.0/24', gateway: '10.10.7.1' },
    ],
  },

  'acl': {
    seed: 'acl_mike_master_seed',
    grade_container: 'acl',
    containers: [
      { name: 'acl', image: IMAGES.base, user: 'alice', password: 'password4alice', terminals: 3,
        extra_users: [
          { name: 'bob', password: 'password4bob', groups: [] },
          { name: 'harry', password: 'password4harry', groups: [] },
          { name: 'mike', password: 'password4mike', groups: ['wheel'] },
        ],
        setup: [
          'mkdir -p /shared_data/alice /shared_data/bob/fun',
          'echo "some numbers" > /shared_data/accounting.txt',
          'echo "alice stuff" > /shared_data/alice/alicestuff.txt',
          'echo "bob stuff" > /shared_data/bob/bobstuff.txt',
          'echo "#!/bin/bash" > /shared_data/bob/fun && echo "echo just for fun" >> /shared_data/bob/fun',
          'chmod +x /shared_data/bob/fun',
          'chown -R bob:bob /shared_data/bob',
          'chown -R alice:alice /shared_data/alice',
          'chmod 660 /shared_data/bob/bobstuff.txt',
          'chmod 640 /shared_data/accounting.txt',
          'chown bob:bob /shared_data/accounting.txt',
          'setfacl -m u:harry:rw /shared_data/accounting.txt',
          'setfacl -m u:alice:r /shared_data/accounting.txt',
          'echo "umask 007" >> /home/bob/.bashrc',
          'echo "umask 007" >> /home/alice/.bashrc',
        ] },
    ],
    networks: [],
  },

  'wireshark-intro': {
    seed: 'wireshark_master_seed',
    grade_container: 'wireshark-intro',
    containers: [
      { name: 'wireshark-intro', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        setup: [],
        // Le fichier telnet.pcap est fourni dans le home de l'utilisateur
        home_files: { 'telnet.pcap': true } },
    ],
    networks: [],
  },

  'ssh-tunnel': {
    seed: 'ssh_tunnel_seed',
    grade_container: 'base',
    containers: [
      { name: 'base', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'NET_AB', ip: '10.10.10.10',
        extra_hosts: { 'hosta': '10.10.10.20' },
        setup: [] },
      { name: 'hosta', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        networks: [
          { name: 'NET_AB', ip: '10.10.10.20' },
          { name: 'NET_BC', ip: '10.10.11.10' }
        ],
        extra_hosts: { 'hostb': '10.10.11.20' },
        setup: ['service ssh start 2>/dev/null || true'] },
      { name: 'hostb', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        networks: [
          { name: 'NET_BC', ip: '10.10.11.20' },
          { name: 'NET_CD', ip: '10.10.12.10' }
        ],
        extra_hosts: { 'hostc': '10.10.12.20' },
        setup: ['service ssh start 2>/dev/null || true'] },
      { name: 'hostc', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        networks: [
          { name: 'NET_CD', ip: '10.10.12.20' },
          { name: 'NET_DE', ip: '10.10.13.10' }
        ],
        extra_hosts: { 'hostd': '10.10.13.20' },
        setup: ['service ssh start 2>/dev/null || true'] },
      { name: 'hostd', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        network: 'NET_DE', ip: '10.10.13.20',
        setup: [
          'service ssh start 2>/dev/null || true',
          'echo "Congratulations! You reached host-d via SSH tunnel." > /home/ubuntu/copyfile.txt',
          'chown ubuntu:ubuntu /home/ubuntu/copyfile.txt'
        ] },
    ],
    networks: [
      { name: 'NET_AB', subnet: '10.10.10.0/24', gateway: '10.10.10.1' },
      { name: 'NET_BC', subnet: '10.10.11.0/24', gateway: '10.10.11.1' },
      { name: 'NET_CD', subnet: '10.10.12.0/24', gateway: '10.10.12.1' },
      { name: 'NET_DE', subnet: '10.10.13.0/24', gateway: '10.10.13.1' },
    ],
  },

  'nmap-discovery': {
    seed: 'nmap_discovery_seed',
    grade_container: 'nmap-discovery',
    containers: [
      { name: 'nmap-discovery', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        network: 'DISCOVERY_NET', ip: '10.10.8.10',
        setup: [] },
      { name: 'target', image: IMAGES.network, user: 'ubuntu', password: 'ubuntu', terminals: 0,
        network: 'DISCOVERY_NET', ip: '10.10.8.20',
        setup: [
          'service ssh start 2>/dev/null || true',
          'service apache2 start 2>/dev/null || true',
          'mkdir -p /home/ubuntu && echo "fried shrimp project - classified data" > /home/ubuntu/project.txt',
          'chown ubuntu:ubuntu /home/ubuntu/project.txt'
        ] },
    ],
    networks: [
      { name: 'DISCOVERY_NET', subnet: '10.10.8.0/24', gateway: '10.10.8.1' },
    ],
  },

  'pass-crack': {
    seed: 'passcrack_seed',
    grade_container: 'pass-crack',
    containers: [
      { name: 'pass-crack', image: IMAGES.crypto, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        setup: [] },
    ],
    networks: [],
  },

  'onewayhash': {
    seed: 'onewayhash_seed',
    grade_container: 'onewayhash',
    containers: [
      { name: 'onewayhash', image: IMAGES.crypto, user: 'ubuntu', password: 'ubuntu', terminals: 1,
        setup: [] },
    ],
    networks: [],
  },
};

// ======================================================================
// Parser start.config complet et fidèle
// ======================================================================
function parseStartConfig(labId) {
  // D'abord vérifier si on a une config hardcodée (plus fiable)
  if (LAB_CONFIGS[labId]) {
    const cfg = LAB_CONFIGS[labId];
    return {
      containers: cfg.containers.map(c => ({
        name: c.name,
        user: c.user,
        password: c.password || '',
        terminals: c.terminals !== undefined ? c.terminals : 1,
        x11: c.x11 || false,
        ip: c.ip || (c.network ? undefined : undefined),
        mac: c.mac || undefined,
        network: c.network || undefined,
        networks: c.networks || undefined,
        extra_users: c.extra_users || [],
        extra_hosts: c.extra_hosts || {},
        image: c.image || IMAGES.base,
        setup: c.setup || [],
        base: c.base || 'ubuntu',
      })),
      networks: cfg.networks || [],
      global: { GRADE_CONTAINER: cfg.grade_container, LAB_MASTER_SEED: cfg.seed },
    };
  }

  // Fallback: parser le fichier start.config
  const configPath = path.join(LABTAINERS_PATH, 'labs', labId, 'config', 'start.config');
  if (!fs.existsSync(configPath)) return null;

  const content = fs.readFileSync(configPath, 'utf8');
  const config = { containers: [], networks: [], global: {} };
  let section = null;
  let currentItem = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed === 'GLOBAL_SETTINGS') { section = 'global'; continue; }
    if (trimmed === 'NETWORK') {
      if (currentItem && currentItem.name) {
        if (section === 'container') config.containers.push({ ...currentItem });
        if (section === 'network') config.networks.push({ ...currentItem });
      }
      section = 'network'; currentItem = {}; continue;
    }
    if (trimmed === 'CONTAINER') {
      if (currentItem && currentItem.name) {
        if (section === 'container') config.containers.push({ ...currentItem });
        if (section === 'network') config.networks.push({ ...currentItem });
      }
      section = 'container'; currentItem = {}; continue;
    }

    const parts = trimmed.split(/\s+/);

    if (section === 'global') {
      config.global[parts[0]] = parts.slice(1).join(' ');
    } else if (section === 'network' && currentItem) {
      if (!currentItem.name) { currentItem.name = parts[0]; }
      else if (parts[0] === 'MASK') { currentItem.subnet = parts[1]; }
      else if (parts[0] === 'GATEWAY') { currentItem.gateway = parts[1]; }
    } else if (section === 'container' && currentItem) {
      if (!currentItem.name) {
        currentItem.name = parts[0];
        currentItem.extra_users = [];
        currentItem.extra_hosts = {};
        currentItem.setup = [];
      }
      else if (parts[0] === 'USER') { currentItem.user = parts[1]; }
      else if (parts[0] === 'PASSWORD') { currentItem.password = parts[1]; }
      else if (parts[0] === 'TERMINALS') { currentItem.terminals = parseInt(parts[1]) || 1; }
      else if (parts[0] === 'X11') { currentItem.x11 = parts[1] === 'YES'; }
      else if (parts[0] === 'ADD-HOST') {
        const [host, ip] = parts[1].split(':');
        currentItem.extra_hosts[host] = ip;
      }
      else if (parts[0] === currentItem.name || /^\d/.test(parts[0])) {
        // Ligne de réseau : NETWORK_NAME IP[:MAC]
      }
    }
  }

  // Ajouter le dernier item
  if (currentItem && currentItem.name) {
    if (section === 'container') config.containers.push(currentItem);
    if (section === 'network') config.networks.push(currentItem);
  }

  return config;
}

function getLabAbout(labId) {
  const aboutPath = path.join(LABTAINERS_PATH, 'labs', labId, 'config', 'about.txt');
  if (fs.existsSync(aboutPath)) {
    return fs.readFileSync(aboutPath, 'utf8').trim();
  }
  return '';
}

function getLabGoals(labId) {
  const goalsPath = path.join(LABTAINERS_PATH, 'labs', labId, 'instr_config', 'goals.config');
  if (!fs.existsSync(goalsPath)) return [];

  const content = fs.readFileSync(goalsPath, 'utf8');
  const goals = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\w+)\s*=\s*(.+)/);
    if (match) {
      goals.push({ id: match[1], expression: match[2] });
    }
  }
  return goals;
}

function getLabResults(labId) {
  const resultsPath = path.join(LABTAINERS_PATH, 'labs', labId, 'instr_config', 'results.config');
  if (!fs.existsSync(resultsPath)) return [];

  const content = fs.readFileSync(resultsPath, 'utf8');
  const results = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    results.push(trimmed);
  }
  return results;
}

function listAvailableLabs() {
  if (labCache) return labCache;

  const labsDir = path.join(LABTAINERS_PATH, 'labs');
  if (!fs.existsSync(labsDir)) return [];

  const dirs = fs.readdirSync(labsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  labCache = dirs.map(labId => {
    const config = parseStartConfig(labId);
    const about = getLabAbout(labId);
    const hasDocs = fs.existsSync(path.join(labsDir, labId, 'docs'));
    return {
      id: labId,
      about,
      hasDocs,
      containerCount: config ? config.containers.length : 0,
      networkCount: config ? config.networks.length : 0,
    };
  }).filter(lab => lab.about || lab.containerCount > 0);

  return labCache;
}

// ======================================================================
// Gestion Docker — réseaux et conteneurs avec configs réelles
// ======================================================================

async function createLabNetwork(userId, labId, networkDef) {
  const name = `cyberlab_${userId}_${labId}_${networkDef.name}`;
  try {
    const network = await docker.createNetwork({
      Name: name,
      Driver: 'bridge',
      IPAM: networkDef.subnet ? {
        Config: [{ Subnet: networkDef.subnet, Gateway: networkDef.gateway }],
      } : undefined,
      Labels: { 'cyberlab.user': String(userId), 'cyberlab.lab': labId },
    });
    return { id: network.id, name, subnet: networkDef.subnet };
  } catch (err) {
    if (err.statusCode === 409) {
      const networks = await docker.listNetworks({ filters: { name: [name] } });
      return { id: networks[0]?.Id, name, subnet: networkDef.subnet };
    }
    throw err;
  }
}

async function ensureImage(imageName) {
  try {
    await docker.getImage(imageName).inspect();
  } catch {
    console.log(`Pull de l'image ${imageName}...`);
    await new Promise((resolve, reject) => {
      docker.pull(imageName, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    });
  }
}

async function startLabContainer(userId, labId, containerDef) {
  const containerName = `cyberlab_${userId}_${labId}_${containerDef.name}`;

  // Vérifier si le conteneur existe déjà
  try {
    const existing = docker.getContainer(containerName);
    const info = await existing.inspect();
    if (info.State.Running) {
      return { id: info.Id, name: containerName, containerLabel: containerDef.name, status: 'already_running' };
    }
    await existing.start();
    return { id: info.Id, name: containerName, containerLabel: containerDef.name, status: 'restarted' };
  } catch {
    // Le conteneur n'existe pas, on le crée
  }

  // Utiliser l'image pré-construite (plus de apt-get install à chaque démarrage)
  const imageName = containerDef.image || IMAGES.base;

  const labPath = path.join(LABTAINERS_PATH, 'labs', labId);
  // Chemin hôte pour les bind mounts (Docker socket = perspective hôte)
  const labHostPath = `${LABTAINERS_HOST_PATH}/labs/${labId}`;

  // Construire la liste d'extra hosts
  const extraHosts = [];
  if (containerDef.extra_hosts) {
    for (const [host, ip] of Object.entries(containerDef.extra_hosts)) {
      extraHosts.push(`${host}:${ip}`);
    }
  }

  // Déterminer le réseau et l'IP
  let networkMode = 'cyberlab_labs';
  let networkConfig = undefined;

  if (containerDef.ip && containerDef.network) {
    // Conteneur mono-réseau (ex: user, webserver)
    const netName = `cyberlab_${userId}_${labId}_${containerDef.network}`;
    networkMode = netName;
    networkConfig = {
      EndpointsConfig: {
        [netName]: {
          IPAMConfig: { IPv4Address: containerDef.ip },
          ...(containerDef.mac ? { MacAddress: containerDef.mac } : {}),
        }
      }
    };
  } else if (containerDef.networks && containerDef.networks.length > 0) {
    // Conteneur multi-réseau (ex: gateway, firewall) — se connecter au premier réseau au démarrage
    const firstNet = containerDef.networks[0];
    const netName = `cyberlab_${userId}_${labId}_${firstNet.name}`;
    networkMode = netName;
    networkConfig = {
      EndpointsConfig: {
        [netName]: {
          IPAMConfig: firstNet.ip ? { IPv4Address: firstNet.ip } : undefined,
          ...(firstNet.mac ? { MacAddress: firstNet.mac } : {}),
        }
      }
    };
  }

  const createOpts = {
    Image: imageName,
    name: containerName,
    Hostname: containerDef.name,
    Cmd: ['/bin/bash'],
    Tty: true,
    OpenStdin: true,
    Labels: {
      'cyberlab.user': String(userId),
      'cyberlab.lab': labId,
      'cyberlab.container': containerDef.name,
      'cyberlab.username': containerDef.user || 'ubuntu',
      'cyberlab.password': containerDef.password || '',
    },
    HostConfig: {
      Binds: [
        `${labHostPath}:/lab:ro`,
      ],
      NetworkMode: networkMode,
      CapAdd: ['NET_ADMIN', 'SYS_PTRACE', 'NET_RAW'],
      ExtraHosts: extraHosts.length > 0 ? extraHosts : undefined,
      Privileged: true, // Nécessaire pour iptables, sysctl, etc.
      // Limites de ressources par conteneur
      Memory: 512 * 1024 * 1024, // 512 Mo max RAM
      MemorySwap: 1024 * 1024 * 1024, // 1 Go max RAM+swap
      CpuQuota: 50000, // 50% d'un CPU max
      PidsLimit: 256, // Limite de processus
    },
    NetworkingConfig: networkConfig,
  };

  const container = await docker.createContainer(createOpts);
  await container.start();

  // Connecter aux réseaux supplémentaires (multi-homed containers)
  if (containerDef.networks && containerDef.networks.length > 1) {
    for (let i = 1; i < containerDef.networks.length; i++) {
      const netDef = containerDef.networks[i];
      const netName = `cyberlab_${userId}_${labId}_${netDef.name}`;
      try {
        const network = docker.getNetwork(netName);
        await network.connect({
          Container: container.id,
          EndpointConfig: {
            IPAMConfig: netDef.ip ? { IPv4Address: netDef.ip } : undefined,
          },
        });
      } catch (err) {
        console.warn(`Impossible de connecter au réseau ${netName}:`, err.message);
      }
    }
  }

  // Setup léger : plus besoin de apt-get install, tout est dans l'image
  const userSetup = [];

  // Utilisateur principal
  if (containerDef.user && containerDef.user !== 'root') {
    userSetup.push(
      `id ${containerDef.user} 2>/dev/null || useradd -ms /bin/bash ${containerDef.user}`,
      `echo "${containerDef.user}:${containerDef.password || containerDef.user}" | chpasswd`,
      `echo "${containerDef.user} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers`,
    );
  }

  // Utilisateurs supplémentaires (ex: bob, harry, mike pour le lab ACL)
  if (containerDef.extra_users) {
    for (const u of containerDef.extra_users) {
      userSetup.push(
        `id ${u.name} 2>/dev/null || useradd -ms /bin/bash ${u.name}`,
        `echo "${u.name}:${u.password}" | chpasswd`,
      );
      if (u.groups && u.groups.length > 0) {
        for (const g of u.groups) {
          userSetup.push(`usermod -aG ${g} ${u.name} 2>/dev/null || true`);
        }
      }
    }
  }

  // Scripts de setup spécifiques au lab
  const labSetup = (containerDef.setup || []).map(cmd => `${cmd}`);

  // Copier les fichiers du lab dans le conteneur
  const copyFiles = [];
  const containerDir = path.join(labPath, containerDef.name);
  if (fs.existsSync(containerDir)) {
    copyFiles.push(
      `if [ -d /lab/${containerDef.name}/_system ]; then cp -a /lab/${containerDef.name}/_system/* / 2>/dev/null || true; fi`,
      `if [ -f /lab/${containerDef.name}/_bin/fixlocal.sh ]; then bash /lab/${containerDef.name}/_bin/fixlocal.sh 2>/dev/null || true; fi`,
      `if [ -f /lab/${containerDef.name}/_bin/student_startup.sh ]; then bash /lab/${containerDef.name}/_bin/student_startup.sh 2>/dev/null || true; fi`,
    );
  }

  const fullSetup = [
    ...userSetup,
    ...copyFiles,
    ...labSetup,
    'echo "=== Lab prêt ===" && touch /tmp/.lab_ready',
  ].join(' && ');

  const exec = await container.exec({
    Cmd: ['bash', '-c', fullSetup],
    AttachStdout: true,
    AttachStderr: true,
  });

  // Lancer le setup en arrière-plan (ne PAS attendre — sinon timeout)
  exec.start((err, stream) => {
    if (err) {
      console.error(`[${containerName}] Erreur lancement setup:`, err.message);
      return;
    }
    let output = '';
    stream.on('data', (chunk) => { output += chunk.toString(); });
    stream.on('end', () => {
      console.log(`[${containerName}] Setup terminé (${output.includes('=== Lab prêt ===') ? 'OK' : 'avec avertissements'})`);
    });
    stream.on('error', (e) => {
      console.error(`[${containerName}] Erreur setup:`, e.message);
    });
  });

  const info = await container.inspect();
  return {
    id: info.Id,
    name: containerName,
    containerLabel: containerDef.name,
    user: containerDef.user,
    password: containerDef.password,
    status: 'started',
  };
}

// Démarrer un lab complet avec tous ses réseaux et conteneurs
async function startFullLab(userId, labId) {
  const config = parseStartConfig(labId);
  if (!config) throw new Error(`Configuration introuvable pour le lab ${labId}`);

  // 1. Créer les réseaux
  const createdNetworks = [];
  for (const netDef of config.networks) {
    const net = await createLabNetwork(userId, labId, netDef);
    createdNetworks.push(net);
  }

  // 2. Démarrer les conteneurs
  const createdContainers = [];
  for (const containerDef of config.containers) {
    // Sauter les conteneurs sans terminaux si pas de rôle réseau
    const result = await startLabContainer(userId, labId, containerDef);
    createdContainers.push(result);
  }

  return { networks: createdNetworks, containers: createdContainers };
}

async function stopLab(userId, labId) {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: [`cyberlab.user=${userId}`, `cyberlab.lab=${labId}`] },
  });

  const results = [];
  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    try {
      if (c.State === 'running') await container.stop({ t: 5 });
      await container.remove({ force: true });
      results.push({ id: c.Id, status: 'removed' });
    } catch (err) {
      results.push({ id: c.Id, status: 'error', error: err.message });
    }
  }

  // Nettoyer les réseaux
  const networks = await docker.listNetworks({
    filters: { label: [`cyberlab.user=${userId}`, `cyberlab.lab=${labId}`] },
  });
  for (const n of networks) {
    try { await docker.getNetwork(n.Id).remove(); } catch { /* réseau peut être en usage */ }
  }

  return results;
}

async function execInContainer(containerId, cmd) {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: ['bash', '-c', cmd],
    AttachStdout: true,
    AttachStderr: true,
  });

  return new Promise((resolve, reject) => {
    exec.start((err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream.on('data', (chunk) => { output += chunk.toString(); });
      stream.on('end', () => resolve(output));
      stream.on('error', reject);
    });
  });
}

async function getUserContainers(userId) {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: [`cyberlab.user=${userId}`] },
  });

  return containers.map(c => ({
    id: c.Id,
    name: c.Names[0]?.replace('/', ''),
    lab: c.Labels['cyberlab.lab'],
    container: c.Labels['cyberlab.container'],
    user: c.Labels['cyberlab.username'],
    password: c.Labels['cyberlab.password'],
    state: c.State,
    status: c.Status,
  }));
}

module.exports = {
  docker,
  listAvailableLabs,
  parseStartConfig,
  getLabAbout,
  getLabGoals,
  getLabResults,
  createLabNetwork,
  startLabContainer,
  startFullLab,
  stopLab,
  execInContainer,
  getUserContainers,
  LAB_CONFIGS,
};
