# Prompt d'implémentation — Lab ARP Spoofing pédagogique (Option A multi-phases)

## Contexte projet

CyberLab est une plateforme Docker de labs cybersécurité avec un frontend React (Vite), un backend Node.js, et des conteneurs Docker orchestrés. Le lab **arp-spoof** existe déjà et fonctionne. On veut **réécrire son contenu pédagogique** et **enrichir son schéma réseau** sans casser le reste.

## Fichiers à modifier (et UNIQUEMENT ceux-ci)

### 1. `frontend/src/pages/LabWorkspace.jsx`
- Réécrire l'entrée `'arp-spoof'` dans l'objet `LAB_INSTRUCTIONS`
- Ne toucher à AUCUNE autre entrée de LAB_INSTRUCTIONS
- Ne toucher à AUCUN autre code du composant

### 2. `frontend/src/components/NetworkTopology.jsx`
- Réécrire l'entrée `'arp-spoof'` dans l'objet `TOPOLOGIES`
- Ajouter le support d'un système d'onglets de phases (3 phases)
- Ne casser aucune autre topologie existante

## Ne PAS modifier
- `backend/` (aucun fichier)
- `docker-compose.yml`
- `images/` (aucun Dockerfile)
- Les autres entrées de `LAB_INSTRUCTIONS` ou `TOPOLOGIES`

---

## PARTIE 1 — Réécriture du texte (`LAB_INSTRUCTIONS['arp-spoof']`)

### Structure cible : 3 actes pédagogiques

