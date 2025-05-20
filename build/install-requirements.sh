#!/bin/bash

set -eo pipefail

# If running as root, make sudo a no-op.
# Useful if e.g. running in a docker container that doesn't have sudo installed.
if [[ $UID == 0 ]]; then
  function sudo() { "$@"; }
fi

# Install make, curl, zip, unzip
sudo apt-get update
sudo apt-get install -y build-essential curl zip unzip

unset -f sudo

# Install rust 1.86.0 and the wasm32-unknown-unknown toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs |
  sh -s -- -y -t wasm32-unknown-unknown --default-toolchain 1.86.0
source "$HOME/.cargo/env"

# Install node 22 via FNM
cargo install fnm
eval "$(fnm env)"
fnm install 22

# Install wasm-pack 0.13.1
npm install -g wasm-pack@0.13.1

echo
echo Done! Restart your shell to ensure all changes have been applied.
