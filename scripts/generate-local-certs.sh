#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="${1:-certs/local}"

DEFAULT_HOSTS="localhost,127.0.0.1"

if command -v scutil >/dev/null 2>&1; then
  LOCAL_HOSTNAME="$(scutil --get LocalHostName 2>/dev/null || true)"
  if [[ -n "$LOCAL_HOSTNAME" ]]; then
    DEFAULT_HOSTS="$DEFAULT_HOSTS,$LOCAL_HOSTNAME.local"
  fi
fi

LOCAL_IPS="$(ifconfig | awk '/inet / {print $2}' | grep -v '^127\.' | grep -v '^198\.18\.' || true)"
while IFS= read -r IP; do
  [[ -z "$IP" ]] && continue
  DEFAULT_HOSTS="$DEFAULT_HOSTS,$IP"
done <<< "$LOCAL_IPS"

HOSTS="${LOCAL_HTTPS_HOSTS:-$DEFAULT_HOSTS}"

mkdir -p "$CERT_DIR"

CA_KEY="$CERT_DIR/dev-ca.key"
CA_CERT="$CERT_DIR/dev-ca.pem"
SERVER_KEY="$CERT_DIR/dev-server.key"
SERVER_CSR="$CERT_DIR/dev-server.csr"
SERVER_CERT="$CERT_DIR/dev-server.pem"
SERVER_EXT="$CERT_DIR/dev-server.ext"

if [[ ! -f "$CA_KEY" || ! -f "$CA_CERT" ]]; then
  openssl genrsa -out "$CA_KEY" 2048
  openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
    -out "$CA_CERT" -subj "/CN=Diary App Local Dev CA"
fi

openssl genrsa -out "$SERVER_KEY" 2048
FIRST_HOST="${HOSTS%%,*}"
openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" -subj "/CN=$FIRST_HOST"

{
  echo "authorityKeyIdentifier=keyid,issuer"
  echo "basicConstraints=CA:FALSE"
  echo "keyUsage=digitalSignature,keyEncipherment"
  echo "extendedKeyUsage=serverAuth"
  echo "subjectAltName=@alt_names"
  echo "[alt_names]"
} > "$SERVER_EXT"

INDEX=1
IFS=',' read -ra HOST_ARRAY <<< "$HOSTS"
for HOST in "${HOST_ARRAY[@]}"; do
  HOST_TRIMMED="$(echo "$HOST" | xargs)"
  if [[ "$HOST_TRIMMED" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "IP.$INDEX=$HOST_TRIMMED" >> "$SERVER_EXT"
  else
    echo "DNS.$INDEX=$HOST_TRIMMED" >> "$SERVER_EXT"
  fi
  INDEX=$((INDEX + 1))
done

openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$SERVER_CERT" -days 825 -sha256 -extfile "$SERVER_EXT"

echo "Generated local CA and server certificates in $CERT_DIR"
echo "Included hosts: $HOSTS"
echo "Install and trust $CA_CERT on your iPhone if you want Safari to treat this server as trusted HTTPS."