Le contenu utilise du HTML inline (c'est un string rendu avec `dangerouslySetInnerHTML`). Les balises autorisées sont : `<strong>`, `<code>`, `<em>`, `<br>`, `<div>`, `<span>`, `<table>`, `<tr>`, `<td>`, `<th>`, `<ul>`, `<li>`, `<h4>`, `<pre>`. Les retours à la ligne dans le string template sont rendus par `\n` qui est transformé en `<br>` par le composant.

### Format de l'objet

```javascript
'arp-spoof': {
  title: '...',
  overview: `...`,       // String HTML — introduction générale
  environment: `...`,    // String HTML — description de l'environnement
  steps: [               // Array d'étapes
    { title: '...', content: `...` },
    // ...
  ],
}
```

### Contenu à écrire

#### `title`
```
ARP Spoofing — Attaque Man-in-the-Middle sur réseau local
```

#### `overview`
Écrire un paragraphe d'introduction qui pose le PROBLÈME :
- Sur un réseau commuté (switch), le sniffing passif ne fonctionne pas (contrairement à un hub)
- ARP est le maillon faible : il ne vérifie pas l'identité de celui qui répond
- L'ARP spoofing permet de détourner le trafic en empoisonnant le cache ARP des victimes
- Ce lab couvre : observation du réseau normal → empoisonnement ARP → capture MITM → analyse avec tcpdump et tshark

#### `environment`
Structurer en 3 blocs visuels :

**Bloc 1 — Topologie** (tableau HTML ou liste structurée) :
| Machine | IP | MAC | Réseau | Rôle |
|---------|-----|-----|--------|------|
| user | 10.10.3.10 | aa:ab:ac:ad:00:02 | LOCAL_NETWORK | Victime — navigue sur le web |
| gateway | 10.10.3.254 / 10.10.4.254 | aa:ab:ac:ad:00:03 | LOCAL + REMOTE | Routeur entre les 2 réseaux |
| attacker | 10.10.3.20 | aa:ab:ac:ad:00:04 | LOCAL_NETWORK | Attaquant — intercept le trafic |
| webserver | 10.10.4.10 | — | REMOTE_NETWORK | Serveur HTTP cible |

**Bloc 2 — Réseaux** :
- LOCAL_NETWORK : 10.10.3.0/24 (tous sur le même switch)
- REMOTE_NETWORK : 10.10.4.0/24 (accessible via gateway)

**Bloc 3 — Outils disponibles** :
Présenter tcpdump et tshark avec une analogie courte :
- `tcpdump` = jumelles : observer/capturer le trafic brut en temps réel
- `tshark` = microscope : analyser en détail, disséquer chaque protocole, reconstituer des sessions

#### `steps` — 7 étapes

**Étape 1 : "Comprendre — Le protocole ARP"** (théorie pure, pas de commande)
Contenu :
- Expliquer le problème : IP ≠ MAC, le switch travaille en MAC
- Schéma ASCII inline du fonctionnement normal d'ARP :
```
user veut joindre 10.10.3.254 (gateway) :

1. user → broadcast : "Qui a 10.10.3.254 ? Dites-le à 10.10.3.10"
2. gateway → user  : "10.10.3.254, c'est moi, MAC aa:ab:ac:ad:00:03"
3. user stocke dans son cache : 10.10.3.254 = aa:ab:ac:ad:00:03

⚠ ARP fait confiance aveuglément. Aucune vérification.
  N'importe qui peut envoyer une réponse ARP non sollicitée.
```
- Conclure : "C'est cette confiance aveugle que l'attaquant va exploiter."

**Étape 2 : "Observer — Le réseau avant l'attaque"**
Contenu :
1. Sur **user** : `arp -a` → observer le cache ARP initial (la MAC de .254 est bien celle de la gateway :03)
2. Sur **attacker** : lancer `sudo tcpdump -i eth0 -n -v` 
3. Sur **user** : `wget -q http://10.10.4.10`
4. Revenir sur **attacker** : observer que tcpdump ne montre PAS la requête HTTP

Encart "Observation attendue" : Le switch envoie les trames uniquement au port MAC de destination. L'attaquant ne reçoit que le broadcast et son propre trafic. → Le sniffing passif est impossible sur un switch.

Terminer par `Ctrl+C` sur tcpdump.

**Étape 3 : "Comprendre — Le principe de l'empoisonnement ARP"** (théorie, pas de commande)
Contenu :
- Schéma ASCII inline AVANT/APRÈS :
```
══ AVANT (normal) ══════════════════════════════════

  user                    gateway              webserver
  .3.10                   .3.254 / .4.254      .4.10
  MAC:02                  MAC:03
    │                       │
    │───── HTTP GET ───────→│──────────────────→│
    │←──── HTTP 200 ────────│←─────────────────│

  Cache ARP de user : 10.10.3.254 → MAC:03 ✓

══ APRÈS (empoisonné) ══════════════════════════════

  user          attacker           gateway        webserver
  .3.10         .3.20              .3.254         .4.10
  MAC:02        MAC:04             MAC:03
    │              │                 │
    │── HTTP GET →│── forward ────→│────────────→│
    │←─ HTTP 200 ─│←─ forward ─────│←────────────│
                   ↑
              LIT TOUT EN CLAIR

  Cache ARP de user : 10.10.3.254 → MAC:04 ✗ (empoisonné !)
```
- Expliquer pourquoi le forwarding IP est nécessaire (sinon le user perd sa connexion → l'attaque est détectée)

**Étape 4 : "Attaquer — Empoisonner le cache ARP"**
Contenu :
1. Sur **attacker** : vérifier le forwarding IP
   `cat /proc/sys/net/ipv4/ip_forward` → doit être 1
2. Lancer l'empoisonnement bidirectionnel avec `arpspoof` :
   - `sudo arpspoof -i eth0 -t 10.10.3.10 10.10.3.254 &`
     → "dire à user que la MAC de .254 c'est moi"
   - `sudo arpspoof -i eth0 -t 10.10.3.254 10.10.3.10 &`
     → "dire à gateway que la MAC de .10 c'est moi"
3. Vérifier sur **user** : `arp -a`

Encart "Observation attendue" : La MAC de 10.10.3.254 dans le cache de user est maintenant `aa:ab:ac:ad:00:04` (celle de l'attaquant, pas celle de la gateway). L'empoisonnement fonctionne.

**Étape 5 : "Capturer — Intercepter le trafic avec tcpdump"**
Contenu :
Rappeler : tcpdump = jumelles, on capture le brut.
1. Sur **attacker** : `sudo tcpdump -i eth0 -n -w /tmp/capture.pcap port 80 &`
   → Expliquer chaque option : `-w` écrit en fichier PCAP, `port 80` = filtre BPF
2. Sur **user** : générer du trafic
   - `wget -q http://10.10.4.10`
   - `wget -q http://10.10.4.10/index.html`
3. Sur **attacker** : `pkill tcpdump` pour stopper la capture
4. Lecture rapide : `tcpdump -r /tmp/capture.pcap -A | head -40`

Encart "Observation attendue" : Vous voyez les en-têtes HTTP (`GET / HTTP/1.1`, `Host: 10.10.4.10`) et le contenu HTML en clair. L'attaquant intercepte tout.

**Étape 6 : "Analyser — Disséquer avec tshark"**
Contenu :
Rappeler : tshark = microscope, on dissèque.
1. Vue résumée : `tshark -r /tmp/capture.pcap`
   → Chaque ligne = 1 paquet (numéro, timestamp, src, dst, protocole)
2. Filtrer les requêtes HTTP : `tshark -r /tmp/capture.pcap -Y "http.request"`
3. Extraire les URLs : `tshark -r /tmp/capture.pcap -Y "http.request" -T fields -e http.host -e http.request.uri`
4. Reconstituer le flux TCP complet : `tshark -r /tmp/capture.pcap -z "follow,tcp,ascii,0" -q`
   → C'est l'équivalent de "Suivre le flux TCP" dans Wireshark GUI
5. Statistiques protocolaires : `tshark -r /tmp/capture.pcap -z "io,phs" -q`

**Étape 7 : "Synthèse — Comparer, nettoyer, se défendre"**
Contenu :
1. Tableau comparatif HTML :

| | tcpdump | tshark |
|---|---------|--------|
| **Rôle** | Capturer | Analyser |
| **Analogie** | Jumelles | Microscope |
| **Force** | Léger, rapide, debug live | Filtres puissants, dissection protocolaire |
| **Limite** | Pas de dissection | Plus lourd, surtout en post-capture |
| **Quand l'utiliser** | "Est-ce que des paquets passent ?" | "Que contiennent ces paquets ?" |

2. Nettoyage :
   - `pkill arpspoof`
   - Vérifier retour à la normale : `arp -a` sur **user**

3. Questions de réflexion (texte en italique) :
   - "Comment un administrateur réseau pourrait-il détecter cette attaque ?"
   - "Quel mécanisme pourrait empêcher l'empoisonnement ARP ?" (→ piste : ARP statique, 802.1X, DHCP snooping + Dynamic ARP Inspection)
   - "Pourquoi cette attaque ne fonctionne-t-elle que sur le réseau local ?"

---

## PARTIE 2 — Schéma réseau multi-phases (`NetworkTopology.jsx`)

### Architecture cible

Le composant `NetworkTopology` doit supporter un nouveau concept : **les phases**.

Si une topologie dans `TOPOLOGIES` contient une clé `phases` (array), le composant affiche :
- Une barre d'onglets au-dessus du graphe : un bouton par phase
- Chaque phase a son propre jeu de `nodes` et `edges`
- Les `groups` restent partagés entre les phases
- L'onglet actif est géré par un state local (`useState`)
- Au clic sur un onglet, on met à jour les données du graphe vis-network

### Rétrocompatibilité

Si la topologie n'a PAS de clé `phases` (tous les autres labs), le composant fonctionne exactement comme avant avec `nodes`, `edges`, `groups` directement dans la topologie. Aucun changement de comportement pour les autres labs.

### Données de la topologie `'arp-spoof'`

```javascript
'arp-spoof': {
  groups: [
    { id: 'local', label: 'LOCAL_NETWORK\n10.10.3.0/24', color: '#e8f5e9' },
    { id: 'router', label: 'Routeur', color: '#fff3e0' },
    { id: 'remote', label: 'REMOTE_NETWORK\n10.10.4.0/24', color: '#e3f2fd' },
  ],
  phases: [
    {
      id: 'normal',
      label: '1. Réseau normal',
      description: 'Le trafic passe directement de user à gateway. L\'attaquant ne voit rien.',
      nodes: [
        { id: 'user', label: 'user\n10.10.3.10\nMAC:..02', group: 'local', type: 'pc', x: -200, y: 0 },
        { id: 'attacker', label: 'attacker\n10.10.3.20\nMAC:..04', group: 'local', type: 'attacker', x: -200, y: 150, opacity: 0.4 },
        { id: 'gateway', label: 'gateway\n10.10.3.254\nMAC:..03', group: 'router', type: 'router', x: 100, y: 0 },
        { id: 'webserver', label: 'webserver\n10.10.4.10', group: 'remote', type: 'server', x: 350, y: 0 },
      ],
      edges: [
        { from: 'user', to: 'gateway', label: 'HTTP GET →', color: '#4caf50', width: 3 },
        { from: 'gateway', to: 'webserver', label: '→ forward', color: '#4caf50', width: 2 },
        { from: 'attacker', to: 'gateway', label: '(ne voit rien)', color: '#9e9e9e', width: 1, dashes: true },
      ],
    },
    {
      id: 'poisoned',
      label: '2. Cache ARP empoisonné',
      description: 'L\'attaquant envoie de fausses réponses ARP. Le cache de user est corrompu.',
      nodes: [
        { id: 'user', label: 'user\n10.10.3.10\nCache: .254→MAC:04 ✗', group: 'local', type: 'pc', x: -200, y: 0 },
        { id: 'attacker', label: 'attacker\n10.10.3.20\nMAC:..04\n⚠ arpspoof actif', group: 'local', type: 'attacker', x: -200, y: 150 },
        { id: 'gateway', label: 'gateway\n10.10.3.254\nMAC:..03', group: 'router', type: 'router', x: 100, y: 0 },
        { id: 'webserver', label: 'webserver\n10.10.4.10', group: 'remote', type: 'server', x: 350, y: 0 },
      ],
      edges: [
        { from: 'attacker', to: 'user', label: '"MAC de .254 = moi"', color: '#f44336', width: 3, dashes: [10, 5], arrows: 'to' },
        { from: 'attacker', to: 'gateway', label: '"MAC de .10 = moi"', color: '#f44336', width: 3, dashes: [10, 5], arrows: 'to' },
      ],
    },
    {
      id: 'mitm',
      label: '3. Interception MITM',
      description: 'Le trafic de user passe par l\'attaquant qui capture tout avant de retransmettre.',
      nodes: [
        { id: 'user', label: 'user\n10.10.3.10', group: 'local', type: 'pc', x: -250, y: 0 },
        { id: 'attacker', label: 'attacker\n10.10.3.20\n🔍 tcpdump/tshark', group: 'local', type: 'attacker', x: -20, y: 0 },
        { id: 'gateway', label: 'gateway\n10.10.3.254', group: 'router', type: 'router', x: 200, y: 0 },
        { id: 'webserver', label: 'webserver\n10.10.4.10', group: 'remote', type: 'server', x: 400, y: 0 },
      ],
      edges: [
        { from: 'user', to: 'attacker', label: 'HTTP GET', color: '#f44336', width: 3, arrows: 'to' },
        { from: 'attacker', to: 'gateway', label: 'forward →', color: '#ff9800', width: 2, arrows: 'to' },
        { from: 'gateway', to: 'webserver', label: '', color: '#4caf50', width: 2, arrows: 'to' },
        { from: 'webserver', to: 'gateway', label: 'HTTP 200', color: '#4caf50', width: 2, arrows: 'to' },
        { from: 'gateway', to: 'attacker', label: '← forward', color: '#ff9800', width: 2, arrows: 'to' },
        { from: 'attacker', to: 'user', label: 'HTTP 200', color: '#f44336', width: 3, arrows: 'to' },
      ],
    },
  ],
},
```

### Implémentation du composant — Modifications à apporter

Dans `NetworkTopology.jsx` :

1. **Ajouter un state pour la phase active** :
```javascript
const [activePhase, setActivePhase] = useState(0);
```

2. **Détecter si la topologie a des phases** :
```javascript
const topology = TOPOLOGIES[labId];
const hasPhases = topology && Array.isArray(topology.phases);
const currentData = hasPhases 
  ? { nodes: topology.phases[activePhase].nodes, edges: topology.phases[activePhase].edges, groups: topology.groups }
  : { nodes: topology.nodes, edges: topology.edges, groups: topology.groups };
```

3. **Rendre une barre d'onglets si `hasPhases`** :
Au-dessus du conteneur du graphe vis-network, ajouter :
```jsx
{hasPhases && (
  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
    {topology.phases.map((phase, index) => (
      <button
        key={phase.id}
        onClick={() => setActivePhase(index)}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: activePhase === index ? '2px solid #1976d2' : '1px solid #ccc',
          background: activePhase === index ? '#e3f2fd' : '#fff',
          fontWeight: activePhase === index ? 'bold' : 'normal',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        {phase.label}
      </button>
    ))}
  </div>
)}
{hasPhases && topology.phases[activePhase].description && (
  <div style={{
    padding: '8px 12px',
    marginBottom: '10px',
    background: '#f5f5f5',
    borderLeft: '3px solid #1976d2',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#333',
  }}>
    {topology.phases[activePhase].description}
  </div>
)}
```

4. **Mettre à jour le graphe vis-network quand `activePhase` change** :
Ajouter un `useEffect` qui dépend de `activePhase` :
- Recréer les DataSets `nodes` et `edges` avec les données de la phase active
- Appeler `network.setData({ nodes: newNodes, edges: newEdges })`
- Ou si le network est recréé à chaque changement, utiliser une `key` sur le conteneur

5. **Conserver le comportement de clic sur un nœud** pour basculer vers l'onglet terminal correspondant (déjà existant, ne pas casser).

### Style des onglets de phases

- Onglet actif : bordure bleue (#1976d2), fond bleu clair (#e3f2fd), texte bold
- Onglet inactif : bordure grise (#ccc), fond blanc, texte normal
- S'intégrer au thème sombre si le projet utilise des CSS variables (vérifier `var(--bg)`, `var(--text)`, `var(--border)`)

### Style des nœuds par phase

- Phase "normal" : arêtes vertes (#4caf50), attaquant en opacité réduite (grisé)
- Phase "poisoned" : arêtes rouges pointillées (#f44336) pour les fausses réponses ARP
- Phase "mitm" : flux rouge (user→attacker), orange (attacker→gateway), vert (gateway→webserver)

---

## PARTIE 3 — CSS / Styles pour les encarts pédagogiques

Dans le rendu HTML des steps dans `LabWorkspace.jsx`, utiliser des `<div>` avec styles inline pour créer les encarts suivants. NE PAS créer de fichier CSS séparé — utiliser du style inline dans le HTML string.

### Encart "À retenir" (théorie clé)
```html
<div style="background:#fff3e0; border-left:4px solid #ff9800; padding:12px 16px; margin:12px 0; border-radius:4px;">
  <strong>À retenir :</strong> ...contenu...
</div>
```

### Encart "Observation attendue" (feedback après commande)
```html
<div style="background:#e8f5e9; border-left:4px solid #4caf50; padding:12px 16px; margin:12px 0; border-radius:4px;">
  <strong>✓ Observation attendue :</strong> ...contenu...
</div>
```

### Encart "Schéma" (ASCII art)
```html
<pre style="background:#263238; color:#e0e0e0; padding:16px; border-radius:6px; font-size:13px; overflow-x:auto; line-height:1.4;">
...schéma ASCII...
</pre>
```

### Encart "Question de réflexion"
```html
<div style="background:#f3e5f5; border-left:4px solid #9c27b0; padding:12px 16px; margin:12px 0; border-radius:4px;">
  <em>Question :</em> ...question...
</div>
```

---

## Contraintes d'implémentation

1. **Lire chaque fichier AVANT de le modifier**
2. **Ne modifier QUE les sections arp-spoof** — ne pas toucher aux autres labs
3. **Tester la rétrocompatibilité** : les topologies sans `phases` (tous les autres labs) doivent continuer à fonctionner identiquement
4. **Pas de nouvelles dépendances npm** — utiliser uniquement vis-network (déjà installé) et React hooks standard
5. **Pas de fichiers CSS séparés** — inline styles uniquement pour les encarts HTML dans les strings
6. **Pas d'emoji dans le code** sauf dans les strings de contenu pédagogique affichés à l'utilisateur
7. **Les IPs doivent correspondre** à la config Docker dans `backend/src/services/docker.js` : user=10.10.3.10, gateway=10.10.3.254/10.10.4.254, attacker=10.10.3.20, webserver=10.10.4.10
8. **Langue : tout en français**, qualité professionnelle, terminologie technique correcte
