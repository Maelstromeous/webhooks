#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/constants.sh"
source "$SCRIPT_DIR/log.sh"

need() { command -v "$1" >/dev/null 2>&1; }

install_ssh_client() {
  # Read distro ID
  OS_ID="$( ( . /etc/os-release 2>/dev/null; echo "${ID:-}" ) || echo "" )"

  case "$OS_ID" in
    alpine)
      apk add --no-cache openssh-client >/dev/null
      ;;
    debian|ubuntu)
      apt-get update -y >/dev/null
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends openssh-client >/dev/null
      ;;
    rhel|centos)
      if need dnf; then dnf install -y openssh-clients >/dev/null
      else yum install -y openssh-clients >/dev/null
      fi
      ;;
    fedora)
      dnf install -y openssh-clients >/dev/null
      ;;
    *)
      # Fallback: try common managers
      if need apk; then apk add --no-cache openssh-client >/dev/null
      elif need apt-get; then apt-get update -y >/dev/null && apt-get install -y --no-install-recommends openssh-client >/dev/null
      elif need dnf; then dnf install -y openssh-clients >/dev/null
      elif need yum; then yum install -y openssh-clients >/dev/null
      else
        log_message install_ssh "Cannot install ssh client: unknown package manager" >&2
        exit 1
      fi
      ;;
  esac
}

# Ensure ssh client
need ssh || install_ssh_client

# Key perms (ssh will complain if too open)
[ -f "$SSH_KEY" ] || { log_message install_ssh "Key not found at $SSH_KEY" >&2; exit 1; }
chmod 600 "$SSH_KEY" || true
