#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== Construction des images CyberLab ==="

echo "[1/6] cyberlab-base..."
docker build -t cyberlab-base -f Dockerfile.base .

echo "[2/6] cyberlab-network..."
docker build -t cyberlab-network -f Dockerfile.network .

echo "[3/6] cyberlab-attacker..."
docker build -t cyberlab-attacker -f Dockerfile.attacker .

echo "[4/6] cyberlab-web..."
docker build -t cyberlab-web -f Dockerfile.web .

echo "[5/6] cyberlab-dns..."
docker build -t cyberlab-dns -f Dockerfile.dns .

echo "[6/6] cyberlab-exploit..."
docker build -t cyberlab-exploit -f Dockerfile.exploit .

echo "[7/7] cyberlab-crypto..."
docker build -t cyberlab-crypto -f Dockerfile.crypto .

echo ""
echo "=== Toutes les images sont prêtes ==="
docker images | grep cyberlab
